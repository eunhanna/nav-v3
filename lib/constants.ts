export type ThemeId = 'light' | 'dark' | 'system'

export interface Site {
  id: number
  name: string
  url: string
  category: string
  color: string
  icon: string
  iconUrl?: string
}
export interface AppState {
  engine: string
  activeCategory: string
  loggedIn: boolean
  theme: ThemeId
  wallpaper: number
  settings: {
    seconds: boolean
    lunarDate: boolean
    greeting: boolean
    editing: boolean
    compactMode: boolean
  }
  categories: string[]
  sites: Site[]
}
export interface SearchEngine {
  name: string
  mark: string
  url: string
}
export interface ThemeOption {
  id: ThemeId
  name: string
  background: string
  accent: string
}

export const APP_STORAGE_KEY = 'nova-app-v3'
export const searchEngines: SearchEngine[] = [
  { name: '百度', mark: '百', url: 'https://www.baidu.com/s?wd=' },
  { name: 'Bing', mark: 'B', url: 'https://www.bing.com/search?q=' },
  { name: 'Google', mark: 'G', url: 'https://www.google.com/search?q=' },
  { name: 'DuckDuckGo', mark: 'D', url: 'https://duckduckgo.com/?q=' },
]
export const themes: ThemeOption[] = [
  { id: 'light', name: '明亮', background: '#f3f1ea', accent: '#157a58' },
  { id: 'dark', name: '暗色', background: '#070a0d', accent: '#62e6b7' },
  {
    id: 'system',
    name: '跟随系统',
    background: 'linear-gradient(135deg,#070a0d 0 50%,#f3f1ea 50%)',
    accent: '#62e6b7',
  },
]
export const defaultState: AppState = {
  engine: '百度',
  activeCategory: '全部',
  loggedIn: false,
  theme: 'system',
  wallpaper: 0,
  settings: {
    seconds: false,
    lunarDate: false,
    greeting: true,
    editing: false,
    compactMode: false,
  },
  categories: ['常用', '工作', '创作', '生活'],
  // 公共入口由 API 获取，不能作为离线或首次加载的内置回退数据。
  sites: [],
  /*
    {
      id: 1,
      name: '哔哩哔哩',
      url: 'https://bilibili.com',
      category: '常用',
      color: '#69c9d0',
      icon: 'B',
    },
    {
      id: 2,
      name: 'GitHub',
      url: 'https://github.com',
      category: '工作',
      color: '#d8dee9',
      icon: 'G',
    },
    {
      id: 3,
      name: 'Notion',
      url: 'https://notion.so',
      category: '工作',
      color: '#f0f0f0',
      icon: 'N',
    },
    {
      id: 4,
      name: 'Figma',
      url: 'https://figma.com',
      category: '创作',
      color: '#a983ff',
      icon: 'F',
    },
    {
      id: 5,
      name: '少数派',
      url: 'https://sspai.com',
      category: '创作',
      color: '#ff5964',
      icon: '少',
    },
    {
      id: 6,
      name: '知乎',
      url: 'https://zhihu.com',
      category: '常用',
      color: '#5d9eff',
      icon: '知',
    },
    {
      id: 7,
      name: '豆瓣',
      url: 'https://douban.com',
      category: '生活',
      color: '#6cbd76',
      icon: '豆',
    },
    {
      id: 8,
      name: 'YouTube',
      url: 'https://youtube.com',
      category: '常用',
      color: '#ff4f55',
      icon: 'Y',
    },
    {
      id: 9,
      name: 'ChatGPT',
      url: 'https://chatgpt.com',
      category: '常用',
      color: '#74d6b0',
      icon: 'C',
    },
    {
      id: 10,
      name: 'Gmail',
      url: 'https://mail.google.com',
      category: '工作',
      color: '#f4b4aa',
      icon: 'G',
    },
    {
      id: 11,
      name: 'Vercel',
      url: 'https://vercel.com',
      category: '工作',
      color: '#e9edf2',
      icon: 'V',
    },
    {
      id: 12,
      name: 'Linear',
      url: 'https://linear.app',
      category: '工作',
      color: '#9fa8ff',
      icon: 'L',
    },
    {
      id: 13,
      name: 'Dribbble',
      url: 'https://dribbble.com',
      category: '创作',
      color: '#f48cba',
      icon: 'D',
    },
    {
      id: 14,
      name: 'Unsplash',
      url: 'https://unsplash.com',
      category: '创作',
      color: '#e9edf2',
      icon: 'U',
    },
    {
      id: 15,
      name: 'Pinterest',
      url: 'https://pinterest.com',
      category: '创作',
      color: '#f36b72',
      icon: 'P',
    },
    {
      id: 16,
      name: 'Spotify',
      url: 'https://spotify.com',
      category: '生活',
      color: '#65d68a',
      icon: 'S',
    },
    {
      id: 17,
      name: '小红书',
      url: 'https://xiaohongshu.com',
      category: '生活',
      color: '#ff6f77',
      icon: '红',
    },
    {
      id: 18,
      name: '网易云音乐',
      url: 'https://music.163.com',
      category: '生活',
      color: '#f2656d',
      icon: '云',
    },
  ],
  */
}
