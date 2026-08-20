import LoginPage from './LoginPage'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '登录 · Euno',
  description: '通过邮箱验证码连接你的 Euno 个人导航。',
}

export default function Page() {
  return <LoginPage />
}
