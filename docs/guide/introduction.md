# Introduction

`hexa_core` is the framework resource every other script on this server talks to. It owns player
identity, characters, money, the item and job catalogues, permissions, callbacks and the save cycle.
It targets RedM (RDR2 on FXServer) and depends on nothing but `oxmysql`.

This page covers what the resource manages, why its database looks the way it does, how the files are
laid out, and how to reach the core object from your own resource.

::: tip Version 3.0.0
The public API was flattened in 3.0.0. `Core.GetPlayer(source)` and `Player.AddMoney(...)` are the
current spellings. The old `Core.Functions.*` and `Player.Functions.*` layers still resolve for one
more release and print a deprecation warning naming the resource that called them.
:::

## What hexa_core manages

- **Characters** — creation, loading, saving, deletion, and the identifiers that hang off a character
  (citizen id, wallet id, bank account number, fingerprint, phone serial).
- **Money** — the money types declared in `Config.Money.MoneyTypes` (`cash`, `bank`, `gold` out of the
  box), the minus-limit rules, and the paycheck loop.
- **Items** — the shared catalogue in `Core.Shared.Items`, built at boot from the `items` table, the
  weapon list in `shared/weapons.lua`, and optionally the money items.
- **Jobs** — `Core.Shared.Jobs`, built at boot from the `jobs` and `job_grades` tables, plus duty state
  and grade payment.
- **Permissions and commands** — ace-backed `admin` / `staff` levels and `Core.Commands.Add`.
- **Callbacks** — `CreateCallback` / `TriggerCallback` in both directions.
- **Needs and status** — hunger, thirst, cleanliness, stress and the RDR2 cores, driven server-side.
- **Logging** — a console printer with one shared signature on both sides, and a Discord forwarder for
  `hexa_log:server:CreateLog`.
- **RedM specifics** — prompts, eagle eye, IPLs and interiors, ped/vehicle density, the coloured
  minimap.

Inventory operations are delegated to the inventory resource. Every call site in `hexa_core` checks
that it is actually started and degrades to a safe return value if it is not, so a stopped inventory
never turns into a Lua error inside the core.

## How the database is shaped

Characters live in a `users` table keyed by `identifier`, one column per concern: `accounts`,
`job`, `job_grade`, `firstname`, `lastname`, `dateofbirth`, `sex`, `position`, `inventory`, `loadout`,
`metadata`, `status`, `is_dead`. Jobs come from `jobs` + `job_grades`, and item definitions from
`items`. `install.sql` creates and seeds all of it on first boot.

That layout buys three things:

1. **Real columns, not one blob.** Everything a query needs has a column of its own, so a character
   can be read and edited straight from the database.
2. **External tooling keeps working.** Admin panels, web dashboards and SQL reports read the same
   columns the framework does, including the summarised `status` column.
3. **Item and job editing stays where you expect it.** The database is the only source of truth for
   both catalogues. `Core.Shared.Items` and `Core.Shared.Jobs` start empty and are filled at boot, so
   you edit rows and restart `hexa_core` rather than editing a Lua table.

In memory the shape is different on purpose. A row is translated into a `PlayerData` table with
`citizenid`, `money`, `charinfo`, `job` and `metadata`, so scripts written against the flat
`citizenid` / `charinfo` player data keep working. The two inventory columns (`inventory` for
goods, `loadout` for weapons) are merged into one slot table at load and split again at save.

::: warning Do not write to `users` behind the framework
`Core.SavePlayer` upserts the whole row. A write that lands between two saves is overwritten on the
next sweep. Change data through the player object and let the save cycle persist it.
:::

## Resource layout

```
hexa_core/
├── client/          -- client side
│   ├── main.lua           -- the Core object and GetCoreObject
│   ├── functions.lua      -- entity, vehicle, ped, anim, ptfx and world helpers
│   ├── spawn.lua          -- character spawn
│   ├── prompts.lua        -- RDR2 prompts
│   ├── status.lua         -- needs and cores on screen
│   ├── interiors.lua      -- interiors
│   ├── ipls.lua           -- IPL loading
│   ├── colormap.lua       -- minimap zone colouring
│   ├── eagleeye.lua       -- eagle eye tinting
│   └── compat.lua         -- old client names, loaded last
├── server/          -- server side
│   ├── main.lua           -- the Core object and GetCoreObject
│   ├── installer.lua      -- runs install.sql at boot
│   ├── storage.lua        -- inventory/loadout column codec
│   ├── functions.lua      -- getters, buckets, permissions, callbacks, paychecks
│   ├── jobs.lua           -- loads jobs + job_grades
│   ├── items.lua          -- builds the item catalogue
│   ├── player.lua         -- the player object and its lifecycle
│   ├── commands.lua       -- Core.Commands
│   ├── exports.lua        -- catalogue registration and the export surface
│   ├── debug.lua          -- hexa_log:server:CreateLog sink and Discord forwarding
│   ├── save.lua           -- the autosave sweep
│   └── compat.lua         -- old server names, loaded last
├── shared/          -- loaded on both sides
│   ├── log.lua            -- Log, Warn, Error, Debug, DumpTable
│   ├── locale.lua         -- the locale engine
│   ├── main.lua           -- Shared helpers, Shared.Items, Shared.Jobs
│   ├── weapons.lua        -- weapon definitions
│   └── keybinds.lua       -- key mappings
├── locale/          -- en.lua, th.lua
├── stream/          -- streamed textures
├── config/           -- one shared file per configurable subsystem
│   ├── main.lua            -- general settings; creates Config first
│   ├── player.lua          -- player and character defaults
│   ├── money.lua           -- economy and paychecks
│   ├── save.lua            -- persistence cadence
│   ├── status.lua          -- needs, damage and RDR2 cores
│   └── ...                 -- logging, colormap, density and eagle eye
├── install.sql      -- schema and seed data
└── fxmanifest.lua
```

Load order matters and is spelled out in `fxmanifest.lua`. Three rules to know if you ever edit it:
`config/main.lua` must load before the other config files, `server/storage.lua` must load before
`server/player.lua`, and both `compat.lua` files must load last because the compatibility layer can
only alias functions that already exist.

## Getting the core object

One export, same name on both sides.

```lua
-- server or client, identical
local Core = exports['hexa_core']:GetCoreObject()
```

Everything hangs directly off that table. Server side:

```lua
local Core = exports['hexa_core']:GetCoreObject()

RegisterNetEvent('myresource:server:payout', function()
    local Player = Core.GetPlayer(source)
    if not Player then return end
    -- flat on the core, flat on the player
    Player.AddMoney('cash', 100, 'bounty payout')
    Core.Notify(source, { title = 'Bounty', description = 'Paid in full', type = 'success' })
end)
```

Client side the same object carries the client helpers and a cached `Core.PlayerData`:

```lua
local Core = exports['hexa_core']:GetCoreObject()

CreateThread(function()
    local data = Core.GetPlayerData()
    -- PlayerData is empty until HexaCore:Client:OnPlayerLoaded fires
    Core.PrintDebug('spawned as %s', tostring(data.citizenid))
end)
```

::: tip The old spelling still resolves
`Core.Functions.GetPlayer(source)` and `Player.Functions.AddMoney(...)` both work today. `.Functions`
is a real table kept mirrored with the flat one, not a proxy, because the bridge copies methods out
of it with `pairs()`. Every legacy call logs one warning per name, naming the calling resource:

```
[hexa_core] [WARN] myresource calls Core.GetSource which was renamed to Core.GetSourceByIdentifier
```

Fix the call sites while the warnings are still there.
:::

## Registering an item is not giving an item

This is the one distinction to get right before writing anything against `hexa_core`. The two used to
share a verb and mean opposite things.

| Intent | Call | Where it lands |
| --- | --- | --- |
| Define a new item type | `Core.RegisterItem('bread', def)` | `Core.Shared.Items` — the catalogue |
| Put an item in a player's satchel | `Player.AddItem('bread', 1)` | that player's inventory |

```lua
local Core = exports['hexa_core']:GetCoreObject()

-- catalogue: the server now knows what bread IS
Core.RegisterItem('bread', { name = 'bread', label = 'Bread', weight = 1 })

-- inventory: this player now HAS bread
local Player = Core.GetPlayer(source)
Player.AddItem('bread', 1)
```

The catalogue verbs are `Core.RegisterItem`, `Core.RegisterItems`, `Core.UnregisterItem` and
`Core.UpdateItemDefinition`, with the same four shapes for jobs: `Core.RegisterJob`,
`Core.RegisterJobs`, `Core.UnregisterJob`, `Core.UpdateJobDefinition`.

::: danger The export named AddItem is the catalogue one
`exports['hexa_core']:AddItem(name, def)` and `exports['hexa_core']:RemoveItem(name)` are kept
permanently, and they register and unregister item *definitions* — the same meaning those exports have
elsewhere, which is why ported scripts drop in unmodified. They do not touch anyone's inventory. To
give a player an item you need the player object.
:::

## Saving is the server's job

The save cadence lives entirely on the server. A character carries a dirty flag, set whenever their
data actually changes, and the sweep writes only the flagged ones.

```lua
Config.Save.Interval = 45        -- minutes between sweeps, minimum 1
Config.Save.SpreadSeconds = 60   -- spread the writes so a full server does not hit MySQL at once
Config.Save.OnResourceStop = true
```

From another resource:

```lua
local Core = exports['hexa_core']:GetCoreObject()

-- force a player into the next sweep after changing their data yourself
Core.GetPlayer(source).MarkDirty()

-- write everyone right now, no spreading
local written = Core.SaveAllPlayers()
```

## Logging

Five printers, identical signature on both sides, printf style.

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.Log('boot finished in %dms', elapsed)
Core.Warn('no bank account on %s', citizenid)
Core.Error('save failed for %s', citizenid)
Core.PrintDebug('drained %s by %.1f', 'hunger', 1.0)
Core.DumpTable(Player.PlayerData)
```

`Core.PrintDebug` is gated on `Config.Debug` and checks that switch before formatting, so leaving debug
calls in hot paths costs nothing while debug is off. Log lines are written in English on purpose: some
server consoles mangle Thai, and operators scan them fast.

`hexa_core` also listens for `hexa_log:server:CreateLog` itself. It prints every log line to the
console and forwards it to a Discord webhook if one is configured for that category in
`Config.Log.Webhooks`, falling back to the `default` entry.

## Next steps

- [Installation](/guide/installation) — database, `server.cfg`, first boot
- [Configuration](/guide/configuration) — every file in `config/`
- [Player object](/guide/player-object) — the flat player methods
- [Server functions](/api/server-functions) — the full server API
