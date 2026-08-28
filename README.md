<div align="center">

<a href="https://github.com/hexa-development">
  <img src="https://raw.githubusercontent.com/hexa-development/.github/main/assets/banner.png" alt="Hexa Development" width="880">
</a>

# HEXA DOCS

### Official documentation for Hexa Framework

Installation guides, API references, examples, and development documentation for [`hexa_core`](https://github.com/hexa-development/hexa_core) and the Hexa ecosystem.

<br>

[![Documentation](https://img.shields.io/badge/Documentation-Live-B45309?style=for-the-badge)](https://hexa-development.github.io/hexa-docs/)
[![VitePress](https://img.shields.io/badge/VitePress-Powered-646CFF?style=for-the-badge\&logo=vitepress\&logoColor=white)](https://vitepress.dev/)
[![Vue.js](https://img.shields.io/badge/Vue.js-Documentation-42B883?style=for-the-badge\&logo=vuedotjs\&logoColor=white)](https://vuejs.org/)
[![RedM](https://img.shields.io/badge/Platform-RedM-8B0000?style=for-the-badge)](https://redm.net/)

<br>

**Guides · API Reference · Examples · Migration · Development**

</div>

---

## About

**hexa-docs** is the official documentation website for the **Hexa Framework** ecosystem.

The documentation is designed to provide a single source of truth for server owners and developers working with Hexa.

It covers everything from installing `hexa_core` to building custom RedM resources using Hexa APIs.

### Live Documentation

### [Open Hexa Documentation →](https://hexa-development.github.io/hexa-docs/)

---

## Documentation Scope

The documentation includes areas such as:

```text
Hexa Documentation
│
├── Getting Started
│   ├── Installation
│   ├── Server Configuration
│   └── First Resource
│
├── Core Concepts
│   ├── Players
│   ├── Characters
│   ├── Jobs
│   ├── Money
│   ├── Items
│   └── Metadata
│
├── API Reference
│   ├── Functions
│   ├── Exports
│   ├── Events
│   ├── Callbacks
│   └── Permissions
│
├── Bridge
│   ├── RSG Compatibility
│   ├── VORP Compatibility
│   └── Migration
│
└── Development
    ├── Resource Structure
    ├── Examples
    └── Best Practices
```

Documentation continues to expand alongside the framework.

---

## Tech Stack

| Technology         | Usage                                    |
| :----------------- | :--------------------------------------- |
| **VitePress**      | Static documentation framework           |
| **Vue.js**         | Components and interactive documentation |
| **Markdown**       | Documentation content                    |
| **TypeScript**     | VitePress configuration                  |
| **GitHub Actions** | Automated deployment                     |
| **GitHub Pages**   | Documentation hosting                    |

---

## Local Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/hexa-development/hexa-docs.git
cd hexa-docs

npm install
```

Start the VitePress development server:

```bash
npm run docs:dev
```

The documentation will be available locally at:

```text
http://localhost:5173
```

Changes to Markdown files and VitePress configuration will automatically refresh during development.

---

## Build

Generate the production version of the documentation:

```bash
npm run docs:build
```

The generated static files are written to:

```text
docs/.vitepress/dist
```

Preview the production build locally:

```bash
npm run docs:preview
```

---

## Deployment

Production deployment is handled automatically through **GitHub Actions**.

```text
Push to main
     │
     ▼
GitHub Actions
     │
     ▼
Install Dependencies
     │
     ▼
VitePress Build
     │
     ▼
GitHub Pages
     │
     ▼
Live Documentation
```

Push changes to the `main` branch:

```bash
git add .
git commit -m "docs: update documentation"
git push origin main
```

The deployment workflow will build the documentation and publish the latest version to GitHub Pages.

Workflow configuration:

```text
.github/workflows/deploy.yml
```

---

## Project Structure

```text
hexa-docs/
│
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── docs/
│   │
│   ├── .vitepress/
│   │   └── config.mts
│   │
│   ├── index.md
│   │
│   ├── guide/
│   │   └── ...
│   │
│   ├── api/
│   │   └── ...
│   │
│   ├── bridge/
│   │   └── ...
│   │
│   ├── th/
│   │   └── ...
│   │
│   └── public/
│       └── ...
│
├── package.json
└── README.md
```

### Important directories

| Path                 | Purpose                                                       |
| :------------------- | :------------------------------------------------------------ |
| `docs/.vitepress/`   | VitePress configuration, navigation, sidebar, and theme setup |
| `docs/index.md`      | Documentation landing page                                    |
| `docs/guide/`        | Installation guides and framework concepts                    |
| `docs/api/`          | API and developer reference                                   |
| `docs/bridge/`       | RSG and VORP compatibility reference                          |
| `docs/public/`       | Static assets                                                 |
| `.github/workflows/` | Automated build and deployment workflows                      |

---

## Writing Documentation

Documentation pages are written primarily in Markdown.

Example:

````md
# Player API

Access a player through Hexa Core:

```lua
local HexaCore = exports['hexa_core']:GetCoreObject()

local Player = HexaCore.GetPlayer(source)
````

````

VitePress also allows Vue components to be used directly inside documentation pages when more advanced presentation or interaction is required.

---

## Documentation Guidelines

When contributing documentation, keep pages focused on practical usage.

Prefer:

```text
What the API does
      ↓
How to use it
      ↓
Parameters
      ↓
Return values
      ↓
Example
      ↓
Common mistakes
````

Code examples should be:

* Minimal
* Valid
* Copy-friendly
* Consistent with the current Hexa API
* Explicit about client/server context
* Clear about expected parameters and return values

Avoid documenting internal implementation details unless developers are expected to depend on them.

---

## Example API Documentation

A typical API reference should clearly show the environment and expected behavior.

```lua
local HexaCore = exports['hexa_core']:GetCoreObject()

local Player = HexaCore.GetPlayer(source)

if not Player then
    return
end

Player.AddMoney(
    'cash',
    100,
    'example_reward'
)
```

Where possible, documentation should explain:

```text
API
├── Purpose
├── Context
│   ├── Client
│   └── Server
├── Parameters
├── Return Value
├── Example
└── Notes
```

---

## Hexa Ecosystem

`hexa-docs` is the single source of truth for every repository below.

| Project | Description |
| :--- | :--- |
| [`hexa_core`](https://github.com/hexa-development/hexa_core) | Core framework — players, jobs, items, economy, status, callbacks, permissions |
| [`hexa_inventory`](https://github.com/hexa-development/hexa_inventory) | Persistent grid inventory — stashes, shops, ground drops, secure trading |
| [`hexa_progbar`](https://github.com/hexa-development/hexa_progbar) | Screen-fixed progress bar — drop-in for `ox_lib` `progressBar` |
| [`hexa-bridge`](https://github.com/hexa-development/hexa-bridge) | Compatibility layer for supported RSG and VORP resources |
| **`hexa-docs`** | Official documentation and API reference (VitePress) <br> *(this repository)* |
| [`rdr2-unpack`](https://github.com/hexa-development/rdr2-unpack) | Read a local RDR2 install into open formats — GLB, PNG, `.ymap` JSON |
| [`txAdmin`](https://github.com/hexa-development/txAdmin) | One-click txAdmin recipe that deploys the whole Hexa stack |

Live site: [hexa-development.github.io/hexa-docs](https://hexa-development.github.io/hexa-docs/) · [เอกสารภาษาไทย](https://hexa-development.github.io/hexa-docs/th/)

---

## Contributing

Documentation improvements are welcome.

Useful contributions include:

* Fixing incorrect API documentation
* Adding missing parameters or return values
* Improving installation instructions
* Adding examples
* Documenting newly supported APIs
* Fixing broken links
* Improving migration guides
* Reporting outdated information

When documenting a new framework feature, update the documentation together with the corresponding framework change whenever possible.

This helps prevent the classic framework problem where the code is three versions ahead of the docs and everyone starts reading source files like ancient prophecy.

---

## Development Workflow

A recommended documentation workflow:

```text
Framework Change
      │
      ▼
Update Documentation
      │
      ▼
Test Code Examples
      │
      ▼
Run Local Docs
      │
      ▼
Build Production
      │
      ▼
Push to main
      │
      ▼
Automatic Deployment
```

---

<div align="center">

### Documentation should answer the question before Discord has to.

**Official documentation for Hexa Framework**

<br>

[Documentation](https://hexa-development.github.io/hexa-docs/) ·
[เอกสารภาษาไทย](https://hexa-development.github.io/hexa-docs/th/) ·
[hexa_core](https://github.com/hexa-development/hexa_core) ·
[hexa_inventory](https://github.com/hexa-development/hexa_inventory) ·
[hexa_progbar](https://github.com/hexa-development/hexa_progbar) ·
[hexa-bridge](https://github.com/hexa-development/hexa-bridge) ·
[Organization](https://github.com/hexa-development)

</div>
