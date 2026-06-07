import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Pages from 'vite-plugin-pages'
import VueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    
    // Auto import Vue APIs
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        'pinia',
        '@vueuse/core',
        {
          '@/plugins/utils': [
            'DialogConfirm',
            'DialogDelete',
            'DialogAlert',
            'DialogInfo',
            'DialogWarning',
            'formatDate',
            'formatDateTime',
            'formatTime',
            'formatLongDate',
            'formatCurrency',
            'formatGender',
          ]
        }
      ],
      dts: 'src/auto-imports.d.ts',
      dirs: [
        'src/composables',
        'src/stores',
      ],
      vueTemplate: true,
    }),

    // Auto import components
    Components({
      dirs: ['src/components'],
      extensions: ['vue'],
      deep: true,
      dts: 'src/components.d.ts',
      resolvers: [
        IconsResolver({
          prefix: 'icon',
        }),
      ],
    }),

    // Icons
    Icons({
      compiler: 'vue3',
      autoInstall: true,
    }),

    // File-based routing
    Pages({
      dirs: [
        {
          dir: 'src/pages',
          baseRoute: '',
          exclude: ['src/pages/public']
        }
      ],
      extensions: ['vue'],
      // Ensure the 404 route is properly handled
      onRoutesGenerated: (routes) => {
        // Make sure we have a catch-all route
        const hasCatchAll = routes.some(route =>
          route.path === '/:pathMatch(.*)*' || route.path === '/:catchAll(.*)'
        )
        
        if (!hasCatchAll) {
          console.warn('No catch-all route found for 404 page')
        }
        
        return routes
      },
      // Set the 404 page explicitly
      extendRoute(route, parent) {
        if (route.path === '/:pathMatch(.*)*') {
          return {
            ...route,
            meta: {
              ...route.meta,
              public: true
            }
          }
        }
        return route
      }
    }),
    // Vue DevTools
    VueDevTools(),
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    port: 5173,
    host: '0.0.0.0', // Allow external access
    open: false, // Don't auto-open browser in production
    strictPort: true, // Exit if port is already in use
    hmr: {
      overlay: true
    }
  },

  esbuild: {
    pure: ['console.log', 'console.info', 'console.debug', 'console.warn'],
  },

  // Build optimization
  build: {
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
        }
      }
    }
  },

  // CSS optimization
  css: {
    devSourcemap: true,
  },
})
