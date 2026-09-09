import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      'firebase/firestore': path.resolve(__dirname, './src/lib/firestoreMock.ts'),
      '@firebase/firestore': path.resolve(__dirname, './src/lib/firestoreMock.ts')
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
})
