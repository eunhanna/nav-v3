'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isApiConfigured, requestLoginCode, restoreSession, verifyLoginCode } from '@/lib/api'

type LoginStep = 'email' | 'code'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export default function LoginPage() {
  const router = useRouter()
  const codeInput = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<LoginStep>('email')
  const [checkingSession, setCheckingSession] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    let active = true
    restoreSession()
      .then(() => { if (active) router.replace('/') })
      .catch(() => { if (active) setCheckingSession(false) })
    return () => { active = false }
  }, [router])

  useEffect(() => {
    if (step === 'code') codeInput.current?.focus()
  }, [step])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  async function sendCode() {
    if (busy || cooldown > 0) return
    const normalizedEmail = email.trim()
    setEmail(normalizedEmail)
    setBusy(true)
    setError('')
    try {
      await requestLoginCode(normalizedEmail)
      setStep('code')
      setCode('')
      setCooldown(60)
    } catch {
      setError('暂时无法发送验证码，请检查网络后重试。')
    } finally {
      setBusy(false)
    }
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await sendCode()
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (code.length !== 6 || busy) return
    setBusy(true)
    setError('')
    try {
      await verifyLoginCode(email, code)
      router.replace('/')
    } catch {
      setError('验证码错误、已过期或尝试次数过多，请重新获取。')
      setBusy(false)
      codeInput.current?.select()
    }
  }

  function changeEmail() {
    setStep('email')
    setCode('')
    setCooldown(0)
    setError('')
  }

  return (
    <main className="login-page">
      <header className="login-header">
        <Link className="login-brand" href="/" aria-label="返回 EUNHANNA 首页"><img src={`${basePath}/eunhanna-logo.png`} alt="EUNHANNA" /></Link>
        <Link className="login-back" href="/"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>返回导航</Link>
      </header>

      <section className="login-stage" aria-labelledby="login-title">
        <div className={`login-orbit${step === 'code' ? ' is-connected' : ''}`} aria-hidden="true"><span className="login-orbit-line" /><span className="login-orbit-node">{step === 'code' ? '6' : ''}</span></div>
        {!isApiConfigured ? (
          <div className="login-card"><p className="login-eyebrow">LOCAL MODE</p><h1 id="login-title">登录服务暂未开放</h1><p className="login-copy">你仍可继续使用完整的导航功能；网站、分类和个性化设置会保存在当前浏览器。</p></div>
        ) : checkingSession ? (
          <div className="login-card login-checking" role="status" aria-busy="true"><span className="login-spinner" aria-hidden="true" /><h1 id="login-title">正在连接你的轨道</h1><p>正在确认登录状态…</p></div>
        ) : step === 'email' ? (
          <form className="login-card" onSubmit={submitEmail} aria-busy={busy}>
            <p className="login-eyebrow">CLOUD PASS</p><h1 id="login-title">连接你的轨道</h1><p className="login-copy">输入受邀邮箱，我们会发送一组 10 分钟有效的登录验证码，无需密码。</p>
            <label className="login-field"><span>邮箱地址</span><input autoFocus required type="email" autoComplete="email" inputMode="email" value={email} onChange={event => { setEmail(event.target.value); setError('') }} placeholder="name@example.com" aria-describedby={error ? 'login-error' : 'login-hint'} /></label>
            {error && <p id="login-error" className="login-error" role="alert">{error}</p>}
            <button className="login-submit" disabled={busy}>{busy ? <><span className="login-spinner" aria-hidden="true" />正在发送…</> : <>获取登录验证码<span aria-hidden="true">→</span></>}</button>
            <p id="login-hint" className="login-footnote">当前采用邀请制；提交请求不会透露邮箱是否已受邀。</p>
          </form>
        ) : (
          <form className="login-card login-code-card" onSubmit={submitCode} aria-busy={busy}>
            <p className="login-eyebrow">CODE DISPATCHED</p><h1 id="login-title">输入邮件里的验证码</h1><p className="login-copy">验证码已发送至 <strong>{email}</strong>。它只能使用一次，并将在 10 分钟后失效。</p>
            <label className="login-field login-code-field"><span>6 位验证码</span><input ref={codeInput} required type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => { setCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }} placeholder="000000" aria-describedby={error ? 'login-error' : undefined} /></label>
            {error && <p id="login-error" className="login-error" role="alert">{error}</p>}
            <button className="login-submit" disabled={busy || code.length !== 6}>{busy ? <><span className="login-spinner" aria-hidden="true" />正在验证…</> : <>验证并登录<span aria-hidden="true">→</span></>}</button>
            <div className="login-code-actions"><button type="button" className="login-text-button" onClick={changeEmail}>更换邮箱</button><button type="button" className="login-text-button" disabled={busy || cooldown > 0} onClick={() => void sendCode()}>{cooldown > 0 ? `${cooldown} 秒后可重发` : '重新发送验证码'}</button></div>
          </form>
        )}
      </section>
      <p className="login-local-note"><span aria-hidden="true" />不登录也可以继续使用，本地内容会保留在当前浏览器</p>
    </main>
  )
}
