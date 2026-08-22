# The player object

Every character that is loaded on the server is represented by one player object. It holds the
character's data in `PlayerData` and exposes the methods that are allowed to change it. Since 3.0
the methods sit directly on the object - there is no `.Functions` layer to go through.

```lua
local Core = exports['hexa_core']:GetCoreObject()

local Player = Core.GetPlayer(source)
if not Player then return end

Player.AddMoney('cash', 100, 'daily reward')
```

`Player.Functions.AddMoney(...)` still resolves for one more release and prints a one-time
deprecation warning naming the resource that called it. Write the flat form in new code.

## Getting a player object

```lua
local Core = exports['hexa_core']:GetCoreObject()

local Player = Core.GetPlayer(source)
local Player = Core.GetPlayerByCitizenId('RB0087')
local Player = Core.GetPlayerByLicense('license:1100001abcdef')
local Player = Core.GetPlayerByAccount('US07HexaCore1234567812')
local Player = Core.GetPlayerByCharInfo('firstname', 'Arthur')
```

`Core.GetPlayer` accepts a server id or an identifier string. Every one of these returns `nil` when
no matching character is loaded, so always check before you use the result.

For a character that is not online, `Core.GetOfflinePlayerByCitizenId` builds a full player object
straight from the `users` row:

```lua
local Player = Core.GetOfflinePlayerByCitizenId('RB0087')
if Player then
    Player.AddMoney('bank', 500, 'court settlement')
    Player.Save()
end
```

An offline object has `Player.Offline == true`. Its money and metadata methods still mutate
`PlayerData`, but they broadcast nothing and log nothing, and `Player.Save()` routes to
`Core.SaveOfflinePlayer` instead of the online path.

::: warning
An offline player object is a snapshot, not a live handle. If that character logs in while you are
holding one, your `Save()` writes the snapshot over their live row. Fetch it, change it, save it,
drop it.
:::

## PlayerData

`Player.PlayerData` is the character. The shape below is what `Core.LoadPlayer` produces after
`Config.Player.PlayerDefaults` has filled in whatever the database row did not carry.

| Field | Type | What it is |
| --- | --- | --- |
| `source` | number | Current server id. Absent on offline objects. |
| `citizenid` | string | Character id, `Config.Player.CitizenIdPrefix` plus random digits (`RB0087`). |
| `cid` | number | Character slot number on the account. |
| `license` | string | Account identifier, the `identifier` column of `users`. |
| `name` | string | Player name from `GetPlayerName`, falling back to the citizenid. |
| `money` | table | One key per type in `Config.Money.MoneyTypes` - `cash`, `bank`, `gold`. |
| `charinfo` | table | `firstname`, `lastname`, `birthdate`, `gender`, `nationality`, `account`. |
| `job` | table | `name`, `label`, `type`, `payment`, `onduty`, `isboss`, `grade`. |
| `metadata` | table | Everything else about the character. See below. |
| `items` | table | Inventory slots, owned by `hexa_inventory` at runtime. |
| `position` | table | Last saved coordinates. |
| `weight` | number | Carry capacity, a percentage where 100 is a full satchel. |
| `slots` | number | Number of inventory slots. |
| `optin` | boolean | Whether this player receives admin alerts. |

`job.grade` is a table of its own: `name`, `level`, `payment`, `isboss`.

Reading is direct. Nothing wraps it:

```lua
local data = Player.PlayerData

print(data.citizenid)
print(data.charinfo.firstname, data.charinfo.lastname)
print(data.money.cash, data.money.bank)
print(data.job.name, data.job.grade.level, data.job.onduty)
```

::: danger
Read `PlayerData` directly, never write to it directly. Assigning
`Player.PlayerData.money.cash = 500` changes the number in memory and nothing else - no client
sync, no money-change event, no log line, and the save sweep will skip the player because nothing
marked them dirty. Use the methods.
:::

### Default metadata keys

These come from `Config.Player.PlayerDefaults.metadata`, so every loaded character has them:

`health`, `hunger`, `thirst`, `cleanliness`, `stress`, `isdead`, `armor`, `ishandcuffed`,
`injail`, `jailitems`, `status`, `rep`, `callsign`, `fingerprint`, `walletid`, `criminalrecord`.

Characters saved before a default was added will not have that key until they next load, because
defaults are only applied to keys that are missing at the top level of `metadata`.

## Money

Four methods, all taking a money type name that is lowercased for you, and a `reason` string that
ends up in the money log.

```lua
Player.AddMoney('cash', 100, 'bounty payout')
Player.RemoveMoney('bank', 50, 'stable fee')
Player.SetMoney('gold', 10, 'admin adjustment')

local cash = Player.GetMoney('cash')
```

`AddMoney`, `RemoveMoney` and `SetMoney` all return a boolean and refuse the call - returning
`false` without touching anything - when:

- the money type is not a string, or is not a key of `PlayerData.money`
- the amount does not convert to a number, is `NaN`, or is negative

`RemoveMoney` additionally returns `false` when the balance would drop below its floor. Types listed
in `Config.Money.DontAllowMinus` floor at zero. Everything else uses `Config.Money.MinusLimit`, but
that limit is itself clamped to zero, so no balance can go negative regardless of configuration.

`GetMoney` returns the stored number. It returns `false` if you pass something that is not a string,
and `nil` for a money type that does not exist on the character.

::: warning
Always branch on the return value of `RemoveMoney` before you hand over goods. The standard shape is
the one below; skipping the check is how a shop gives away stock for free.
:::

```lua
-- charge first, deliver only if the charge went through
if Player.RemoveMoney('cash', 25, 'bought a coffee') then
    Player.AddItem('coffee', 1)
else
    Core.Notify(source, { title = 'Not enough cash', type = 'error', duration = 5000 })
end
```

A successful money change syncs the player, writes a `hexa_log:server:CreateLog` entry under the
`playermoney` category, and fires both `HexaCore:Server:OnMoneyChange` and
`HexaCore:Client:OnMoneyChange` with `(source, moneytype, amount, action, reason)` where `action`
is `'add'`, `'remove'` or `'set'`.

## Job and duty

```lua
-- grade may be a number or a string, both are accepted
local ok = Player.SetJob('police', 2)
```

`SetJob` lowercases the job name and returns `false` if that job is not in `Core.Shared.Jobs`. On
success it rebuilds `PlayerData.job` from the shared catalogue - label, type, default duty state,
grade name, payment and boss flag - then syncs the player and fires
`HexaCore:Server:OnJobUpdate` and `HexaCore:Client:OnJobUpdate` with `(source, job)`.

If the grade you pass does not exist on that job, the job is still applied but the grade stays at
level 0 with the placeholder name `No Grades`.

```lua
Player.SetJobDuty(true)
```

`SetJobDuty` coerces its argument to a boolean, writes `PlayerData.job.onduty`, fires the same two
job-update events and syncs. It reads `PlayerData.job` without checking it first, so only call it on
a character that is actually loaded.

Duty state is what `Core.GetPlayersOnDuty(job)` and `Core.GetDutyCount(job)` count.

## Metadata

```lua
Player.SetMetaData('callsign', '1-ADAM-12')
local callsign = Player.GetMetaData('callsign')
```

`SetMetaData` also takes a table, which writes several keys and syncs once instead of once per key:

```lua
-- one sync for the whole batch
Player.SetMetaData({ hunger = 80, thirst = 65 })
```

`hunger`, `thirst`, `cleanliness` and `stress` are clamped to the range 0-100 on the way in, whether
you set them one at a time or as a table. Any other key is stored as given. A key that is neither a
string nor a table is ignored.

`GetMetaData` requires a string and returns `nil` for anything else.

::: warning
Clients cannot set arbitrary metadata. The net event `HexaCore:Server:SetMetaData` only accepts
`hunger`, `thirst`, `cleanliness` and `stress`; anything else is refused and logged. Server code
calls `Player.SetMetaData` directly and is not restricted.
:::

## Items

The inventory methods on the player object delegate to `hexa_inventory`. When that resource is not
started they degrade to a safe value rather than erroring.

```lua
local stored, dropped = Player.AddItem('bread', 2, false, false, 'starter kit')
local removed = Player.RemoveItem('bread', 1, false, 'ate it')

local slotItem = Player.GetItemBySlot(3)
local item     = Player.GetItemByName('bread')
local stacks   = Player.GetItemsByName('bread')
local weight   = Player.GetTotalWeight()
local has      = Player.HasItem('bread', 1)
```

| Method | Returns | Value when `hexa_inventory` is stopped |
| --- | --- | --- |
| `AddItem(item, amount, slot, info, reason)` | `stored, dropped` | `false, false` |
| `RemoveItem(item, amount, slot, reason)` | boolean | `false` |
| `GetItemBySlot(slot)` | item table or `nil` | `nil` |
| `GetItemByName(item)` | item table or `nil` | `nil` |
| `GetItemsByName(item)` | array of stacks | `{}` |
| `GetTotalWeight()` | number | `0` |
| `HasItem(items, amount)` | boolean | `false` |

::: danger
`AddItem` returns two values and the second one matters. `dropped == true` means the satchel was
full and the item was placed on the ground as a bag - the item exists, so you must not refund the
player for it. Treat `stored or dropped` as "the item was delivered".
:::

`slot` and `info` are passed as `false` rather than `nil` on purpose. A `nil` in the middle of an
argument list is dropped as it crosses the resource boundary, which would shift `reason` into the
slot position.

### Adding an item to a player is not registering an item

This is the distinction the 3.0 rename exists to make:

```lua
-- gives one bread to a character
Player.AddItem('bread', 1)

-- adds a bread definition to the shared catalogue, for everyone
Core.RegisterItem('bread', { name = 'bread', label = 'Bread', weight = 1, type = 'item' })
```

`Player.AddItem` moves an item into someone's satchel. `Core.RegisterItem` declares that an item
type exists at all. They used to share the verb `AddItem` and meant opposite things.

On the export surface only, `exports['hexa_core']:AddItem` and `:RemoveItem` remain permanent
aliases for the catalogue functions, so ported qb/rsg scripts keep working unmodified.

### Capacity

```lua
if Player.CanCarryItem('bread', 5) then
    Player.AddItem('bread', 5)
end
```

`CanCarryItem` forwards to `Core.CanCarryItem(source, item, amount)`. It returns `false` if the
character is not loaded, if the item is not in `Core.Shared.Items`, or if `hexa_inventory` is not
started. A missing `amount` is treated as 1.

Capacity itself is changed through the core, not the player object:

```lua
Core.SetMaxWeight(source, 150)
Core.SetMaxSlots(source, 40)
```

Both write through `Player.SetPlayerData`, so both sync.

## Syncing and the dirty flag

```lua
Player.SetPlayerData('weight', 150)
Player.SyncPlayerData()
```

`SetPlayerData(key, value)` writes a top-level `PlayerData` field and syncs. The key must be a
string; anything else is ignored.

`SyncPlayerData()` is the broadcast. It fires `HexaCore:Player:SetPlayerData` on the server and on
the owning client with the whole `PlayerData` table, and marks the player dirty. It does not mutate
anything - the name changed in 3.0 from `UpdatePlayerData` for exactly that reason. Every method
above already calls it, so you only call it yourself after writing `PlayerData` through a path that
does not, which in practice means almost never.

`SyncPlayerData` returns immediately on offline objects; there is no client to tell.

### MarkDirty

The autosave sweep only writes players whose data actually changed. `Player.Dirty` is that flag: it
starts `true` on a freshly loaded character, is set by every mutating method, and is cleared just
before a write is issued.

```lua
-- force this character into the next autosave sweep
Player.MarkDirty()
```

Use it when you changed something through a path the core cannot see. If you are calling the normal
methods you do not need it.

The sweep runs every `Config.Save.Interval` minutes and spreads its writes across
`Config.Save.SpreadSeconds` seconds. `Core.SaveAllPlayers()` writes everyone immediately and returns
how many players it saved.

## State bags

Two methods move the same five keys - `hunger`, `thirst`, `cleanliness`, `stress`, `health` -
between `PlayerData.metadata` and the FiveM player state bag. The names say which way:

| Method | Direction |
| --- | --- |
| `Player.PullStateBags()` | state bag to metadata. Reads `Player(source).state`, writes the values it finds through `SetMetaData`. |
| `Player.PushStateBags()` | metadata to state bag. Reads `PlayerData.metadata`, writes into `Player(source).state`. |

`PushStateBags` runs once when the character is constructed, so other resources can read
`Player(source).state.hunger` without asking the core object for anything.

`PullStateBags` runs inside `Player.Save()` for online characters. That is what keeps live status
values from being lost on restart - a save that skips it writes the stale metadata copy instead of
the current one.

```lua
-- pick up whatever another resource wrote into the state bag, then persist
Player.PullStateBags()
Player.Save()
```

::: warning
`Player.Save()` already calls `PullStateBags` for you. Never call `Core.SavePlayer(source)` directly
as a shortcut - it skips the pull, and the character's hunger, thirst, cleanliness and stress get
written back at whatever value they held before the last state bag update.
:::

Only those five keys move. Anything else in the state bag or in metadata is untouched by both.

## Extending the player object

```lua
local ok, err = Player.SetField('mailbox', {})
```

`SetField(name, value)` attaches a field or a method to this one player object. The name must be a
non-empty string. It refuses three names and returns `false` plus a message when you use one:
`PlayerData`, `Functions` and `Offline` - the structural fields of the object itself. Everything
else it overwrites without asking, which is why the name is `Set` and not `Add`.

`Player.AddMethod` and `Player.AddField` are aliases of `SetField` kept for the transition. Anything
you attach is mirrored into `Player.Functions` automatically, so old-style call sites still find it.

To install a field on players as they load, or on everyone at once, use the core-level helper:

```lua
AddEventHandler('HexaCore:Server:PlayerLoaded', function(Player)
    Core.SetPlayerField(Player.PlayerData.source, 'GetNickname', function()
        return Player.PlayerData.charinfo.firstname
    end)
end)
```

`Core.SetPlayerField(ids, name, value)` accepts a single server id, an array of ids, or `-1` for
every loaded player. It replaces the old `AddPlayerMethod` and `AddPlayerField`, which wrote to the
same place once `.Functions` was flattened.

## Saving and logging out

```lua
Player.Save()
Player.Logout()
```

`Save()` pulls the state bags and writes the character through `Core.SavePlayer(source)`, which
upserts the `users` row and asks `hexa_inventory` to save the satchel. On an offline object it goes
to `Core.SaveOfflinePlayer(PlayerData)` instead. Position comes from the live ped when one exists,
and falls back to the stored position when it does not, so a queued save for a player who already
dropped will not write them to the middle of the map.

`Logout()` unloads the character: it fires `HexaCore:Client:OnPlayerUnload` and
`HexaCore:Server:OnPlayerUnload`, then removes the player from `Core.Players`. It does nothing on an
offline object. Note that it does not save first - call `Save()` yourself if the character has
unsaved changes.

When a player drops, the core saves them and fires `HexaCore:Server:PlayerDropped` with the player
object before removing it.

## SetGang

```lua
-- always false, this server has no gang system
local ok = Player.SetGang()
```

`Player.SetGang` exists only so that the rsg bridge has something to call. It takes no arguments,
does nothing, and returns `false`. It is not a stub waiting to be implemented - there is no gang
data on this server, and `PlayerData` has no gang field.

## Events fired by the player object

| Event | Side | Payload |
| --- | --- | --- |
| `HexaCore:Server:PlayerLoaded` | server | the player object |
| `HexaCore:Player:SetPlayerData` | both | `PlayerData` |
| `HexaCore:Server:OnJobUpdate` | server | `source, job` |
| `HexaCore:Client:OnJobUpdate` | client | `source, job` |
| `HexaCore:Server:OnMoneyChange` | server | `source, moneytype, amount, action, reason` |
| `HexaCore:Client:OnMoneyChange` | client | `source, moneytype, amount, action, reason` |
| `HexaCore:Server:PlayerDropped` | server | the player object |
| `HexaCore:Server:OnPlayerUnload` | server | `source` |
| `HexaCore:Client:OnPlayerUnload` | client | none |

## Full example

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.CreateUseableItem('bandage', function(source, item)
    local Player = Core.GetPlayer(source)
    if not Player then return end

    local health = Player.GetMetaData('health') or 0
    if health >= 600 then
        return Core.Notify(source, { title = 'You are not hurt', type = 'error', duration = 5000 })
    end

    -- remove first so a failed removal cannot heal for free
    if not Player.RemoveItem('bandage', 1, item.slot, 'used a bandage') then return end

    Player.SetMetaData('health', math.min(600, health + 100))
    Core.Notify(source, { title = 'Patched up', type = 'success', duration = 5000 })
end)
```
