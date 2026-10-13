import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 的網址是 https://<帳號>.github.io/anonymous-chat/
// 網頁放在 /anonymous-chat/ 這一層底下,所以 base 必須是這個路徑,否則上線後會整頁空白。
export default defineConfig({
  base: '/anonymous-chat/',
  plugins: [react()],
})
