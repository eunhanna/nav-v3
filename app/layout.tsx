import './globals.css'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Euno · Personal Navigator',
  description: 'Euno 的可自定义个人导航起始页',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
