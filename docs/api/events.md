# Events

Every event `hexa_core` fires or listens for, with its direction, its payload, and - the point of
this page - whether a player's game client is able to fire it.

In FXServer there are two ways to register a handler, and they are not equivalent:

```lua
-- only code running on this same side can reach this handler
AddEventHandler('HexaCore:Server:PlayerLoaded', function(Player) end)

-- the network can reach this handler, which on the server means any connected client
RegisterNetEvent('HexaCore:Server:RequestStatus', function() end)
```

A `RegisterNetEvent` on the server is a public entry point. Anyone running an injector can send it
whatever arguments they like, as often as they like, at any time. A plain `AddEventHandler` on the
server can only be reached by another server script in the same process.

Every table below carries a **Client can fire** column. Read it before you build anything on top of
one of these events.

::: danger
Never trust a value that arrived through a net event on the server. `source` is the only argument
FXServer fills in for you; everything else is attacker-controlled. `hexa_core` validates argument
types, rate-limits, and re-reads the player from `Core.GetPlayer(source)` on every net handler it
owns - do the same in yours.
:::

## How to read the direction column

| Direction | Meaning |
| --------- | ------- |
| client to server | A client sends it with `TriggerServerEvent`. The server handler is a net event. |
| server to client | The server sends it with `TriggerClientEvent`. |
| server local | Fired and handled inside the server process only. |
| client local | Fired and handled inside one client only. |

## Server-side entry points a client can reach

These are the net events registered on the server. Twelve doors into the framework, and each one is
guarded differently.

| Event | Payload | Client can fire | Guard |
| ----- | ------- | --------------- | ----- |
| `HexaCore:Server:RequestSpawn` | none | yes, by design | Re-entry flag per source, replays the last spawn if already logged in |
| `HexaCore:Server:OnPlayerLoaded` | none | yes, by design | Money-item reconciliation runs once per session per source |
| `HexaCore:Server:RequestStatus` | none | yes, by design | Read-only, answers only to the caller |
| `HexaCore:Server:SetMetaData` | `meta` (string), `data` (number or boolean) | yes, allowlisted | Only `hunger`, `thirst`, `cleanliness`, `stress` are accepted |
| `HexaCore:ToggleDuty` | none | yes | None beyond "must have a character loaded" |
| `HexaCore:CallCommand` | `command` (string), `args` (table) | yes | `Core.HasPermission(src, 'command.' .. name)` |
| `HexaCore:Server:TriggerCallback` | `name` (string), `...` | yes, by design | The callback body is responsible for its own checks |
| `HexaCore:Server:TriggerClientCallback` | `name` (string), `...` | yes, by design | Consumes a one-shot pending handler, then clears it |
| `HexaCore:Server:ReportCSRFFailure` | none | yes | Rate-limited to one console line per 10 second window |
| `HexaCore:Server:UseItem` | `item` (table) | yes, deprecated | Warns and does nothing |
| `HexaCore:Server:RemoveItem` | `itemName`, `amount` | yes, deprecated | Warns and does nothing |
| `HexaCore:Server:AddItem` | `itemName`, `amount` | yes, deprecated | Warns and does nothing |

### HexaCore:Server:RequestSpawn

Fired by `client/spawn.lua` once the game world is up. The server finds the newest character for
that identifier, logs it in (creating one if there is none), pushes `Core.Shared`, and answers with
`HexaCore:Client:SpawnPlayer`. The client retries every 10 seconds until it gets an answer, so the
handler must stay idempotent - a repeat request from an already-logged-in player replays the same
spawn data instead of returning silently.

### HexaCore:Server:SetMetaData

The only metadata keys a client may write are the four body-status keys. Anything else is refused
and logged with the source id.

```lua
-- allowed from the client
TriggerServerEvent('HexaCore:Server:SetMetaData', 'thirst', 80)
```

::: danger
Do not widen `CLIENT_SETTABLE_META`. Adding `injail`, `isdead`, `criminalrecord` or `walletid` to
that list hands every player a one-line jailbreak. Write those keys from the server with
`Player.SetMetaData(key, value)` instead.
:::

### HexaCore:ToggleDuty

Flips `PlayerData.job.onduty`, notifies the player, then fans out `HexaCore:Server:SetDuty` and
`HexaCore:Client:SetDuty`.

::: warning
This event has no permission or job check at all. Any client can toggle its own duty state at will,
which means duty is a convenience flag, not an authorisation. If a job resource pays wages, opens a
door, or unlocks a stash based on `onduty`, verify `PlayerData.job.name` and grade on the server as
well.
:::

### HexaCore:CallCommand

The path admin menus use to run a registered command without typing it in chat. The handler looks
the command up in `Core.Commands.List`, checks `command.<name>` through the ace system, checks that
required arguments are present, and only then calls the command body.

```lua
-- from the client, same permission check as typing it
TriggerServerEvent('HexaCore:CallCommand', 'tpm', {})
```

### HexaCore:Server:ReportCSRFFailure

Sent by the client's `validateCSRF` NUI callback when a token does not match. It is a report, not an
order: the server decides what to do with it through `Config.Security.CSRFFailurePolicy` (`'log'` by
default, `'kick'` optional) and `Config.Security.CSRFFailureThreshold`.

::: warning
The CSRF token is generated, sent, and checked entirely on the client. The server has nothing to
verify it against, so this event proves nothing about the sender. It is an alarm bell for stray NUI
frames, never an anti-cheat. Setting the policy to `'kick'` also lets a player drop themselves.
:::

## Server-side events a client cannot reach

Registered with `AddEventHandler`, so only server code gets in.

| Event | Payload | Client can fire | Notes |
| ----- | ------- | --------------- | ----- |
| `HexaCore:UpdatePlayer` | none | no | Forces a save for `source`, with a 30 second per-player cooldown |
| `HexaCore:Server:PlayerLoaded` | `Player` (player object) | no | Also fired by the core, see below |
| `HexaCore:Server:OnMoneyChange` | `src`, `moneytype`, `amount`, `operation`, `reason` | no | Handled here only when `Config.Money.EnableMoneyItems` is true |
| `hexa_log:server:CreateLog` | `category`, `title`, `colour`, `message` | no | The log sink, see [Logging](/guide/logging) |
| `HexaCore:DebugSomething` | `tbl`, `indent`, `resource` | no | Dumps a table to the console, kept for old callers |

### HexaCore:UpdatePlayer

This used to be a net event, and the client used to run the save clock. It is now a plain server
event: a client cannot order a database write any more. The only remaining callers are server-side
bridges, and even they hit the same 30 second cooldown per player.

```lua
-- server side only, and still cooled down per player
TriggerEvent('HexaCore:UpdatePlayer')
```

::: tip
Do not reach for this event to persist your own changes. Call `Player.MarkDirty()` and let the sweep
in `Config.Save.Interval` pick the player up, or call `Player.Save()` when you genuinely need the
row written now.
:::

### HexaCore:DebugSomething

Kept deliberately non-net so a client cannot flood the server console with table dumps. New code
should call `Core.DumpTable(value)` directly.

## Server events hexa_core fires for other resources

Listen to these with `AddEventHandler` on the server. None of them are net events, so a client
cannot forge them.

| Event | Payload | Fired when |
| ----- | ------- | ---------- |
| `HexaCore:Server:PlayerLoaded` | `Player` | A character finished loading, at the end of `Core.CreatePlayer` |
| `HexaCore:Server:PlayerDropped` | `Player` | A player disconnected, fired before the final save |
| `HexaCore:Server:OnPlayerUnload` | `source` | `Core.LogoutPlayer(source)` ran |
| `HexaCore:Server:OnJobUpdate` | `source`, `job` | `Player.SetJob` or `Player.SetJobDuty` changed the job table |
| `HexaCore:Server:SetDuty` | `source`, `onduty` | A player toggled duty through `HexaCore:ToggleDuty` |
| `HexaCore:Server:OnMoneyChange` | `source`, `moneytype`, `amount`, `operation`, `reason` | `Player.AddMoney`, `RemoveMoney` or `SetMoney` succeeded |
| `HexaCore:Server:PermissionsChanged` | `source` | `Core.AddPermission` or `Core.RemovePermission` actually changed something |
| `HexaCore:Server:UpdateObject` | none | The catalogue or the core object changed: item and job registration, `Core.SetField` |

### HexaCore:Server:PlayerLoaded

The standard hook for anything that needs to run once per character, and the right place to attach
extra methods.

```lua
local Core = exports['hexa_core']:GetCoreObject()

AddEventHandler('HexaCore:Server:PlayerLoaded', function(Player)
    -- attach a method for this one player
    Core.SetPlayerField(Player.PlayerData.source, 'GreetTown', function()
        Core.Notify(Player.PlayerData.source, { title = 'Welcome back', type = 'info', duration = 5000 })
    end)
end)
```

### HexaCore:Server:OnMoneyChange

`operation` is one of `'add'`, `'remove'` or `'set'`. `reason` is the string the caller passed to
the money method, defaulting to `'unknown'` when a script omits it.

```lua
AddEventHandler('HexaCore:Server:OnMoneyChange', function(src, moneytype, amount, operation, reason)
    if moneytype == 'gold' and operation == 'add' then
        Core.Log('id %s gained %s gold (%s)', src, amount, reason)
    end
end)
```

### HexaCore:Server:UpdateObject

Fired every time the shared catalogue changes: `Core.RegisterItem`, `Core.RegisterItems`,
`Core.UpdateItemDefinition`, `Core.UnregisterItem`, the four job equivalents, `Core.SetField`, and
the database load of items and jobs at startup.

::: tip
If your resource caches `Core.Shared.Items` or `Core.Shared.Jobs` in a local variable, re-read the
core object when this fires. Otherwise the copy you hold is frozen at the moment you grabbed it.
:::

## Events the server sends to clients

None of these are things you fire yourself, with the exception of `HexaCore:Notify` and the
`hexa_core:client:*` draw-text set. Everything else is the core talking to its own client half - a
client can technically fire them locally on itself, and the column says what that costs.

| Event | Payload | Fired when | If a client fires it locally |
| ----- | ------- | ---------- | ---------------------------- |
| `HexaCore:Client:SharedUpdate` | `shared` (table) | On connect and on every spawn request | Overwrites its own catalogue copy |
| `HexaCore:Client:OnSharedUpdate` | `tableName`, `key`, `value` | One item or job was registered, updated or removed | Same, local only |
| `HexaCore:Client:OnSharedUpdateMultiple` | `tableName`, `values` | A batch of items or jobs changed | Same, local only |
| `HexaCore:Client:SpawnPlayer` | `pos`, `health`, `gender` | Answer to `HexaCore:Server:RequestSpawn` | Guarded by a `spawned` flag, so at most once |
| `HexaCore:Client:OnPlayerUnload` | none | `Core.LogoutPlayer` ran | Clears its own logged-in state bag |
| `HexaCore:Player:SetPlayerData` | `PlayerData` (table) | Every `Player.SyncPlayerData()` | Fakes its own local `Core.PlayerData` only |
| `HexaCore:Player:UpdatePlayerData` | none | Sent during `Core.LogoutPlayer` | Nothing, see the note below |
| `HexaCore:Client:OnJobUpdate` | `job` (table) | `Player.SetJob` or `Player.SetJobDuty` | Fakes its own local job display only |
| `HexaCore:Client:SetDuty` | `onduty` (boolean) | A duty toggle completed | Local display only |
| `HexaCore:Client:OnMoneyChange` | `moneytype`, `amount`, `operation`, `reason` | Any successful money method | Local display only, no balance moves |
| `HexaCore:Client:UpdateNeeds` | `status` (table of the four keys) | Status tick, status write, or player load | Local HUD values only, the server keeps the real numbers |
| `HexaCore:Client:TriggerCallback` | `name`, `...` | A server callback answered | Resolves one of its own pending callbacks |
| `HexaCore:Client:TriggerClientCallback` | `name`, `...` | The server asked the client a question | Answers a question nobody asked |
| `HexaCore:Notify` | `data` (table or string) | `Core.Notify(source, data)` | Shows itself a toast |

### HexaCore:Notify

The one client event other resources are meant to fire directly. `data` accepts a plain string, or a
table with `title`, `description`, `type` and `duration`. `type` is one of `error`, `success`,
`info`, `primary`, `warning`.

```lua
-- from the server, addressed at one player
Core.Notify(source, { title = 'Delivery accepted', type = 'success', duration = 5000 })
```

```lua
-- from the client, on yourself
TriggerEvent('HexaCore:Notify', { title = 'Too far away', type = 'error', duration = 4000 })
```

::: warning
Do not add your own `RegisterNetEvent('HexaCore:Notify')` in another resource. `hexa_core` already
owns a handler for it and forwards to `hexa_notify`; a second listener makes every notification in
the server appear twice.
:::

### HexaCore:Client:UpdateNeeds

The body-status push. `status` always carries all four keys as numbers from 0 to 100.

```lua
RegisterNetEvent('HexaCore:Client:UpdateNeeds', function(status)
    -- status.hunger, status.thirst, status.cleanliness, status.stress
    myHud:setBars(status)
end)
```

The client half of `hexa_core` never calculates drain. The server owns the clock, so a player who
kills the client thread simply stops seeing the numbers - they keep dropping regardless.

### HexaCore:Player:UpdatePlayerData

Sent to the client during logout. The client handler answers with
`TriggerServerEvent('HexaCore:UpdatePlayer')`, but `HexaCore:UpdatePlayer` is deliberately not a net
event any more, so that reply lands nowhere. The save it used to trigger is now handled by the
server's own dirty-flag sweep and by the drop handler. Treat this event as legacy - nothing you
write should depend on it.

### Admin command relays

The `/tp`, `/tpm`, `/noclip`, `/vehicle`, `/dv` and `/me` commands do their permission check on the
server and then push the actual work to one client.

| Event | Payload | Sent by |
| ----- | ------- | ------- |
| `HexaCore:Command:TeleportToPlayer` | `coords` (vector3) | `/tp <id>` |
| `HexaCore:Command:TeleportToCoords` | `x`, `y`, `z` | `/tp <x> <y> <z>` |
| `HexaCore:Command:GoToMarker` | none | `/tpm` |
| `HexaCore:Command:ToggleNoClip` | none | `/noclip` |
| `HexaCore:Command:SpawnVehicle` | `vehName` (string) | `/vehicle <model>` |
| `HexaCore:Command:DeleteVehicle` | none | `/dv` |
| `HexaCore:Command:ShowMe3D` | `senderId`, `msg` | `/me`, sent to everyone within 20 metres |

::: warning
All seven are registered net events on the client, which means a client can fire them on itself and
skip the server's permission check. That is acceptable for teleport and noclip - anyone who can
inject events can already move their own ped - but it does mean the events themselves are not an
authorisation boundary. Never treat receiving one of them as proof the receiver is an admin. Note
also that `HexaCore:Command:SpawnVehicle` creates the vehicle locally on the client, so it is not
the same thing as the server-side `Core.SpawnVehicle`.
:::

### Draw-text events

`client/drawtext.lua` registers four net events alongside its exports. The exports are the preferred
call; the events exist so a server script can drive the on-screen hint directly.

| Event | Payload | Equivalent export |
| ----- | ------- | ----------------- |
| `hexa_core:client:DrawText` | `text`, `pos` | `exports['hexa_core']:DrawText(text, pos)` |
| `hexa_core:client:ChangeText` | `text`, `pos` | `exports['hexa_core']:ChangeText(text, pos)` |
| `hexa_core:client:HideText` | none | `exports['hexa_core']:HideText()` |
| `hexa_core:client:KeyPressed` | none | `exports['hexa_core']:KeyPressed()` |

`pos` is one of `left`, `right`, `top`, or the long forms `left-center`, `right-center`,
`top-center`. Anything else falls back to `right-center`.

```lua
TriggerClientEvent('hexa_core:client:DrawText', source, 'Hold ENTER to open', 'right')
```

## Client-local events

| Event | Payload | Registration | Fired when |
| ----- | ------- | ------------ | ---------- |
| `HexaCore:Client:OnPlayerLoaded` | none | `RegisterNetEvent` | The spawn sequence finished, fired locally by `client/spawn.lua` |
| `HexaCore:Client:UpdateObject` | none | `TriggerEvent` only | The shared catalogue on this client was replaced or patched |
| `HexaCore:Client:UseItem` | `item` (table) | `RegisterNetEvent`, deprecated | Warns and dumps the payload |

### HexaCore:Client:OnPlayerLoaded

The standard start signal for client resources. The server never sends it - `client/spawn.lua`
fires it locally at the end of the spawn, at the same moment it tells the server with
`HexaCore:Server:OnPlayerLoaded`.

```lua
RegisterNetEvent('HexaCore:Client:OnPlayerLoaded', function()
    -- character is on the ground and playable from here
end)
```

An alternative that survives a mid-session resource restart is the state bag the same handler sets:

```lua
if LocalPlayer.state.isLoggedIn then
    -- already loaded before this resource started
end
```

::: warning
Because it is a net event, a client can fire it on itself at any time and make every listening
client resource believe a character just loaded. Anything that must be true only for a loaded
character belongs behind a server check, not behind this event.
:::

### HexaCore:Client:UpdateObject

Fired after `HexaCore:Client:SharedUpdate`, `HexaCore:Client:OnSharedUpdate` and
`HexaCore:Client:OnSharedUpdateMultiple`. Resources that keep a copy of the core object - the copy
`GetCoreObject()` hands out is a msgpack snapshot, not a live reference - use this as the signal to
pull a fresh one.

```lua
local Core = exports['hexa_core']:GetCoreObject()

AddEventHandler('HexaCore:Client:UpdateObject', function()
    Core = exports['hexa_core']:GetCoreObject()
end)
```

Skipping this is the classic cause of "the item exists in the database but my script says it does
not" for a whole session.

## Deprecated events

These four still exist so that a half-ported resource does not error out. All four are net events, a
client can fire all four, and none of them do anything except print a warning naming the calling
resource.

| Event | Side | Replacement |
| ----- | ---- | ----------- |
| `HexaCore:Server:AddItem` | server | `Player.AddItem(name, amount, slot, info)` on the server |
| `HexaCore:Server:RemoveItem` | server | `Player.RemoveItem(name, amount, slot)` on the server |
| `HexaCore:Server:UseItem` | server | `hexa_inventory` |
| `HexaCore:Client:UseItem` | client | `hexa_inventory` |

::: danger
`HexaCore:Server:AddItem` was the single worst hole in the old API: a client could hand itself any
item in the catalogue, in any quantity, in one line. It is now inert and it goes away next release.
Giving an item to a player is a server-side call on the player object:

```lua
local Player = Core.GetPlayer(source)
Player.AddItem('bread', 1, false, false, 'quest reward')
```

Note the deliberate split in 3.0: `Core.RegisterItem` declares that an item type exists,
`Player.AddItem` puts one in somebody's bag. They used to share the verb `AddItem` and mean opposite
things.
:::

## The vehicle spawn callback

`HexaCore:Server:SpawnVehicle` is not an event, it is a server callback, so it travels over
`HexaCore:Server:TriggerCallback` like every other callback and is reachable by any client.

```lua
Core.TriggerCallback('HexaCore:Server:SpawnVehicle', function(netId)
    if not netId then return end
    local veh = NetToVeh(NetworkGetEntityFromNetworkId(netId))
end, model, coords, warp)
```

Three guards sit in front of it: the caller must have a character loaded, `model` must be a string
or a number, and there is a 3 second cooldown per player. Without them a client could fill the
server with vehicles in seconds. It returns `nil` on every rejection, so always check the answer.

## Events hexa_core fires at other resources

These belong to other scripts. `hexa_core` only sends them.

| Event | Direction | Payload | Owner |
| ----- | --------- | ------- | ----- |
| `hexa_log:server:CreateLog` | server local | `category`, `title`, `colour`, `message` | Fired all over the stack, and now also consumed by `hexa_core` itself |
| `hexa_inventory:client:updateInventory` | server to client | none | `hexa_inventory`, sent after money items change while the bag is open |
| `hud:client:OnMoneyChange` | server to client | `moneytype`, `amount`, `isRemove` | The HUD resource |
| `chat:addMessage` | client local | `{ color, multiline, args }` | Fallback path for `HexaCore:Notify` when `hexa_notify` is not started |
| `chat:addSuggestions` | server to client | `suggestions` (array) | Chat autocompletion, refreshed by `Core.Commands.Refresh` |
| `chat:removeSuggestion` | server to client | `'/' .. command` | Removes a suggestion the player has no permission for |

### hexa_log:server:CreateLog

`hexa_core` listens for this itself now, prints it to the console, and forwards it to a Discord
webhook when one is configured under `Config.Log.Webhooks`. There has never been a resource named
`hexa_log`, so before 3.0 every one of these calls vanished silently.

```lua
TriggerEvent('hexa_log:server:CreateLog', 'joinleave', 'Store opened', 'green', 'Blackwater general store is open')
```

`category` picks the webhook: a key that exists in `Config.Log.Webhooks` uses that URL, anything
else falls back to `Config.Log.Webhooks.default`. `Config.Log.Enabled = false` silences both the
console line and the webhook.

## Platform events hexa_core consumes

Standard FXServer events the framework hooks. Listed so you know what is already handled.

| Event | Side | What hexa_core does with it |
| ----- | ---- | --------------------------- |
| `playerConnecting` | server | Defers the connection, resolves the identifier, kicks when there is none, pushes `Core.Shared` |
| `playerDropped` | server | Saves the player, fires `HexaCore:Server:PlayerDropped`, writes a join/leave log, clears buckets, cooldown tables and ace principals |
| `chatMessage` | server | Cancels any message starting with `/` so unknown commands do not print to chat |
| `onResourceStop` | server | Saves every online player unless `Config.Save.OnResourceStop` is false |
| `onResourceStop` | client | Clears draw text, prompts and map zone colours |
| `onResourceStart` | client | Applies Eagle Eye access for the current job |
| `onClientResourceStart` | client | Repaints map zone colours and re-requests body status when already logged in |

::: warning
`playerDropped` fires on the server before the client is gone but after the connection is lost. The
handler saves the player and then removes them from `Core.Players`, so a listener of your own that
runs after `hexa_core` may find `Core.GetPlayer(src)` already `nil`. Read what you need from the
`Player` object handed to `HexaCore:Server:PlayerDropped` instead.
:::

## Quick reference

Everything a client can send to the server, in one place:

```lua
TriggerServerEvent('HexaCore:Server:RequestSpawn')
TriggerServerEvent('HexaCore:Server:OnPlayerLoaded')
TriggerServerEvent('HexaCore:Server:RequestStatus')
TriggerServerEvent('HexaCore:Server:SetMetaData', 'hunger', 60)
TriggerServerEvent('HexaCore:ToggleDuty')
TriggerServerEvent('HexaCore:CallCommand', 'tpm', {})
TriggerServerEvent('HexaCore:Server:TriggerCallback', 'my:callback')
TriggerServerEvent('HexaCore:Server:TriggerClientCallback', 'my:clientcallback')
TriggerServerEvent('HexaCore:Server:ReportCSRFFailure')
```

If your resource adds a net event of its own, hold it to the same rule the core holds these to: the
server decides, the client only asks.
