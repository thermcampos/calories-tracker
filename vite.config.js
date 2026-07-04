import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  include: ['src', 'vite-end.d.ts'],

  plugins: [
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['assets/*.png', 'assets/*.ico', 'assets/*.xml'],

      manifest: {
        name: 'Food Tracker - Daily Calorie Tracker',
        short_name: 'Food Tracker',
        description: 'Track your nutrition, transform your health. Monitor calories, protein, fat, carbs, and fiber for every meal.',
        theme_color: '#121212',
        background_color: '#121212',
        display: 'standalone', // CRITICAL: Enables fullscreen
        orientation: 'portrait',
        scope: '/',
        start_url: '/',

        icons: [
          {
            src: '/assets/apple-icon-180x180.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/assets/android-icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/assets/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },

      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },

      devOptions: {
        enabled: false, // Disable in dev to avoid warnings; test with preview mode
        type: 'module'
      }
    })
  ]
})
