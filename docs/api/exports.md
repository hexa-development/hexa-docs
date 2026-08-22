# Exports

Everything `hexa_core` registers with `exports('Name', fn)`. There is no `export` or
`server_export` metadata in `fxmanifest.lua` - every entry on this page is a runtime registration,
so it is available the moment the resource has started.

Forty-three exports exist: twenty-four on the server, eighteen on the client, one shared.

```lua
-- server
local Core = exports['hexa_core']:GetCoreObject()

-- client
local Core = exports['hexa_core']:GetCoreObject()
```

Most resources need exactly that one call and nothing else on this page. The rest exist for the
narrow cases where an export is genuinely better than the core object: registering catalogue
entries before your own code has a player, reading data that must be computed inside the
`hexa_core` runtime, or blocking on the database installer.

::: tip Why some helpers are exports and not core-object fields
`GetCoreObject()` crosses a resource boundary, so the table you receive is a msgpack copy taken at
the moment you called it. Anything that must read live state - the weapon list, the item catalogue,
the inventory codec - is exposed as an export so the code runs inside `hexa_core` and always sees
current data.
:::

## The item-versus-player trap

This is the single most important distinction on the page.

```lua
-- registers an item TYPE in the catalogue, server-wide, once
exports['hexa_core']:AddItem('bread', { name = 'bread', label = 'Bread', weight = 100 })

-- puts a loaf in one player's pockets
local Player = Core.GetPlayer(source)
Player.AddItem('bread', 1)
```

::: danger Two different things, similar names
`exports['hexa_core']:AddItem(name, itemData)` writes a definition into `Shared.Items`. It does not
touch anybody's inventory. Giving an item to a player is `Player.AddItem(name, amount)` on the
player object, and it is never an export.

The same split applies to `RemoveItem`: the export deletes the definition from the catalogue,
`Player.RemoveItem` takes the item off a player.
:::

On the core object the catalogue verbs were renamed in 3.0 so they can never be confused again -
`Core.RegisterItem`, `Core.UnregisterItem`, `Core.RegisterItems`, `Core.UpdateItemDefinition`. The
**export names were deliberately left alone**. `AddItem`, `AddItems`, `UpdateItem` and `RemoveItem`
keep their old spelling permanently, because that is the shape ported qb-core and rsg-core scripts
already call, and they should drop into this server without an edit. The same holds for the job
exports.

---

## Server exports

### Core object and version

#### GetCoreObject

```lua
local Core = exports['hexa_core']:GetCoreObject()
local Player = Core.GetPlayer(source)
```

Returns the whole framework table, flat - no `.Functions` layer. The `.Functions` table still exists
and still resolves, so old code keeps running for one more release.

#### GetCoreVersion

```lua
local version = exports['hexa_core']:GetCoreVersion()
```

Reads the `version` field out of the resource manifest. Pass your own resource name to leave a trail
in the console when `Config.Debug` is on.

```lua
local version = exports['hexa_core']:GetCoreVersion(GetCurrentResourceName())
```

The debug line is printed through `Core.PrintDebug`, so with `Config.Debug = false` it costs
nothing.

#### AwaitSchemaReady

```lua
CreateThread(function()
    exports['hexa_core']:AwaitSchemaReady(15000)
    -- safe to query users / job_grades / items from here on
end)
```

Blocks the calling thread until `install.sql` has been applied, returning `true` once the schema is
ready. The timeout argument is in milliseconds and defaults to `15000`.

::: warning Call it before your first SELECT
`install.sql` in this resource is the only schema in the stack. On a fresh database, a resource that
queries `users` at boot can beat the `CREATE TABLE` and fail silently. This export exists precisely
to close that race. It blocks, so call it inside a `CreateThread`.
:::

### Item catalogue

Every one of these edits `Shared.Items`, pushes the change to all clients over
`HexaCore:Client:OnSharedUpdate`, and fires `HexaCore:Server:UpdateObject` so cached core-object
copies refresh.

#### AddItem

```lua
local ok, err = exports['hexa_core']:AddItem('coffee', {
    name = 'coffee',
    label = 'Coffee',
    weight = 200,
    type = 'item',
    unique = false,
    useable = true,
})
```

Returns `false, 'invalid_item_name'` if the name is not a string, `false, 'item_exists'` if the item
is already registered, otherwise `true, 'success'`. It refuses to overwrite - use `UpdateItem` for
that.

#### AddItems

```lua
local ok, err, badItem = exports['hexa_core']:AddItems({
    coffee = { name = 'coffee', label = 'Coffee', weight = 200 },
    sugar  = { name = 'sugar',  label = 'Sugar',  weight = 50 },
})
```

Registers a table of items in one pass and sends one `HexaCore:Client:OnSharedUpdateMultiple`
instead of one event per item. On failure it returns `false`, the reason, and the offending entry as
a third value.

::: warning Not a transaction
`AddItems` stops at the first bad entry, but the entries it already wrote stay written. If it
returns `false`, the catalogue is half-applied.
:::

#### UpdateItem

```lua
local ok, err = exports['hexa_core']:UpdateItem('coffee', {
    name = 'coffee',
    label = 'Black Coffee',
    weight = 180,
})
```

Replaces an existing definition. Returns `false, 'item_not_exists'` if the item was never
registered. The table you pass replaces the old one whole - it is not a merge.

#### RemoveItem

```lua
local ok, err = exports['hexa_core']:RemoveItem('coffee')
```

Deletes the definition from the catalogue. Returns `false, 'item_not_exists'` if it was not there.
This does not remove the item from anybody's inventory.

### Job catalogue

Identical shape to the item exports, against `Shared.Jobs`.

```lua
exports['hexa_core']:AddJob('miner', {
    label = 'Miner',
    defaultDuty = true,
    grades = {
        ['0'] = { name = 'Digger', payment = 50 },
        ['1'] = { name = 'Foreman', payment = 90, isboss = true },
    },
})

exports['hexa_core']:AddJobs(myJobTable)
exports['hexa_core']:UpdateJob('miner', updatedJob)
exports['hexa_core']:RemoveJob('miner')
```

Return values match the item side exactly: `invalid_job_name`, `job_exists`, `job_not_exists`,
`success`. `AddJobs` also returns the failing entry third.

On the core object these are `Core.RegisterJob`, `Core.RegisterJobs`, `Core.UpdateJobDefinition` and
`Core.UnregisterJob`.

### Extending the core object

#### SetField

```lua
exports['hexa_core']:SetField('Bank', {
    Accounts = {},
    MinDeposit = 5,
})
```

Writes a field onto the core table and fires `HexaCore:Server:UpdateObject` so every resource
holding a cached copy picks it up. Returns `false, 'invalid_field_name'` for a non-string name,
otherwise `true, 'success'`.

#### SetMethod

```lua
exports['hexa_core']:SetMethod('GetBankBalance', function(citizenid)
    return MySQL.scalar.await('SELECT balance FROM bank WHERE citizenid = ?', { citizenid })
end)
```

The legacy spelling for attaching a function. It writes into `HexaCore.Functions`, which the 3.0
metatable forwards straight back up onto `Core`, so the result is the same as `SetField` with a
function value. Returns `false, 'invalid_method_name'` or `true, 'success'`.

::: tip Prefer SetField
`Core.SetMethod` on the core object is a deprecated alias that warns once and forwards to
`Core.SetField`. New code should use `SetField` in both places.
:::

### Player status

Hunger, thirst, cleanliness and stress live in `PlayerData.metadata`, are clamped to `0-100`, and
are drained on a server-side timer configured by `Config.Status`. These four exports are the only
sanctioned way for another resource to move them.

```lua
-- eating
exports['hexa_core']:AddStatus(source, 'hunger', 20)

-- stress from a fight wears off
exports['hexa_core']:RemoveStatus(source, 'stress', 15)

-- a bath sets it outright
exports['hexa_core']:SetStatus(source, 'cleanliness', 100)

-- several at once
exports['hexa_core']:SetStatus(source, { hunger = 80, thirst = 75 })
```

Reading:

```lua
local all = exports['hexa_core']:GetStatus(source)
local hunger = exports['hexa_core']:GetStatus(source, 'hunger')
```

`GetStatus` returns `nil` when no character is loaded for that source. The writers return the table
of values they actually applied, or `nil` if nothing valid was passed. Keys outside
`hunger / thirst / cleanliness / stress` are silently dropped, on purpose - `injail`,
`criminalrecord` and friends must go through `Player.SetMetaData` instead.

Every write also mirrors the value into the player statebag, so a resource that does not want the
core object at all can read `Player(src).state.hunger` directly.

### Inventory storage codec

`users.inventory` and `users.loadout` are two JSON columns with a specific shape. Anything that
reads or writes those columns outside the core must use these exports so the format stays identical
everywhere. Weapons live only in `loadout`; ordinary items live only in `inventory`.

#### EncodeInventory / DecodeInventory

```lua
local rows = exports['hexa_core']:EncodeInventory(Player.PlayerData.items)
```

`EncodeInventory` takes an in-memory slot table and returns a sorted array of
`{ name, amount, slot, info }`, skipping weapons and anything with an amount of zero or less.
`DecodeInventory(raw)` takes the raw column value - string or already-decoded table - and returns
the same array shape. It reads the current array format, the older array format, and the legacy ESX
`{ name = count }` format.

#### EncodeLoadout / DecodeLoadout

```lua
local weapons = exports['hexa_core']:DecodeLoadout(row.loadout)
for _, w in ipairs(weapons) do
    print(w.name, w.serie, w.ammo)
end
```

Same pair for weapons. Each entry carries `name`, `slot`, `ammo`, `components`, `tintIndex`, `serie`
and `quality`. `serie` is the per-gun identity other systems key on, so preserve it when you write a
loadout back.

#### BuildSlots

```lua
local slots = exports['hexa_core']:BuildSlots(row.inventory, row.loadout)
```

Merges both columns back into one slot list, sorted by slot, weapons included. Entries that stored a
slot number get that slot back; entries without one - legacy rows, or collisions from corrupted data
- are packed into the remaining free slots in order.

#### IsWeapon

```lua
if exports['hexa_core']:IsWeapon(itemName) then
    -- goes to loadout, not inventory
end
```

The single authority on whether a name is a weapon. It reads `Shared.Weapons` inside the
`hexa_core` runtime, so it never sees a stale copy.

### Anti-cheat

#### ExploitBan

```lua
exports['hexa_core']:ExploitBan(source, 'negative money amount')
```

Drops the player with the localised `info.exploit_dropped` message and writes an `anticheat` entry
through `hexa_log:server:CreateLog`, which `hexa_core` now listens for itself and can forward to the
Discord webhook set in `Config.Log.Webhooks.anticheat`.

::: warning It drops, it does not ban
Despite the name, this export kicks the player for the current session. It does not write a ban
record and it does not stop a reconnect. Treat it as "eject and log", and pair it with your own ban
storage if you need persistence.
:::

---

## Client exports

### GetCoreObject

```lua
local Core = exports['hexa_core']:GetCoreObject()
```

Same contract as the server side: the flat client core table, carrying `Core.PlayerData`,
`Core.Config`, `Core.Shared` and every client function.

### Prompts

The prompt API is a thin bridge. `hexa_core` keeps the registration bookkeeping and hands the actual
drawing to `hexa_interaction`, which renders the RedM-style HTML overlay instead of the native
`UiPrompt` system. The export names and signatures did not change, so a resource written against the
old native prompts keeps working untouched.

```lua
exports['hexa_core']:createPrompt('saloon_bar', vector3(-321.4, 803.1, 118.4), 'ENTER', 'Order a drink', {
    type = 'client',
    event = 'myresource:client:OpenBarMenu',
})
```

```lua
-- fire a server event with arguments instead
exports['hexa_core']:createPrompt('post_office', coords, 'ENTER', 'Collect mail', {
    type = 'server',
    event = 'myresource:server:CollectMail',
    args = { 'valentine' },
})
```

`options.type` is `'client'` or `'server'`; anything other than `'client'` is treated as a server
event. `options.args` is unpacked into the event call. `options.promptLabel` overrides the short
in-game button label; leave it out and `hexa_interaction` falls back to the `text` argument.

::: warning The key argument is ignored
Every prompt in this stack uses the same interaction: hold ENTER for 1000ms. The `key` you pass is
stored in the prompt table so `getPrompt()` keeps its shape, but it does not change the binding.
Distances come from `Config.PromptDistance` (1.0, the range at which the prompt can be triggered) and
`Config.PromptVisible` (3.0, the range at which the marker appears).
:::

```lua
exports['hexa_core']:createPromptGroup('stable', 'Stable', coords, {
    { name = 'take_horse',  text = 'Take horse',  options = { type = 'client', event = 'stable:take' } },
    { name = 'store_horse', text = 'Store horse', options = { type = 'client', event = 'stable:store' } },
})
```

::: danger createPromptGroup shares one key
Because every member of a group is bound to the same held ENTER, one completed hold fires the
`onComplete` of every prompt in the group at once. Nothing in the stack currently calls
`createPromptGroup`. If you are about to be the first, open a selection menu instead, or register
the prompts individually.
:::

```lua
local prompts = exports['hexa_core']:getPrompt()
local groups  = exports['hexa_core']:getPromptGroup()

exports['hexa_core']:deletePrompt('saloon_bar')
exports['hexa_core']:deletePromptGroup('stable')
```

`getPrompt` and `getPromptGroup` return the whole registration tables. The delete pair clears the
local bookkeeping and calls `RemovePrompt` / `RemoveGroup` on `hexa_interaction`. Everything this
resource registered is torn down automatically on `onResourceStop`.

### On-screen text

A small RDR3 text drawer built on `CreateVarString` and `DisplayText`. One string at a time, pinned
to one of three screen positions.

```lua
exports['hexa_core']:DrawText('Hold ENTER to mount', 'right')
exports['hexa_core']:ChangeText('Release to dismount', 'top')
exports['hexa_core']:HideText()
```

`DrawText(text, pos)` starts the draw loop, `ChangeText(text, pos)` swaps the string in place,
`HideText()` and `KeyPressed()` both clear it - `KeyPressed` exists as a separate name only because
older callers used it as the "player acted, take the text down" hook.

`pos` accepts the short names `'left'`, `'right'`, `'top'`, or the long forms `'left-center'`,
`'right-center'`, `'top-center'`. Anything unrecognised falls back to `'right-center'`.

::: tip Driving it from the server
There are matching net events, so the server can put text on one player's screen without a client
export: `hexa_core:client:DrawText`, `hexa_core:client:ChangeText`, `hexa_core:client:HideText` and
`hexa_core:client:KeyPressed`, with the same arguments.

```lua
TriggerClientEvent('hexa_core:client:DrawText', source, 'The sheriff is watching', 'top')
```
:::

### Status

```lua
local all = exports['hexa_core']:GetStatus()
local hunger = exports['hexa_core']:GetStatus('hunger')
```

The client copy of the four status values, kept current by `HexaCore:Client:UpdateNeeds`. It starts
at `100` for each bar so a HUD never draws empty in the frames before the first server push arrives.

::: warning Same name, different signature
`GetStatus` exists on both sides. The server one takes `(src, key)`; the client one takes `(key)`
only. They are not interchangeable.
:::

```lua
-- refill the attribute cores and the stamina bar
exports['hexa_core']:RefillCores()

-- cores only, leave stamina alone
exports['hexa_core']:RefillCores(false)
```

`RefillCores` reads its targets from `Config.Status.Cores` and does nothing if that block is
disabled or the ped is dead. It is what you call after a revive or a model change. It also runs
automatically on `HexaCore:Client:OnPlayerLoaded`.

### Map zone colours

Binds a zone hash - state, district or region - to a blip style, and the game draws the border and
fill on both the minimap and the full map. Configured under `Config.Colormap`. There is no loop:
zones are painted once on resource start and stay painted until cleared.

```lua
-- paint the Ambarino state hash with a palette key
exports['hexa_core']:SetZoneColor(0x3B8DD21A, 'red')

-- or with a raw blip style, bypassing the palette
exports['hexa_core']:SetZoneColor(0x3B8DD21A, 'BLIP_STYLE_TURRET_WEAPON')

exports['hexa_core']:ResetZoneColor(0x3B8DD21A)

local painted = exports['hexa_core']:RefreshZoneColors()
exports['hexa_core']:ClearZoneColors()
```

`SetZoneColor(zone, color)` accepts a numeric hash or a string name for either argument; `color` may
be a palette key from `Config.Colormap.Colors` or a raw `BLIP_STYLE_*` name. It returns `true` on
success, `false` if either value failed to resolve.

`ResetZoneColor(zone)` clears one zone and returns a boolean. `RefreshZoneColors()` clears
everything this resource painted, repaints from `Config.Colormap.Zones`, and returns the number of
zones applied - `0` if the colormap is disabled. `ClearZoneColors()` clears without repainting.

Only zones painted by `hexa_core` are tracked, so these never wipe another resource's work.

### NUI security

#### GenerateCSRFToken

```lua
local token = exports['hexa_core']:GenerateCSRFToken()
SendNUIMessage({ action = 'open', token = token })
```

Issues a one-shot token for your NUI page to echo back through the `validateCSRF` callback.

::: danger This is not server-side security
The token is generated on the client, handed to that client's own NUI, and checked by that same
client. It stops a stray page or iframe in the player's CEF from firing your client callbacks. It
does nothing against a player who controls their own machine - they can simply not call
`validateCSRF`.

Every decision that matters - permissions, distance, money, item ownership - must be re-checked on
the server. A failed check now reports to `HexaCore:Server:ReportCSRFFailure` and the server decides
what to do about it under `Config.Security.CSRFFailurePolicy`; it no longer lets the client order
its own kick.
:::

---

## Shared exports

### GetWeapons

```lua
local weapons = exports['hexa_core']:GetWeapons()
```

Registered in `shared/main.lua`, so it answers on both the client and the server. Returns the
`Shared.Weapons` table live from inside the `hexa_core` runtime, which is why it is an export rather
than something you read off a cached core object.

---

## What changed in 3.0

### Export names did not change

The 3.0 flattening renamed a great many things on the core object. It renamed almost nothing on the
export surface, and that is deliberate: exports are the boundary that third-party and ported scripts
sit on, so breaking them would break every qb-core and rsg-core port on the server at once.

| Export (unchanged)                    | Core object (3.0)              |
| ------------------------------------- | ------------------------------ |
| `AddItem`                             | `Core.RegisterItem`            |
| `AddItems`                            | `Core.RegisterItems`           |
| `UpdateItem`                          | `Core.UpdateItemDefinition`    |
| `RemoveItem`                          | `Core.UnregisterItem`          |
| `AddJob`                              | `Core.RegisterJob`             |
| `AddJobs`                             | `Core.RegisterJobs`            |
| `UpdateJob`                           | `Core.UpdateJobDefinition`     |
| `RemoveJob`                           | `Core.UnregisterJob`           |
| `SetMethod`                           | `Core.SetField`                |
| `SetField`                            | `Core.SetField`                |

Calling the old name on the **core object** prints a one-time deprecation warning naming your
resource and then forwards. Calling the old name as an **export** prints nothing, because on that
surface it is not deprecated - it is the supported spelling.

::: tip The rule of thumb
If you hold the core object, use the 3.0 name. If you call across a resource boundary with
`exports['hexa_core']:`, use the name on this page.
:::

### Nothing was removed

No export was deleted in 3.0. Two areas changed underneath while keeping their public shape:

- **Prompts** no longer draw through the native `UiPrompt` system. `hexa_interaction` renders them
  now. `createPrompt`, `createPromptGroup`, `getPrompt`, `getPromptGroup`, `deletePrompt` and
  `deletePromptGroup` all still exist with unchanged signatures, and `hexa_core` forwards to
  `hexa_interaction` internally. A caller written against 2.x needs no edit.
- **On-screen text** still ships as `DrawText`, `ChangeText`, `HideText` and `KeyPressed`. The
  implementation uses the RDR3 `CreateVarString` / `DisplayText` path rather than any GTA-V text
  pipeline.

### New in 3.0

- `AwaitSchemaReady` - the database installer became part of the core, and this is how you wait for
  it.
- `GetStatus`, `SetStatus`, `AddStatus`, `RemoveStatus` on the server, `GetStatus` and `RefillCores`
  on the client - the needs system moved its timing to the server, and these are its public edges.
- `EncodeInventory`, `DecodeInventory`, `EncodeLoadout`, `DecodeLoadout`, `BuildSlots`, `IsWeapon` -
  the inventory codec was pulled into one place so the core and `hexa_inventory` can no longer write
  `users.inventory` in two different formats.
- `SetZoneColor`, `ResetZoneColor`, `RefreshZoneColors`, `ClearZoneColors` - map zone painting.
- `GetCoreVersion` now takes an optional caller name and logs through the gated debug printer.
