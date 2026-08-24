# Upgrading from 2.x to 3.0

Version 3.0 flattens the public API. `Core.Functions.GetPlayer(source)` became `Core.GetPlayer(source)`,
`Player.Functions.AddMoney(...)` became `Player.AddMoney(...)`, and a long list of functions were renamed
so that their names say what they actually do.

**Your server will not break the moment you update.** Every old spelling listed on this page still
resolves, forwards to the new function, and returns exactly what it used to. The only visible change on
day one is a warning in the console.

## Nothing breaks on day one

`hexa_core` loads `server/compat.lua` and `client/compat.lua` last, after every real function exists, and
binds an alias for each old name. Calling an old name forwards the call and prints one warning:

```
[hexa_core] [WARN] my_resource calls Core.GetSource which was renamed to Core.GetSourceByIdentifier - update the call, the old name goes away next release
```

Three things about that warning:

- It names the calling resource, resolved with `GetInvokingResource()`, so you know exactly which file to
  open. If the call did not cross a resource boundary it prints `unknown resource`.
- It prints **once per name** for the lifetime of the resource. A rename called ten thousand times a
  minute still produces one line. That is `Hexa.WarnOnce` in `shared/log.lua`.
- It is a warning, not an error. The return value is the real function's return value.

::: warning
The aliases exist for one release only. Treat every warning line in your console as a task item -- the
next version of `hexa_core` deletes `compat.lua` and those call sites become `attempt to call a nil value`.
:::

### The `.Functions` layer is still a real table

`Core.Functions` and `Player.Functions` were not replaced by proxies that only answer `__index`. They are
real tables, and every function hung on `Core` or on a player object is mirrored into them automatically.

```lua
local Core = exports['hexa_core']:GetCoreObject()

-- both of these are the same function, today
local a = Core.GetPlayer
local b = Core.Functions.GetPlayer
```

That matters because the bridge copies the table with `pairs()` rather than indexing it one key
at a time. A metatable-only proxy would have mirrored zero functions and silently killed every ported
script on the server.

## The new shape

```lua
-- 2.x
local Core = exports['hexa_core']:GetCoreObject()
local Player = Core.Functions.GetPlayer(source)
Player.Functions.AddMoney('cash', 100, 'reward')
```

```lua
-- 3.0
local Core = exports['hexa_core']:GetCoreObject()
local Player = Core.GetPlayer(source)
Player.AddMoney('cash', 100, 'reward')
```

`HexaCore` and `Core` are the same table, on both sides. Code that says `HexaCore.GetPlayer(source)` needs
no edit at all.

## Rename table: Core object, server

Every entry below has a working alias in `server/compat.lua`.

| Old spelling | New spelling |
| --- | --- |
| `Core.GetSource` | `Core.GetSourceByIdentifier` |
| `Core.GetHexaPlayers` | `Core.GetPlayerObjects` |
| `Core.CanUseItem` | `Core.GetUsableItem` |
| `Core.GetPermission` | `Core.GetPermissions` |
| `Core.IsOptin` | `Core.IsAdminAlertsEnabled` |
| `Core.ToggleOptin` | `Core.ToggleAdminAlerts` |
| `Core.ChangeWeight` | `Core.SetMaxWeight` |
| `Core.ChangeSlots` | `Core.SetMaxSlots` |
| `Core.AddPlayerMethod` | `Core.SetPlayerField` |
| `Core.AddPlayerField` | `Core.SetPlayerField` |
| `Core.SetMethod` | `Core.SetField` |
| `Core.CreateFingerId` | `Core.CreateFingerprint` |
| `Core.CreateSerialNumber` | `Core.CreatePhoneSerial` |

`AddPlayerMethod` and `AddPlayerField` collapsed into one function because after the `.Functions` layer
was flattened they wrote into the same slot. Same reason for `SetMethod` and `SetField`.

## Rename table: the dissolved `Core.Player` namespace

The server-side lifecycle namespace `HexaCore.Player.*` is gone. Its functions moved up onto `Core`, and
the six that would have collided with a player-object method got a disambiguating noun.

| Old spelling | New spelling |
| --- | --- |
| `Core.Player.Login` | `Core.LoginPlayer` |
| `Core.Player.Logout` | `Core.LogoutPlayer` |
| `Core.Player.Save` | `Core.SavePlayer` |
| `Core.Player.SaveOffline` | `Core.SaveOfflinePlayer` |
| `Core.Player.CheckPlayerData` | `Core.LoadPlayer` |
| `Core.Player.GetOfflinePlayer` | `Core.GetOfflinePlayerByCitizenId` |

Everything else on that namespace kept its leaf name and simply moved up a level:

| Old spelling | New spelling |
| --- | --- |
| `Core.Player.CreatePlayer` | `Core.CreatePlayer` |
| `Core.Player.DeleteCharacter` | `Core.DeleteCharacter` |
| `Core.Player.ForceDeleteCharacter` | `Core.ForceDeleteCharacter` |
| `Core.Player.CreateCitizenId` | `Core.CreateCitizenId` |
| `Core.Player.CreateWalletId` | `Core.CreateWalletId` |
| `Core.Player.CreateAccountNumber` | `Core.CreateAccountNumber` |
| `Core.Player.SaveInventory` | `Core.SaveInventory` |
| `Core.Player.SaveOfflineInventory` | `Core.SaveOfflineInventory` |

The compat layer does not enumerate that second list. `Core.Player` is a stand-in table whose `__index`
catches **any** key, maps it through the six renames above if it matches, and otherwise looks for the bare
name on `Core`. So `Core.Player.CreateCitizenId()` keeps working without anyone having listed it.

```lua
-- 2.x
Core.Player.Save(source)
Core.Player.CheckPlayerData(source, data)

-- 3.0
Core.SavePlayer(source)
Core.LoadPlayer(source, data)
```

## Rename table: Core object, client

These were renamed because their old names implied server semantics. `GetPlayers` on the client returns
**client player indices**, not server ids -- a script that treated one as the other was passing garbage to
the server. The new names say "Local" so the mistake is visible at the call site.

| Old spelling | New spelling |
| --- | --- |
| `Core.GetPlayers` | `Core.GetLocalPlayers` |
| `Core.GetPlayersFromCoords` | `Core.GetLocalPlayersInRadius` |
| `Core.GetClosestPlayer` | `Core.GetClosestLocalPlayer` |
| `Core.CreateClientCallback` | `Core.CreateCallback` |
| `Core.LookAtEntity` | `Core.TurnPedToFaceEntity` |
| `Core.RequestAnimDict` | `Core.LoadAnimDict` |
| `Core.LoadParticleDictionary` | `Core.LoadPtfxAsset` |
| `Core.AttachProp` | `Core.CreateAttachedProp` |
| `Core.SpawnClear` | `Core.IsAreaClearOfVehicles` |
| `Core.GetStreetNametAtCoords` | `Core.GetStreetNamesAtCoords` |
| `Core.GetCurrentTime` | `Core.GetInGameTime` |
| `Core.GetGroundZCoord` | `Core.GetGroundCoords` |
| `Core.GetGroundHash` | `Core.GetGroundMaterial` |

::: danger Client and server both have a `GetPlayers`
`Core.GetPlayers()` on the **server** was not renamed and still returns server ids. Only the client one
moved. If you share a file between both sides, check which runtime you are in.
:::

`GetStreetNametAtCoords` was a typo that survived for years. The new name is `GetStreetNamesAtCoords`.

## Rename table: the player object

| Old spelling | New spelling |
| --- | --- |
| `Player.UpdatePlayerData` | `Player.SyncPlayerData` |
| `Player.PersistStateBags` | `Player.PullStateBags` |
| `Player.InitializeStateBags` | `Player.PushStateBags` |
| `Player.AddMethod` | `Player.SetField` |
| `Player.AddField` | `Player.SetField` |

`UpdatePlayerData` never mutated anything. It broadcast the current `PlayerData` to the owning client and
to server-side listeners, which is what `SyncPlayerData` says.

The state bag pair was renamed for direction. `PullStateBags` reads `hunger`, `thirst`, `cleanliness`,
`stress` and `health` out of the player's state bag and into metadata -- it runs before a save.
`PushStateBags` writes metadata back into the state bag -- it runs when the character is constructed.

::: warning No alias for these three
`AddMethod` and `AddField` are plain aliases of `SetField` on the player object and are silent. The other
three -- `UpdatePlayerData`, `PersistStateBags`, `InitializeStateBags` -- have **no** compat entry. They
are gone today, not next release. Grep for them before you update.
:::

## Rename table: logging

| Old spelling | New spelling |
| --- | --- |
| `Core.Debug` (one line) | `Core.PrintDebug` |
| `Core.Debug` (a table) | `Core.DumpTable` |

`Core.Debug` used to mean two different things depending on which side you called it from: the client took
`(resource, obj, depth)` and dumped a table, the server took `(tbl, indent)`. It is now split into two
functions with one job each, identical on both sides.

```lua
Core.Log('vehicle %s spawned for %s', plate, GetPlayerName(source))
Core.Warn('shop %s has no stock table', shopId)
Core.Error('save failed for citizenid %s', citizenid)
Core.PrintDebug('tick %d, %d peds tracked', tick, count)
Core.DumpTable(Player.PlayerData)
```

All five are printf style and take the same arguments on client and server. `Core.PrintDebug` is gated on
`Config.Debug` and checks that switch **before** formatting, so leaving debug calls in shipped code costs
nothing while the switch is off.

::: tip Log lines are English on purpose
Every log string in `hexa_core` is English, deliberately. Some server consoles mangle Thai, and operators
scan console output fast. Code comments and player-facing text are unaffected.
:::

The client keeps a `Core.Debug` alias that inspects its arguments and guesses whether you meant
`PrintDebug` or `DumpTable`. The server does not -- on the server, `Core.Debug` is simply gone.

## Catalogue verbs versus player verbs

This is the single most important change in 3.0. In 2.x, `AddItem` meant two opposite things depending on
what you called it on:

- `Core.AddItem('golden_ring', {...})` registered an item **type** in the shared catalogue.
- `Player.AddItem('golden_ring', 1)` put one in a **player's** satchel.

Same verb, completely different operation, and the argument shapes are close enough that a mistake fails
quietly. 3.0 splits them. Catalogue operations use `Register` / `Unregister` / `Update...Definition`.
Player operations keep `Add` / `Remove`.

| Operation | 2.x | 3.0 |
| --- | --- | --- |
| Register an item type | `Core.AddItem` | `Core.RegisterItem` |
| Register many item types | `Core.AddItems` | `Core.RegisterItems` |
| Change an item type | `Core.UpdateItem` | `Core.UpdateItemDefinition` |
| Delete an item type | `Core.RemoveItem` | `Core.UnregisterItem` |
| Register a job | `Core.AddJob` | `Core.RegisterJob` |
| Register many jobs | `Core.AddJobs` | `Core.RegisterJobs` |
| Change a job | `Core.UpdateJob` | `Core.UpdateJobDefinition` |
| Delete a job | `Core.RemoveJob` | `Core.UnregisterJob` |
| Give an item to a player | `Player.Functions.AddItem` | `Player.AddItem` |
| Take an item from a player | `Player.Functions.RemoveItem` | `Player.RemoveItem` |

Before:

```lua
-- 2.x: both of these are called AddItem
Core.AddItem('golden_ring', { name = 'golden_ring', label = 'Golden Ring', weight = 100 })
local Player = Core.Functions.GetPlayer(source)
Player.Functions.AddItem('golden_ring', 1)
```

After:

```lua
-- 3.0: the catalogue verb and the player verb no longer look alike
Core.RegisterItem('golden_ring', { name = 'golden_ring', label = 'Golden Ring', weight = 100 })
local Player = Core.GetPlayer(source)
Player.AddItem('golden_ring', 1)
```

::: danger Read the receiver, not the verb
`Core.RegisterItem` changes what the item *is* for everyone on the server. `Player.AddItem` changes what
one character is *carrying*. If a migration ever leaves you unsure which one a line meant, look at what it
is called on.
:::

`Core.RegisterItem` returns `true, 'success'`, or `false` plus a reason string such as `'item_exists'` or
`'invalid_item_name'`. `Core.RegisterItems` returns a third value: the offending entry.

## Exports that are kept permanently

The export surface is the one place where the old verbs stay forever. Ported scripts call
`exports['hexa_core']:AddItem(...)` on the catalogue, and rewriting every one of them was not worth it.

```lua
-- these keep working, permanently, with no warning
exports['hexa_core']:AddItem('golden_ring', itemData)
exports['hexa_core']:RemoveItem('golden_ring')
```

The full permanent export list on the server:

| Export | What it does |
| --- | --- |
| `GetCoreObject` | Returns the `Core` table |
| `AddItem` / `AddItems` | Register item types |
| `UpdateItem` / `RemoveItem` | Change or delete an item type |
| `AddJob` / `AddJobs` | Register jobs |
| `UpdateJob` / `RemoveJob` | Change or delete a job |
| `SetField` / `SetMethod` | Attach a field or function to `Core` |
| `GetCoreVersion` | Reads the `version` metadata of `hexa_core` |
| `ExploitBan` | Drops a player and files an anticheat log |

::: warning Exports and Core methods are not the same surface
`exports['hexa_core']:AddItem` is permanent. `Core.AddItem` is a deprecated alias that disappears next
release. If your code holds the core object, use `Core.RegisterItem`.
:::

## Names that did not change

Do not "migrate" these. They are the same in 3.0, only one level shallower:

**Core, server:** `GetPlayer`, `GetPlayers`, `GetPlayerByCitizenId`, `GetPlayerByLicense`,
`GetPlayerByAccount`, `GetPlayerByCharInfo`, `GetPlayersOnDuty`, `GetDutyCount`, `GetIdentifier`,
`Notify`, `HasPermission`, `AddPermission`, `RemovePermission`, `CreateCallback`, `TriggerCallback`,
`CreateUseableItem`, `UseItem`, `HasItem`, `CanCarryItem`, `Kick`, `GetCoords`, `SpawnVehicle`,
`CreateVehicle`, `GetClosestPlayer`, `GetClosestPed`, `GetClosestVehicle`, `GetClosestObject`,
`SetPlayerBucket`, `SetEntityBucket`, `GetPlayersInBucket`, `GetEntitiesInBucket`, `GetBucketObjects`,
`Commands.Add`, `Commands.Refresh`.

**Core, client:** `GetPlayerData`, `GetCoords`, `HasItem`, `TriggerCallback`,
`PlayAnim`, `DrawText`, `DrawText3D`, `SpawnVehicle`, `DeleteVehicle`, `GetPlate`, `GetVehicleLabel`,
`GetVehicleProperties`, `SetVehicleProperties`, `GetPeds`, `GetVehicles`, `GetObjects`,
`GetClosestPed`, `GetClosestVehicle`, `GetClosestObject`, `GetZoneAtCoords`, `GetCardinalDirection`.

**Player object:** `AddMoney`, `RemoveMoney`, `SetMoney`, `GetMoney`, `SetJob`, `SetJobDuty`,
`SetMetaData`, `GetMetaData`, `SetPlayerData`, `AddItem`, `RemoveItem`, `GetItemBySlot`, `GetItemByName`,
`GetItemsByName`, `GetTotalWeight`, `HasItem`, `Save`, `Logout`.

Event names did not change either. `HexaCore:Server:PlayerLoaded`, `HexaCore:Client:OnPlayerUnload`,
`HexaCore:Player:SetPlayerData`, `HexaCore:Server:OnJobUpdate` and the rest are untouched.

## What is genuinely gone

### The client no longer owns the save cadence

In 2.x, `client/loops.lua` counted down and fired `HexaCore:UpdatePlayer` at the server. A client that
never fired it was never saved, and a client that fired it in a loop could hammer MySQL.

The countdown now lives in `server/save.lua` and the client has no say. `HexaCore:UpdatePlayer` is
registered with `AddEventHandler`, **not** `RegisterNetEvent`, so a client cannot reach it at all any
more; it survives only so the bridge can forward a save request from server code, and even that
path is rate limited to one save per player per 30 seconds.

```lua
-- 2.x, from a client script: no longer possible
TriggerServerEvent('HexaCore:UpdatePlayer')

-- 3.0, from server code
local Player = Core.GetPlayer(source)
Player.Save()
```

### Reputation methods

`Player.AddRep`, `Player.RemoveRep` and `Player.GetRep` are on the way out. `server/compat.lua` lists them
as removed and stands ready to replace them with stubs that return a safe empty value (`false`, `false`,
`0`) rather than pretend a reputation system exists. Do not build anything new on them, and do not read
`metadata.rep` from a new resource.

### `Core.Debug` on the server

Split into `Core.PrintDebug` and `Core.DumpTable`, with no server-side alias. See
[logging](#rename-table-logging).

## New in 3.0 worth adopting

### Saving is a server-side sweep with a dirty flag

```lua
Config.Save.Interval = 45        -- minutes between sweeps, minimum 1
Config.Save.SpreadSeconds = 60   -- spread the writes across this many seconds
Config.Save.OnDrop = true         -- a dropped player is written out immediately
Config.Save.OnResourceStop = true -- write everyone out before the resource stops
```

Each sweep collects only players whose `Dirty` flag is set, then staggers their writes across
`SpreadSeconds` so a full server does not fire 48 MySQL writes in one tick. Every mutating player method
sets the flag for you.

If your resource changes player data through some path the core cannot see, force the player into the next
sweep yourself:

```lua
local Player = Core.GetPlayer(source)
Player.MarkDirty()
```

`Core.SaveAllPlayers()` writes everyone immediately with no stagger and returns how many it saved. It is
what the `onResourceStop` handler calls; use it only when you really cannot wait.

The old `Config.UpdateInterval` still reads, because `config.lua` assigns it from `Config.Save.Interval`.

### Logs finally have a destination

`hexa_log:server:CreateLog` was fired from 23 call sites across four resources, and nothing on the server
listened for it. Every one of those logs vanished -- joins, leaves, character deletions, anticheat alerts.

`hexa_core` now handles the event itself, prints it to the console, and forwards it to Discord if a webhook
is configured:

```lua
Config.Log.Enabled = true

Config.Log.Webhooks = {
    default   = '',
    joinleave = '',
    anticheat = '',
}
```

The webhook is chosen by the log's category, falling back to `default`. An empty string means no forward.
Existing call sites need no edit:

```lua
TriggerEvent('hexa_log:server:CreateLog', 'anticheat', 'Anti-Cheat', 'red', message)
```

### `Player.SetGang(gang, grade)`

A documented no-op that always returns `false`. This server has no gang system, but the bridge calls
the method unconditionally, and returning `false` is better than the `nil` that used to blow up the bridge.

### `Player.CanCarryItem(item, amount)`

Added because consumers kept guessing that name and not finding it. It forwards to
`Core.CanCarryItem(source, item, amount)`.

## How to migrate your own resource

1. **Update `hexa_core` first and read the console.** Start the server, play for a few minutes, exercise
   the flows you care about. Every deprecated call you own prints exactly one line naming your resource.

2. **Fix the fetch, then the method.** In most files two lines change:

   ```lua
   -- before
   local Player = Core.Functions.GetPlayer(source)
   Player.Functions.AddMoney('cash', 100, 'reward')

   -- after
   local Player = Core.GetPlayer(source)
   Player.AddMoney('cash', 100, 'reward')
   ```

3. **Grep for `.Functions.`** across your resource. Deleting the segment is correct for every function on
   both the core object and the player object.

4. **Grep for the three methods with no alias:** `UpdatePlayerData`, `PersistStateBags`,
   `InitializeStateBags`. These break immediately, and no warning tells you about them.

5. **Grep for `AddItem` and `RemoveItem` and read each receiver.** A call on `Core` is a catalogue
   operation and becomes `RegisterItem` / `UnregisterItem`. A call on a player object stays as it is. A
   call through `exports['hexa_core']` needs no edit ever.

6. **Grep for client-side `GetPlayers`, `GetPlayersFromCoords`, `GetClosestPlayer`.** Rename them, and
   while you are in there confirm you were not feeding a client player index to a server event.

7. **Replace `Core.Debug`** with `Core.PrintDebug` for one-line output or `Core.DumpTable` for a table.

8. **Run again with `Config.Debug = true`** and confirm the console is quiet of `[WARN]` lines from your
   resource. A silent console is the finish line.

::: tip Migrate in one pass per resource
The warning fires once per name, not once per call site. A resource that calls `Core.GetSource` in six
files prints one line, and it keeps printing that line until the last of the six is fixed. Grep rather
than trusting the console to count for you.
:::
