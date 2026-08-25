# Compatibility bridges

`hexa-bridge` lets selected resources written for RSG Core or VORP Core run on top of
`hexa_core`. It supplies resources named `rsg-core` and `vorp_core`, translates the supported
calls, and keeps Hexa as the only framework that owns player data.

The bridge is a migration tool, not a copy of either original framework. An API being callable
does not mean every subsystem behind the original API exists. Check the compatibility pages before
putting an existing resource into production:

- [RSG Core compatibility](/bridge/rsg-core)
- [VORP Core compatibility](/bridge/vorp-core)

For a new resource, use the [native Hexa API](/api/server-functions). The bridge is most useful when
moving an existing server a resource at a time.

## Installation

Clone the bridge repository beside `hexa_core`:

```bash
git clone https://github.com/hexa-development/hexa-bridge.git
```

The repository contains two independent FiveM resources. Copy only the directory or directories you
need into the server's resources tree, keeping their names exact:

```text
resources/
├── [hexa]/
│   └── hexa_core/
└── [bridge]/
    ├── rsg-core/
    └── vorp_core/
```

Start the core first, then each bridge, then the resources that consume it:

```ini
ensure oxmysql
ensure hexa_core

ensure rsg-core
ensure vorp_core

# RSG/VORP resources go below their bridge
```

Both bridge manifests declare `hexa_core` as a dependency, but explicit startup order keeps failures
easy to diagnose.

::: danger Do not start the original core with its bridge
The compatibility resources intentionally use the original resource names. Never run the real
`rsg-core` beside this `rsg-core`, or the real `vorp_core` beside this `vorp_core`. Two resources with
the same name cannot safely provide competing exports and events.
:::

## Configuration

Each bridge owns a separate `config.lua`:

| File | Controls |
| --- | --- |
| `rsg-core/config.lua` | money aliases, permission aliases, the safe default gang shape and debug warnings |
| `vorp_core/config.lua` | numeric currency mapping, VORP group/ACE mapping, reported character limit, notification types and debug warnings |

Unknown mappings are not guessed. A money type, currency id or permission group explicitly mapped to
`false` fails safely and emits one warning instead of silently spending from the wrong account.

## Compatibility model

The bridge refreshes its cached Hexa object when Hexa announces an object or shared-catalogue update.
This matters because an export crosses a resource boundary as a snapshot; keeping the first object
forever would leave item and job catalogues empty after a cold boot.

RSG functions that already match Hexa are exposed through late-bound wrappers. VORP receives a
purpose-built User and Character shape. Signatures that differ are translated explicitly, and
unsupported subsystems return safe empty values or `false` with a one-time warning.

## Production checklist

Before enabling a converted resource for players:

1. Read its manifest and identify every framework export, event and shared file it consumes.
2. Compare those calls with the relevant compatibility page.
3. Enable `BridgeConfig.Debug` while testing so unsupported calls are visible in the server console.
4. Test money removal, item capacity, callbacks, login/logout and job updates with at least two clients.
5. Treat a no-op as unsupported even when it prevents a Lua error. A clothing, gang or character-slot
   script that loads without crashing still does not work if its state has nowhere to persist.

The bridge targets commonly used interfaces. It does not promise drop-in support for every version or
every resource in either ecosystem.

