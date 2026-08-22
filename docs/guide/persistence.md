# Saving and persistence

Everything a character owns - money, job, inventory, loadout, metadata, position, death state - lives
in one row of the `users` table. This page describes exactly when that row gets written, what decides
whether a given player is written at all, and what you lose when the server dies without warning.

The code is in `server/save.lua` (the cadence) and `server/player.lua` (the write itself).

## The server owns the cadence

In earlier versions the save clock ran on the client: `client/loops.lua` counted down and fired
`HexaCore:UpdatePlayer` at the server, which then wrote that one player. A client that stopped firing
that event - because it was frozen, because a resource on that client errored, because someone had
tampered with it - was simply never written. Nothing on the server noticed.

In 3.0 the loop lives on the server and no client can ask for a write:

```lua
-- server/save.lua, simplified
CreateThread(function()
    while true do
        Wait(Config.Save.Interval * 60000)
        sweep()
    end
end)
```

The old `HexaCore:UpdatePlayer` handler still exists on the server, but it is registered with
`AddEventHandler`, not `RegisterNetEvent`, so a client cannot reach it. Only a server-side resource
can trigger it, and it is rate limited to one write per player per 30 seconds.

::: tip
`Config.UpdateInterval` still resolves, but it is now just a copy of `Config.Save.Interval`. Set the
interval on `Config.Save.Interval`; nothing reads `Config.UpdateInterval` any more.
:::

## Configuration

```lua
Config.Save = {}

Config.Save.Interval = 45        -- minutes between sweeps, clamped to a minimum of 1
Config.Save.SpreadSeconds = 60   -- seconds to spread one sweep's writes across
Config.Save.OnDrop = true        -- save immediately when a player disconnects
Config.Save.OnResourceStop = true -- save everyone before hexa_core stops
```

`Config.Save.Interval` is read fresh at the top of every loop iteration, so raising or lowering it
takes effect from the next sweep onward without a restart of the loop thread. Values below 1 are
clamped to 1 minute.

## The dirty flag

A sweep does not write every online player. It writes only the players whose data actually changed
since their last write. Each player object carries a boolean:

```lua
local Player = Core.GetPlayer(source)
print(Player.Dirty)
```

It is `true` the moment the player object is constructed, because a freshly loaded character has not
been written during this session yet. It is cleared inside `Core.SavePlayer` immediately *before* the
insert is dispatched, not after - the write is asynchronous, and clearing it afterwards would wipe a
flag that some other resource legitimately raised while the query was in flight. If the insert comes
back with no id, the flag is put back and the player is picked up again by the next sweep.

### What marks a player dirty

- `Player.SyncPlayerData()`, which is called for you by `Player.SetPlayerData`, `Player.SetMetaData`,
  `Player.SetJob`, `Player.SetJobDuty`, `Player.AddMoney`, `Player.RemoveMoney`, `Player.SetMoney`,
  `Player.AddRep` and `Player.RemoveRep`
- `Player.AddItem` and `Player.RemoveItem` on the player object, which set the flag themselves
  because they do not go through `SyncPlayerData`
- `Player.MarkDirty()`, called by hand

### What does not

Reaching into `Player.PlayerData` and mutating a table in place changes nothing that the sweep can
see. Writing a statebag key directly does not mark the player dirty either - statebag values are
folded into metadata at save time, but they do not by themselves cause a save to happen.

```lua
-- this is invisible to the sweep
Player.PlayerData.metadata.criminalrecord = true

-- this is not
Player.PlayerData.metadata.criminalrecord = true
Player.MarkDirty()
```

::: warning
If your resource writes into `PlayerData` directly instead of going through a player method, you must
call `Player.MarkDirty()` yourself or your change survives only until the next restart.
:::

## Why writes are spread out

A full server writing every dirty player in the same server tick means dozens of simultaneous upserts
against `users`, plus a `SaveInventory` call each, all landing at once. `Config.Save.SpreadSeconds`
turns that spike into a queue: the sweep divides the spread window by the number of pending players
and staggers each write with `SetTimeout`.

With the defaults, a sweep of 40 dirty players issues roughly one write every 1.5 seconds instead of
40 writes in one frame.

Because a queued write can fire up to `SpreadSeconds` after the sweep began, the player is re-fetched
from `Core.Players` at the moment its turn arrives rather than being captured in the closure. A player
who disconnected while waiting in the queue is skipped - they were already written by the disconnect
path.

## Save on disconnect

`Config.Save.OnDrop` is meant to control this, and the `playerDropped` handler in `server/events.lua`
does save:

```lua
-- server/events.lua
AddEventHandler('playerDropped', function(reason)
    local src = source
    if not HexaCore.Players[src] then return end
    local Player = HexaCore.Players[src]
    TriggerEvent('HexaCore:Server:PlayerDropped', Player)
    Player.Save()
    HexaCore.Players[src] = nil
end)
```

::: danger Source note
As of 3.0.0 that handler does not actually read `Config.Save.OnDrop` - it saves unconditionally.
Setting the key to `false` has no effect today. Since saving on drop is what you want anyway, the
practical advice is to leave it `true` and treat the disconnect save as always-on.
:::

The disconnect save is what keeps the interval survivable in normal operation. A player who plays for
two hours and logs out cleanly loses nothing, regardless of how long the interval is, because leaving
is itself a write.

::: warning
Logging out to the character selector is not a disconnect. `Core.LogoutPlayer` (and `Player.Logout`,
which calls it) unloads the character from `Core.Players` without writing it. Save first if you are
building a flow that unloads a character deliberately:

```lua
local Player = Core.GetPlayer(source)
Player.Save()
Player.Logout()
```
:::

## Save on resource stop

```lua
AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    if Config.Save.OnResourceStop == false then return end
    Hexa.Log('resource stopping - saving %d player(s)', Core.SaveAllPlayers())
end)
```

This path honours `Config.Save.OnResourceStop`, and it ignores the dirty flag on purpose:
`Core.SaveAllPlayers()` walks every entry in `Core.Players` and writes it, clean or not. A restart is
not the moment to be clever about skipping work, and there is no spread here either - there is no time
left to queue.

### Why it must go through Player.Save()

`Core.SavePlayer(source)` builds the row out of `PlayerData` as it currently stands. Live status
values - `hunger`, `thirst`, `cleanliness`, `stress`, `health` - do not live in `PlayerData` while the
player is online; they live in that player's statebag and are only copied back by
`Player.PullStateBags()`.

```lua
function self.Save()
    if self.Offline then
        HexaCore.SaveOfflinePlayer(self.PlayerData)
    else
        self.PullStateBags()
        HexaCore.SavePlayer(self.PlayerData.source)
    end
end
```

Earlier code called `Core.SavePlayer(src)` directly on resource stop, which skipped `PullStateBags`
and therefore wrote the stale metadata from whenever the values were last synced. Every restart reset
hunger, thirst, cleanliness and stress. `Core.SaveAllPlayers()` calls `Player.Save()`, so the
statebags are flushed into metadata before the row is built.

The mirror of this runs at load: `Player.PushStateBags()` copies those same keys out of metadata and
into the statebag when the character is constructed.

::: warning
Never call `Core.SavePlayer(source)` from your own resource for an online player. Call `Player.Save()`
and let it flush the statebags first. `Core.SavePlayer` is the low-level half and skipping the flush
is exactly the bug described above.
:::

## What a hard crash costs

Everything above depends on something running: a sweep, a disconnect, a resource stop. A hard crash -
the process killed, the machine losing power, oxmysql dying - runs none of them.

At the default `Config.Save.Interval = 45`, the worst case for a given player is 45 minutes of
progress, plus up to `SpreadSeconds` if they were still sitting in the last sweep's queue. In practice
it is 45 minutes of money, job changes, metadata and position for anyone who was online continuously
and did not happen to trigger any other write.

This is a real tradeoff, not a rounding error. A long interval is cheap on the database and expensive
on a crash; a short interval is the reverse.

| Interval | Worst-case loss | Writes per hour, 40 dirty players |
| --- | --- | --- |
| 5 | about 6 minutes | 480 |
| 15 | about 16 minutes | 160 |
| 45 (default) | about 46 minutes | roughly 53 |

The default assumes clean disconnects are the common case and crashes are rare. If your server crashes
often enough that players notice rollbacks, lower the interval before you do anything else - and raise
`SpreadSeconds` along with it so the extra sweeps stay spread out.

## Forcing a save from another resource

Three levels, from cheapest to most immediate.

Mark the player so the next sweep picks them up. Use this after mutating `PlayerData` directly:

```lua
local Core = exports['hexa_core']:GetCoreObject()
local Player = Core.GetPlayer(source)

Player.MarkDirty()
```

Write one player now. Use this after something that must not be lost, such as a large payout or a
character-defining change:

```lua
local Player = Core.GetPlayer(source)

Player.Save()
```

Write everyone now. Use this before a planned restart or from an admin command:

```lua
local saved = Core.SaveAllPlayers()

Core.Log('saved %d player(s) before restart', saved)
```

For a character who is not online, load them and save through the same method:

```lua
local Player = Core.GetOfflinePlayerByCitizenId('RB1234')

if Player then
    Player.AddMoney('bank', 500, 'offline payout')
    Player.Save()
end
```

`Player.Save()` on an offline player routes to `Core.SaveOfflinePlayer(PlayerData)` instead, which
skips the statebag flush - an offline character has no statebag to read.

## Reference

| Symbol | Side | What it does |
| --- | --- | --- |
| `Config.Save.Interval` | server | Minutes between sweeps, minimum 1 |
| `Config.Save.SpreadSeconds` | server | Window the sweep staggers its writes across |
| `Config.Save.OnDrop` | server | Intended to gate the disconnect save; not read in 3.0.0 |
| `Config.Save.OnResourceStop` | server | Set `false` to skip the save on resource stop |
| `Core.SaveAllPlayers()` | server | Writes every loaded player, returns how many |
| `Core.SavePlayer(source)` | server | Low-level write, no statebag flush |
| `Core.SaveOfflinePlayer(PlayerData)` | server | Write for a character with no session |
| `Player.Save()` | server | Flushes statebags, then writes; the call you want |
| `Player.MarkDirty()` | server | Forces the player into the next sweep |
| `Player.Dirty` | server | Boolean, true when there is something to write |
| `Player.SyncPlayerData()` | server | Broadcasts PlayerData and marks the player dirty |
| `Player.PullStateBags()` | server | Copies live status values into metadata |
| `Player.PushStateBags()` | server | Copies metadata back out into the statebag |
