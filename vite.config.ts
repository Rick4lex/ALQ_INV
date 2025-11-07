import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/ALQ_INV/',
  resolve: {
    alias: {
      '@automerge/automerge-repo': '/node_modules/@automerge/automerge-repo/dist/index.js',
      '@automerge/automerge-repo-storage-localforage': '/node_modules/@automerge/automerge-repo-storage-localforage/dist/index.js',
      '@automerge/automerge-repo-network-broadcastchannel': '/node_modules/@automerge/automerge-repo-network-broadcastchannel/dist/index.js'
    }
  }
})
