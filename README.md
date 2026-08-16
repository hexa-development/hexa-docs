# hexa-docs

Documentation website for [hexa_core](https://github.com/hexa-development/hexa_core) — the core framework for RedM roleplay servers.

Built with [VitePress](https://vitepress.dev/) (Vue.js), in the style of the [ESX docs](https://docs.esx-framework.org/).

**Live site:** [hexa-development.github.io/hexa-docs](https://hexa-development.github.io/hexa-docs/)

## Local development

```bash
npm install
npm run docs:dev      # dev server at http://localhost:5173
```

## Build

```bash
npm run docs:build    # output in docs/.vitepress/dist
npm run docs:preview  # preview the built site
```

## Deploy

Push to `main` and GitHub Actions builds and deploys to GitHub Pages automatically (see `.github/workflows/deploy.yml`).

## Structure

```
docs/
├── .vitepress/config.mts   # site config (nav, sidebar, theme)
├── index.md                # landing page (hero + features)
├── guide/                  # user guide
└── api/                    # API reference
```
