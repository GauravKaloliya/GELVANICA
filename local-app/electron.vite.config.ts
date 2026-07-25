import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      sourcemap: false,
      rollupOptions: {
        external: ['better-sqlite3'],
      },
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@main': resolve('src/main'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      sourcemap: false,
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
      },
    },
  },
  renderer: {
    plugins: [react(), tailwindcss()],
    root: 'src/renderer',
    build: {
      sourcemap: false,
      rollupOptions: {
        input: resolve('src/renderer/index.html'),
      },
    },
    resolve: {
      alias: {
        '@': resolve('src/renderer'),
        '@shared': resolve('src/shared'),
        '@components': resolve('src/renderer/components'),
        '@hooks': resolve('src/renderer/hooks'),
        '@store': resolve('src/renderer/store'),
        '@lib': resolve('src/renderer/lib'),
        '@pages': resolve('src/renderer/pages'),
        '@assets': resolve('src/renderer/assets'),
      },
    },
    css: {
      postcss: {
        plugins: [],
      },
    },
  },
})
