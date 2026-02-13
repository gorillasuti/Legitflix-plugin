import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const jellyfinUrl = env.VITE_JELLYFIN_URL || 'http://localhost:8096'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "./src"),
      },
    },
    base: '/LegitFlix/Client/',
    build: {
      outDir: '../LegitFlix.Plugin/Assets/Client',
      emptyOutDir: true,
      assetsDir: '',
      rollupOptions: {
        output: {
          entryFileNames: 'app.js',
          assetFileNames: 'style.css',
        }
      }
    },
    optimizeDeps: {
      include: ['@vidstack/react', 'jassub', 'abslink', 'rvfc-polyfill', 'axios'],
    },
    worker: {
      format: 'es'
    },
    server: {
      proxy: {
        '/System': { target: jellyfinUrl, changeOrigin: true },
        '/Users': { target: jellyfinUrl, changeOrigin: true },
        '/Items': { target: jellyfinUrl, changeOrigin: true },
        '/Branding': { target: jellyfinUrl, changeOrigin: true },
        // Add more routes as needed
      },
      configureServer(server) {
        server.middlewares.use('/Plugins/LegitFlix/Configuration', (req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ primary: '#00a4dc', accent: '#ff0000' })) // Mock config
        })
      }
    }
  }
})
