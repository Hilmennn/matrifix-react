import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const LARAVEL_TARGET = 'http://127.0.0.1:8000'

function createLaravelProxy(extra = {}) {
  return {
    target: LARAVEL_TARGET,
    changeOrigin: true,
    cookieDomainRewrite: 'localhost',
    cookiePathRewrite: '/',
    ...extra
  }
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        ...createLaravelProxy()
      },
      '/sanctum': {
        ...createLaravelProxy()
      },
      '/__laravel-login': {
        ...createLaravelProxy(),
        rewrite: (path) => path.replace(/^\/__laravel-login/, '/login')
      },
      '/__laravel-logout': {
        ...createLaravelProxy(),
        rewrite: (path) => path.replace(/^\/__laravel-logout/, '/logout')
      },
      '/__laravel-sanctum': {
        ...createLaravelProxy(),
        rewrite: (path) => path.replace(/^\/__laravel-sanctum/, '/sanctum/csrf-cookie')
      },
      '/revisi': {
        ...createLaravelProxy()
      },
      '/__laravel-inputpermintaan': {
        ...createLaravelProxy(),
        rewrite: (path) => path.replace(/^\/__laravel-inputpermintaan/, '/inputpermintaan')
      },
      '/__laravel-inputpermintaan-php': {
        ...createLaravelProxy(),
        rewrite: (path) => path.replace(/^\/__laravel-inputpermintaan-php/, '/inputpermintaan.php')
      },
      '/detailpermintaan.php': {
        ...createLaravelProxy()
      },
      '/detail_permintaan.php': {
        ...createLaravelProxy()
      },
      '/ubahpermintaan.php': {
        ...createLaravelProxy()
      },
      '/proses.php': {
        ...createLaravelProxy()
      },
      '/exportreport.php': {
        ...createLaravelProxy()
      },
      '/legacy-files': {
        ...createLaravelProxy()
      },
      '/delete_permintaan.php': {
        ...createLaravelProxy()
      }
    }
  },
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
        entryFileNames: 'assets/app-[hash].js',
        chunkFileNames: 'assets/chunk-[hash].js',
        assetFileNames: ({ name }) => {
          if (name && name.endsWith('.css')) {
            return 'assets/style-[hash][extname]'
          }
          return 'assets/asset-[hash][extname]'
        }
      }
    }
  }
})