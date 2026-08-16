# hexa-docs

เว็บไซต์เอกสาร (documentation) ของ [hexa_core](https://github.com/hexa-development/hexa_core) — เฟรมเวิร์กหลักสำหรับเซิร์ฟเวอร์ RedM

สร้างด้วย [VitePress](https://vitepress.dev/) (Vue.js) สไตล์เดียวกับ [ESX docs](https://docs.esx-framework.org/)

## พัฒนา (local dev)

```bash
npm install
npm run docs:dev      # เปิด dev server ที่ http://localhost:5173
```

## Build

```bash
npm run docs:build    # ผลลัพธ์อยู่ที่ docs/.vitepress/dist
npm run docs:preview  # ดูผลลัพธ์ที่ build แล้ว
```

## Deploy

push ขึ้น branch `main` แล้ว GitHub Actions จะ build + deploy ขึ้น GitHub Pages ให้อัตโนมัติ (ดู `.github/workflows/deploy.yml`)

## โครงสร้าง

```
docs/
├── .vitepress/config.mts   # การตั้งค่าเว็บ (nav, sidebar, theme)
├── index.md                # หน้าแรก (hero + features)
├── guide/                  # คู่มือการใช้งาน
└── api/                    # API Reference
```
