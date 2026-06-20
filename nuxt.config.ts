export default defineNuxtConfig({
  ssr: false,
  experimental: {
    renderJsonPayloads: false,
    noVueServer: true,
  },
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
  ],
  components: [
    '~/components',
    '~/components/common',
    '~/components/canvas',
    '~/components/materials',
    '~/components/filters',
    '~/components/labels',
    '~/components/export',
  ],
  tailwindcss: {
    cssPath: '~/assets/styles/tailwind.css',
    configPath: 'tailwind.config.js',
  },
  css: [
    'element-plus/dist/index.css',
    'element-plus/theme-chalk/dark/css-vars.css',
  ],
  plugins: [
    '~/plugins/element-plus.client.ts',
    '~/plugins/fabric.client.ts',
  ],
  app: {
    pageTransition: false,
    layoutTransition: false,
    head: {
      title: '植物压花标本工作室',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '水彩手绘风植物压花标本设计与排版工具' },
      ],
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Noto+Serif+SC:wght@400;600;700&family=Noto+Sans+SC:wght@400;700&family=ZCOOL+XiaoWei&display=swap',
        },
      ],
    },
  },
  vite: {
    optimizeDeps: {
      include: ['fabric', 'element-plus', 'pinia', 'element-plus/es/locale/lang/zh-cn'],
      esbuildOptions: {
        define: {
          'process.env': '{}',
        },
      },
    },
    ssr: {
      noExternal: ['fabric'],
    },
  },
})
