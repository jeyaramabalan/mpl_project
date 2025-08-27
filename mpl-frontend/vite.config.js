// mpl-project/mpl-frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API requests
      '/api': {
        //target: 'http://localhost:5000', // Your backend API URL
        target: 'https://mpl.supersalessoft.com',
        changeOrigin: true,
      },
      // Proxy Socket.IO connections
      '/socket.io': {
        //target: 'http://localhost:5000', // Your backend Socket.IO URL
        target:'https://mpl.supersalessoft.com',
        ws: true, // IMPORTANT: Enable WebSocket proxying
        changeOrigin: true,
      },
    }
  }
})