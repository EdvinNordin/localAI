import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
//import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    host: true, // allow access via LAN IP (192.168.x.x)
    port: 5173,
    proxy: {
      '/ollama': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
        // **The Key Change:** Remove the Origin header from the request
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Remove the Origin header sent by the browser
            // This makes the request look like a simple server-to-server request
            proxyReq.removeHeader('Origin')

            // Optionally, you can also set the Host header to trick it further
            proxyReq.setHeader('Host', '127.0.0.1:11434')
          })
        },
      },
      '/langsearch': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
