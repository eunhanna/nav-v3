import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EUNHANNA · Personal Navigator',
  description: 'EUNHANNA 的可自定义个人导航起始页',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
