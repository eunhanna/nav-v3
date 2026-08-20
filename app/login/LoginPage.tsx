'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useRef, useState } from 'react'

import {
  isApiConfigured,
  loginWithPassword,
  requestLoginCode,
  restoreSession,
  setupPassword,
  verifyLoginCode,
} from '@/lib/api'
import { assetUrl } from '@/lib/assets'

type Step = 'email' | 'password' | 'code' | 'setup'

export default function LoginPage() {
  const router = useRouter()
  const redirect = '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<Step>('email')
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const codeInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    let active = true
    restoreSession()
      .then(() => active && router.replace(redirect))
      .catch(() => active && setChecking(false))
    return () => {
      active = false
    }
  }, [redirect, router])
  useEffect(() => {
    if (step === 'code') codeInput.current?.focus()
  }, [step])
  useEffect(() => {
    if (!cooldown) return
    const timer = window.setInterval(() => setCooldown((v) => Math.max(0, v - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])
  const fail = (message: string) => {
    setError(message)
    setBusy(false)
  }
  async function sendCode() {
    if (busy || cooldown) return
    setBusy(true)
    setError('')
    try {
      const value = email.trim()
      await requestLoginCode(value)
      setEmail(value)
      setCode('')
      setStep('code')
      setCooldown(60)
    } catch {
      fail('暂时无法发送验证码，请检查网络后重试。')
    } finally {
      setBusy(false)
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (step === 'email') {
        setStep('password')
        setBusy(false)
        return
      }
      if (step === 'password') {
        await loginWithPassword(email.trim(), password)
        router.replace(redirect)
        return
      }
      if (step === 'code') {
        await verifyLoginCode(email, code)
        setPassword('')
        setStep('setup')
        setBusy(false)
        return
      }
      await setupPassword(password)
      router.replace(redirect)
    } catch (e) {
      const message = e instanceof Error ? e.message : ''
      fail(
        message === 'invalid_password'
          ? '密码至少 8 位，且必须包含字母和数字。'
          : step === 'password'
            ? '邮箱或密码错误，请重试。'
            : step === 'code'
              ? '验证码错误、已过期或尝试次数过多，请重新获取。'
              : '设置密码失败，请重试。',
      )
    }
  }
  if (!isApiConfigured)
    return (
      <main className="login-page">
        <div className="login-card">
          <p className="login-eyebrow">LOCAL MODE</p>
          <h1 id="login-title">登录服务暂未开放</h1>
          <p className="login-copy">内容会保存在当前浏览器。</p>
        </div>
      </main>
    )
  return (
    <main className="login-page">
      <header className="login-header">
        <Link className="login-brand" href="/" aria-label="返回首页">
          <img src={assetUrl('/brand/euno/euno-horizontal-white.svg')} alt="Euno" />
        </Link>
        <Link className="login-back" href="/">
          返回导航
        </Link>
      </header>
      <section className="login-stage" aria-labelledby="login-title">
        <div className={`login-orbit${step !== 'email' ? ' is-connected' : ''}`} aria-hidden="true">
          <span className="login-orbit-line" />
          <span className="login-orbit-node" />
        </div>
        {checking ? (
          <div className="login-card login-checking">
            <span className="login-spinner" />
            <h1 id="login-title">正在连接你的轨道</h1>
          </div>
        ) : (
          <form className="login-card login-code-card" onSubmit={submit} aria-busy={busy}>
            <p className="login-eyebrow">CLOUD PASS</p>
            <h1 id="login-title">
              {step === 'email'
                ? '连接你的轨道'
                : step === 'password'
                  ? '输入密码登录'
                  : step === 'code'
                    ? '输入邮件里的验证码'
                    : '设置登录密码'}
            </h1>
            <p className="login-copy">
              {step === 'email' ? (
                '输入受邀邮箱，选择登录方式。'
              ) : step === 'password' ? (
                <>
                  账号：<strong>{email}</strong>
                </>
              ) : step === 'code' ? (
                <>
                  验证码已发送至 <strong>{email}</strong>。
                </>
              ) : (
                '验证码登录成功，请设置一个以后可以使用的密码。'
              )}
            </p>
            {step === 'email' && (
              <label className="login-field">
                <span>邮箱地址</span>
                <input
                  autoFocus
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </label>
            )}
            {(step === 'password' || step === 'setup') && (
              <label className="login-field">
                <span>密码</span>
                <input
                  autoFocus
                  required
                  type="password"
                  autoComplete={step === 'setup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 8 位，含字母和数字"
                />
              </label>
            )}
            {step === 'code' && (
              <label className="login-field login-code-field">
                <span>6 位验证码</span>
                <input
                  ref={codeInput}
                  required
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                />
              </label>
            )}
            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="login-submit"
              disabled={busy || (step === 'code' && code.length !== 6)}
            >
              {busy
                ? '处理中…'
                : step === 'email'
                  ? '继续 →'
                  : step === 'password'
                    ? '密码登录 →'
                    : step === 'code'
                      ? '验证并设置密码 →'
                      : '保存密码并登录 →'}
            </button>
            <div className="login-code-actions">
              {step !== 'email' && (
                <button
                  type="button"
                  className="login-text-button"
                  onClick={() => {
                    setStep('email')
                    setPassword('')
                    setCode('')
                    setError('')
                  }}
                >
                  更换邮箱
                </button>
              )}
              {step === 'password' && (
                <>
                  <button
                    type="button"
                    className="login-text-button"
                    onClick={() => setStep('code')}
                  >
                    使用验证码登录
                  </button>
                  <button
                    type="button"
                    className="login-text-button"
                    onClick={() => setStep('code')}
                  >
                    忘记密码
                  </button>
                </>
              )}
              {step === 'code' && (
                <button
                  type="button"
                  className="login-text-button"
                  disabled={busy || !!cooldown}
                  onClick={() => void sendCode()}
                >
                  {cooldown ? `${cooldown} 秒后可重发` : '重新发送验证码'}
                </button>
              )}
            </div>
          </form>
        )}
      </section>
      <p className="login-local-note">
        <span />
        不登录也可以继续使用，本地内容会保留在当前浏览器
      </p>
    </main>
  )
}
