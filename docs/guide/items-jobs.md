# Items and jobs

Items and jobs are the framework's two shared catalogues. Both live in the database, both are loaded
once when `hexa_core` boots, and both end up in the same place at runtime: `Core.Shared.Items` and
`Core.Shared.Jobs`, mirrored to every connected client.

```lua
local Core = exports['hexa_core']:GetCoreObject()

local item = Core.Shared.Items['bread']
local job  = Core.Shared.Jobs['medic']
```

## Register a type, or give it to a person

This is the one distinction on this page you cannot afford to get wrong.

::: danger Core.RegisterItem and Player.AddItem are not the same thing
`Core.RegisterItem('gold_ring', { ... })` adds an item **type** to the server catalogue. Nobody
receives anything. It teaches the server that a thing called `gold_ring` exists, what it weighs and
what it looks like.

`Player.AddItem('gold_ring', 1)` puts one `gold_ring` **into a person's satchel**.

These two used to share the verb `AddItem` on the core object, which meant `Core.AddItem` and
`Player.AddItem` read almost identically and did opposite things. The catalogue verbs were renamed
in 3.0 for exactly that reason. The player methods did not change.
:::

```lua
local Core = exports['hexa_core']:GetCoreObject()

-- teaches the server that this item type exists
Core.RegisterItem('gold_ring', {
    name = 'gold_ring',
    label = 'Gold Ring',
    weight = 1,
    type = 'item',
    image = 'gold_ring.png',
    unique = false,
    useable = false,
    shouldClose = true,
})

-- hands one to the player behind server id 3
local Player = Core.GetPlayer(3)
Player.AddItem('gold_ring', 1, false, false, 'quest_reward')
```

The same split applies to jobs: `Core.RegisterJob` defines a job that exists on the server,
`Player.SetJob` puts a person into it.

## The database is the source of truth

`Shared.Items` and `Shared.Jobs` start empty in `shared/main.lua`. Nothing is hardcoded. `install.sql`
creates and seeds the tables on first boot, and the loaders in `server/items.lua` and
`server/jobs.lua` read them once `MySQL.ready` fires.

The installer runs automatically, so there is no manual SQL import step. Any resource that queries
these tables itself must wait for it:

```lua
CreateThread(function()
    exports['hexa_core']:AwaitSchemaReady(15000)
    -- schema is applied from here on
end)
```

### The items table

Straight `esx_core` shape. Five columns, nothing more.

| Column | Type | Meaning |
| --- | --- | --- |
| `name` | `VARCHAR(50)`, primary key | Item id used everywhere in code |
| `label` | `VARCHAR(100)` | Display name |
| `weight` | `INT`, default `1` | Percent of carry capacity per unit |
| `rare` | `TINYINT(1)`, default `0` | Loaded as `rare` |
| `can_remove` | `TINYINT(1)`, default `1` | Loaded as `canRemove` |

Weight is a percentage, not grams. A player carries `100` by default
(`Config.Player.PlayerDefaults.weight`), so a food item at weight `1` stacks to a hundred units.

```sql
INSERT INTO `items` (`name`, `label`, `weight`) VALUES ('gold_ring', 'Gold Ring', 1);
```

::: warning Do not add rows for weapons
`server/items.lua` merges `Shared.Weapons` from `shared/weapons.lua` into the catalogue on boot and
forces `type = 'weapon'` and `unique = true` on every entry. A weapon row in the `items` table can
only override `label` and `weight`; it can never make something a weapon, and it is not needed.
:::

### The jobs and job_grades tables

| `jobs` column | Type | Loaded as |
| --- | --- | --- |
| `name` | `VARCHAR(50)`, primary key | `name` |
| `label` | `VARCHAR(100)` | `label`, falls back to `name` |
| `type` | `VARCHAR(50)` | `type` |
| `default_duty` | `TINYINT(1)` | `defaultDuty` |
| `offduty_pay` | `TINYINT(1)` | `offDutyPay` |
| `whitelisted` | `TINYINT(1)` | `whitelisted` |

| `job_grades` column | Type | Loaded as |
| --- | --- | --- |
| `job_name` | `VARCHAR(50)` | Key back into `jobs.name` |
| `grade` | `INT` | Grade key, stored as a string |
| `name` | `VARCHAR(50)` | Grade `name`, falls back to `label` then to the number |
| `salary` | `INT` | Grade `payment` |
| `isboss` | `TINYINT(1)` | `isboss` |

`job_grades` also carries `label`, `skin_male` and `skin_female` columns and a unique key on
(`job_name`, `grade`). The loader reads `label` only as a fallback for `name`; the skin columns are
not read by `hexa_core`.

A job with no grade rows at all is given a synthetic grade `0` named after the job label with
`payment = 0`, so nothing downstream has to handle a job without grades.

```sql
INSERT INTO `jobs` (`name`, `label`, `type`, `whitelisted`) VALUES ('butcher', 'Butcher', NULL, 0);
INSERT INTO `job_grades` (`job_name`, `grade`, `name`, `salary`, `isboss`) VALUES
    ('butcher', 0, 'Apprentice', 10, 0),
    ('butcher', 1, 'Owner', 40, 1);
```

The seed ships `unemployed`, five law offices (`vallaw`, `rholaw`, `blklaw`, `strlaw`, `stdenlaw`)
and `medic`. Every insert is `INSERT IGNORE`, so re-running the installer never overwrites your edits.

## What the loader builds

### Item entries

Every row is expanded into a full entry, because the ESX table has no column for the fields the
inventory needs:

```lua
Core.Shared.Items['bread'] = {
    name = 'bread',
    label = 'ขนมปัง',
    weight = 1,
    rare = false,
    canRemove = true,
    type = 'item',
    image = 'bread.png',
    unique = false,
    useable = true,
    shouldClose = true,
}
```

The seeded labels are Thai, which is why `label` reads the way it does above; the item `name` is
always the English identifier and that is what code refers to.

`image` follows the convention `<name>.png`. `useable = true` here only means "not blocked"; whether
using it actually does something is decided by `Core.CreateUseableItem`, exactly like
`ESX.RegisterUsableItem`. `hexa_inventory` additionally reads `description` and `combinable` off an
entry when they are present, so a runtime registration may set them.

Weapons come out with `type = 'weapon'` and `unique = true`, one gun per slot. Money items
(`dollar`, `cent`, `money_clip`, `blood_dollar`, `blood_cent`, `blood_money_clip`) are added only
when `Config.Money.EnableMoneyItems` is `true`, with `useable = false`.

::: tip Weapon checks use Shared.IsWeapon
Do not test `Core.Shared.Items[name].type == 'weapon'` to decide whether something is a weapon. The
catalogue only exists after the database is up, so that check is false during early boot and a
weapon saved in that window loses its ammo and serial. Use `Core.Shared.IsWeapon(name)`, which reads
the static weapon table and is correct from the first frame. It is also exported as
`exports['hexa_core']:IsWeapon(name)`.
:::

### Job entries

```lua
Core.Shared.Jobs['medic'] = {
    name = 'medic',
    label = 'Medic',
    type = 'medic',
    defaultDuty = false,
    offDutyPay = false,
    whitelisted = true,
    grades = {
        ['0'] = { name = 'Recruit', payment = 5, isboss = false },
        ['4'] = { name = 'Manager', payment = 100, isboss = true },
    },
}
```

Grade keys are **strings**, not numbers. `Player.SetJob('medic', 2)` converts for you, but a direct
read has to use `job.grades['2']`.

`payment` is what the paycheck loop pays out every `Config.Money.PayCheckTimeOut` minutes. A player
is paid when they are on duty, or off duty if the job has `offDutyPay` set.

## How the catalogue reaches clients

Both loaders push the finished table to everyone and then refresh the core object:

```lua
TriggerClientEvent('HexaCore:Client:OnSharedUpdateMultiple', -1, 'Items', items)
TriggerEvent('HexaCore:Server:UpdateObject')
```

Three server-to-client events keep clients in sync:

| Event | Payload | Sent when |
| --- | --- | --- |
| `HexaCore:Client:SharedUpdate` | The whole `Shared` table | On `playerConnecting`, and again on spawn request |
| `HexaCore:Client:OnSharedUpdateMultiple` | Table name plus a map of entries | Catalogue load, `RegisterItems`, `RegisterJobs` |
| `HexaCore:Client:OnSharedUpdate` | Table name, key, value | Single register, update or unregister |

Each of them ends by firing `HexaCore:Client:UpdateObject` on the client. That signal matters:
resources that cache the core object hold a msgpack **copy**, not a live reference, so they must
re-fetch when it fires or they keep reading an empty catalogue for the rest of the session.

```lua
local Core = exports['hexa_core']:GetCoreObject()

RegisterNetEvent('HexaCore:Client:UpdateObject', function()
    Core = exports['hexa_core']:GetCoreObject()
end)
```

The server-side counterpart is `HexaCore:Server:UpdateObject`.

## Registering at runtime

All of these are server side, on the core object. They mutate `Core.Shared` in memory and broadcast
to clients. Every one returns `success, message`.

| Function | Signature | Fails with |
| --- | --- | --- |
| `Core.RegisterItem` | `(itemName, item)` | `invalid_item_name`, `item_exists` |
| `Core.RegisterItems` | `(items)` | `invalid_item_name`, `item_exists` |
| `Core.UpdateItemDefinition` | `(itemName, item)` | `invalid_item_name`, `item_not_exists` |
| `Core.UnregisterItem` | `(itemName)` | `invalid_item_name`, `item_not_exists` |
| `Core.RegisterJob` | `(jobName, job)` | `invalid_job_name`, `job_exists` |
| `Core.RegisterJobs` | `(jobs)` | `invalid_job_name`, `job_exists` |
| `Core.UpdateJobDefinition` | `(jobName, job)` | `invalid_job_name`, `job_not_exists` |
| `Core.UnregisterJob` | `(jobName)` | `invalid_job_name`, `job_not_exists` |

```lua
local Core = exports['hexa_core']:GetCoreObject()

local ok, err = Core.RegisterItem('gold_ring', {
    name = 'gold_ring',
    label = 'Gold Ring',
    weight = 1,
    rare = false,
    canRemove = true,
    type = 'item',
    image = 'gold_ring.png',
    unique = false,
    useable = true,
    shouldClose = true,
    description = 'A plain band of gold.',
})

if not ok then
    Core.Error('gold_ring was not registered: %s', err)
end
```

`RegisterItems` and `RegisterJobs` take a map keyed by name and return a third value, the entry that
failed, so you can report which one broke:

```lua
local ok, err, offender = Core.RegisterItems({
    gold_ring   = { name = 'gold_ring',   label = 'Gold Ring',   weight = 1, type = 'item', image = 'gold_ring.png' },
    silver_ring = { name = 'silver_ring', label = 'Silver Ring', weight = 1, type = 'item', image = 'silver_ring.png' },
})

if not ok then
    Core.Error('item batch rejected (%s): %s', err, json.encode(offender))
end
```

Registering a job at runtime looks the same:

```lua
local ok, err = Core.RegisterJob('butcher', {
    name = 'butcher',
    label = 'Butcher',
    type = 'none',
    defaultDuty = true,
    offDutyPay = false,
    whitelisted = false,
    grades = {
        ['0'] = { name = 'Apprentice', payment = 10, isboss = false },
        ['1'] = { name = 'Owner', payment = 40, isboss = true },
    },
})
```

::: warning Runtime registration is not persistence
`Core.RegisterItem` and friends only touch memory. `hexa_core` rebuilds `Shared.Items` and
`Shared.Jobs` from the database on every start, so anything registered at runtime is gone after a
restart unless there is a row backing it. Registering before `MySQL.ready` completes is worse than
useless: the item loader assigns a freshly built table over `Shared.Items`, wiping whatever was
added first. Register from a thread that has already called `AwaitSchemaReady`, or insert a row.
:::

There is a partial-failure trap in the batch calls worth knowing about: `RegisterItems` and
`RegisterJobs` write each entry as they walk the table and stop at the first bad one, so the entries
processed before the failure stay in `Core.Shared` but are never broadcast to clients. Validate a
batch before sending it, or register one at a time when the input is not fully under your control.

## The export surface

The catalogue verbs are also exported under their original `qb`/`rsg` names, permanently, so ported
scripts drop in unmodified:

```lua
exports['hexa_core']:AddItem('gold_ring', itemDefinition)
exports['hexa_core']:AddItems(itemMap)
exports['hexa_core']:UpdateItem('gold_ring', itemDefinition)
exports['hexa_core']:RemoveItem('gold_ring')

exports['hexa_core']:AddJob('butcher', jobDefinition)
exports['hexa_core']:AddJobs(jobMap)
exports['hexa_core']:UpdateJob('butcher', jobDefinition)
exports['hexa_core']:RemoveJob('butcher')
```

::: warning The export named AddItem is the catalogue one
`exports['hexa_core']:AddItem(name, definition)` registers an item **type**. It is the export form of
`Core.RegisterItem`, not of `Player.AddItem`. To give an item to a player, go through the player
object.
:::

On the core object the old spellings still resolve for one more release. `Core.AddItem`,
`Core.AddItems`, `Core.UpdateItem`, `Core.RemoveItem`, `Core.AddJob`, `Core.AddJobs`,
`Core.UpdateJob` and `Core.RemoveJob` each forward to the new name and print a one-time warning
naming the calling resource.

## Useable items

Registering a callback is what makes an item do something when a player uses it. `hexa_inventory`
looks the callback up when the item is used and calls it with the player's server id and the item
data from the slot.

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.CreateUseableItem('bandage', function(source, item)
    local Player = Core.GetPlayer(source)
    if not Player then return end
    -- item.info and item.slot come from the slot the player clicked
    Player.RemoveItem('bandage', 1, item.slot, 'used_bandage')
end)
```

`Core.GetUsableItem(itemName)` returns whatever was registered, or `nil` if the item has no handler.
It is the direct replacement for the old `CanUseItem`, which still works and warns.

```lua
if Core.GetUsableItem('bandage') then
    -- something is registered for this item
end
```

`Core.UseItem(source, item)` forwards to `exports['hexa_inventory']:UseItem`, and returns early with
a warning if `hexa_inventory` is not started. The inventory fires item use by itself when a player
clicks an item, so resources rarely need to call this.

::: warning The old use events are exploitable
`HexaCore:Server:UseItem` and `HexaCore:Client:UseItem` still exist but log a deprecation warning
naming the caller, and are scheduled for removal. Go through `hexa_inventory` instead.
:::

Two more helpers guard item flow. Both are on the core object and mirrored onto the player object,
and both return `false` when `hexa_inventory` is not started:

```lua
local Player = Core.GetPlayer(source)

if Player.CanCarryItem('gold_ring', 5) then
    Player.AddItem('gold_ring', 5)
end

if Player.HasItem('bandage', 1) then
    -- the player is carrying at least one
end
```

`Core.CanCarryItem(source, item, amount)` weighs `amount` units of the item against the player's
current load and their `PlayerData.weight` cap, and logs an error if the item is not in the
catalogue at all. `Core.HasItem(source, items, amount)` accepts a string or a table of names.

## Items on the player object

These are the player-side inventory methods. All of them delegate to `hexa_inventory` and degrade to
a safe value when it is stopped, rather than erroring.

| Method | Returns when the inventory is down |
| --- | --- |
| `Player.AddItem(item, amount, slot, info, reason)` | `false, false` |
| `Player.RemoveItem(item, amount, slot, reason)` | `false` |
| `Player.GetItemBySlot(slot)` | `nil` |
| `Player.GetItemByName(item)` | `nil` |
| `Player.GetItemsByName(item)` | `{}` |
| `Player.GetTotalWeight()` | `0` |
| `Player.HasItem(items, amount)` | `false` |
| `Player.CanCarryItem(item, amount)` | `false` |

`Player.AddItem` returns two booleans: `stored` and `dropped`. `dropped = true` means the satchel was
full and the item was placed on the ground as a bag. The item still exists, so a shop must not refund
the player in that case.

```lua
local stored, dropped = Player.AddItem('gold_ring', 1, false, false, 'shop_purchase')

if not stored and not dropped then
    -- nothing was created, this is the only case worth refunding
end
```

Pass `false` rather than `nil` for `slot` and `info` when you skip them. A `nil` in the middle of an
argument list is dropped as it crosses the resource boundary, which shifts `reason` into the slot
position.

`Player.AddItem` and `Player.RemoveItem` mark the player dirty, so the next save sweep writes them
out. Changing inventory through some other path does not; call `Player.MarkDirty()` yourself then.

## Jobs on the player object

```lua
local Player = Core.GetPlayer(source)

-- refuses and returns false if the job is not in the catalogue
Player.SetJob('medic', 2)
Player.SetJobDuty(true)
```

`SetJob` lowercases the job name, defaults the grade to `'0'`, and rejects anything not in
`Core.Shared.Jobs`. On success it copies `label`, `type` and the grade's `name`, `level`, `payment`
and `isboss` into `PlayerData.job`, sets `onduty` from the job's `defaultDuty`, syncs the player and
fires `HexaCore:Server:OnJobUpdate` plus `HexaCore:Client:OnJobUpdate` with `(source, job)`. A grade
that does not exist leaves the placeholder grade in place: level `0`, name `No Grades`, payment `30`.

::: tip There is no gang system on this server
`Player.SetGang(gang, grade)` exists and always returns `false`. It is there because the rsg bridge
calls it. Do not build anything on it.
:::

Counting who is working:

```lua
local players, count = Core.GetPlayersOnDuty('medic')
local onlyCount = Core.GetDutyCount('medic')
```

`GetPlayersOnDuty` returns a list of server ids plus the count; `GetDutyCount` returns just the number.

## Weight and slots

Capacity defaults come from `Config.Player.PlayerDefaults`: `weight = 10000` and `slots = 10000`. Weight
is a percentage of the satchel, so an item of weight `1` costs one percent of the bag.

```lua
Core.SetMaxWeight(source, 150)
Core.SetMaxSlots(source, 40)
```

Both write straight to the player's data through `SetPlayerData`. They were `ChangeWeight` and
`ChangeSlots`; the old names still work and warn once.

`Core.GetTotalWeight(items)` weighs a raw items table, and returns `0` when `hexa_inventory` is not
running.

## Admin commands

`hexa_core` ships three commands that touch these catalogues.

| Command | Permission | Notes |
| --- | --- | --- |
| `/giveitem [citizenid] [item] [amount]` | `admin` | First argument is a **citizen id**, not a server id. Rejects items missing from the catalogue |
| `/setjob [citizenid] [job] [grade]` | `admin` | Also a citizen id. Rejects jobs missing from the catalogue |
| `/job` | `user` | Prints your own job, grade and duty state |

## Renamed in 3.0

| Old | New |
| --- | --- |
| `Core.AddItem` | `Core.RegisterItem` |
| `Core.AddItems` | `Core.RegisterItems` |
| `Core.UpdateItem` | `Core.UpdateItemDefinition` |
| `Core.RemoveItem` | `Core.UnregisterItem` |
| `Core.AddJob` | `Core.RegisterJob` |
| `Core.AddJobs` | `Core.RegisterJobs` |
| `Core.UpdateJob` | `Core.UpdateJobDefinition` |
| `Core.RemoveJob` | `Core.UnregisterJob` |
| `Core.CanUseItem` | `Core.GetUsableItem` |
| `Core.ChangeWeight` | `Core.SetMaxWeight` |
| `Core.ChangeSlots` | `Core.SetMaxSlots` |

Unchanged, and not to be second-guessed: `Core.CreateUseableItem`, `Core.UseItem`, `Core.HasItem`,
`Core.CanCarryItem`, `Core.GetPlayersOnDuty`, `Core.GetDutyCount`, and on the player object
`AddItem`, `RemoveItem`, `GetItemBySlot`, `GetItemByName`, `GetItemsByName`, `GetTotalWeight`,
`HasItem`, `SetJob`, `SetJobDuty`.
