# Commands

hexa_core registers eighteen chat commands on the server and three client-side debug commands. This
page lists every one of them, then covers `Core.Commands.Add` for registering your own and how the
permission levels map onto the FXServer ace system.

The source for this page is `server/commands.lua`, `server/status.lua` (the `/setstatus` command),
`client/colormap.lua` (the zone debug commands) and `client/events.lua` (the client half of the
teleport, vehicle and `/me` commands).

::: warning Admin commands target a citizen id, not a server id
Every admin command in `server/commands.lua` resolves its target through
`Core.GetPlayerByCitizenId`, so `/givemoney RB0421 cash 100` means the character whose citizen id is
`RB0421`, not the player sitting on server id 421. The citizen id is the permanent id handed out at
character creation, built from `Config.Player.CitizenIdPrefix` and `Config.Player.CitizenIdDigits`.

`/setstatus` is the one exception: it takes a **server id**.
:::

## Teleport and movement

| Command | Arguments | Permission |
| --- | --- | --- |
| `/tp` | `[id]` or `[x] [y] [z]` | admin |
| `/tpm` | none | admin |
| `/noclip` | none | admin |

`/tp` has two shapes. With three arguments it teleports you to those coordinates; commas are stripped
first, so pasting `-1024.5, 328.2, 44.1` straight out of a map tool works. With a single argument it
looks the target up by citizen id and teleports you to their ped. If none of the three coordinates
parse, or only two are supplied, you get a format error instead.

::: warning /tp by id needs a numeric citizen id
The single-argument path runs `tonumber(args[1])` before the lookup. With the default
`Config.Player.CitizenIdPrefix = 'RB'` every citizen id starts with letters, so `/tp RB0421` is
rejected as a bad format and never reaches the lookup. Only servers running an empty prefix can
teleport to a player this way. Coordinates always work.
:::

`/tpm` teleports you to your map waypoint. It drops you three units above the heightmap and then
calls `PlacePedOnGroundProperly`, and it brings your mount or your vehicle along with you. With no
waypoint set it notifies `No Waypoint Set.` and does nothing.

`/noclip` runs txAdmin's own noclip toggle on your client. hexa_core does not implement noclip
itself, so on a server without the txAdmin in-game menu the command is a no-op.

## Permissions

| Command | Arguments | Permission |
| --- | --- | --- |
| `/addpermission` | `[id] [permission]` | admin |
| `/removepermission` | `[id] [permission]` | admin |

Both take a citizen id and a permission level, and both require all arguments. The level is
lowercased before use and should be one of the entries in `Core.Commands.Permissions` — `admin` or
`staff` out of the box. They are thin wrappers around `Core.AddPermission` and
`Core.RemovePermission`, which means the grant lands as an FXServer principal on the target's
**current server id** and is dropped again when that player disconnects. Nothing is written to the
database.

## Vehicles, peds and objects

| Command | Arguments | Permission |
| --- | --- | --- |
| `/vehicle` | `[model]` | admin |
| `/dv` | none | admin |
| `/dvall` | none | admin |
| `/dvp` | none | admin |
| `/dvo` | none | admin |

`/vehicle` spawns the model in front of you and warps you into it. If the model is not in the game's
image it silently does nothing, and if you were already in a vehicle the old one is deleted first.

`/dv` deletes the vehicle you are in. On foot it deletes every vehicle within five units instead.
`/dvall`, `/dvp` and `/dvo` are server-side sweeps over `GetAllVehicles`, `GetAllPeds` and
`GetAllObjects` and delete everything they find, worldwide.

::: danger /dvall, /dvp and /dvo are server-wide
These three are not scoped to your position or to your session. `/dvp` deletes every ped on the
server, players' mounts included, and `/dvo` deletes every object, which takes props placed by other
resources with it. They are recovery tools, not cleanup tools.
:::

## Money

| Command | Arguments | Permission |
| --- | --- | --- |
| `/givemoney` | `[id] [moneytype] [amount]` | admin |
| `/setmoney` | `[id] [moneytype] [amount]` | admin |

`moneytype` is one of the account names the player object carries — `cash`, `bank` or `bloodmoney`.
`/givemoney` calls `Player.AddMoney(type, amount, 'Admin give money')`, and that reason string is
carried into the `playermoney` log line the player object emits. `/setmoney` calls
`Player.SetMoney(type, amount)` and overwrites the balance outright.

## Items

| Command | Arguments | Permission |
| --- | --- | --- |
| `/giveitem` | `[id] [item] [amount]` | admin |

The item name is lowercased and checked against `Core.Shared.Items` first, so a typo reports
`Item does not exist` rather than handing out a broken stack. `amount` defaults to 1 when omitted or
unparseable. The command then requires the inventory resource to be in the `started` state and hands the
item over with the inventory resource's `AddItem(source, item, amount)` export; without that resource
running it refuses with `Inventory resource not running`.

## Jobs

| Command | Arguments | Permission |
| --- | --- | --- |
| `/job` | none | user |
| `/setjob` | `[id] [job] [grade]` | admin |

`/job` notifies you with your own job label, grade name and duty state. It tolerates being run before
a character is loaded, and from the console, by notifying `Player not online` instead of erroring.

`/setjob` validates the job name against `Core.Shared.Jobs` and rejects unknown jobs. When
`Hexa-multijob` is started it registers the job there first with
`exports['Hexa-multijob']:AddJobToPlayer(citizenid, job, grade)`, then calls
`Player.SetJob(job, grade)` to make it the active one.

## Status

| Command | Arguments | Permission |
| --- | --- | --- |
| `/setstatus` | `[id] [key] [value]` | admin |

Registered in `server/status.lua`, not in `commands.lua`. `key` is one of `hunger`, `thirst`,
`cleanliness` or `stress`; `value` is clamped into 0-100. The write goes through the same path as
the `SetStatus` export, so it updates metadata, the player statebag and the client HUD in one step.

::: warning /setstatus takes a server id
Unlike every other admin command here, `/setstatus` resolves its target with `tonumber(args[1])` as
a plain server id. `/setstatus 12 hunger 100` means the player on server id 12.
:::

## Player commands

| Command | Arguments | Permission |
| --- | --- | --- |
| `/me` | `[message]` | user |
| `/id` | none | user |

`/me` draws the message in 3D above your ped for ten seconds, for every player within twenty units
of you. Colour codes and markup are stripped from the message (`~` and `<>` sequences) before it is
sent, so it cannot be used to inject formatting into other players' screens. An empty message is
rejected.

`/id` notifies you with your own citizen id.

::: warning /id assumes a loaded character
`/id` reads `Player.PlayerData.citizenid` without a nil check. Run from the server console, or before
a character is selected, it raises a Lua error instead of notifying. `/job` guards against the same
case; `/id` does not.
:::

## Colormap debug commands

These three live in `client/colormap.lua`, run entirely on the client, and are only registered when
`Config.Colormap.Debug = true`. They are not ace-restricted, which is safe because the paint they
apply is client-local and never leaves that player's map. Turn `Config.Colormap.Debug` back off when
you are done and they disappear.

| Command | Arguments | Side |
| --- | --- | --- |
| `/zonehash` | none | client |
| `/zonestyle` | `[zone] [style]` | client |
| `/zonereset` | `[zone]` (optional) | client |

`/zonehash` prints every map zone hash at your current position, one line per zone type from 0 to 15,
skipping types with no zone there. The small areas (region, district) come out at the low type
numbers and the big containers (state) at the high ones. Copy the hex straight into
`Config.Colormap.Zones`. Standing on open water or out of bounds prints `no zone here`.

`/zonestyle` paints one zone immediately, with no restart. The zone can be a hash (`0x3B8DD21A`) or a
zone name; the style can be a palette name from `Config.Colormap.Colors` such as `red`, or a raw
`BLIP_STYLE_*` name when you want to preview a shade the palette does not have.

```
/zonestyle 0x3B8DD21A BLIP_STYLE_TURRET_WEAPON
```

`/zonereset` with a zone argument clears that zone. With no argument it repaints everything from
`Config.Colormap.Zones`, which undoes whatever `/zonestyle` left behind.

## Core.Commands.Add

```lua
Core.Commands.Add(name, help, arguments, argsrequired, callback, permission, ...)
```

| Argument | Type | Meaning |
| --- | --- | --- |
| `name` | string | The command, without the slash. Stored lowercased. |
| `help` | string | Description shown in the chat suggestion. |
| `arguments` | table | Array of `{ name = ..., help = ... }`, one per parameter. |
| `argsrequired` | boolean | When true, refuse to run unless every argument was supplied. |
| `callback` | function | `function(source, args, rawCommand)`. |
| `permission` | string | Level required. Defaults to `'user'` when omitted. |
| `...` | string | Extra levels that may also run the command. |

A full registration from another resource:

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.Commands.Add('heal', 'Heal a player', {
    { name = 'id', help = 'Citizen id' },
}, true, function(source, args)
    local Player = Core.GetPlayerByCitizenId(tostring(args[1]))
    if not Player then
        return Core.Notify(source, { title = 'Player not online', type = 'error', duration = 5000 })
    end
    -- do the healing here
end, 'admin')
```

`argsrequired` is checked by the wrapper before your callback runs: if `#args` is smaller than
`#arguments`, the caller is notified with `All arguments must be filled out!` and the callback is
never reached. Set it to `false` when a command has optional parameters, as `/tp` does, and validate
inside the callback yourself.

Passing extra levels after `permission` lets several roles share a command:

```lua
Core.Commands.Add('announce', 'Broadcast a message', {
    { name = 'message', help = 'Text to send' },
}, true, function(source, args)
    TriggerClientEvent('chat:addMessage', -1, { args = { 'SERVER', table.concat(args, ' ') } })
end, 'staff', 'admin')
```

::: warning Only the sixth argument decides whether the command is restricted
`restricted` is computed from `permission` alone, before the extra levels are packed. Passing
`'user'` as the sixth argument and a real level after it registers a command that everyone can run.
Put the most restrictive level in the `permission` slot.
:::

## Core.Commands.Refresh

```lua
Core.Commands.Refresh(source)
```

Rebuilds that player's chat suggestion list. For every command in `Core.Commands.List` it checks
`command.<name>` against the player's aces, sends the ones they may use through
`chat:addSuggestions`, and removes the rest with `chat:removeSuggestion`. It returns early if
`Core.GetPlayer(source)` is nil.

hexa_core calls it by itself inside `Core.AddPermission` and `Core.RemovePermission`, so a player who
is promoted mid-session sees the new commands without relogging. It is not called on character load,
so if you want suggestions populated at spawn, call it yourself once the character exists.

## Core.Commands.List

Every registered command, keyed by lowercased name:

```lua
local info = Core.Commands.List['givemoney']
-- info.name, info.permission, info.help, info.arguments, info.argsrequired, info.callback
```

`info.permission` is a string for a single-level command and an array of strings when extra levels
were passed. This table is what `Core.Commands.Refresh` and the `HexaCore:CallCommand` event read.

## Permission levels and the ace setup

```lua
Core.Commands.Permissions = { 'admin', 'staff' }
```

These are the roles the framework knows about, and they have to match what `permissions.cfg` grants.
On resource start hexa_core runs `add_ace hexacore.<level> <level> allow` for each of them, which is
what makes `Core.HasPermission(source, 'admin')` answerable at all.

```lua
Core.Commands.IgnoreList = { ['admin'] = true, ['user'] = true }
```

Levels in the ignore list get no per-command ace. `user` needs none because those commands are
registered unrestricted, and `admin` needs none because it is expected to hold a blanket grant.
Every other level gets one ace per command at registration time:

```
add_ace hexacore.staff command.announce allow
```

So the whole chain for a `staff` command is: hexa_core creates
`add_ace hexacore.staff command.announce allow` when the command registers, your `permissions.cfg`
puts a player into the `hexacore.staff` principal, and FXServer answers the `command.announce` check
in `Core.Commands.Refresh` and in the command's own restriction.

The blanket grant for admins is the one line you have to write yourself:

```
add_ace hexacore.admin command allow
add_principal identifier.license:0000000000000000 hexacore.admin
```

`command` is the parent of every `command.<name>` ace, so that single line covers all current and
future commands.

::: tip user is not an ace at all
A command registered with `'user'` is passed to `RegisterCommand` with `restricted = false`. There is
no ace object and no check — anyone can run it. `/job`, `/me` and `/id` are the built-in examples.
:::

Granting a level at runtime is the job of `Core.AddPermission`, which adds
`player.<source> hexacore.<level>` as a principal, refreshes that player's suggestions and fires
`HexaCore:Server:PermissionsChanged`. Because principals are keyed on the server id, and FXServer
recycles server ids, hexa_core strips every level from the id again on `playerDropped`.

```lua
Core.AddPermission(source, 'staff')
Core.RemovePermission(source, 'staff')
Core.RemovePermission(source) -- strips every level in Core.Commands.Permissions
```

## Running a command without chat

Admin menus and other UIs can invoke a registered command over the net event `HexaCore:CallCommand`:

```lua
TriggerServerEvent('HexaCore:CallCommand', 'givemoney', { 'RB0421', 'cash', '100' })
```

The server looks the command up in `Core.Commands.List`, requires a loaded character, and checks
`command.<name>` with `Core.HasPermission` before running the callback — the same gate as the chat
path, so this is not a way around the ace check. It also enforces `argsrequired`, and notifies
`No access to this command` when the check fails.
