---
layout: home

hero:
  name: "Hexa Framework"
  text: "The core framework for RedM roleplay servers"
  tagline: hexa_core gives you players, jobs, items, money and status in one flat API - on a database that installs itself, with none of the ceremony.
  actions:
    - theme: brand
      text: Get started
      link: /guide/introduction
    - theme: alt
      text: API Reference
      link: /api/server-functions
    - theme: alt
      text: GitHub
      link: https://github.com/hexa-development/hexa_core

features:
  - title: Built for RedM, not ported to it
    details: Written against the RDR2 natives from the start. Interaction prompts, eagle eye tuning, IPL and interior loading, world density, colour-mapped minimap zones and the hunger/thirst/cleanliness/stress status loop all ship in the core.
  - title: A database that installs itself
    details: The users table is keyed by identifier, one column per concern, and install.sql runs itself on every boot. Idempotent DDL means a fresh database and a five-year-old one both end up correct with no manual import.
  - title: One complete player object
    details: Core.GetPlayer(source) returns everything about a character on one flat table - money across cash, bank and gold, inventory calls, job and duty, metadata, state bags and its own Save. No .Functions layer to step through.
  - title: Callbacks in both directions
    details: Register on the server with Core.CreateCallback and ask from the client with Core.TriggerCallback, or turn it around with Core.TriggerClientCallback. Usable items register through the same core object.
  - title: Thai and English out of the box
    details: A locale instance with English as the fallback and Thai loaded last, so player-facing strings follow the server language. Console log lines stay English on purpose - operators scan them fast and some consoles mangle Thai.
  - title: The server owns the save cadence
    details: A server thread sweeps every Config.Save.Interval minutes, writes only players marked dirty, and spreads the writes over Config.Save.SpreadSeconds so a full server does not hit MySQL in one tick.
---

# Hexa Framework

`hexa_core` is version 3.0.0 of the framework that every other Hexa resource is
built on. Its only hard dependency is `oxmysql`.

Version 3.0.0 flattened the public API. If you have written for this framework
before, the shortest possible summary is: delete `.Functions` from every call you
have.

## The core object is flat

```lua
local Core = exports['hexa_core']:GetCoreObject()

RegisterCommand('bonus', function(source)
    local Player = Core.GetPlayer(source)
    if not Player then return end
    Player.AddMoney('cash', 100, 'daily bonus')
end, false)
```

The old spellings `Core.Functions.GetPlayer(source)` and
`Player.Functions.AddMoney(...)` still resolve for one more release. Each one
prints a single warning naming the resource that called it, then forwards to the
new name.

::: warning
The `.Functions` layer is a transition aid, not an alternative style. It goes
away in the next release, and nothing new should be written against it.
:::

## Registering an item is not giving an item

These two verbs used to share a name and mean opposite things. They no longer
do, and this is the distinction to internalise before anything else.

```lua
-- defines a NEW KIND of item for the whole server
Core.RegisterItem('canteen', {
    name = 'canteen',
    label = 'Canteen',
    weight = 2,
    type = 'item',
    image = 'canteen.png',
    unique = false,
    useable = true,
    shouldClose = true,
})

-- puts one in ONE player's satchel
local Player = Core.GetPlayer(source)
Player.AddItem('canteen', 1, false, false, 'shop purchase')
```

The catalogue verbs are `Core.RegisterItem`, `Core.UnregisterItem`,
`Core.RegisterItems` and `Core.UpdateItemDefinition`, with the same shape for
jobs: `Core.RegisterJob`, `Core.UnregisterJob`, `Core.RegisterJobs` and
`Core.UpdateJobDefinition`. The player verbs are `Player.AddItem` and
`Player.RemoveItem`.

::: tip
On the export surface only, `exports['hexa_core']:AddItem` and `:RemoveItem` are
kept permanently. They are catalogue calls, matching what a ported script
expects from those export names, so such a script drops in unmodified.
:::

## Callbacks in both directions

```lua
-- server
Core.CreateCallback('bank:getBalance', function(source, cb)
    local Player = Core.GetPlayer(source)
    cb(Player and Player.GetMoney('bank') or 0)
end)
```

```lua
-- client
Core.TriggerCallback('bank:getBalance', function(balance)
    print(('balance: %s'):format(balance))
end)
```

## Saving is the server's job

The save cadence used to run on the client, which meant a client that stopped
sending stopped being saved. The server owns it now.

```lua
-- force a player into the next sweep after changing their data yourself
local Player = Core.GetPlayer(source)
Player.MarkDirty()
```

`Core.SaveAllPlayers()` writes everyone immediately and returns how many were
written; it is what `onResourceStop` calls when `Config.Save.OnResourceStop` is
left on. `Config.Save.OnDrop` covers the player who disconnects between sweeps.

## Logging

One printer set, identical on both sides, printf style.

```lua
Core.Log('spawned %d wagons', 4)
Core.Warn('no grade %s on job %s', grade, job)
Core.Error('save failed for %s', citizenid)
Core.PrintDebug('bucket now %d', bucket)
Core.DumpTable(Player.PlayerData)
```

`Core.PrintDebug` is gated on `Config.Debug` and checks the switch before it
formats anything, so leaving debug calls in shipped code costs nothing.
`hexa_core` also listens for `hexa_log:server:CreateLog` itself and forwards to
Discord when a URL is set in `Config.Log.Webhooks`.

## Where to go next

- [Introduction](/guide/introduction) for installation and the first resource
- [Configuration](/guide/configuration) for every config key
- [Player object](/guide/player-object) for the full method list
- [Server functions](/api/server-functions) and [client functions](/api/client-functions) for the API reference
