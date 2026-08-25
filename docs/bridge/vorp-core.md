# VORP Core compatibility

The `vorp_core` bridge presents a VORP-shaped Core, User and Character interface backed by
`hexa_core`. It supports both common acquisition styles on server and client:

```lua
local Core = exports.vorp_core:GetCore()

-- legacy event style
TriggerEvent('getCore', function(core)
    Core = core
end)
```

Start `vorp_core` after `hexa_core` and before any resource that expects `getCore` to answer during
its own startup.

## Users and characters

On the server:

```lua
local User = Core.getUser(source)       -- Core.GetUser also works
if not User then return end

local Character = User.getUsedCharacter -- this is a value, not a function
Character.addCurrency(0, 100)
```

`Core.getUsers()` / `Core.GetUsers()` returns a map keyed by server id. A User reports
`source`, `identifier`, `getUsedCharacter`, `getUserCharacters`, `getGroup` and
`numOfCharacters`. `getNumOfCharacters()` returns `1` because the bridge exposes the currently loaded
Hexa character, not Hexa's character-selection storage.

Character fields translate identity, name, job, money, status and position from `PlayerData`.
`skinPlayer`, `compPlayer` and `comps` are empty because Hexa skin data has a different format, and
`inventory` is empty because this stack keeps inventory in `hexa_inventory`.

The Character object is a snapshot taken by `Core.getUser(src)`. Call `getUser` again before reading
a balance or job value that may have changed.

### Character methods

Supported mutations include:

| Area | Methods |
| --- | --- |
| Currency | `addCurrency`, `removeCurrency`, `setCurrency`, `getCurrency` |
| Job | `setJob`, `setJobGrade`, `setJobDuty` |
| Permission group | `setGroup` |
| XP | `addXp`, `removeXp`, `setXp` |
| Status metadata | `setHealth`, `setHealthOuter`, `setHealthInner`, `setStamina`, `setStaminaOuter`, `setStaminaInner`, `setDead`, `setHours` |
| Lifecycle | `updateCharUi`, `saveCharacter` |

`setJobLabel` is a no-op because Hexa stores the label in the jobs catalogue. `setSkin` and
`setComps` are no-ops because `hexa_skin` uses a different format. User-level `setUsedCharacter`,
`addCharacter` and `delCharacter` are no-ops because slot management belongs to
`hexa_multicharacter`.

## Currency mapping

VORP addresses currencies numerically. The shipped mapping is:

```lua
BridgeConfig.Currency = {
    [0] = 'cash',
    [1] = 'gold',
    [2] = false, -- rol / rollcoins
}
```

A `false` or missing mapping returns failure (or `0` for a read) and warns once. If a converted
resource uses rollcoins, decide explicitly whether to add a matching Hexa money type or map it to an
existing account. Do not map it to `bank` merely to silence an error unless those economics are
actually intended.

## Groups and ACE permissions

`Character.group` is derived from Hexa permissions in priority order. The defaults map `admin` to
VORP `admin`, `staff` to `moderator`, and no matching ACE to `user`.

`Character.setGroup(group)` translates back through `BridgeConfig.PermissionFromGroup`:

- `admin` and `superadmin` grant Hexa `admin`;
- `moderator` and `mod` grant Hexa `staff`;
- `user = false` removes all Hexa permission levels from that player;
- an unknown group is not guessed and produces one warning.

## Notifications

The server and client expose the familiar notification names, including `NotifyRightTip`,
`NotifyTip`, `NotifyObjective`, `NotifyCenter`, `NotifyBottomRight`, `NotifyTop`,
`NotifySimpleTop`, `NotifyLeft`, `NotifyLeftRotate`, `NotifyAvanced` / `NotifyAdvanced`, and
`NotifyDeadPlayer`.

All of them render through Hexa's one toast interface. Position, texture dictionary, icon and colour
arguments cannot be reproduced and are ignored. `BridgeConfig.NotifyTypes` controls the Hexa toast
type selected for each VORP name.

## Callbacks

Register a server callback and call it from a client:

```lua
-- server
Core.Callback.Register('example:get', function(src, cb, value)
    cb(value * 2)
end)

-- aliases on the server:
-- Core.addRpcCallback(...)
-- Core.RegisterCallback(...)
```

```lua
-- client, asynchronous
Core.Callback.TriggerAsync('example:get', function(result)
    print(result)
end, 5)

-- client, await (must run inside a Citizen thread)
local result = Core.Callback.TriggerAwait('example:get', 5)
```

Each request has its own id, so overlapping calls with the same name are safe. Client requests time
out after 15 seconds and resolve/call back with no values. For the reverse direction, clients use
`Core.Callback.Register(name, fn)` and servers call
`Core.Callback.TriggerClientAsync(name, source, cb, ...)`; the same 15-second timeout applies.

## Webhooks

The server supplies the VORP-compatible call:

```lua
Core.AddWebhook(title, webhookUrl, description, colour, username, logo, footerLogo, avatar)
```

It sends a Discord embed directly to the supplied URL. Keep webhook URLs in server-only files; do not
place them in the shared bridge config.

## Forwarded events

| VORP event | Bridge behaviour |
| --- | --- |
| `vorp:SelectedCharacter` | Fired server-side with `(source, Character)` and client-side with the character id when Hexa loads a player |
| `vorp:playerSpawn` | Fired server-side and client-side when Hexa receives its player-loaded signal |
| `vorp:playerDropped` | Fired server-side with the source when Hexa drops a player |
| `vorp:setJob` | Fired server-side with `(source, jobName, gradeLevel)` on a Hexa job update |
| `vorp:updateCharUi` | Fired client-side by `Character.updateCharUi()` |

## Known boundaries

- Only the currently loaded character is exposed; create/select/delete operations remain with
  `hexa_multicharacter`.
- `BridgeConfig.MaxCharacters` only controls the reported `Core.maxCharacters`. Keep it aligned with
  `hexa_multicharacter`; it does not enforce slots.
- VORP skin/component data and character-owned inventory are not translated.
- Notification placement and VORP-specific artwork are reduced to a normal Hexa toast.
- Currency and group mappings require deliberate configuration for custom servers.

