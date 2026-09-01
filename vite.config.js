import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/moneymoney/' // 這裡設定跟你的 GitHub 專案名稱一樣
})
