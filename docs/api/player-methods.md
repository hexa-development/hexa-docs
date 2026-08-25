# Player methods

Every loaded character is one player object, built by `Core.CreatePlayer` in
`server/player.lua`. This page is the complete reference for what sits on that object: the exact
signature, the real return value, what it broadcasts, and what it does when a dependency is
missing.

The methods sit directly on the object. There is no `.Functions` layer to walk through any more.

```lua
local Core = exports['hexa_core']:GetCoreObject()

local Player = Core.GetPlayer(source)
if not Player then return end

Player.AddMoney('cash', 100, 'reward')
```

Every method is a plain field on the object, so they are all called with a dot, never a colon.
`Player:AddMoney(...)` passes the object itself as the first argument and will not work.

## Registering an item is not giving an item

This is the one thing to get right before anything else on this page.

```lua
-- defines a NEW item type for the whole server
Core.RegisterItem('bandage', { name = 'bandage', label = 'Bandage', weight = 1 })

-- puts an EXISTING item into ONE player's satchel
Player.AddItem('bandage', 1, false, false, 'medic supplies')
```

`Core.RegisterItem` / `Core.UnregisterItem` / `Core.RegisterItems` / `Core.UpdateItemDefinition`
touch the shared catalogue in `Core.Shared.Items`. They never touch a player. `Player.AddItem` and
`Player.RemoveItem` move stock in and out of a single character's inventory and never touch the
catalogue.

::: danger
On the export surface only, `exports['hexa_core']:AddItem` and `exports['hexa_core']:RemoveItem`
are the **catalogue** functions - they are the permanent aliases of `Core.RegisterItem` and
`Core.UnregisterItem`, kept so ported scripts keep loading. If you meant to hand an item to a
player, you want `Player.AddItem` on a player object, not the export.
:::

## Fields on the object

| Field | Type | What it is |
| --- | --- | --- |
| `PlayerData` | table | The character itself - `citizenid`, `money`, `charinfo`, `job`, `metadata`, `items`, `position`. |
| `Offline` | boolean | `true` for an object built from a database row with no `source`. |
| `Dirty` | boolean | Set when something changed since the last write. The save sweep skips players whose flag is down. |
| `Functions` | table | Compatibility mirror of every method on the object. |

`Dirty` starts as `true` on a freshly built object, because a character that just loaded has not
been written in this cycle yet.

`Player.Functions.AddMoney(...)` still resolves. It is a real table kept in sync by a metatable, so
anything assigned onto the player at runtime shows up there too. Write the flat form in new code.

::: warning
`PlayerData` and `Functions` are the only two names other resources are expected to read directly.
Do not write to them by hand - use the methods below, which mark the player dirty and broadcast the
change.
:::

## Money

Money types come from `Config.Money.MoneyTypes`, which ships with `cash`, `bank` and `gold`. All
four methods lowercase the type before touching it.

### AddMoney

```lua
Player.AddMoney(moneytype, amount, reason)
```

Returns `boolean`. `false` means nothing was added, and the three ways to get it are a
non-string `moneytype`, an `amount` that is not a number or is negative, and a `moneytype` that
does not exist on `PlayerData.money`.

```lua
local ok = Player.AddMoney('cash', 250, 'bounty payout')
if not ok then
    Core.Error('could not pay the bounty to %s', Player.PlayerData.citizenid)
end
```

On success, and only for an online player, it calls `SyncPlayerData`, writes a
`hexa_log:server:CreateLog` line under `playermoney`, and fires
`HexaCore:Client:OnMoneyChange` and `HexaCore:Server:OnMoneyChange` with the operation `'add'`.
Amounts above 100000 are logged with the alert flag raised.

`reason` defaults to `'unknown'` and lands in the log line. Always pass one.

### RemoveMoney

```lua
Player.RemoveMoney(moneytype, amount, reason)
```

Returns `boolean`. It returns `false` for all the same bad input as `AddMoney`, plus the important
case: the balance is not enough.

::: warning
This is the method that decides whether a player can afford something. Check the return value
before you hand over the goods. `if Player.RemoveMoney(...) then giveGoods() end` is the contract
every script on this server is expected to follow.
:::

```lua
if not Player.RemoveMoney('bank', 1500, 'horse purchase') then
    return Core.Notify(source, { type = 'error', description = 'Not enough money in the bank' })
end

Player.AddItem('horse_deed', 1, false, false, 'horse purchase')
```

The floor is computed per money type. Types listed in `Config.Money.DontAllowMinus` (shipping as
`cash`, `gold`, `bank`, `bloodmoney`) can never go under `0`. Any other type uses
`Config.Money.MinusLimit`, which is itself clamped so it can never be lower than `0`. In practice
no balance on this server can be pushed negative, whatever the config says.

### SetMoney

```lua
Player.SetMoney(moneytype, amount, reason)
```

Returns `boolean`, with the same validation as `AddMoney`. It overwrites the balance rather than
adjusting it, and fires the change events with the operation `'set'`.

```lua
Player.SetMoney('bank', 0, 'account seized')
```

### GetMoney

```lua
Player.GetMoney(moneytype)
```

Returns the balance as a number. It returns `false` when `moneytype` is not a string, and `nil`
when the type is a string that simply is not on this character. Guard with a fallback if you are
about to do arithmetic.

```lua
local cash = Player.GetMoney('cash') or 0
```

## Inventory

Every inventory method delegates to the inventory resource. Each one checks that it is
`started` first, so a stopped or restarting inventory
degrades to a safe value instead of throwing.

| Method | Return when the inventory resource is not started |
| --- | --- |
| `AddItem` | `false, false` |
| `RemoveItem` | `false` |
| `GetItemBySlot` | `nil` |
| `GetItemByName` | `nil` |
| `GetItemsByName` | `{}` |
| `GetTotalWeight` | `0` |
| `HasItem` | `false` |
| `CanCarryItem` | `false` |

::: warning
A safe fallback is not a success. `AddItem` returning `false, false` while the inventory is down
looks exactly like a full satchel to a caller that only checks the first value, so a script that
charges the player first and adds the item second will take the money and give nothing. Charge
after the item lands, not before.
:::

### AddItem

```lua
Player.AddItem(item, amount, slot, info, reason)
```

**Returns two values**: `stored, dropped`.

- `stored` is `true` when the item went into the satchel.
- `dropped` is `true` when the satchel was full and the item was placed on the ground as a bag.

`dropped = true` means the item **exists in the world**. Do not refund for it and do not retry.

```lua
local stored, dropped = Player.AddItem('canned_beans', 2, false, false, 'store purchase')
if not stored and not dropped then
    Player.AddMoney('cash', 12, 'refund - could not deliver goods')
end
```

`slot` and `info` are optional, and the method passes `false` rather than `nil` for them when you
omit them. That is deliberate: a `nil` in the middle of an argument list is dropped as it crosses
the resource boundary, which would shift `reason` into the slot position. If you pass them
yourself, pass `false`, not `nil`.

`reason` defaults to `'hexa_core:player.AddItem'`. The call sets `Player.Dirty` so the change is
picked up by the next save sweep, because this path does not go through `SyncPlayerData`.

### RemoveItem

```lua
Player.RemoveItem(item, amount, slot, reason)
```

Returns `boolean` - `true` when the item was taken. It returns `false` for an unknown item name,
for an `amount` that is not a positive number, and when the player does not have enough of it.
`reason` defaults to `'hexa_core:player.RemoveItem'`. Sets `Player.Dirty`.

```lua
if Player.RemoveItem('lockpick', 1, false, 'lockpick broke') then
    TriggerClientEvent('my_resource:client:lockpickBroke', source)
end
```

### GetItemBySlot

```lua
Player.GetItemBySlot(slot)
```

Returns the item table in that slot, or `nil` when the slot is empty. The returned item has passed
through the inventory's decay check, so `info.quality` on it is current.

### GetItemByName

```lua
Player.GetItemByName(item)
```

Returns the item table from the first slot holding that item, or `nil`. Use it when you only care
whether one exists and want to read its `info`.

```lua
local pocketWatch = Player.GetItemByName('pocket_watch')
if pocketWatch then
    print(pocketWatch.info.quality)
end
```

### GetItemsByName

```lua
Player.GetItemsByName(item)
```

Returns an **array of every stack** of that item, in slot order. Returns `{}` when the player has
none, so it is always safe to iterate.

```lua
local total = 0
for _, stack in ipairs(Player.GetItemsByName('gold_nugget')) do
    total = total + stack.amount
end
```

### GetTotalWeight

```lua
Player.GetTotalWeight()
```

Returns the summed weight of everything the player is carrying, as a number. Weight on this server
is a percentage: `Config.Player.PlayerDefaults.weight` is `100` and each item's `weight` is its
share of that.

### HasItem

```lua
Player.HasItem(items, amount)
```

Returns `boolean`. `items` is a single item name or a table of names. Forwards to `Core.HasItem`
with this player's source.

```lua
if not Player.HasItem({ 'shovel', 'lantern' }) then
    return Core.Notify(source, { type = 'error', description = 'You need a shovel and a lantern' })
end
```

### CanCarryItem

```lua
Player.CanCarryItem(item, amount)
```

Returns `boolean` - whether the player has the free weight for `amount` of `item`. `amount`
defaults to `1`. Forwards to `Core.CanCarryItem`.

It returns `false` and logs an error through `Core.Error` when the item is not in
`Core.Shared.Items` at all, so a typo reads as "cannot carry" rather than as a crash.

```lua
if not Player.CanCarryItem('bear_pelt', 3) then
    return Core.Notify(source, { type = 'error', description = 'Your satchel is too full' })
end

Player.AddItem('bear_pelt', 3, false, false, 'hunting')
```

## Job

### SetJob

```lua
Player.SetJob(job, grade)
```

Returns `boolean`. It returns `false` only when `job` is not a key in `Core.Shared.Jobs`. The job
name is lowercased, and `grade` defaults to `'0'`.

```lua
if not Player.SetJob('sheriff', 2) then
    Core.Error('sheriff is not a registered job')
end
```

::: warning
An unknown **grade** does not fail. The job is applied with a placeholder grade of
`{ name = 'No Grades', level = 0, payment = 30, isboss = false }` and the method still returns
`true`. Validate the grade against `Core.Shared.Jobs[job].grades` yourself if handing out a bad
grade matters to you.
:::

`onduty` is taken from the job's `defaultDuty`, and `type` from the job's `type`, falling back to
`'none'`. For an online player it then calls `SyncPlayerData` and fires
`HexaCore:Server:OnJobUpdate` and `HexaCore:Client:OnJobUpdate`. On an offline object it changes
`PlayerData` and stays silent.

### SetJobDuty

```lua
Player.SetJobDuty(onDuty)
```

No return value. The argument is coerced to a real boolean, so any truthy value becomes `true`.
Fires both `OnJobUpdate` events and then calls `SyncPlayerData`.

```lua
Player.SetJobDuty(not Player.PlayerData.job.onduty)
```

::: danger
This one does not guard against a missing job and will error on a character with no
`PlayerData.job`. In practice every loaded character has one, because `applyDefaults` fills in the
`unemployed` default, but do not call it on a half-built table of your own.
:::

## Character data and metadata

### SetPlayerData

```lua
Player.SetPlayerData(key, val)
```

No return value. Writes a top-level key on `PlayerData` and calls `SyncPlayerData`. It silently
does nothing when `key` is not a string. This is how the inventory resource writes `items` back after
every change.

```lua
Player.SetPlayerData('position', { x = -298.0, y = 780.0, z = 119.0 })
```

### SetMetaData

```lua
Player.SetMetaData(meta, val)
Player.SetMetaData(tableOfPairs)
```

No return value. Accepts either a string key with a value, or a single table of key/value pairs
written in one pass. Either form ends with a `SyncPlayerData`.

```lua
Player.SetMetaData('callsign', '1-Lincoln-18')

Player.SetMetaData({ hunger = 100, thirst = 100, stress = 0 })
```

Every key in `Config.Status.Keys` is clamped into `0-100` on the way in, so a script that changes a
configured status in a loop cannot push it past the status HUD range.
Anything else is stored as given.

### GetMetaData

```lua
Player.GetMetaData(meta)
```

Returns whatever is under that key in `PlayerData.metadata`, or `nil`. Returns `nil` without
looking anything up when `meta` is not a string.

```lua
local jailTime = Player.GetMetaData('injail') or 0
```

The metadata keys a fresh character starts with are listed in
`Config.Player.PlayerDefaults.metadata`: `health`, `hunger`, `thirst`, `cleanliness`, `stress`,
`isdead`, `armor`, `ishandcuffed`, `injail`, `jailitems`, `status`, `rep`, `callsign`,
`fingerprint`, `walletid` and `criminalrecord`.

## Reputation

`metadata.rep` is a table of named counters. All three methods repair it first: a character saved
before `rep` existed has no such key, and reading it directly would fail, so they replace anything
that is not a table with an empty one before touching it.

### AddRep

```lua
Player.AddRep(rep, amount)
```

No return value. Does nothing when `rep` is missing or `amount` is not a number. Adds and calls
`SyncPlayerData`.

### RemoveRep

```lua
Player.RemoveRep(rep, amount)
```

No return value. Subtracts, with a floor of `0`, then calls `SyncPlayerData`.

### GetRep

```lua
Player.GetRep(rep)
```

Returns the counter as a number, `0` when the counter was never set, and `nil` when `rep` itself is
missing.

```lua
Player.AddRep('hunting', 5)
local hunting = Player.GetRep('hunting')
```

::: warning
These three are on the way out. `server/compat.lua` lists them as removed methods and carries
stubs that print a one-time warning and return an empty value. The stubs only install themselves
when the method is absent, so today the real implementations above win and reputation genuinely
works - but the intent recorded in the source is that this server has no reputation system. Do not
build anything new on them.
:::

## State bags

Every configured status plus health lives in both `PlayerData.metadata` and the player's state bag.
The status HUD reads the bag; the database stores the metadata. These two methods move values
between them, for every key in `Config.Status.Keys` plus `health`.

### PushStateBags

```lua
Player.PushStateBags()
```

No return value. Copies metadata into the state bag, skipping keys the metadata does not carry.
`Core.CreatePlayer` calls it once for every online character at build time, so the bag is populated
before any other resource can read it.

### PullStateBags

```lua
Player.PullStateBags()
```

No return value. Copies the state bag back into metadata, and calls `SetMetaData` with the whole
batch when anything was found - which means it also runs the `0-100` clamp and a
`SyncPlayerData`.

`Player.Save()` calls this for online characters, which is why status survives a restart.

::: danger
Neither method is safe on an offline object. They resolve `Player(PlayerData.source).state`, and an
offline object has no `source`. Call them only on a player you got from `Core.GetPlayer`.
:::

## Saving and syncing

### SyncPlayerData

```lua
Player.SyncPlayerData()
```

No return value, and an immediate no-op on an offline object.

It broadcasts. It has never mutated anything - the old name `UpdatePlayerData` suggested otherwise
and that is why it was renamed. It raises `Player.Dirty`, reconciles money items when
`Config.Money.EnableMoneyItems` is on, then fires `HexaCore:Player:SetPlayerData` on the server and
on this player's client.

Every setter on this page already calls it. You only need it by hand if you have written into
`PlayerData` directly, which you should not be doing.

### MarkDirty

```lua
Player.MarkDirty()
```

No return value. Raises the dirty flag so this character is picked up by the next save sweep,
without broadcasting anything.

```lua
Player.PlayerData.metadata.criminalrecord.hasRecord = true
Player.MarkDirty()
```

The sweep in `server/save.lua` runs every `Config.Save.Interval` minutes, collects the players
whose flag is up, and spreads the writes across `Config.Save.SpreadSeconds` so a full server does
not hit MySQL in one tick.

### Save

```lua
Player.Save()
```

No return value. Two different paths depending on the object:

- Online: calls `PullStateBags()` first, then `Core.SavePlayer(source)`, which upserts the `users`
  row and asks the inventory resource to write the satchel.
- Offline: goes straight to `Core.SaveOfflinePlayer(PlayerData)`.

```lua
local Player = Core.GetOfflinePlayerByCitizenId('RB0087')
if Player then
    Player.AddMoney('bank', 500, 'court settlement')
    Player.Save()
end
```

::: warning
Always go through `Player.Save()` rather than calling `Core.SavePlayer(source)` yourself. The
direct call skips `PullStateBags`, and everything sitting in the state bag - hunger, thirst,
cleanliness, stress - is lost on that write.
:::

The dirty flag is lowered *before* the write is queued, not after, because the write does not block.
Lowering it afterwards would clear a flag that was raised again while MySQL was working. If the
insert comes back empty the flag goes straight back up and the player is retried on the next sweep.

### Logout

```lua
Player.Logout()
```

No return value, and a no-op on an offline object. Forwards to `Core.LogoutPlayer(source)`, which
fires `HexaCore:Client:OnPlayerUnload` and `HexaCore:Server:OnPlayerUnload`, waits 200ms, and drops
the object out of `Core.Players`.

::: danger
`Logout` does not save. It unloads the character. Call `Player.Save()` first if the session
mattered.
:::

## Extending the object

### SetField

```lua
Player.SetField(name, value)
```

**Returns two values**: `ok, err`.

- `true` on success.
- `false, 'field name must be a non-empty string'` when `name` is not a usable string.
- `false, 'cannot overwrite reserved field <name>'` for `PlayerData`, `Functions` and `Offline`.

```lua
local ok, err = Player.SetField('GetBountyTotal', function()
    return Player.GetMetaData('bountytotal') or 0
end)

if not ok then Core.Error('SetField refused: %s', err) end
```

Anything you attach with a function value is mirrored into `Player.Functions` automatically by the
object's metatable, so old-style callers reach it too.

`Player.AddMethod` and `Player.AddField` are direct aliases of `SetField`. They were separate
methods that wrote to two different places; with the `.Functions` layer flattened they wrote to the
same one, so they collapsed into a single method. The name is `Set` because it overwrites, which
is not what `Add` implied.

To install a field on players from outside, use `Core.SetPlayerField(ids, name, value)`. It takes a
server id, `-1` for every loaded player, or an array of ids.

```lua
AddEventHandler('HexaCore:Server:PlayerLoaded', function(Player)
    Core.SetPlayerField(Player.PlayerData.source, 'bountyBoard', {})
end)
```

### SetGang

```lua
Player.SetGang(gang, grade)
```

Always returns `false`, and changes nothing. It exists because the bridge calls it and this
server has no gang system; returning `false` is a clearer answer than the `nil` a missing method
would give.

::: tip
The implementation in the source takes no parameters at all. Lua discards extra arguments, so
calling it with a gang and a grade is harmless - it just still returns `false`.
:::

## Methods that return two values

Only two, and both are easy to get wrong by reading the first value alone.

| Method | Returns | Why the second value matters |
| --- | --- | --- |
| `AddItem` | `stored, dropped` | `dropped = true` means the item is on the ground as a bag. It exists - never refund for it. |
| `SetField` | `ok, err` | `err` names which rule the call broke. |

## Offline player objects

`Core.GetOfflinePlayerByCitizenId` returns a full object with `Offline == true`. Behaviour differs
in specific places:

| Method | On an offline object |
| --- | --- |
| `SyncPlayerData` | Returns immediately. Nothing is broadcast. |
| `AddMoney` / `RemoveMoney` / `SetMoney` | Balance changes in `PlayerData`, no events, no log line. |
| `SetJob` | Job changes in `PlayerData`, no `OnJobUpdate` events. |
| `Save` | Routes to `Core.SaveOfflinePlayer`. |
| `Logout` | Does nothing. |
| `PullStateBags` / `PushStateBags` | Not safe to call - there is no `source`. |
| Inventory methods | Called with a `nil` source. Do not use them on an offline object. |

## Quick reference

| Method | Returns |
| --- | --- |
| `AddMoney(moneytype, amount, reason)` | `boolean` |
| `RemoveMoney(moneytype, amount, reason)` | `boolean` |
| `SetMoney(moneytype, amount, reason)` | `boolean` |
| `GetMoney(moneytype)` | `number`, or `nil` / `false` |
| `AddItem(item, amount, slot, info, reason)` | `boolean stored, boolean dropped` |
| `RemoveItem(item, amount, slot, reason)` | `boolean` |
| `GetItemBySlot(slot)` | `table` or `nil` |
| `GetItemByName(item)` | `table` or `nil` |
| `GetItemsByName(item)` | `table` array, `{}` when none |
| `GetTotalWeight()` | `number` |
| `HasItem(items, amount)` | `boolean` |
| `CanCarryItem(item, amount)` | `boolean` |
| `SetJob(job, grade)` | `boolean` |
| `SetJobDuty(onDuty)` | nothing |
| `SetPlayerData(key, val)` | nothing |
| `SetMetaData(meta, val)` | nothing |
| `GetMetaData(meta)` | any or `nil` |
| `AddRep(rep, amount)` | nothing |
| `RemoveRep(rep, amount)` | nothing |
| `GetRep(rep)` | `number` or `nil` |
| `PushStateBags()` | nothing |
| `PullStateBags()` | nothing |
| `SyncPlayerData()` | nothing |
| `MarkDirty()` | nothing |
| `Save()` | nothing |
| `Logout()` | nothing |
| `SetField(name, value)` | `boolean ok, string err` |
| `AddMethod(name, value)` | alias of `SetField` |
| `AddField(name, value)` | alias of `SetField` |
| `SetGang(gang, grade)` | always `false` |
