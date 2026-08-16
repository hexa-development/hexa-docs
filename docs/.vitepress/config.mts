import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Hexa Framework',
  description: 'เอกสารประกอบการใช้งาน hexa_core — เฟรมเวิร์กหลักสำหรับเซิร์ฟเวอร์ RedM',
  lang: 'th-TH',
  base: '/hexa-docs/',
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['meta', { name: 'theme-color', content: '#b45309' }]
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
      message: 'เอกสารของ Hexa Framework สำหรับ RedM',
      copyright: '© Hexa Development'
    }
  }
})
