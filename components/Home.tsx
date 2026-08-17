'use client'

import { FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AppState, Site, ThemeId, defaultState, searchEngines, themes } from '@/lib/constants'
import { loadState, saveState } from '@/lib/storage'
import { BackdropProfile, inspectSearchBackdrop } from '@/lib/search-backdrop'
import { AuthUser, isApiConfigured, logout, restoreSession } from '@/lib/api'
import { AlertDialog, Dialog, Drawer } from '@/components/ui/overlays'

const wallpapers = [
  'radial-gradient(circle at 78% 18%,rgba(98,230,183,.11),transparent 29%),radial-gradient(circle at 15% 82%,rgba(57,104,147,.12),transparent 31%)',
  'radial-gradient(circle at 70% 20%,rgba(42,112,170,.23),transparent 35%),radial-gradient(circle at 20% 80%,rgba(32,76,101,.22),transparent 34%)',
  'radial-gradient(circle at 78% 24%,rgba(209,104,66,.18),transparent 34%),radial-gradient(circle at 18% 78%,rgba(110,52,90,.18),transparent 35%)',
  'linear-gradient(transparent,transparent)',
]

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

function domain(url: string) { try { return new URL(url).hostname.replace('www.', '') } catch { return url } }
function favicon(url: string) { return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}` }

function compactDate(date: Date) {
  const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date)
  return `${date.getMonth() + 1}月${date.getDate()}日 · ${weekday}`
}

function Favicon({ url, fallback, className = '' }: { url: string; fallback: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className={`${className} favicon-fallback`}>{fallback}</span>
  return <img className={className} src={favicon(url)} alt="" onError={() => setFailed(true)} />
}

export default function Home() {
  const [state, setState] = useState<AppState>(defaultState)
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(new Date())
  const [panel, setPanel] = useState<'site' | 'category' | 'settings' | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [toast, setToast] = useState('')
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null)
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLElement>(null)
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0, ready: false })
  const [searchBackdrop, setSearchBackdrop] = useState<BackdropProfile>({ tone: 'dark', texture: 'calm' })

  useEffect(() => { setState(loadState()); setMounted(true) }, [])
  useEffect(() => {
    restoreSession().then(session => { setUser(session.user); patch({ loggedIn: true }) }).catch(() => { setUser(null); patch({ loggedIn: false }) })
  }, [])
  useEffect(() => { if (mounted) saveState(state) }, [state, mounted])
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    document.documentElement.style.colorScheme = state.theme === 'morning' ? 'light' : 'dark'
    document.documentElement.dataset.theme = state.theme
  }, [state.theme])
  useEffect(() => {
    const searchBox = searchBoxRef.current
    if (!searchBox) return

    let cancelled = false
    const inspect = () => {
      inspectSearchBackdrop(searchBox, wallpapers[state.wallpaper]).then(profile => {
        if (!cancelled) setSearchBackdrop(profile)
      })
    }
    inspect()
    const observer = new ResizeObserver(inspect)
    observer.observe(searchBox)
    window.addEventListener('resize', inspect)
    return () => {
      cancelled = true
      observer.disconnect()
      window.removeEventListener('resize', inspect)
    }
  }, [state.wallpaper])
  useLayoutEffect(() => {
    const tabs = tabsRef.current
    if (!tabs) return

    const updateIndicator = () => {
      const activeTab = tabs.querySelector<HTMLElement>('[aria-pressed="true"]')
      if (!activeTab) return
      setTabIndicator({ left: activeTab.offsetLeft, width: activeTab.offsetWidth, ready: true })
    }

    updateIndicator()
    const observer = new ResizeObserver(updateIndicator)
    observer.observe(tabs)
    return () => observer.disconnect()
  }, [state.activeCategory, state.categories])

  const visibleSites = useMemo(() => state.activeCategory === '全部' ? state.sites : state.sites.filter(site => site.category === state.activeCategory), [state])
  const engine = searchEngines.find(item => item.name === state.engine) ?? searchEngines[0]
  const hour = now.getHours()
  const greeting = hour < 6 ? '夜深了，快速找到你需要的。' : hour < 12 ? '早上好，准备从哪里开始？' : hour < 18 ? '下午好，继续今天的探索。' : '晚上好，收束一天的轨迹。'
  const period = hour < 6 ? 'NIGHT' : hour < 12 ? 'MORNING' : hour < 18 ? 'AFTERNOON' : 'EVENING'
  const time = `${String(hour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}${state.settings.seconds ? `:${String(now.getSeconds()).padStart(2, '0')}` : ''}`
  const dateLabel = compactDate(now)

  function patch(next: Partial<AppState>) { setState(current => ({ ...current, ...next })) }
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(''), 1800) }
  function search(event: FormEvent) {
    event.preventDefault(); const value = query.trim(); if (!value) return
    const direct = /^(https?:\/\/|[\w-]+\.[a-z]{2,})/i.test(value)
    window.location.href = direct ? (value.startsWith('http') ? value : `https://${value}`) : engine.url + encodeURIComponent(value)
  }
  function addSite(site: Omit<Site, 'id' | 'icon'>) {
    patch({ sites: [...state.sites, { ...site, id: Date.now(), icon: site.name.slice(0, 1).toUpperCase() }] }); setPanel(null); notify('网站已添加')
  }
  function deleteSite(id: number) {
    patch({ sites: state.sites.filter(item => item.id !== id) });
    setSiteToDelete(null)
    notify('网站已删除')
  }

  return <div className="nova-app layout-reference" data-theme={state.theme} style={{ '--wallpaper': wallpapers[state.wallpaper] } as React.CSSProperties}>
    <header className="topbar">
      <div className="brand" aria-label="EUNHANNA · Personal Navigator"><span className="brand-logo-frame" aria-hidden="true"><img className="brand-logo" src={`${basePath}/eunhanna-logo.png`} alt="" /></span></div>
      <div className="top-actions"><button className="account-pill" onClick={() => setPanel('settings')} aria-label="打开个性化与账户设置"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56v.08h-3v-.08a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.56-1.03h-.08v-3h.08A1.7 1.7 0 0 0 7 9.94a1.7 1.7 0 0 0-.34-1.88L6.6 8l2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56v-.08h3v.08a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 8l-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.08v3h-.08A1.7 1.7 0 0 0 19.4 15Z" /></svg><span className="account-pill-divider" aria-hidden="true" /><span className="account-pill-avatar" aria-hidden="true">{user?.email.slice(0, 1).toUpperCase() ?? '游'}</span></button></div>
    </header>
    <main>
      <h1 className="sr-only">EUNHANNA 个人导航</h1>
      <section className="hero">
        <time className="clock" dateTime={now.toISOString()}>{time.split(':').map((part, index) => <span key={index}>{index > 0 && <i>:</i>}{part}</span>)}</time>
        <p className="reference-date">{dateLabel}</p>
        {state.settings.greeting && <div className="greeting"><p>NOW · {period}</p><h1>{greeting}</h1><span>{new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now)}</span></div>}
      </section>
      <form className="search-rail" role="search" onSubmit={search}>
        <span className="rail-line" /><span className="rail-node" />
        <div ref={searchBoxRef} className="search-box" data-backdrop-tone={searchBackdrop.tone} data-backdrop-texture={searchBackdrop.texture}>
          <details className="engine-picker"><summary aria-label={`当前搜索引擎：${engine.name}`}><Favicon className="engine-logo" url={engine.url} fallback={engine.mark} /><svg className="engine-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg></summary><div className="engine-menu">{searchEngines.map(item => <button type="button" key={item.name} onClick={event => { patch({ engine: item.name }); event.currentTarget.closest('details')?.removeAttribute('open') }}><Favicon className="engine-logo" url={item.url} fallback={item.mark} />{item.name}</button>)}</div></details>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索，或直接输入网址" aria-label="搜索内容或网址" autoComplete="off" />
          <button className="search-submit" aria-label="开始搜索"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg></button>
        </div>
      </form>
      <section className="workspace" aria-labelledby="orbit-title">
        <div className="section-head"><div><h2 id="orbit-title">你的轨道</h2><p>{state.sites.length} 个停靠点 · 自定义内容自动保存</p></div>{state.settings.editing && <div><button className="quiet" onClick={() => setPanel('category')}>新建分类</button><button className="primary" onClick={() => setPanel('site')}>＋ 添加网站</button></div>}</div>
        <nav ref={tabsRef} className="tabs" aria-label="筛选网站分类">{['全部', ...state.categories].map(category => <button type="button" key={category} className={state.activeCategory === category ? 'active' : ''} aria-pressed={state.activeCategory === category} onClick={() => patch({ activeCategory: category })}>{category}</button>)}<span className={`tab-indicator${tabIndicator.ready ? ' ready' : ''}`} aria-hidden="true" style={{ width: tabIndicator.width, transform: `translateX(${tabIndicator.left}px)` }} /></nav>
        <div className="site-grid">{visibleSites.length ? visibleSites.map(site => <article className="site-card" key={site.id} style={{ '--site-color': site.color } as React.CSSProperties}><a href={site.url} title={`打开 ${site.name}`}><span className="site-icon"><Favicon url={site.url} fallback={site.icon} /></span><strong>{site.name}</strong><small>{domain(site.url)}</small></a>{state.settings.editing && <button className="site-delete" onClick={() => setSiteToDelete(site)} aria-label={`删除 ${site.name}`}>×</button>}</article>) : <div className="empty">这条轨道还没有停靠点。选择“添加网站”开始。</div>}</div>
      </section>
    </main>
    <SiteDialog open={panel === 'site'} categories={state.categories} onOpenChange={open => { if (!open) setPanel(null) }} onAdd={addSite} />
    <CategoryDialog open={panel === 'category'} onOpenChange={open => { if (!open) setPanel(null) }} onAdd={name => { if (!state.categories.includes(name)) patch({ categories: [...state.categories, name], activeCategory: name }); setPanel(null); notify('分类已创建') }} />
    <Settings open={panel === 'settings'} state={state} user={user} patch={patch} onOpenChange={open => { if (!open) setPanel(null) }} onLogout={async () => { await logout(); setUser(null); patch({ loggedIn: false }); notify('已退出登录') }} requestReset={() => setResetConfirmationOpen(true)} notify={notify} />
    <AlertDialog open={siteToDelete !== null} onOpenChange={open => { if (!open) setSiteToDelete(null) }} title="删除网站？" description={siteToDelete ? `“${siteToDelete.name}”将从你的轨道中移除。` : ''} confirmLabel="删除网站" onConfirm={() => { if (siteToDelete) deleteSite(siteToDelete.id) }} />
    <AlertDialog open={resetConfirmationOpen} onOpenChange={setResetConfirmationOpen} title="恢复默认内容？" description="你的自定义网站、分类和个性化设置将被默认内容替换。" confirmLabel="恢复默认" onConfirm={() => { setState(structuredClone(defaultState)); setResetConfirmationOpen(false); notify('已恢复默认内容') }} />
    <div className={`toast ${toast ? 'show' : ''}`} role="status">{toast}</div>
  </div>
}

function SiteDialog({ open, categories, onOpenChange, onAdd }: { open: boolean; categories: string[]; onOpenChange: (open: boolean) => void; onAdd: (site: Omit<Site, 'id' | 'icon'>) => void }) {
  const [name, setName] = useState(''); const [url, setUrl] = useState(''); const [category, setCategory] = useState(categories[0]); const [color, setColor] = useState('#62e6b7')
  return <Dialog open={open} onOpenChange={onOpenChange} eyebrow="NEW STOP" title="添加网站" description="填写网站信息并添加到你的轨道。"><form onSubmit={event => { event.preventDefault(); const normalized = url.startsWith('http') ? url : `https://${url}`; onAdd({ name: name.trim(), url: normalized, category, color }) }}><label>网站名称<input autoFocus required maxLength={20} value={name} onChange={event => setName(event.target.value)} placeholder="例如：少数派" /></label><label>网址<input required inputMode="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://sspai.com" /></label><label>所属分类<select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select></label><label>标识颜色<input type="color" value={color} onChange={event => setColor(event.target.value)} /></label><div className="modal-actions"><button type="button" className="quiet" onClick={() => onOpenChange(false)}>取消</button><button className="primary">添加到轨道</button></div></form></Dialog>
}

function CategoryDialog({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (open: boolean) => void; onAdd: (name: string) => void }) {
  const [name, setName] = useState('')
  return <Dialog open={open} onOpenChange={onOpenChange} eyebrow="NEW ORBIT" title="新建分类" description="创建一个用于整理网站的新分类。"><form onSubmit={event => { event.preventDefault(); onAdd(name.trim()) }}><label>分类名称<input autoFocus required maxLength={10} value={name} onChange={event => setName(event.target.value)} placeholder="例如：灵感" /></label><div className="modal-actions"><button type="button" className="quiet" onClick={() => onOpenChange(false)}>取消</button><button className="primary">创建分类</button></div></form></Dialog>
}

function Settings({ open, state, user, patch, onOpenChange, onLogout, requestReset, notify }: { open: boolean; state: AppState; user: AuthUser | null; patch: (next: Partial<AppState>) => void; onOpenChange: (open: boolean) => void; onLogout: () => Promise<void>; requestReset: () => void; notify: (text: string) => void }) {
  const chooseTheme = (theme: ThemeId) => { patch({ theme }); notify(`已切换为${themes.find(item => item.id === theme)?.name}`) }
  return <Drawer open={open} onOpenChange={onOpenChange} eyebrow="CONTROL" title="个性化" description="管理账户、主题、壁纸与界面设置。"><section><h3>账户与同步</h3><div className="profile-row"><span className="avatar">{user?.email.slice(0, 1).toUpperCase() ?? '游'}</span><div><strong>{user?.email ?? '访客模式'}</strong><small>{user ? '账户已连接，云同步将在下一阶段启用' : isApiConfigured ? '自定义内容仅保存在当前浏览器' : '登录服务暂未开放，内容保存在当前浏览器'}</small></div>{user ? <button className="quiet" onClick={() => void onLogout()}>退出</button> : isApiConfigured ? <Link className="quiet profile-login-link" href="/login">登录</Link> : null}</div></section><section><h3>配色主题</h3><div className="theme-list">{themes.map(theme => <button key={theme.id} className={state.theme === theme.id ? 'active' : ''} aria-pressed={state.theme === theme.id} onClick={() => chooseTheme(theme.id)}><i style={{ background: `linear-gradient(135deg,${theme.background} 0 68%,${theme.accent} 68%)` }} /><span>{theme.name}</span></button>)}</div></section><section><h3>壁纸氛围</h3><div className="wall-list">{wallpapers.map((wallpaper, index) => <button key={index} className={state.wallpaper === index ? 'active' : ''} aria-label={`使用壁纸 ${index + 1}`} aria-pressed={state.wallpaper === index} style={{ background: wallpaper }} onClick={() => patch({ wallpaper: index })} />)}</div></section><section><h3>界面</h3><Switch label="编辑轨道" hint="显示新增、分类与删除操作" checked={state.settings.editing} onClick={() => patch({ settings: { ...state.settings, editing: !state.settings.editing } })} /><Switch label="显示秒数" hint="在时间旁显示秒钟" checked={state.settings.seconds} onClick={() => patch({ settings: { ...state.settings, seconds: !state.settings.seconds } })} /><Switch label="显示问候" hint="根据时间更新首页问候" checked={state.settings.greeting} onClick={() => patch({ settings: { ...state.settings, greeting: !state.settings.greeting } })} /></section><section><button className="quiet danger" onClick={requestReset}>恢复默认内容</button></section></Drawer>
}

function Switch({ label, hint, checked, onClick }: { label: string; hint: string; checked: boolean; onClick: () => void }) { return <div className="setting-row"><span>{label}<small>{hint}</small></span><button className="switch" role="switch" aria-checked={checked} onClick={onClick} aria-label={label} /></div> }
