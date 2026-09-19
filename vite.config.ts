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
    alias: [
      {
        find: 'firebase/firestore',
        replacement: path.resolve(__dirname, './src/lib/firestoreMock.ts'),
        customResolver(updatedId, importer) {
          if (importer && (importer.includes('node_modules') || importer.includes('firestoreMock.ts'))) {
            return null; // Let Vite resolve to the real package normally
          }
          return path.resolve(__dirname, './src/lib/firestoreMock.ts');
        }
      },
      {
        find: '@firebase/firestore',
        replacement: path.resolve(__dirname, './src/lib/firestoreMock.ts'),
        customResolver(updatedId, importer) {
          if (importer && (importer.includes('node_modules') || importer.includes('firestoreMock.ts'))) {
            return null; // Let Vite resolve to the real package normally
          }
          return path.resolve(__dirname, './src/lib/firestoreMock.ts');
        }
      }
    ]
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: false,
  },
})
