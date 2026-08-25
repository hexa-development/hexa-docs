# RSG Core compatibility

The `rsg-core` bridge exposes an RSG-shaped object while `hexa_core` remains the source of truth.
The export works on both server and client:

```lua
local RSGCore = exports['rsg-core']:GetCoreObject()
```

Start `rsg-core` after `hexa_core` and before every resource that calls this export or includes
`@rsg-core/shared/locale.lua`.

## Core object and shared data

The returned object supplies the familiar tables `Functions`, `Config`, `Shared`, callback tables and,
on the server, `Commands`, `Player`, `Players` and `UsableItems`.

- `Shared.Items`, `Shared.Jobs` and `Shared.Weapons` come from Hexa.
- `Shared.Gangs`, `Shared.Vehicles` and `Shared.Locations` are empty tables when Hexa has no equivalent.
- `Config.Player.MaxWeight` and `MaxInvSlots` are derived from
  `Config.Player.PlayerDefaults.weight` and `.slots` when needed.
- The server-only `Config.Server` fallback reports an open, non-whitelisted server with
  `admin` and `staff` permissions. It is compatibility data, not a server-control system.
- `RSGCore.Functions` mirrors matching Hexa functions with late binding. Only the overrides documented
  below translate a different signature; do not assume an arbitrary mirrored name has RSG semantics.

The bridge also publishes `shared/locale.lua` so resources that declare
`@rsg-core/shared/locale.lua` can keep using `Locale` and `Lang:t(...)`.

## Players

All supported lookup functions return a wrapped player:

```lua
local Player = RSGCore.Functions.GetPlayer(source)
local byCitizenId = RSGCore.Functions.GetPlayerByCitizenId(citizenid)
```

The explicit wrappers are `GetPlayer`, `GetPlayerByCitizenId`,
`GetOfflinePlayerByCitizenId`, `GetPlayerByLicense`, `GetPlayerByAccount` and
`GetPlayerByCharInfo`. `GetRSGPlayers`, `GetQBPlayers` and `GetHexaPlayers` return a map keyed by
server id.

`PlayerData` keeps Hexa's common fields and fills missing tables such as `money`, `charinfo`,
`metadata`, `items` and `job`. A default `gang` is added so scripts can safely read
`PlayerData.gang.name`; it does not create a functioning gang system.

### Flat and nested player methods

Wrapped methods are available in both forms:

```lua
Player.Functions.AddMoney('cash', 100, 'reward')
Player.AddMoney('cash', 100, 'reward')

Player.Functions.AddItem('bread', 1)
Player.AddItem('bread', 1)
```

Both forms call the same translated wrapper. Flat methods were added so resources that use the newer
RSG/QB player style do not receive `nil` even though nested methods work.

### Money aliases

`rsg-core/config.lua` ships with:

```lua
BridgeConfig.MoneyAliases = {
    money  = 'cash',
    crypto = false,
}
```

`AddMoney`, `RemoveMoney`, `SetMoney` and `GetMoney` translate the name first. Names absent from the
table pass through unchanged. A `false` mapping is unsupported: writers return `false`, readers
return `0`, and the console warns once. Map every custom money name deliberately before testing a
resource.

### Inventory behaviour

`AddItem(item, amount, slot, info, reason)` forces absent `slot` and `info` values to `false` while
crossing the resource boundary. It returns two booleans:

```lua
local accepted, dropped = Player.AddItem('bread', 1)
```

`accepted` is true when the item was stored or created as a ground drop. This prevents a purchasing
script from refunding money after a successful ground drop and duplicating the item. Check the second
value when your resource must distinguish inventory storage from a drop.

`RemoveItem` returns a boolean. `ClearInventory`, `SetInventory`, `GetSlotsByItem` and
`GetFirstSlotByItem` require the `hexa_inventory` resource; they return safe failure/empty values when
it is not started.

### Unsupported gang mutations

`Player.SetGang()` and `Player.SetGangDuty()` warn once and return `false`. The default gang object is
only nil protection. `AddJobReputation(amount)` is supported by storing a `metadata.jobrep` table keyed
by the current job.

## Notifications and permissions

Server calls use `Notify(source, text, type, length)` and client calls use
`Notify(text, type, length)`. A string or `{ text, caption }` table is translated into Hexa's single
toast shape. Known types include `primary`, `success`, `error`, `warning`, `info`, `police` and
`ambulance`; unknown values fall back to `primary`.

Permission aliases ship as:

```lua
BridgeConfig.PermissionAliases = {
    god = 'admin',
    mod = 'staff',
}
```

They apply to `AddPermission`, `RemovePermission`, `HasPermission` and `RSGCore.Commands.Add`.
`IsLicenseInUse` and `ExploitBan` are also supplied explicitly.

## Callbacks

The familiar calls are supported on both sides:

```lua
-- server
RSGCore.Functions.CreateCallback('example:get', function(src, cb, value)
    cb(value * 2)
end)

-- client
RSGCore.Functions.TriggerCallback('example:get', function(result)
    print(result)
end, 5)
```

`CreateClientCallback` and `TriggerClientCallback` support server-to-client requests. Unlike a
single-slot implementation keyed only by callback name, the bridge keeps a FIFO queue, so simultaneous
requests with the same name do not overwrite one another. Pending server-to-client entries are
discarded when that player disconnects.

## Forwarded events

Hexa lifecycle changes are re-emitted under RSG names:

| RSG event | Direction / source |
| --- | --- |
| `RSGCore:Client:OnPlayerLoaded`, `OnPlayerUnload` | client local, from Hexa lifecycle events |
| `RSGCore:Player:SetPlayerData` | client and server local, translated `PlayerData` |
| `RSGCore:Client:OnJobUpdate`, `OnMoneyChange`, `SetDuty` | client local |
| `RSGCore:Client:UpdateObject`, `OnSharedUpdate`, `OnSharedUpdateMultiple` | client local |
| `RSGCore:Server:PlayerLoaded`, `PlayerDropped`, `OnPlayerUnload`, `OnPlayerLoaded` | server local |
| `RSGCore:Server:OnJobUpdate`, `OnMoneyChange`, `SetDuty`, `UpdateObject`, `PermissionsChanged` | server local |

Incoming `RSGCore:Server:SetMetaData`, `RSGCore:ToggleDuty` and `RSGCore:UpdatePlayer` calls are
forwarded into Hexa's guarded handlers. `RSGCore:CallCommand` checks the command permission before
calling it. Teleport, coordinate teleport, vehicle spawn and vehicle delete command events are
translated on the client.

::: warning Deprecated item net events are intentional no-ops
`RSGCore:Server:UseItem`, `RSGCore:Server:AddItem` and `RSGCore:Server:RemoveItem` are accepted only to
print a warning. They do not mutate inventory because exposing those client-triggered operations would
be exploitable. Use a validated server-side player method instead.
:::

## Known boundaries

- There is no gang backend; default gang data and setters do not persist a gang.
- Empty `Vehicles` and `Locations` tables prevent nil indexing but do not provide those catalogues.
- Inventory helper coverage depends on `hexa_inventory`.
- A mirrored Hexa function is a pass-through unless this page documents a translated contract.
- Test framework-version-specific resources; the bridge targets common APIs, not every RSG release.

