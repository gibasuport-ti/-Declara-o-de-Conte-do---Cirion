import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Configuração correta para deploy na raiz do domínio no Netlify
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})