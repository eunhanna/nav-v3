import type { Metadata } from 'next'
import LoginPage from './LoginPage'

export const metadata: Metadata = {
  title: '登录 · EUNHANNA',
	description: '通过邮箱验证码连接你的 EUNHANNA 个人导航。',
}

export default function Page() {
  return <LoginPage />
}
