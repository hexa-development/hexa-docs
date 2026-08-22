# Client functions

Everything the client half of `hexa_core` exposes hangs directly off the core object. There is no
`.Functions` layer any more:

```lua
local Core = exports['hexa_core']:GetCoreObject()

local players = Core.GetLocalPlayers()
```

`HexaCore` is the same table under a different name, so old files that spell `HexaCore.GetCoords(ped)`
keep working with no edit. `Core.Functions.GetCoords(ped)` also still resolves for one more release.

::: warning
Client and server both expose a table called `Core`, and several names exist on both sides with
**different parameters and different return values**. `Core.HasItem`, `Core.SpawnVehicle`,
`Core.TriggerCallback`, `Core.GetClosestPed` and friends are not the same function on the two sides.
See [Names that differ across the boundary](#names-that-differ-across-the-boundary) before you copy a
call from a server file into a client file.
:::

## The core object on the client

`client/main.lua` builds the object and fills in these fields.

| Field | What it holds |
| ----- | ------------- |
| `Core.PlayerData` | The local player's data table, pushed by the server through `HexaCore:Player:SetPlayerData`. Empty until the character loads. |
| `Core.Config` | The shared `Config` table from `config.lua`. |
| `Core.Shared` | The shared catalogue: `Items`, `Jobs`, `Weapons` and the rest. Replaced wholesale when the server sends `HexaCore:Client:SharedUpdate`. |
| `Core.ClientCallbacks` | Handlers registered with `Core.CreateCallback` on this side. |
| `Core.ServerCallbacks` | Pending answers waiting for a server reply, keyed by callback name. |
| `Core.Functions` | Compatibility mirror. Every function assigned to `Core` is copied into it automatically. |

The mirror is a real table with real members, not a proxy, because the RSG bridge lifts functions out
of it with `pairs()`. Reading through it is silent - unlike a renamed function, `Core.Functions.X`
does not print a warning.

::: tip
`Core.Shared` is swapped for a new table when the catalogue arrives. If your resource caches
`Core.Shared.Items` in a local, listen for `HexaCore:Client:UpdateObject` and re-read it, or you will
hold an empty catalogue for the whole session.
:::

## Names that differ across the boundary

Both sides define these. The signatures are not interchangeable.

| Name | Client | Server |
| ---- | ------ | ------ |
| `HasItem` | `(items, amount)` - asks about the local player | `(source, items, amount)` |
| `CreateCallback` | registers into `ClientCallbacks` | registers into `ServerCallbacks` |
| `TriggerCallback` | `(name, cb, ...)` - crosses the wire to the server | `(name, source, cb, ...)` - runs a local server callback |
| `TriggerClientCallback` | `(name, cb, ...)` - runs a local client callback | `(name, source, cb, ...)` - crosses the wire to one player |
| `SpawnVehicle` | `(model, cb, coords, isnetworked, teleportInto)` - returns nothing, hands the entity to `cb` | `(source, model, coords, warp)` - returns the entity |
| `GetClosestPed` | `(coords, ignoreList)` | `(source, coords)` |
| `GetClosestVehicle` | `(coords)` | `(source, coords)` |
| `GetClosestObject` | `(coords)` | `(source, coords)` |
| `GetCoords` | `(entity)` - same shape on both sides, returns `vector4` | `(entity)` |
| `GetPlayerData` | `(cb?)` - the local player only | not present; use `Player.PlayerData` |

And these exist on one side only: `Core.GetPlayer`, `Core.Notify`, `Core.HasPermission`,
`Core.Kick`, `Core.CreateVehicle` and the whole player lifecycle family are **server only**. There is
no `Core.Notify` on the client - the client receives the net event `HexaCore:Notify` instead, and
`hexa_core` already registers the handler for it.

## The Local family

Three functions were renamed in 3.0 for one reason: they return **client player indices**, the small
numbers the game engine uses locally, not server ids. Passing one to a server event is the single
most common bug this rename exists to stop.

```lua
-- client indices, only meaningful in this game session
local locals = Core.GetLocalPlayers()

-- turn one into something the server understands
local serverId = GetPlayerServerId(locals[1])
```

### Core.GetLocalPlayers()

Returns every active player index around you, straight from `GetActivePlayers()`. Only players the
game has actually streamed in are in the list, so this is a "who is near me right now" answer, never
a player count for the server. The server's `Core.GetPlayers()` is the one that returns server ids.

### Core.GetLocalPlayersInRadius(coords, distance)

Player indices within `distance` of `coords`. `coords` accepts a vector3 or a table with `x`, `y`,
`z`; omit it to measure from your own ped. `distance` defaults to `5`.

```lua
local nearby = Core.GetLocalPlayersInRadius(nil, 20.0)
```

### Core.GetClosestLocalPlayer(coords)

Returns `closestPlayer, closestDistance`, both `-1` when nobody qualifies. Your own player index is
excluded.

::: warning
This one only searches the default radius. It calls `Core.GetLocalPlayersInRadius(coords)` without a
distance, so the candidate set is capped at 5 units and anyone further away comes back as `-1`. If
you need a wider search, call `Core.GetLocalPlayersInRadius` yourself with an explicit distance and
pick the nearest.
:::

## Player and local ped

### Core.GetPlayerData(cb)

With no argument it returns `Core.PlayerData` directly. With a function it calls it with the same
table. Both forms read the local copy - they do not ask the server.

```lua
local PlayerData = Core.GetPlayerData()

Core.GetPlayerData(function(data)
    print(data.citizenid)
end)
```

### Core.GetCoords(entity)

Returns `vector4(x, y, z, heading)` for any entity.

### Core.HasItem(items, amount)

Asks `hexa_inventory` whether the local player carries `items` - a single item name or a table of
names - in at least `amount`. Returns `false` immediately if `hexa_inventory` is not started, so a
resource that asks early gets a plain `false` instead of an error.

```lua
if Core.HasItem('bread', 1) then
    print('has bread')
end
```

### Core.IsWearingGloves()

Reads the ped's arm drawable and answers against `Core.Shared.MaleNoGloves` or
`Core.Shared.FemaleNoGloves` depending on the model hash. Returns `true` when the current arms are
not one of the bare-hand variations.

### Core.PlayAnim(animDict, animName, upperbodyOnly, duration)

Loads the dictionary, tasks the animation on the local ped and releases the dictionary again.
`upperbodyOnly` maps to flag `16`, and `duration` defaults to `-1` (loop).

```lua
-- upperbodyOnly true maps to animation flag 16
Core.PlayAnim(animDict, animName, true, 4000)
```

Note that it returns immediately - it does not wait for the animation to end, and it removes the
dictionary right after tasking. Keep your own `Wait` if you need the animation to finish before the
next step.

### Core.TurnPedToFaceEntity(entity, timeout, speed)

Rotates the local ped to face `entity`. `entity` must be a number that exists, or the call returns
without doing anything. `speed` is clamped to `5.0`; `timeout` is clamped to `5000` ms and defaults
to `5000` when omitted.

```lua
Core.TurnPedToFaceEntity(GetPlayerPed(closestPlayer), 2000, 2.0)
```

## Entities around you

### Core.GetVehicles()

Every vehicle in the local pool.

### Core.GetObjects()

Every object in the local pool.

### Core.GetPeds(ignoreList)

Every ped in the local pool, minus the handles in `ignoreList`.

### Core.GetClosestPed(coords, ignoreList)

Returns `closestPed, closestDistance`, or `-1, -1` when the pool is empty. `coords` defaults to your
own position. Note there is no radius here - it scans the whole pool.

### Core.GetClosestVehicle(coords)

Returns `closestVehicle, closestDistance`.

### Core.GetClosestObject(coords)

Returns `closestObject, closestDistance`.

```lua
local vehicle, distance = Core.GetClosestVehicle()
if vehicle ~= -1 and distance < 3.0 then
    print(Core.GetPlate(vehicle))
end
```

## Vehicles

### Core.SpawnVehicle(model, cb, coords, isnetworked, teleportInto)

Spawns a vehicle locally. `model` may be a string or a hash and is checked with `IsModelInCdimage`
first - an unknown model makes the call return silently. `coords` accepts a vector4 or a table and
defaults to your own position and heading. `isnetworked` defaults to `true`. The handle is passed to
`cb`; the function itself returns nothing.

```lua
Core.SpawnVehicle(model, function(veh)
    SetVehicleDirtLevel(veh, 0.0)
end, nil, true, true)
```

### Core.DeleteVehicle(vehicle)

Marks the vehicle as a mission entity and deletes it.

### Core.GetPlate(vehicle)

Trimmed plate text. Returns `nil` for handle `0`.

### Core.GetVehicleLabel(vehicle)

The display label for the vehicle's model. Returns `nil` for `nil` or `0`.

### Core.GetVehicleProperties(vehicle)

A full snapshot table: `model`, `plate`, `plateIndex`, `bodyHealth`, `engineHealth`, `tankHealth`,
`fuelLevel`, `dirtLevel`, `oilLevel`, `color1`, `color2`, `pearlescentColor`, `dashboardColor`,
`wheelColor`, `wheels`, `wheelSize`, `wheelWidth`, `tireHealth`, `tireBurstState`,
`tireBurstCompletely`, `windowTint`, `windowStatus`, `doorStatus` and `extras`. Returns `nil` when
the entity does not exist.

`color1` and `color2` come back as a number for a standard colour or as an `{r, g, b}` table when the
vehicle uses a custom colour.

### Core.SetVehicleProperties(vehicle, props)

Applies a table in the shape `Core.GetVehicleProperties` returns. Every key is optional - only the
fields present are written, so a partial table is a valid patch.

```lua
local props = Core.GetVehicleProperties(veh)
Core.SetVehicleProperties(otherVeh, props)
```

## Asset loading

All four wait for the asset with a deadline and return the asset on success, or `nil` on timeout.
The timeout defaults to 10000 ms.

### Core.LoadModel(model, timeout)

Accepts a string or a hash. Returns `nil` without requesting anything if the model is not in the
game's image.

### Core.LoadAnimDict(animDict, timeout)

Returns `nil` immediately when `DoesAnimDictExist` says the dictionary is not real.

### Core.LoadAnimSet(animSet, timeout)

Waits until `HasAnimSetLoaded` reports the set is in, or the deadline passes.

### Core.LoadPtfxAsset(ptFxName, timeout)

Waits until `HasNamedPtfxAssetLoaded` reports the asset is in, or the deadline passes.

```lua
local hash = Core.LoadModel(model)
if hash then
    -- only create the object once the model is really in memory
    local obj = CreateObject(hash, coords.x, coords.y, coords.z, true, false, false)
end
```

## Props and bones

### Core.CreateAttachedProp(ped, model, boneId, x, y, z, xR, yR, zR, vertex)

Loads the model, creates the object, attaches it to `boneId` on `ped` and returns the prop handle.
`vertex` picks the attachment mode: falsy uses mode `2`, truthy uses mode `0`.

```lua
-- boneId is the raw bone id, resolved internally with GetPedBoneIndex
local prop = Core.CreateAttachedProp(PlayerPedId(), model, boneId, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, false)
```

### Core.GetClosestBone(entity, list)

Takes a list of bone ids, or of tables carrying an `id` field, and returns `bone, coords, distance`
for whichever is nearest your ped. When nothing matches it falls back to the `bodyshell` bone and
returns it as `{ id = ..., type = 'remains', name = 'bodyshell' }`.

### Core.GetBoneDistance(entity, boneType, boneIndex)

Distance from your ped to a bone. `boneType == 1` resolves `boneIndex` with `GetPedBoneIndex`,
anything else resolves it by name with `GetEntityBoneIndexByName`.

## World queries

### Core.IsAreaClearOfVehicles(coords, radius)

`true` when no vehicle sits within `radius` of `coords`. `coords` defaults to your own position.

### Core.GetStreetNamesAtCoords(coords)

Returns `{ main = ..., cross = ... }`, both already resolved to readable names.

```lua
local streets = Core.GetStreetNamesAtCoords(GetEntityCoords(PlayerPedId()))
print(streets.main, streets.cross)
```

### Core.GetZoneAtCoords(coords)

The label text for the zone at those coordinates.

### Core.GetCardinalDirection(entity)

`'North'`, `'East'`, `'South'` or `'West'` from the entity's heading. Falls back to the local ped
when `entity` does not exist.

### Core.GetInGameTime()

Returns a table built from the game clock:

| Key | Always present | Meaning |
| --- | -------------- | ------- |
| `min` | yes | Clock minutes, `0`-`59` |
| `hour` | yes | Clock hours, `0`-`23` |
| `ampm` | yes | `'AM'` for hours up to 12, `'PM'` from 13 |
| `formattedHour` | no | Only set in the PM branch, as `hour - 12` |
| `formattedMin` | no | Only set when `min <= 9`, as a zero-padded string |

::: warning
`formattedHour` and `formattedMin` are absent most of the time. Fall back to `hour` and `min`
yourself rather than concatenating a `nil`.
:::

### Core.GetGroundCoords(coords)

Returns a vector3 with `z` snapped to the ground. Returns `nil` if you pass nothing, and hands back
the original `coords` unchanged when the ground probe fails.

### Core.GetGroundMaterial(entity)

Fires a shape test capsule straight down from the entity and returns, in this order:
`materialHash, entityHit, surfaceNormal, endCoords, success, retval`.

::: tip
RedM builds do not agree on the name of the shape-test result native. `hexa_core` picks whichever one
actually exists once at load. On a build that only ships the plain variant there is no material
information at all and `materialHash` comes back as `0` - test for that instead of assuming a hash.
:::

## Drawing text

### Core.DrawText(x, y, width, height, scale, r, g, b, a, text)

### Core.DrawText3D(x, y, z, text)

Both are minimal helpers that must be called every frame from your own loop. For anything a player
reads for more than a moment, use the drawing layer in `client/drawtext.lua` instead - it owns its
own draw loop and takes a position of `'left'`, `'right'` or `'top'`.

```lua
exports['hexa_core']:DrawText('Press [E] to talk', 'left')
exports['hexa_core']:ChangeText('New text', 'left')
exports['hexa_core']:HideText()
```

The same four entry points exist as events: `hexa_core:client:DrawText`,
`hexa_core:client:ChangeText`, `hexa_core:client:HideText` and `hexa_core:client:KeyPressed`.

## Callbacks

### Core.CreateCallback(name, cb)

Registers a client callback. The server reaches it with `Core.TriggerClientCallback(name, source, cb, ...)`.

```lua
Core.CreateCallback('myscript:client:getHeading', function(cb)
    cb(GetEntityHeading(PlayerPedId()))
end)
```

### Core.TriggerCallback(name, cb, ...)

Asks the server. Stores `cb` in `Core.ServerCallbacks` and fires
`HexaCore:Server:TriggerCallback`; the answer arrives on `HexaCore:Client:TriggerCallback` and the
entry is cleared after one use.

```lua
Core.TriggerCallback('myscript:server:getBalance', function(balance)
    print(balance)
end)
```

### Core.TriggerClientCallback(name, cb, ...)

Runs a locally registered client callback without touching the network. Returns without doing
anything if `name` was never registered. This is what the incoming net event handler uses, and it is
usable directly when you want to reuse a handler in-process.

Full walkthrough on the [Callbacks](/guide/callbacks) page.

::: tip
The registration function used to be `Core.CreateClientCallback`. It is `Core.CreateCallback` now,
matching the server. The old name still forwards and warns once.
:::

## Logging

The same five printers exist on both sides with identical signatures, defined once in
`shared/log.lua`. They are printf style.

```lua
Core.Log('spawned %d wagons', count)
Core.Warn('%s has no job data', citizenid)
Core.Error('failed to load %s', model)
Core.PrintDebug('ground material %s', materialHash)
Core.DumpTable(Core.PlayerData)
```

`Core.PrintDebug` is gated on `Config.Debug` and checks the switch **before** formatting, so leaving
debug lines in a per-frame loop costs nothing while debug is off.

`Core.ShowError(resource, msg)` and `Core.ShowSuccess(resource, msg)` print a prefixed one-liner in
the older `[resource:ERROR]` shape and are available here too.

Log lines are English on purpose - some server consoles mangle Thai, and operators scan fast.
See [Logging](/guide/logging).

## Deprecated names

Every old client name below still resolves through `client/compat.lua`, forwards to the new
function, and prints one warning naming the calling resource the first time it is used. They go away
next release.

| Old name | Call this instead |
| -------- | ----------------- |
| `Core.CreateClientCallback` | `Core.CreateCallback` |
| `Core.GetPlayers` | `Core.GetLocalPlayers` |
| `Core.GetPlayersFromCoords` | `Core.GetLocalPlayersInRadius` |
| `Core.GetClosestPlayer` | `Core.GetClosestLocalPlayer` |
| `Core.LookAtEntity` | `Core.TurnPedToFaceEntity` |
| `Core.RequestAnimDict` | `Core.LoadAnimDict` |
| `Core.LoadParticleDictionary` | `Core.LoadPtfxAsset` |
| `Core.AttachProp` | `Core.CreateAttachedProp` |
| `Core.SpawnClear` | `Core.IsAreaClearOfVehicles` |
| `Core.GetStreetNametAtCoords` | `Core.GetStreetNamesAtCoords` |
| `Core.GetCurrentTime` | `Core.GetInGameTime` |
| `Core.GetGroundZCoord` | `Core.GetGroundCoords` |
| `Core.GetGroundHash` | `Core.GetGroundMaterial` |
| `Core.Debug` | `Core.PrintDebug` for a line, `Core.DumpTable` for a table |

::: danger
`Core.GetPlayers` is the alias with real consequences. On the client it now means "the players
streamed in around me, as client indices". On the server the very same name means "every connected
player, as server ids". Code moved between the two sides without changing the name compiles fine and
is wrong at runtime. Spell it `Core.GetLocalPlayers` on the client and the mistake becomes
impossible to make silently.
:::

`Core.Debug` is a special case: it used to take `(resource, obj, depth)` on the client and
`(tbl, indent)` on the server, so the same call meant two different things depending on the file it
sat in. The alias guesses from the argument types and forwards to `Core.DumpTable` or
`Core.PrintDebug`. Pick the right one yourself and the guess never has to happen.

## Deprecated particle helpers

`Core.StartParticleAtCoord(dict, ptName, looped, coords, rot, scale, alpha, color, duration)` and
`Core.StartParticleOnEntity(dict, ptName, looped, entity, bone, offset, rot, scale, alpha, color, evolution, duration)`
are still present and still work. Both are marked deprecated in the source: call the ParticleFx
natives directly in new code. Both block for `duration` when you pass one, because they `Wait` before
stopping a looped effect.
