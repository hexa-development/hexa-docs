import { defineConfig } from 'vitepress'

const SITE_URL = 'https://hexa-development.github.io/hexa-docs/'
const REPO = 'https://github.com/hexa-development/hexa_core'

const enGuide = [
  {
    text: 'Getting started',
    items: [
      { text: 'What Hexa Framework is', link: '/guide/introduction' },
      { text: 'Installation', link: '/guide/installation' },
      { text: 'Configuration', link: '/guide/configuration' },
      { text: 'Upgrading to 3.0', link: '/guide/upgrading' }
    ]
  },
  {
    text: 'Core concepts',
    items: [
      { text: 'The player object', link: '/guide/player-object' },
      { text: 'Saving and persistence', link: '/guide/persistence' },
      { text: 'Callbacks', link: '/guide/callbacks' },
      { text: 'Items and jobs', link: '/guide/items-jobs' },
      { text: 'Logging', link: '/guide/logging' }
    ]
  }
]

const enApi = [
  {
    text: 'API reference',
    items: [
      { text: 'Server functions', link: '/api/server-functions' },
      { text: 'Client functions', link: '/api/client-functions' },
      { text: 'Player methods', link: '/api/player-methods' },
      { text: 'Exports', link: '/api/exports' },
      { text: 'Events', link: '/api/events' },
      { text: 'Commands', link: '/api/commands' }
    ]
  }
]

const thGuide = [
  {
    text: 'เริ่มต้นใช้งาน',
    items: [
      { text: 'Hexa Framework คืออะไร', link: '/th/guide/introduction' },
      { text: 'การติดตั้ง', link: '/th/guide/installation' },
      { text: 'การตั้งค่า', link: '/th/guide/configuration' },
      { text: 'อัปเกรดมาเป็น 3.0', link: '/th/guide/upgrading' }
    ]
  },
  {
    text: 'แนวคิดหลัก',
    items: [
      { text: 'อ็อบเจกต์ผู้เล่น', link: '/th/guide/player-object' },
      { text: 'การบันทึกข้อมูล', link: '/th/guide/persistence' },
      { text: 'Callbacks', link: '/th/guide/callbacks' },
      { text: 'ไอเทมและอาชีพ', link: '/th/guide/items-jobs' },
      { text: 'ระบบ log', link: '/th/guide/logging' }
    ]
  }
]

const thApi = [
  {
    text: 'อ้างอิง API',
    items: [
      { text: 'ฟังก์ชันฝั่ง server', link: '/th/api/server-functions' },
      { text: 'ฟังก์ชันฝั่ง client', link: '/th/api/client-functions' },
      { text: 'เมธอดของผู้เล่น', link: '/th/api/player-methods' },
      { text: 'Exports', link: '/th/api/exports' },
      { text: 'Events', link: '/th/api/events' },
      { text: 'คำสั่ง', link: '/th/api/commands' }
    ]
  }
]

export default defineConfig({
  title: 'Hexa Framework',
  description:
    'Hexa Framework (hexa_core) documentation - the core framework for RedM roleplay servers: players, jobs, items, money, callbacks, and permissions with an ESX-style structure',
  base: '/hexa-docs/',
  lastUpdated: true,
  cleanUrls: true,

  sitemap: { hostname: SITE_URL },

  head: [
    ['meta', { name: 'google-site-verification', content: 'Zrn6PC3LAN4uHXbpjsLc8XGlfV6bMoXQVeEu7owb6Og' }],
    ['meta', { name: 'theme-color', content: '#b45309' }],
    ['meta', { name: 'keywords', content: 'Hexa Framework, hexa_core, RedM framework, RedM roleplay, RDR2 roleplay server, RedM scripts, FXServer, ESX style framework, RedM core' }],
    ['meta', { name: 'robots', content: 'index, follow' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Hexa Framework' }],
    ['meta', { property: 'og:title', content: 'Hexa Framework - RedM roleplay framework documentation' }],
    ['meta', { property: 'og:description', content: 'Documentation for Hexa Framework (hexa_core) - the core framework for RedM roleplay servers' }],
    ['meta', { property: 'og:url', content: SITE_URL }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['script', { type: 'application/ld+json' }, JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Hexa Framework',
      alternateName: 'hexa_core',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'RedM (FXServer)',
      description: 'The core framework for RedM roleplay servers - players, jobs, items, money, callbacks, and permissions with an ESX-style structure',
      url: SITE_URL,
      sameAs: [REPO]
    })]
  ],

  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/introduction' },
          { text: 'API', link: '/api/server-functions' },
          { text: 'GitHub', link: REPO }
        ],
        sidebar: { '/guide/': enGuide, '/api/': enApi },
        outline: { label: 'On this page', level: [2, 3] },
        docFooter: { prev: 'Previous', next: 'Next' },
        lastUpdatedText: 'Last updated',
        footer: {
          message: 'Hexa Framework documentation for RedM',
          copyright: 'Hexa Framework'
        }
      }
    },

    th: {
      label: 'ไทย',
      lang: 'th-TH',
      link: '/th/',
      themeConfig: {
        nav: [
          { text: 'คู่มือ', link: '/th/guide/introduction' },
          { text: 'API', link: '/th/api/server-functions' },
          { text: 'GitHub', link: REPO }
        ],
        sidebar: { '/th/guide/': thGuide, '/th/api/': thApi },
        outline: { label: 'ในหน้านี้', level: [2, 3] },
        docFooter: { prev: 'หน้าก่อนหน้า', next: 'หน้าถัดไป' },
        lastUpdatedText: 'อัปเดตล่าสุด',
        footer: {
          message: 'เอกสาร Hexa Framework สำหรับ RedM',
          copyright: 'Hexa Framework'
        }
      }
    }
  },

  themeConfig: {
    siteTitle: 'Hexa Framework',
    socialLinks: [{ icon: 'github', link: REPO }],
    search: { provider: 'local' }
  }
})
