import { defineConfig } from 'vitepress'

const SITE_URL = 'https://hexa-development.github.io/hexa-docs/'

export default defineConfig({
  title: 'Hexa Framework',
  description: 'Hexa Framework (hexa_core) documentation - the core framework for RedM roleplay servers: players, jobs, items, money, callbacks, and permissions with an ESX-style structure',
  lang: 'th-TH',
  base: '/hexa-docs/',
  lastUpdated: true,
  cleanUrls: true,

  sitemap: {
    hostname: SITE_URL
  },

  head: [
    ['meta', { name: 'theme-color', content: '#b45309' }],
    ['meta', { name: 'keywords', content: 'Hexa Framework, hexa_core, RedM framework, RedM roleplay, RDR2 roleplay server, RedM scripts, FXServer, ESX style framework, RedM core' }],
    ['meta', { name: 'robots', content: 'index, follow' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Hexa Framework' }],
    ['meta', { property: 'og:title', content: 'Hexa Framework - RedM roleplay framework documentation' }],
    ['meta', { property: 'og:description', content: 'Documentation for Hexa Framework (hexa_core) - the core framework for RedM roleplay servers' }],
    ['meta', { property: 'og:url', content: SITE_URL }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:title', content: 'Hexa Framework - RedM roleplay framework documentation' }],
    ['script', { type: 'application/ld+json' }, JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Hexa Framework',
      alternateName: 'hexa_core',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'RedM (FXServer)',
      description: 'The core framework for RedM roleplay servers - players, jobs, items, money, callbacks, and permissions with an ESX-style structure',
      url: SITE_URL,
      sameAs: ['https://github.com/hexa-development/hexa_core']
    })]
  ],

  themeConfig: {
    siteTitle: 'Hexa Framework',

    nav: [
      { text: 'หน้าแรก', link: '/' },
      { text: 'คู่มือ', link: '/guide/introduction' },
      { text: 'API Reference', link: '/api/server-functions' },
      { text: 'GitHub', link: 'https://github.com/hexa-development/hexa_core' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'เริ่มต้นใช้งาน',
          items: [
            { text: 'แนะนำ Hexa Framework', link: '/guide/introduction' },
            { text: 'การติดตั้ง', link: '/guide/installation' },
            { text: 'การตั้งค่า (config.lua)', link: '/guide/configuration' }
          ]
        },
        {
          text: 'แนวคิดหลัก',
          items: [
            { text: 'Player Object', link: '/guide/player-object' },
            { text: 'Callbacks', link: '/guide/callbacks' },
            { text: 'Items และ Jobs', link: '/guide/items-jobs' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Server Functions', link: '/api/server-functions' },
            { text: 'Client Functions', link: '/api/client-functions' },
            { text: 'Player Methods', link: '/api/player-methods' },
            { text: 'Exports', link: '/api/exports' },
            { text: 'Events', link: '/api/events' },
            { text: 'Commands', link: '/api/commands' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/hexa-development/hexa_core' }
    ],

    search: {
      provider: 'local'
    },

    outline: {
      label: 'ในหน้านี้',
      level: [2, 3]
    },

    docFooter: {
      prev: 'หน้าก่อนหน้า',
      next: 'หน้าถัดไป'
    },

    lastUpdatedText: 'อัปเดตล่าสุด',

    footer: {
      message: 'Hexa Framework documentation for RedM',
      copyright: '© Hexa Framework'
    }
  }
})
