'use client'

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { AlertDialog, Dialog, Drawer } from '@/components/ui/overlays'
import { AuthUser, getPublicSites, isApiConfigured, logout, restoreSession } from '@/lib/api'
import { assetUrl } from '@/lib/assets'
import { AppState, Site, ThemeId, defaultState, searchEngines, themes } from '@/lib/constants'
import { loadPublicSitesCache, loadState, savePublicSitesCache, saveState } from '@/lib/storage'

const wallpapers = [
  {
    name: 'Aurora Mint',
    background:
      'radial-gradient(circle at 78% 18%,rgba(98,230,183,.2),transparent 30%),radial-gradient(circle at 15% 82%,rgba(57,104,147,.2),transparent 32%)',
  },
  {
    name: 'Aurora Ocean',
    background:
      'radial-gradient(circle at 70% 20%,rgba(42,112,170,.3),transparent 35%),radial-gradient(circle at 20% 80%,rgba(32,76,101,.28),transparent 34%)',
  },
  {
    name: 'Aurora Amber',
    background:
      'radial-gradient(circle at 78% 24%,rgba(209,104,66,.24),transparent 34%),radial-gradient(circle at 18% 78%,rgba(110,52,90,.24),transparent 35%)',
  },
  { name: '纯色', background: 'linear-gradient(transparent,transparent)' },
]

function domain(url: string) {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}
function favicon(url: string) {
  return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`
}
function siteIconSources(url: string, iconUrl?: string) {
  const host = domain(url)
  return [iconUrl, `https://logo.clearbit.com/${encodeURIComponent(host)}`, favicon(url)].filter(
    (source): source is string => Boolean(source),
  )
}

function compactDate(date: Date) {
  const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date)
  return `${date.getMonth() + 1}月${date.getDate()}日 · ${weekday}`
}

type ResetTarget = 'settings' | 'sites'

function Favicon({
  url,
  fallback,
  className = '',
  variant = 'default',
  iconUrl,
}: {
  url: string
  fallback: string
  className?: string
  variant?: 'default' | 'site'
  iconUrl?: string
}) {
  const sources = variant === 'site' ? siteIconSources(url, iconUrl) : [favicon(url)]
  const [sourceIndex, setSourceIndex] = useState(0)
  const failed = sourceIndex >= sources.length
  if (failed) return <span className={`${className} favicon-fallback`}>{fallback}</span>
  return (
    <img
      className={className}
      src={sources[sourceIndex]}
      alt=""
      onError={() => setSourceIndex((index) => index + 1)}
    />
  )
}

function SortableSite({
  site,
  editing,
  onDelete,
  suppressNavigation,
}: {
  site: Site
  editing: boolean
  onDelete: (site: Site) => void
  suppressNavigation: (id: number) => boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: site.id,
  })

  return (
    <article
      ref={setNodeRef}
      className={`site-card site-card-sortable${isDragging ? ' is-dragging' : ''}`}
      style={
        {
          '--site-color': site.color,
          transform: CSS.Transform.toString(transform),
          transition,
        } as React.CSSProperties
      }
      {...attributes}
      {...listeners}
    >
      <a
        href={site.url}
        title={`打开 ${site.name}`}
        draggable={false}
        onClickCapture={(event) => {
          if (!suppressNavigation(site.id)) return
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        <span className="site-icon">
          <Favicon variant="site" url={site.url} iconUrl={site.iconUrl} fallback={site.icon} />
        </span>
        <strong>{site.name}</strong>
        <small>{domain(site.url)}</small>
      </a>
      {editing && (
        <button
          className="site-delete"
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onClick={() => onDelete(site)}
          aria-label={`删除 ${site.name}`}
        >
          ×
        </button>
      )}
    </article>
  )
}

export default function Home() {
  const [state, setState] = useState<AppState>(defaultState)
  const [mounted, setMounted] = useState(false)
  const [usingPublicSites] = useState(true)
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(new Date())
  const [panel, setPanel] = useState<'site' | 'category' | 'settings' | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [toast, setToast] = useState('')
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null)
  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const enginePickerRef = useRef<HTMLDetailsElement>(null)
  const tabsRef = useRef<HTMLElement>(null)
  const draggedSiteRef = useRef<number | null>(null)
  const dragClickResetRef = useRef<number | null>(null)
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0, ready: false })
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    setState(loadState())
    setMounted(true)
    const loadCachedPublicSites = () => {
      const cached = loadPublicSitesCache()
      if (cached) setState((current) => ({ ...current, sites: cached }))
    }
    if (!isApiConfigured) {
      loadCachedPublicSites()
      return
    }
    getPublicSites()
      .then((response) => {
        const sites = response.sites
          .filter((site) => site.enabled)
          .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
          .map((site, index) => ({
            id: Number.parseInt(site.id.replace(/\D/g, '').slice(-8) || String(index + 1), 10),
            name: site.name,
            url: site.url,
            category: site.category,
            color: site.fallbackColor ?? '#d8dee9',
            icon: site.fallbackIcon,
            iconUrl: site.iconUrl,
          }))
        setState((current) => ({ ...current, sites }))
        savePublicSitesCache(sites)
      })
      .catch(loadCachedPublicSites)
  }, [])
  useEffect(() => {
    restoreSession()
      .then((session) => {
        setUser(session.user)
        patch({ loggedIn: true })
      })
      .catch(() => {
        setUser(null)
        patch({ loggedIn: false })
      })
  }, [])
  useEffect(() => {
    if (mounted) saveState(state)
  }, [state, mounted])
  useEffect(
    () => () => {
      if (dragClickResetRef.current !== null) window.clearTimeout(dragClickResetRef.current)
    },
    [],
  )
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    const closeEnginePicker = (event: PointerEvent) => {
      const picker = enginePickerRef.current
      if (picker?.open && event.target instanceof Node && !picker.contains(event.target))
        picker.open = false
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && enginePickerRef.current?.open)
        enginePickerRef.current.open = false
    }
    document.addEventListener('pointerdown', closeEnginePicker)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeEnginePicker)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])
  useEffect(() => {
    document.documentElement.style.colorScheme =
      state.theme === 'light' ? 'light' : state.theme === 'dark' ? 'dark' : 'light dark'
    document.documentElement.dataset.theme = state.theme
  }, [state.theme])
  useLayoutEffect(() => {
    const tabs = tabsRef.current
    if (!tabs) return

    const updateIndicator = () => {
      const activeTab = tabs.querySelector<HTMLElement>('[aria-pressed="true"]')
      if (!activeTab) return
      const indicatorWidth = Math.min(44, activeTab.offsetWidth)
      setTabIndicator({
        left: activeTab.offsetLeft + (activeTab.offsetWidth - indicatorWidth) / 2,
        width: indicatorWidth,
        ready: true,
      })
    }

    updateIndicator()
    const observer = new ResizeObserver(updateIndicator)
    observer.observe(tabs)
    return () => observer.disconnect()
  }, [state.activeCategory, state.categories])

  const visibleSites = useMemo(
    () =>
      state.activeCategory === '全部'
        ? state.sites
        : state.sites.filter((site) => site.category === state.activeCategory),
    [state],
  )
  const engine = searchEngines.find((item) => item.name === state.engine) ?? searchEngines[0]
  const hour = now.getHours()
  const greeting =
    hour < 6
      ? '夜深了，快速找到你需要的。'
      : hour < 12
        ? '早上好，准备从哪里开始？'
        : hour < 18
          ? '下午好，继续今天的探索。'
          : '晚上好，收束一天的轨迹。'
  const period = hour < 6 ? 'NIGHT' : hour < 12 ? 'MORNING' : hour < 18 ? 'AFTERNOON' : 'EVENING'
  const time = `${String(hour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}${state.settings.seconds ? `:${String(now.getSeconds()).padStart(2, '0')}` : ''}`
  const dateLabel = compactDate(now)

  function patch(next: Partial<AppState>) {
    setState((current) => ({ ...current, ...next }))
  }
  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 1800)
  }
  function search(event: FormEvent) {
    event.preventDefault()
    const value = query.trim()
    if (!value) return
    const direct = /^(https?:\/\/|[\w-]+\.[a-z]{2,})/i.test(value)
    window.location.href = direct
      ? value.startsWith('http')
        ? value
        : `https://${value}`
      : engine.url + encodeURIComponent(value)
  }
  function addSite(site: Omit<Site, 'id' | 'icon'>) {
    patch({
      sites: [
        ...state.sites,
        { ...site, id: Date.now(), icon: site.name.slice(0, 1).toUpperCase() },
      ],
    })
    setPanel(null)
    notify('网站已添加')
  }
  function deleteSite(id: number) {
    patch({ sites: state.sites.filter((item) => item.id !== id) })
    setSiteToDelete(null)
    notify('网站已删除')
  }
  function reorderSites({ active, over }: DragEndEvent) {
    if (dragClickResetRef.current !== null) window.clearTimeout(dragClickResetRef.current)
    dragClickResetRef.current = window.setTimeout(() => {
      draggedSiteRef.current = null
      dragClickResetRef.current = null
    }, 250)
    if (!over || active.id === over.id) return

    setState((current) => {
      const visible =
        current.activeCategory === '全部'
          ? current.sites
          : current.sites.filter((site) => site.category === current.activeCategory)
      const oldIndex = visible.findIndex((site) => site.id === active.id)
      const newIndex = visible.findIndex((site) => site.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return current

      const reorderedVisible = arrayMove(visible, oldIndex, newIndex)
      if (current.activeCategory === '全部') return { ...current, sites: reorderedVisible }

      let visibleIndex = 0
      const sites = current.sites.map((site) =>
        site.category === current.activeCategory ? reorderedVisible[visibleIndex++] : site,
      )
      return { ...current, sites }
    })
  }
  function suppressDraggedSiteNavigation(id: number) {
    if (draggedSiteRef.current !== id) return false
    draggedSiteRef.current = null
    if (dragClickResetRef.current !== null) window.clearTimeout(dragClickResetRef.current)
    dragClickResetRef.current = null
    return true
  }

  const sortableAnnouncements = {
    onDragStart({ active }: { active: { id: string | number } }) {
      const index = visibleSites.findIndex((site) => site.id === active.id)
      return `已拾取 ${visibleSites[index]?.name ?? '网站'}，当前位置 ${index + 1}，共 ${visibleSites.length} 项。`
    },
    onDragOver({ over }: { over?: { id: string | number } | null }) {
      if (!over) return '当前不在可放置区域。'
      const index = visibleSites.findIndex((site) => site.id === over.id)
      return `已移动到第 ${index + 1} 位。`
    },
    onDragEnd({ over }: { over?: { id: string | number } | null }) {
      if (!over) return '排序已取消。'
      const index = visibleSites.findIndex((site) => site.id === over.id)
      return `已放置在第 ${index + 1} 位。`
    },
    onDragCancel() {
      return '排序已取消。'
    },
  }

  return (
    <div
      className="nova-app layout-reference"
      data-theme={state.theme}
      data-wallpaper={state.wallpaper}
      style={
        {
          '--wallpaper': wallpapers[state.wallpaper]?.background ?? wallpapers[3].background,
        } as React.CSSProperties
      }
    >
      <header className="topbar">
        <div className="brand" aria-label="Euno">
          <span className="brand-logo-frame" aria-hidden="true">
            <img
              className="brand-logo"
              src={assetUrl('/brand/euno/euno-horizontal-white.svg')}
              alt=""
            />
          </span>
        </div>
        <div className="top-actions">
          <button
            className="account-pill"
            onClick={() => setPanel('settings')}
            aria-label="打开个性化与账户设置"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56v.08h-3v-.08a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.56-1.03h-.08v-3h.08A1.7 1.7 0 0 0 7 9.94a1.7 1.7 0 0 0-.34-1.88L6.6 8l2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56v-.08h3v.08a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 8l-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.08v3h-.08A1.7 1.7 0 0 0 19.4 15Z" />
            </svg>
            <span className="account-pill-divider" aria-hidden="true" />
            <span className="account-pill-avatar" aria-hidden="true">
              {user?.email.slice(0, 1).toUpperCase() ?? '游'}
            </span>
          </button>
        </div>
      </header>
      <main>
        <h1 className="sr-only">Euno 个人导航</h1>
        <section className="hero">
          <time className="clock" dateTime={now.toISOString()}>
            {time.split(':').map((part, index) => (
              <span key={index}>
                {index > 0 && <i>:</i>}
                {part}
              </span>
            ))}
          </time>
          <p className="reference-date">{dateLabel}</p>
          {state.settings.greeting && (
            <div className="greeting">
              <p>NOW · {period}</p>
              <h1>{greeting}</h1>
              <span>
                {new Intl.DateTimeFormat('zh-CN', {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                }).format(now)}
              </span>
            </div>
          )}
        </section>
        <form className="search-rail" role="search" onSubmit={search}>
          <span className="rail-line" />
          <span className="rail-node" />
          <div ref={searchBoxRef} className="search-box">
            <details ref={enginePickerRef} className="engine-picker">
              <summary aria-label={`当前搜索引擎：${engine.name}`}>
                <Favicon className="engine-logo" url={engine.url} fallback={engine.mark} />
                <svg className="engine-chevron" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m7 10 5 5 5-5" />
                </svg>
              </summary>
              <div className="engine-menu">
                {searchEngines.map((item) => (
                  <button
                    type="button"
                    key={item.name}
                    onClick={(event) => {
                      patch({ engine: item.name })
                      event.currentTarget.closest('details')?.removeAttribute('open')
                    }}
                  >
                    <Favicon className="engine-logo" url={item.url} fallback={item.mark} />
                    {item.name}
                  </button>
                ))}
              </div>
            </details>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索，或直接输入网址"
              aria-label="搜索内容或网址"
              autoComplete="off"
            />
            <button className="search-submit" aria-label="开始搜索">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
            </button>
          </div>
        </form>
        <section className="workspace" aria-labelledby="orbit-title">
          <div className="section-head">
            <div>
              <h2 id="orbit-title">你的轨道</h2>
              <p>{state.sites.length} 个停靠点 · 公共入口由后台管理</p>
            </div>
            {state.settings.editing && !usingPublicSites && (
              <div>
                <button className="quiet" onClick={() => setPanel('category')}>
                  新建分类
                </button>
                <button className="primary" onClick={() => setPanel('site')}>
                  ＋ 添加网站
                </button>
              </div>
            )}
          </div>
          <nav ref={tabsRef} className="tabs" aria-label="筛选网站分类">
            {['全部', ...state.categories].map((category) => (
              <button
                type="button"
                key={category}
                className={state.activeCategory === category ? 'active' : ''}
                aria-pressed={state.activeCategory === category}
                onClick={() => patch({ activeCategory: category })}
              >
                {category}
              </button>
            ))}
            <span
              className={`tab-indicator${tabIndicator.ready ? ' ready' : ''}`}
              aria-hidden="true"
              style={{ width: tabIndicator.width, transform: `translateX(${tabIndicator.left}px)` }}
            />
          </nav>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => {
              draggedSiteRef.current = Number(active.id)
            }}
            onDragEnd={reorderSites}
            onDragCancel={() => {
              draggedSiteRef.current = null
              if (dragClickResetRef.current !== null) window.clearTimeout(dragClickResetRef.current)
              dragClickResetRef.current = null
            }}
            accessibility={{
              announcements: sortableAnnouncements,
              screenReaderInstructions: {
                draggable:
                  '按空格键拾取网站，使用方向键调整位置，再按空格键放下；按 Escape 键取消。',
              },
            }}
          >
            <SortableContext
              items={visibleSites.map((site) => site.id)}
              strategy={rectSortingStrategy}
            >
              <div className="site-grid">
                {visibleSites.length ? (
                  visibleSites.map((site) => (
                    <SortableSite
                      key={site.id}
                      site={site}
                      editing={state.settings.editing}
                      onDelete={setSiteToDelete}
                      suppressNavigation={suppressDraggedSiteNavigation}
                    />
                  ))
                ) : (
                  <div className="empty">这条轨道还没有停靠点。选择“添加网站”开始。</div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </section>
      </main>
      <SiteDialog
        open={panel === 'site'}
        categories={state.categories}
        onOpenChange={(open) => {
          if (!open) setPanel(null)
        }}
        onAdd={addSite}
      />
      <CategoryDialog
        open={panel === 'category'}
        onOpenChange={(open) => {
          if (!open) setPanel(null)
        }}
        onAdd={(name) => {
          if (!state.categories.includes(name))
            patch({ categories: [...state.categories, name], activeCategory: name })
          setPanel(null)
          notify('分类已创建')
        }}
      />
      <Settings
        open={panel === 'settings'}
        state={state}
        user={user}
        patch={patch}
        onOpenChange={(open) => {
          if (!open) setPanel(null)
        }}
        onLogout={async () => {
          await logout()
          setUser(null)
          patch({ loggedIn: false })
          notify('已退出登录')
        }}
        requestReset={(target) => setResetTarget(target)}
        notify={notify}
      />
      <AlertDialog
        open={siteToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setSiteToDelete(null)
        }}
        title="删除网站？"
        description={siteToDelete ? `“${siteToDelete.name}”将从你的轨道中移除。` : ''}
        confirmLabel="删除网站"
        onConfirm={() => {
          if (siteToDelete) deleteSite(siteToDelete.id)
        }}
      />
      <AlertDialog
        open={resetTarget !== null}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null)
        }}
        title={resetTarget === 'sites' ? '重置网站入口？' : '重置设置？'}
        description={
          resetTarget === 'sites'
            ? '网站、分类和排序将恢复为默认内容，主题与界面设置不会改变。'
            : '搜索引擎、主题、壁纸和界面开关将恢复为默认设置，网站入口不会改变。'
        }
        confirmLabel="确认重置"
        onConfirm={() => {
          if (resetTarget === 'sites')
            setState((current) => ({
              ...current,
              activeCategory: defaultState.activeCategory,
              categories: structuredClone(defaultState.categories),
              sites: structuredClone(defaultState.sites),
            }))
          if (resetTarget === 'settings')
            setState((current) => ({
              ...current,
              engine: defaultState.engine,
              theme: defaultState.theme,
              wallpaper: defaultState.wallpaper,
              settings: structuredClone(defaultState.settings),
            }))
          setResetTarget(null)
          notify(resetTarget === 'sites' ? '网站入口已重置' : '设置已重置')
        }}
      />
      <div className={`toast ${toast ? 'show' : ''}`} role="status">
        {toast}
      </div>
    </div>
  )
}

function SiteDialog({
  open,
  categories,
  onOpenChange,
  onAdd,
}: {
  open: boolean
  categories: string[]
  onOpenChange: (open: boolean) => void
  onAdd: (site: Omit<Site, 'id' | 'icon'>) => void
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState(categories[0])
  const [color, setColor] = useState('#62e6b7')
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="NEW STOP"
      title="添加网站"
      description="填写网站信息并添加到你的轨道。"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const normalized = url.startsWith('http') ? url : `https://${url}`
          onAdd({ name: name.trim(), url: normalized, category, color })
        }}
      >
        <label>
          网站名称
          <input
            autoFocus
            required
            maxLength={20}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：少数派"
          />
        </label>
        <label>
          网址
          <input
            required
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://sspai.com"
          />
        </label>
        <label>
          所属分类
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          标识颜色
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="quiet" onClick={() => onOpenChange(false)}>
            取消
          </button>
          <button className="primary">添加到轨道</button>
        </div>
      </form>
    </Dialog>
  )
}

function CategoryDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (name: string) => void
}) {
  const [name, setName] = useState('')
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="NEW ORBIT"
      title="新建分类"
      description="创建一个用于整理网站的新分类。"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onAdd(name.trim())
        }}
      >
        <label>
          分类名称
          <input
            autoFocus
            required
            maxLength={10}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：灵感"
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="quiet" onClick={() => onOpenChange(false)}>
            取消
          </button>
          <button className="primary">创建分类</button>
        </div>
      </form>
    </Dialog>
  )
}

function Settings({
  open,
  state,
  user,
  patch,
  onOpenChange,
  onLogout,
  requestReset,
  notify,
}: {
  open: boolean
  state: AppState
  user: AuthUser | null
  patch: (next: Partial<AppState>) => void
  onOpenChange: (open: boolean) => void
  onLogout: () => Promise<void>
  requestReset: (target: ResetTarget) => void
  notify: (text: string) => void
}) {
  type SettingsSection = 'account' | 'appearance' | 'interface' | 'reset'
  const settingsSections: Array<{ id: SettingsSection; label: string }> = [
    { id: 'account', label: '账户' },
    { id: 'appearance', label: '外观' },
    { id: 'interface', label: '界面' },
    { id: 'reset', label: '恢复默认设置' },
  ]
  const [activeSection, setActiveSection] = useState<SettingsSection>('account')
  const settingsTabRefs = useRef<Array<HTMLButtonElement | null>>([])
  useEffect(() => {
    if (open) setActiveSection('account')
  }, [open])

  const chooseTheme = (theme: ThemeId) => {
    patch({ theme })
    notify(`已切换为${themes.find((item) => item.id === theme)?.name}`)
  }
  function selectSettingsSection(index: number, focus = false) {
    const nextIndex = (index + settingsSections.length) % settingsSections.length
    setActiveSection(settingsSections[nextIndex].id)
    if (focus) settingsTabRefs.current[nextIndex]?.focus()
  }
  function handleSettingsTabKey(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      selectSettingsSection(index + 1, true)
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      selectSettingsSection(index - 1, true)
    }
    if (event.key === 'Home') {
      event.preventDefault()
      selectSettingsSection(0, true)
    }
    if (event.key === 'End') {
      event.preventDefault()
      selectSettingsSection(settingsSections.length - 1, true)
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      eyebrow=""
      title="Settings"
      description="管理账户、主题、壁纸与界面设置。"
      className="settings-drawer"
    >
      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="settings-tabs" role="tablist" aria-label="设置分类">
            {settingsSections.map((section, index) => (
              <button
                ref={(node) => {
                  settingsTabRefs.current[index] = node
                }}
                type="button"
                role="tab"
                id={`settings-tab-${section.id}`}
                aria-selected={activeSection === section.id}
                aria-controls={`settings-panel-${section.id}`}
                tabIndex={activeSection === section.id ? 0 : -1}
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                onKeyDown={(event) => handleSettingsTabKey(event, index)}
              >
                {section.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="settings-content">
          <div
            className="settings-panel"
            role="tabpanel"
            tabIndex={0}
            id={`settings-panel-${activeSection}`}
            aria-labelledby={`settings-tab-${activeSection}`}
          >
            {activeSection === 'account' && (
              <section className="settings-panel-section">
                <h3>账户与同步</h3>
                <p className="settings-panel-intro">管理当前设备上的账户连接与同步状态。</p>
                <div className="profile-row">
                  <span className="avatar">{user?.email.slice(0, 1).toUpperCase() ?? '游'}</span>
                  <div>
                    <strong>{user?.email ?? '访客模式'}</strong>
                    <small>
                      {user
                        ? '账户已连接，云同步将在下一阶段启用'
                        : isApiConfigured
                          ? '自定义内容仅保存在当前浏览器'
                          : '登录服务暂未开放，内容保存在当前浏览器'}
                    </small>
                  </div>
                  {user ? (
                    <button className="quiet" onClick={() => void onLogout()}>
                      退出
                    </button>
                  ) : isApiConfigured ? (
                    <Link className="quiet profile-login-link" href="/login">
                      登录
                    </Link>
                  ) : null}
                </div>
              </section>
            )}
            {activeSection === 'appearance' && (
              <div className="settings-panel-stack">
                <section className="settings-panel-section">
                  <h3>配色主题</h3>
                  <p className="settings-panel-intro">选择适合当前环境的界面配色。</p>
                  <div className="theme-list">
                    {themes.map((theme) => (
                      <button
                        key={theme.id}
                        className={state.theme === theme.id ? 'active' : ''}
                        aria-pressed={state.theme === theme.id}
                        onClick={() => chooseTheme(theme.id)}
                      >
                        <i
                          style={{
                            background: `linear-gradient(135deg,${theme.background} 0 68%,${theme.accent} 68%)`,
                          }}
                        />
                        <span>{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="settings-panel-section">
                  <h3>壁纸氛围</h3>
                  <p className="settings-panel-intro">
                    选择一组 Animated Aurora Gradient Wave 背景。
                  </p>
                  <div className="wall-list">
                    {wallpapers.map((wallpaper, index) => (
                      <button
                        key={index}
                        className={`wallpaper-option wallpaper-option-${index}${state.wallpaper === index ? ' active' : ''}`}
                        aria-label={`使用壁纸 ${wallpaper.name}`}
                        aria-pressed={state.wallpaper === index}
                        style={
                          { '--wallpaper-preview': wallpaper.background } as React.CSSProperties
                        }
                        onClick={() => patch({ wallpaper: index })}
                      >
                        <span>{wallpaper.name}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}
            {activeSection === 'interface' && (
              <section className="settings-panel-section">
                <h3>界面显示</h3>
                <p className="settings-panel-intro">控制首页中辅助信息与编辑操作的显示。</p>
                <div className="settings-switches">
                  <Switch
                    label="编辑轨道"
                    hint="公共网站入口由后台管理"
                    checked={state.settings.editing}
                    onClick={() =>
                      patch({ settings: { ...state.settings, editing: !state.settings.editing } })
                    }
                  />
                  <Switch
                    label="显示秒数"
                    hint="在时间旁显示秒钟"
                    checked={state.settings.seconds}
                    onClick={() =>
                      patch({ settings: { ...state.settings, seconds: !state.settings.seconds } })
                    }
                  />
                  <Switch
                    label="显示问候"
                    hint="根据时间更新首页问候"
                    checked={state.settings.greeting}
                    onClick={() =>
                      patch({ settings: { ...state.settings, greeting: !state.settings.greeting } })
                    }
                  />
                </div>
              </section>
            )}
            {activeSection === 'reset' && (
              <section className="settings-panel-section">
                <h3>恢复默认设置</h3>
                <p className="settings-panel-intro">选择要恢复的内容，两个入口互不影响。</p>
                <div className="reset-options">
                  <button type="button" onClick={() => requestReset('settings')}>
                    <strong>重置设置</strong>
                    <span>恢复搜索引擎、主题、壁纸和界面开关</span>
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  )
}

function Switch({
  label,
  hint,
  checked,
  onClick,
}: {
  label: string
  hint: string
  checked: boolean
  onClick: () => void
}) {
  return (
    <div className="setting-row">
      <span>
        {label}
        <small>{hint}</small>
      </span>
      <button
        className="switch"
        role="switch"
        aria-checked={checked}
        onClick={onClick}
        aria-label={label}
      />
    </div>
  )
}
