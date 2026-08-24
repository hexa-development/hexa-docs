# Server functions

Everything the framework exposes on the server hangs directly off the core object. There is no
`.Functions` layer any more.

```lua
local Core = exports['hexa_core']:GetCoreObject()

local Player = Core.GetPlayer(source)
```

`Core.Functions` still resolves for one more release. It is a real table that mirrors every function
on `Core`, so `Core.Functions.GetPlayer(source)` keeps working, but it is deprecated and the
compatibility layer will be removed.

The source for this page is `server/functions.lua`, `server/player.lua`, `server/exports.lua`,
`server/commands.lua`, `server/save.lua` and `server/main.lua`.

::: danger Registering an item is not giving an item
`Core.RegisterItem(name, definition)` adds an item **type** to the shared catalogue. It never touches
a player.

`Player.AddItem(name, amount)` puts an item **in a character's satchel**.

These two used to share the verb `AddItem` and mean opposite things. If you are handing something to
a person, you want the player object, never `Core`.
:::

## Deprecated spellings

Old names still resolve. Calling one prints a single warning naming the resource that called it, then
forwards to the new function. They are removed next release.

| Old spelling | Call this instead |
| --- | --- |
| `Core.GetSource` | `Core.GetSourceByIdentifier` |
| `Core.GetHexaPlayers` | `Core.GetPlayerObjects` |
| `Core.CanUseItem` | `Core.GetUsableItem` |
| `Core.GetPermission` | `Core.GetPermissions` |
| `Core.IsOptin` | `Core.IsAdminAlertsEnabled` |
| `Core.ToggleOptin` | `Core.ToggleAdminAlerts` |
| `Core.ChangeWeight` | `Core.SetMaxWeight` |
| `Core.ChangeSlots` | `Core.SetMaxSlots` |
| `Core.AddPlayerMethod`, `Core.AddPlayerField` | `Core.SetPlayerField` |
| `Core.SetMethod` | `Core.SetField` |
| `Core.AddJob` | `Core.RegisterJob` |
| `Core.AddJobs` | `Core.RegisterJobs` |
| `Core.RemoveJob` | `Core.UnregisterJob` |
| `Core.UpdateJob` | `Core.UpdateJobDefinition` |
| `Core.AddItem` | `Core.RegisterItem` |
| `Core.AddItems` | `Core.RegisterItems` |
| `Core.UpdateItem` | `Core.UpdateItemDefinition` |
| `Core.RemoveItem` | `Core.UnregisterItem` |
| `Core.CreateFingerId` | `Core.CreateFingerprint` |
| `Core.CreateSerialNumber` | `Core.CreatePhoneSerial` |

The whole `Core.Player.*` namespace was dissolved into `Core`. `Core.Player` survives as a warning
shim that forwards any key it can resolve.

| Old spelling | Call this instead |
| --- | --- |
| `Core.Player.Login` | `Core.LoginPlayer` |
| `Core.Player.Logout` | `Core.LogoutPlayer` |
| `Core.Player.Save` | `Core.SavePlayer` |
| `Core.Player.SaveOffline` | `Core.SaveOfflinePlayer` |
| `Core.Player.CheckPlayerData` | `Core.LoadPlayer` |
| `Core.Player.GetOfflinePlayer` | `Core.GetOfflinePlayerByCitizenId` |
| `Core.Player.CreatePlayer`, `Core.Player.DeleteCharacter`, `Core.Player.CreateCitizenId`, and the rest | the same leaf name directly on `Core` |

## Players

### GetPlayer

```lua
Core.GetPlayer(source) --> table|nil
```

Returns the loaded player object for a server id, or `nil` if that id has no character loaded. A
string argument is treated as an identifier and resolved through `Core.GetSourceByIdentifier` first.

```lua
RegisterCommand('whoami', function(source)
    local Player = Core.GetPlayer(source)
    if not Player then return end
    Core.Notify(source, { title = Player.PlayerData.citizenid, type = 'info', duration = 5000 })
end, false)
```

### GetPlayerByCitizenId

```lua
Core.GetPlayerByCitizenId(citizenid) --> table|nil
```

Scans the online roster for a matching `PlayerData.citizenid`. Online only; for a character that is
not connected use `Core.GetOfflinePlayerByCitizenId`.

### GetPlayerByLicense

```lua
Core.GetPlayerByLicense(license) --> table|nil
```

Returns the online player for that identifier if there is one, otherwise falls through to
`Core.GetOfflinePlayerByLicense` and loads the row from the database.

### GetPlayerByAccount

```lua
Core.GetPlayerByAccount(account) --> table|nil
```

Finds an online player by `PlayerData.charinfo.account`, the bank account number generated at
character creation.

### GetPlayerByCharInfo

```lua
Core.GetPlayerByCharInfo(property, value) --> table|nil
```

Finds an online player whose `charinfo[property]` equals `value`.

```lua
local Player = Core.GetPlayerByCharInfo('firstname', 'Arthur')
```

### GetPlayers

```lua
Core.GetPlayers() --> table
```

An array of the server ids that currently have a character loaded. Ids only, no player objects.

### GetPlayerObjects

```lua
Core.GetPlayerObjects() --> table
```

The live roster table itself, keyed by server id, values are player objects. This is not a copy, so
do not insert into it or remove from it.

```lua
for src, Player in pairs(Core.GetPlayerObjects()) do
    Player.AddMoney('cash', 5, 'server wide bonus')
end
```

Deprecated spelling: `Core.GetHexaPlayers`.

### GetPlayersOnDuty

```lua
Core.GetPlayersOnDuty(job) --> table, number
```

Returns the array of server ids on duty for that job, and the count as a second value.

```lua
local medics, count = Core.GetPlayersOnDuty('doctor')
```

### GetDutyCount

```lua
Core.GetDutyCount(job) --> number
```

The count on its own, without building the array.

### GetIdentifier

```lua
Core.GetIdentifier(source, idtype) --> string|nil
```

Reads one identifier off a connected player. `idtype` defaults to `Config.IdentifierType`, which is
`steam` on this server.

### GetSourceByIdentifier

```lua
Core.GetSourceByIdentifier(identifier) --> number
```

Walks the online roster looking for a player who owns that identifier. Returns `0` when nobody does,
not `nil`.

Deprecated spelling: `Core.GetSource`.

### GetOfflinePlayerByCitizenId

```lua
Core.GetOfflinePlayerByCitizenId(citizenid) --> table|nil
```

Loads a character out of the `users` table and builds a full player object for it without that player
being connected. The object is flagged `Offline`, so its methods mutate `PlayerData` but broadcast
nothing to any client.

```lua
local Player = Core.GetOfflinePlayerByCitizenId('RB0087')
if Player then
    Player.AddMoney('bank', 250, 'offline payout')
    Player.Save()
end
```

::: warning
An offline object is a detached snapshot. If that character logs in while you are holding one, both
copies will write to the same row and the later `Save()` wins. Get in, change, `Save()`, drop the
reference.
:::

### GetOfflinePlayerByLicense

```lua
Core.GetOfflinePlayerByLicense(license) --> table|nil
```

The same thing keyed by the `identifier` column instead of the citizen id.

### Notify

```lua
Core.Notify(source, data)
```

Sends the built-in notification to one player. `data` takes `title`, `description`, `type` and
`duration`. A `source` of `0` or `nil` (a console command, a hook that lost its id) is printed to the
server console instead of crashing.

```lua
Core.Notify(source, {
    title = 'Delivery complete',
    description = 'The wagon reached Valentine.',
    type = 'success',
    duration = 5000
})
```

### Kick

```lua
Core.Kick(source, reason, setKickReason, deferrals)
```

Drops a player with a reason, and keeps re-dropping for a few seconds so a client that ignores the
first drop still leaves. Pass the connection deferral's `setKickReason` function and `deferrals`
object when you are kicking during `playerConnecting`; pass `nil` for both when the player is already
in game.

### GetCoords

```lua
Core.GetCoords(entity) --> vector4
```

Position plus heading of any entity, packed as `vector4(x, y, z, heading)`.

### GetClosestPlayer, GetClosestPed, GetClosestVehicle, GetClosestObject

```lua
Core.GetClosestPlayer(source, coords)  --> number, number
Core.GetClosestPed(source, coords)     --> number, number
Core.GetClosestVehicle(source, coords) --> number, number
Core.GetClosestObject(source, coords)  --> number, number
```

Each returns the closest entity and its distance, or `-1, -1` when there is nothing to find. `coords`
is optional and defaults to the coordinates of `source`'s ped. `GetClosestPlayer` returns a server id
and skips the calling player; the other three return entity handles.

```lua
local target, distance = Core.GetClosestPlayer(source)
if target ~= -1 and distance < 3.0 then
    Core.Notify(target, { title = 'Someone is right next to you', type = 'info', duration = 3000 })
end
```

### PrepForSQL

```lua
Core.PrepForSQL(source, data, pattern) --> boolean
```

Returns `true` when `data` matches `pattern` over its whole length. On a mismatch it logs an
anticheat entry naming the player and returns `false`.

### GetDatabaseInfo

```lua
Core.GetDatabaseInfo() --> table
```

Parses the `mysql_connection_string` convar and returns `{ exists = boolean, database = string }`.

## Money and items

Money lives on the player object, not on `Core`. There is no `Core.AddMoney`.

```lua
local Player = Core.GetPlayer(source)
Player.AddMoney('cash', 100, 'reward')
Player.RemoveMoney('bank', 40, 'stamp duty')
local balance = Player.GetMoney('cash')
```

The money types are whatever `Config.Money.MoneyTypes` defines: `cash`, `bank` and `gold` by default.
`AddMoney` and `RemoveMoney` return `false` for a money type the character does not have.

### CanCarryItem

```lua
Core.CanCarryItem(source, item, amount) --> boolean
```

Checks the item's weight from the shared catalogue against what the character is already carrying.
Returns `false` if the item is unknown, if the player is not loaded, or if the inventory resource
is not
running. `amount` defaults to `1`.

```lua
if not Core.CanCarryItem(source, 'bread', 5) then
    return Core.Notify(source, { title = 'Your satchel is full', type = 'error', duration = 4000 })
end
```

The same check is on the player object as `Player.CanCarryItem(item, amount)`.

### HasItem

```lua
Core.HasItem(source, items, amount) --> boolean
```

Forwards to the inventory resource. `items` may be a name or a table of names. Returns `false` when the
inventory resource is not started. `Player.HasItem(items, amount)` is the same call from the player
object.

### CreateUseableItem

```lua
Core.CreateUseableItem(item, handler)
```

Registers what happens when a player uses that item. The handler receives the source and the item
table.

```lua
Core.CreateUseableItem('bread', function(source, item)
    local Player = Core.GetPlayer(source)
    if not Player then return end
    Player.RemoveItem('bread', 1, item.slot, 'eaten')
    Player.SetMetaData('hunger', Player.GetMetaData('hunger') + 20)
end)
```

### GetUsableItem

```lua
Core.GetUsableItem(item) --> function|nil
```

Returns the handler registered for that item, or `nil`. Use it to test whether an item is usable.

Deprecated spelling: `Core.CanUseItem`.

### UseItem

```lua
Core.UseItem(source, item)
```

Asks the inventory resource to run the item's use flow. Logs a warning and does nothing if the inventory
resource is not started.

### SetMaxWeight

```lua
Core.SetMaxWeight(source, weight)
```

Sets the character's carry capacity. This server uses a percentage weight system, so the default is
`100`. Writes through `SetPlayerData`, so it syncs and marks the player dirty. Returns nothing.

Deprecated spelling: `Core.ChangeWeight`.

### SetMaxSlots

```lua
Core.SetMaxSlots(source, slots)
```

Sets the number of satchel slots, default `25`. Returns nothing.

Deprecated spelling: `Core.ChangeSlots`.

### GetTotalWeight, GetSlotsByItem, GetFirstSlotByItem

```lua
Core.GetTotalWeight(items)              --> number|nil
Core.GetSlotsByItem(items, itemName)    --> table|nil
Core.GetFirstSlotByItem(items, itemName)--> number|nil
```

Thin pass-throughs to the inventory resource that take a slot table (usually `Player.PlayerData.items`).
All three return `nil` when the inventory resource is not started.

### SaveInventory, SaveOfflineInventory

```lua
Core.SaveInventory(source)
Core.SaveOfflineInventory(PlayerData)
```

Write only the satchel back to the database. `Core.SavePlayer` already does this for you; reach for
these only when you deliberately want the inventory written without the rest of the row.

## The item and job catalogue

These functions edit the shared catalogue of item and job **definitions**. Every one of them
broadcasts the change to connected clients and fires `HexaCore:Server:UpdateObject`. All of them
return `success, message`, and the multi-add variants return a third value with the entry that
failed.

The database is the source of truth for both catalogues: `hexa_core` reads the `items`, `jobs` and
`job_grades` tables on boot. Use these functions for definitions your own resource owns at runtime.

### RegisterItem

```lua
Core.RegisterItem(itemName, item) --> boolean, string
```

Adds one item type. Fails with `item_exists` if the name is taken and `invalid_item_name` if the name
is not a string.

```lua
Core.RegisterItem('brew_coffee', {
    name = 'brew_coffee',
    label = 'Hot Coffee',
    weight = 1,
    type = 'item',
    image = 'brew_coffee.png',
    unique = false,
    useable = true,
    shouldClose = true
})
```

Deprecated spelling: `Core.AddItem`.

### RegisterItems

```lua
Core.RegisterItems(items) --> boolean, string, table|nil
```

Registers a whole table of definitions keyed by item name. It stops at the first bad entry and
returns it as the third value, so entries before the failure are already registered.

Deprecated spelling: `Core.AddItems`.

### UpdateItemDefinition

```lua
Core.UpdateItemDefinition(itemName, item) --> boolean, string
```

Replaces an existing definition. Fails with `item_not_exists` if it was never registered.

Deprecated spelling: `Core.UpdateItem`.

### UnregisterItem

```lua
Core.UnregisterItem(itemName) --> boolean, string
```

Removes the definition from the catalogue. Items already sitting in a character's satchel are not
touched, but the inventory drops entries it cannot resolve on the next load.

Deprecated spelling: `Core.RemoveItem`.

### RegisterJob, RegisterJobs, UpdateJobDefinition, UnregisterJob

```lua
Core.RegisterJob(jobName, job)         --> boolean, string
Core.RegisterJobs(jobs)                --> boolean, string, table|nil
Core.UpdateJobDefinition(jobName, job) --> boolean, string
Core.UnregisterJob(jobName)            --> boolean, string
```

Exactly the same shape as the item functions, against `Shared.Jobs`. Failure messages are
`invalid_job_name`, `job_exists` and `job_not_exists`.

```lua
Core.RegisterJob('ferrier', {
    label = 'Ferrier',
    type = 'none',
    defaultDuty = true,
    offDutyPay = false,
    grades = {
        ['0'] = { name = 'Apprentice', payment = 25 },
        ['1'] = { name = 'Master', payment = 60, isboss = true }
    }
})
```

Deprecated spellings: `Core.AddJob`, `Core.AddJobs`, `Core.UpdateJob`, `Core.RemoveJob`.

::: warning The export surface uses the old verbs
`exports['hexa_core']:AddItem(name, definition)` and `exports['hexa_core']:RemoveItem(name)` are
registered exports and they are the **catalogue** functions, the same as `Core.RegisterItem` and
`Core.UnregisterItem`. They do not give or take an item from a player. The same is true of
`:AddJob`, `:AddJobs`, `:AddItems`, `:UpdateItem`, `:UpdateJob` and `:RemoveJob`.

To move an item to or from a character, go through the player object or the inventory resource directly.
:::

## Jobs

Job changes are player object methods.

```lua
local Player = Core.GetPlayer(source)
Player.SetJob('sheriff', 2)
Player.SetJobDuty(true)
```

`Player.SetJob(job, grade)` returns `false` if the job is not in the catalogue. It fires
`HexaCore:Server:OnJobUpdate` and `HexaCore:Client:OnJobUpdate` and syncs the player.

`Player.SetGang(gang, grade)` is a documented no-op that always returns `false`. This server has no
gang system; the method exists because the bridge calls it.

## Permissions

Permission levels come from `Core.Commands.Permissions`, which is `{ 'admin', 'staff' }`. Aces are
created as `hexacore.<level>` at boot.

### HasPermission

```lua
Core.HasPermission(source, permission) --> boolean
```

`permission` may be a string or an array of strings, in which case any match returns `true`.

```lua
if not Core.HasPermission(source, { 'admin', 'staff' }) then return end
```

### AddPermission

```lua
Core.AddPermission(source, permission)
```

Adds the principal, refreshes that player's command suggestions and fires
`HexaCore:Server:PermissionsChanged`. Does nothing if the player already has it.

### RemovePermission

```lua
Core.RemovePermission(source, permission)
```

Removes one permission. Called with no `permission` it strips every level in
`Core.Commands.Permissions`. Fires `HexaCore:Server:PermissionsChanged` once, after all changes.

::: tip
Principals are bound to the numeric server id, and FXServer reuses ids. `hexa_core` strips every
permission principal on `playerDropped` for exactly this reason, so the next person to receive that
id does not inherit staff.
:::

### GetPermissions

```lua
Core.GetPermissions(source) --> table
```

A set of the levels this player holds, for example `{ staff = true }`.

Deprecated spelling: `Core.GetPermission`.

### IsAdminAlertsEnabled

```lua
Core.IsAdminAlertsEnabled(source) --> boolean
```

Whether this admin is opted in to admin alerts. Returns `false` for anyone without the `admin`
permission and for an admin with no character loaded.

Deprecated spelling: `Core.IsOptin`.

### ToggleAdminAlerts

```lua
Core.ToggleAdminAlerts(source)
```

Flips the opt-in flag and persists it through `SetPlayerData`. Silently does nothing for a
non-admin.

Deprecated spelling: `Core.ToggleOptin`.

## Routing buckets

### SetPlayerBucket

```lua
Core.SetPlayerBucket(source, bucket) --> boolean
```

Moves a player into a routing bucket, writes `instance` into their statebag and records the move in
the bucket registry. Returns `false` if either argument is missing.

```lua
Core.SetPlayerBucket(source, 42)
```

### SetEntityBucket

```lua
Core.SetEntityBucket(entity, bucket) --> boolean
```

The same for a non-player entity: peds, vehicles, props.

### GetPlayersInBucket

```lua
Core.GetPlayersInBucket(bucket) --> table|false
```

Array of server ids inside that bucket. Returns `false`, not an empty table, when no player has ever
been placed in a bucket.

### GetEntitiesInBucket

```lua
Core.GetEntitiesInBucket(bucket) --> table|false
```

Array of entity handles inside that bucket. Same `false` behaviour.

### GetBucketObjects

```lua
Core.GetBucketObjects() --> table, table
```

The raw registries: player buckets keyed by identifier, then entity buckets keyed by entity handle.

## Vehicles

### SpawnVehicle

```lua
Core.SpawnVehicle(source, model, coords, warp) --> number
```

Creates a vehicle with the classic `CreateVehicle` path, which needs a client near the coordinates to
actually build the entity. `model` may be a string or a hash. `coords` defaults to the player's
position and uses `coords.w` as the heading. Every wait inside is bounded at ten seconds: it returns
`0` if the entity never existed, and logs a warning but still returns the handle if the warp or the
ownership migration times out.

```lua
local veh = Core.SpawnVehicle(source, 'wagon01x', GetEntityCoords(GetPlayerPed(source)), true)
```

### CreateVehicle

```lua
Core.CreateVehicle(source, model, vehtype, coords, warp) --> number
```

The newer server-side setter, and the more reliable of the two. `vehtype` is the vehicle type string
from `vehicles.meta`, such as `automobile`, `boat` or `heli`. Returns `0` on timeout.

::: tip
Client-side scripts should ask for a vehicle through the `HexaCore:Server:SpawnVehicle` callback
rather than calling either of these. That path is rate limited to one spawn per player per three
seconds and refuses to run for a player with no character loaded.
:::

## Callbacks

### CreateCallback

```lua
Core.CreateCallback(name, handler)
```

Registers a server callback. The handler is called as `handler(source, cb, ...)` and must call `cb`
exactly once.

```lua
Core.CreateCallback('myresource:server:getBalance', function(source, cb)
    local Player = Core.GetPlayer(source)
    if not Player then return cb(0) end
    cb(Player.GetMoney('bank'))
end)
```

### TriggerCallback

```lua
Core.TriggerCallback(name, source, cb, ...)
```

Invokes a registered server callback from server code. Returns immediately and does nothing if the
name was never registered.

### TriggerClientCallback

```lua
Core.TriggerClientCallback(name, source, cb, ...)
```

Asks one client to answer a callback registered on that client. The reply arrives on `cb` and the
stored handler is discarded after it fires once.

## Lifecycle

These run the login, save and delete flows. Most resources never call them; `hexa_core` drives them
from `server/spawn.lua` and `server/save.lua`.

### LoginPlayer

```lua
Core.LoginPlayer(source, citizenid, newData) --> boolean
```

Loads an existing character by citizen id, or creates a fresh one from `Config.Player.PlayerDefaults`
when `citizenid` is `nil`. The identifier on the connection must match the `identifier` column of
that character's row or the player is dropped and an anticheat log is written. Always clears a
stale `isdead` flag on the way in.

Deprecated spelling: `Core.Player.Login`.

### LogoutPlayer

```lua
Core.LogoutPlayer(source)
```

Fires `HexaCore:Client:OnPlayerUnload` and `HexaCore:Server:OnPlayerUnload`, waits briefly and then
removes the player from the roster. It does not save; call `Player.Save()` first if you need the row
written.

Deprecated spelling: `Core.Player.Logout`.

### LoadPlayer

```lua
Core.LoadPlayer(source, PlayerData) --> table|nil
```

Fills in defaults, validates the job against the catalogue, merges legacy bank accounts into `bank`,
pulls the satchel from the inventory resource and constructs the player object.

Passing `nil` as the source builds an **offline** object and returns it. Passing a real source
registers the object in the roster, saves it, fires `HexaCore:Server:PlayerLoaded` and returns
nothing.

Deprecated spelling: `Core.Player.CheckPlayerData`.

### CreatePlayer

```lua
Core.CreatePlayer(PlayerData, Offline) --> table|nil
```

The constructor `LoadPlayer` calls. It attaches every method to the object, sets `Dirty` to `true`
and pushes the metadata statebags. Prefer `LoadPlayer`, which does the validation first.

### SavePlayer

```lua
Core.SavePlayer(source)
```

Upserts the whole `users` row: money, job, charinfo, position, inventory, loadout, metadata and death
state. Logs an error and does nothing when that id has no character loaded. The dirty flag is cleared
before the query is dispatched, and put back if the insert fails so the next sweep retries.

::: warning
`Core.SavePlayer` does not pull statebag values first, so hunger, thirst, cleanliness, stress and
health can be written stale. Call `Player.Save()` instead, which does `Player.PullStateBags()` and
then this.
:::

Deprecated spelling: `Core.Player.Save`.

### SaveOfflinePlayer

```lua
Core.SaveOfflinePlayer(PlayerData)
```

Writes a `PlayerData` table for a character that is not connected, and saves its inventory in offline
mode. This is what `Player.Save()` calls on an offline object.

Deprecated spelling: `Core.Player.SaveOffline`.

### SaveAllPlayers

```lua
Core.SaveAllPlayers() --> number
```

Saves every online player immediately, without the spread delay used by the periodic sweep, and
returns how many were written. `hexa_core` calls this itself on `onResourceStop` unless
`Config.Save.OnResourceStop` is `false`.

```lua
Core.Commands.Add('saveall', 'Save every online player now', {}, false, function(source)
    Core.Log('manual save wrote %d player(s)', Core.SaveAllPlayers())
end, 'admin')
```

The periodic sweep runs every `Config.Save.Interval` minutes (45 by default, clamped to a minimum of
1) and spreads its writes across `Config.Save.SpreadSeconds`. It only writes players whose `Dirty`
flag is set, so idle characters are not rewritten. `Player.MarkDirty()` forces a player into the next
sweep.

### DeleteCharacter

```lua
Core.DeleteCharacter(source, citizenid)
```

Deletes a character, but only after checking that the connection's identifier owns it. If it does
not, the player is dropped and an anticheat log is written.

### ForceDeleteCharacter

```lua
Core.ForceDeleteCharacter(citizenid)
```

Deletes a character with no ownership check. If that character is currently in game its player is
dropped first. This is the admin path.

## Extending the core

### SetField

```lua
Core.SetField(fieldName, data) --> boolean, string
```

Puts anything on the core object and fires `HexaCore:Server:UpdateObject` so resources holding a copy
know to refresh. Returns `false, 'invalid_field_name'` if the name is not a string.

```lua
Core.SetField('MyRegistry', {})
Core.SetField('GetTownFor', function(coords) return 'valentine' end)
```

Because `Core` mirrors every function it receives into `Core.Functions`, a function put here is
reachable under both names during the deprecation window.

Deprecated spelling: `Core.SetMethod`.

### SetPlayerField

```lua
Core.SetPlayerField(ids, fieldName, data)
```

Puts a field or a method on one player object, on an array of them, or on every online player when
`ids` is `-1`. Reserved names (`PlayerData`, `Functions`, `Offline`) are refused.

```lua
AddEventHandler('HexaCore:Server:PlayerLoaded', function(Player)
    Core.SetPlayerField(Player.PlayerData.source, 'GetTownDues', function()
        return math.floor(Player.GetMoney('bank') * 0.02)
    end)
end)
```

The equivalent on a player object you already hold is `Player.SetField(name, value)`.

Deprecated spellings: `Core.AddPlayerMethod`, `Core.AddPlayerField`.

### GetCoreVersion

```lua
Core.GetCoreVersion(invokingResource) --> string
```

The `version` field from `fxmanifest.lua`. Passing a resource name logs the lookup at debug level.
Also available as `exports['hexa_core']:GetCoreVersion()`.

## Generated ids

Each of these draws a random value and checks the `users` table until it finds one nobody holds. They
all block on a database query, so call them at character creation, not in a loop.

### CreateCitizenId

```lua
Core.CreateCitizenId() --> string
```

`Config.Player.CitizenIdPrefix` followed by `Config.Player.CitizenIdDigits` zero-padded random
digits, so `RB` and `4` produce ids like `RB0087`. Numbers in `Config.Player.LockedIds` are never
handed out. If fifty draws all collide it widens the pool by a digit, up to four extra digits, and
logs that you should raise `Config.Player.CitizenIdDigits`.

### CreateAccountNumber

```lua
Core.CreateAccountNumber() --> string
```

The bank account number stored on `charinfo.account`.

### CreateWalletId

```lua
Core.CreateWalletId() --> string
```

A `Hexa-` prefixed wallet id, stored in `metadata.walletid`.

### CreateFingerprint

```lua
Core.CreateFingerprint() --> string
```

The mixed letter and digit fingerprint stored in `metadata.fingerprint`.

Deprecated spelling: `Core.CreateFingerId`.

### CreatePhoneSerial

```lua
Core.CreatePhoneSerial() --> number
```

The phone serial stored in `metadata.phonedata.SerialNumber`.

Deprecated spelling: `Core.CreateSerialNumber`.

## Logging

All five printers take a printf-style format string and arguments, and have identical signatures on
the client and the server. Log lines are written in English on purpose: some server consoles mangle
Thai, and operators scan console output fast.

```lua
Core.Log('shop opened in %s', 'valentine')
Core.Warn('%s asked for an item that does not exist: %s', resource, item)
Core.Error('could not write ledger for %s', citizenid)
Core.PrintDebug('cart %s now holds %d entries', cartId, count)
Core.DumpTable(Player.PlayerData)
```

### Log, Warn, Error

```lua
Core.Log(fmt, ...)
Core.Warn(fmt, ...)
Core.Error(fmt, ...)
```

All three print with the `[hexa_core]` prefix, tagged `[WARN]` and `[ERROR]` respectively. They are
never silenced by config.

### PrintDebug

```lua
Core.PrintDebug(fmt, ...)
```

Prints only when `Config.Debug` is `true`. The switch is checked **before** the string is formatted,
so leaving debug calls in hot paths costs nothing when debug is off.

::: tip
`Core.Debug` used to mean one thing on the client and another on the server. It is now split:
`Core.PrintDebug` prints a formatted line, `Core.DumpTable` prints a table.
:::

### DumpTable

```lua
Core.DumpTable(value, indent)
```

Pretty prints a table to the console with colour by value type, cutting off at six levels deep so a
self-referencing table cannot hang the console.

### ShowError, ShowSuccess

```lua
Core.ShowError(resource, message)
Core.ShowSuccess(resource, message)
```

The older two-argument format used across the server, kept on the same printer so prefixes stay
consistent.

### Forwarding logs to Discord

`hexa_core` listens for `hexa_log:server:CreateLog` itself. Nothing used to listen for that event at
all, so every log line the server produced disappeared.

```lua
TriggerEvent('hexa_log:server:CreateLog', 'joinleave', 'Store opened', 'green', 'Valentine store is open')
```

The arguments are category, title, colour and message. Every log prints to the console, and is also
posted to a Discord webhook when one is configured:

```lua
Config.Log.Enabled = true
Config.Log.Webhooks = {
    default   = '',
    joinleave = '',
    anticheat = ''
}
```

A category with no entry falls back to `Webhooks.default`. An empty string means nothing is posted.
Setting `Config.Log.Enabled = false` turns off both the console line and the webhook.

## Commands

### Commands.Add

```lua
Core.Commands.Add(name, help, arguments, argsrequired, callback, permission, ...)
```

Registers a chat command, creates the ace for it and adds it to the suggestion list. `permission`
defaults to `'user'`, which makes the command unrestricted; `'admin'` and `'staff'` restrict it. Extra
permission levels can follow as additional arguments. When `argsrequired` is `true` and the player
passes fewer arguments than `arguments` describes, the callback never runs and the player gets an
error notification.

```lua
Core.Commands.Add('openstore', 'Open the town store', {
    { name = 'town', help = 'Town name' }
}, true, function(source, args)
    Core.Notify(source, { title = ('Opening %s'):format(args[1]), type = 'info', duration = 4000 })
end, 'staff')
```

### Commands.Refresh

```lua
Core.Commands.Refresh(source)
```

Rebuilds one player's chat suggestions, adding the commands they may now use and removing the ones
they may not. `AddPermission` and `RemovePermission` call this for you.

`Core.Commands.List` holds every registered command keyed by lowercase name, and
`Core.Commands.Permissions` is the list of permission levels the server recognises.

## Tables on the core object

| Field | What it holds |
| --- | --- |
| `Core.Players` | Live roster, keyed by server id. Same table `GetPlayerObjects` returns |
| `Core.Config` | The whole `Config` table |
| `Core.Shared` | `Shared`, including `Shared.Items`, `Shared.Jobs` and `Shared.Weapons` |
| `Core.Functions` | Deprecated mirror of every function on `Core` |
| `Core.UsableItems` | Handlers registered through `CreateUseableItem` |
| `Core.ServerCallbacks` | Handlers registered through `CreateCallback` |
| `Core.ClientCallbacks` | Pending client callback handlers |
| `Core.Player_Buckets` | Player bucket registry, keyed by identifier |
| `Core.Entity_Buckets` | Entity bucket registry, keyed by entity handle |
| `Core.Commands.List` | Registered commands, keyed by lowercase name |
| `Core.Commands.Permissions` | `{ 'admin', 'staff' }` |

::: warning Core.Storage is not part of the core object contract
The inventory codec (`EncodeInventory`, `DecodeInventory`, `EncodeLoadout`, `DecodeLoadout`,
`BuildSlots`, `IsWeapon`) exists as `Core.Storage` but must be called as exports:

```lua
local slots = exports['hexa_core']:BuildSlots(inventoryColumn, loadoutColumn)
```

`GetCoreObject()` hands back a snapshot across the resource boundary, and the codec has to read the
current weapon list every time. Calling it as an export runs it inside `hexa_core`, where it always
sees live data.
:::
