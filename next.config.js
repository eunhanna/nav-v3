/** @type {import('next').NextConfig} */
const basePath = process.env.PAGES_BASE_PATH ?? ''

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
}

module.exports = nextConfig
