# Logging and debugging

Every line `hexa_core` prints goes through one small set of functions defined in
`shared/log.lua`. That file is a `shared_script`, so client and server get the exact same
implementations under the exact same names - a helper you write once works on both sides without a
`IsDuplicityVersion()` branch.

The printers are attached to the core object in `client/main.lua` and `server/main.lua`, so any
resource that holds a core object can use them.

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.Log('shop opened at %s', 'Valentine')
```

## The four levels

| Function | Prefix | Prints when |
| --- | --- | --- |
| `Core.Log(fmt, ...)` | `[hexa_core]` | always |
| `Core.Warn(fmt, ...)` | `[hexa_core] [WARN]` | always |
| `Core.Error(fmt, ...)` | `[hexa_core] [ERROR]` | always |
| `Core.PrintDebug(fmt, ...)` | `[hexa_core] [DEBUG]` | only while `Config.Debug` is `true` |

All four take the same arguments on the server and on the client. There is no severity threshold and
no log file: these write to the FXServer console (server side) or the game console (client side).

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.Log('catalogue ready: %d entries', 412)
Core.Warn('paycheck skipped for id %s - no job grade', tostring(source))
Core.Error('could not read the jobs table: %s', tostring(err))
```

Colouring uses FXServer colour codes (`^1` … `^9`), never ANSI escapes, because FXServer consoles do not
agree on how to render ANSI.

### ShowError and ShowSuccess

Two older shapes are kept because server code already used them. They take a resource name instead of
a format string, and they now exist on both sides:

```lua
Core.ShowError(GetCurrentResourceName(), 'config.lua has no Config.Money.MoneyTypes')
Core.ShowSuccess(GetCurrentResourceName(), 'loaded 12 shop locations')
```

## printf style, not concatenation

Every printer is `printf` style. Pass a format string plus values; do not build the string yourself.

```lua
-- do this
Core.Log('player %s bought %d x %s', name, amount, item)

-- not this
Core.Log('player ' .. name .. ' bought ' .. amount .. ' x ' .. item)
```

Formatting only happens when you actually pass values. A call with a single argument is passed
through `tostring` untouched, so a lone message containing a stray `%` will not blow up:

```lua
Core.Log('discount is 50% off')
```

The core wraps anything that could be `nil` in `tostring()` before handing it to `%s`. Copy that
habit - it keeps a missing value from turning a log line into a runtime error.

## Why Core.PrintDebug checks the switch first

`Core.PrintDebug` is the one printer that is called on hot paths, so it tests `Config.Debug` **before**
it formats anything. If debug output is off, no string is ever built and the call costs a table lookup
and a return.

That only helps if you let the function do the gating. The moment you build the string at the call
site, you pay for it whether debug is on or off:

```lua
-- good: nothing is formatted while Config.Debug is false
Core.PrintDebug('inventory sync for %s took %dms', citizenid, elapsed)

-- bad: the concatenation and the json.encode run every time
Core.PrintDebug('inventory sync ' .. citizenid .. ' ' .. json.encode(payload))
```

::: tip
`Config.Debug` lives in `hexa_core/config.lua` and ships as `false`. It is a single switch for the
whole framework - turning it on makes every `[DEBUG]` line in every hexa resource appear at once.
:::

## Core.DumpTable for tables

The line printers take a format string. For a whole table, use `Core.DumpTable`:

```lua
local Core = exports['hexa_core']:GetCoreObject()
local Player = Core.GetPlayer(source)

Core.DumpTable(Player.PlayerData)
```

The second argument is the starting indent level and is normally left out:

```lua
Core.DumpTable(Player.PlayerData.metadata, 1)
```

Keys are printed in yellow and values are tinted by type: strings green, numbers blue, booleans red,
everything else grey. A non-table value is simply printed, so passing the wrong thing is harmless.

Nesting is cut off at depth 6 and replaced with `...`.

::: warning
`Core.DumpTable` is not gated by `Config.Debug`, and printing blocks the main thread. Dumping a large
or deeply nested table every tick will visibly stall the server. Use it from a command or a one-off
branch, not from a loop.
:::

## Core.Debug was split in two

In 2.x, `Debug` meant different things depending on the side: the client version took
`(resource, obj, depth)`, the server version took `(tbl, indent)`. There was no way to write one
helper that worked on both. It is now two functions with one meaning each:

- `Core.PrintDebug(fmt, ...)` - one formatted line, gated on `Config.Debug`
- `Core.DumpTable(value, indent)` - a table, always printed

::: warning
A compatibility alias for `Core.Debug` exists on the **client only**. It guesses from the argument
types which of the two you meant and prints a one-time deprecation warning. There is no such alias on
the server: server code calling `Core.Debug` will error on a nil value. Move to `Core.PrintDebug` or
`Core.DumpTable` now.
:::

## Why log text is English

All log text produced by the framework is English, deliberately. Two reasons:

- Some server consoles and log shippers mangle Thai characters, which turns an incident timeline into
  garbage exactly when you need to read it.
- Operators scan logs fast, and a consistent single language reads faster than a mix.

This applies to log lines only. Code comments stay Thai, and anything a player sees - notifications,
prompts, command help - stays Thai and belongs in `locale/th.lua`, not in a log call.

In practice a single action often produces both - a Thai message for the player, an English line for
the operator:

```lua
local Core = exports['hexa_core']:GetCoreObject()
local Player = Core.GetPlayer(source)

Player.AddItem('bread', 1)
Core.Notify(source, { title = 'ได้รับขนมปัง 1 ชิ้น', type = 'success', duration = 5000 })
Core.Log('gave bread x1 to %s', Player.PlayerData.citizenid)
```

## The audit log: hexa_log:server:CreateLog

This is a different thing from the console printers. `hexa_log:server:CreateLog` is the server-side
event that resources fire to record something that a human should be able to review later - money
moving, a character being deleted, an anticheat drop, an admin running code.

```lua
TriggerEvent('hexa_log:server:CreateLog', 'joinleave', 'Dropped', 'red',
    ('**%s** left. Reason: %s'):format(GetPlayerName(src), reason))
```

| Argument | Type | Meaning |
| --- | --- | --- |
| `category` | string | log channel, e.g. `joinleave`, `anticheat`, `playermoney` |
| `title` | string | short headline, becomes the Discord embed title |
| `colour` | string | console tint - see below |
| `message` | string | the body; Discord markdown works here |

Everything is coerced with `tostring`, and a missing `category` becomes `general`.

::: danger Those logs used to go nowhere
The event was fired from 23 places across 4 resources, but no resource named `hexa_log` ever existed
on this server and nothing registered a handler for it. Every player join and leave, every character
deletion, every money adjustment and every anticheat alert was written into a void.

As of 3.0, `hexa_core` registers the handler itself in `server/debug.lua`. The 23 existing call sites
started working with no edits to them at all.
:::

The handler is registered with `AddEventHandler`, not `RegisterNetEvent`. That is deliberate: a client
cannot fire it, so nobody can flood the console or your webhook from the game.

### Colours

`colour` is a name, not a code. Recognised names are `red`, `green`, `yellow`, `blue` and `white`.
Anything else falls back to white, which is why older call sites passing `lightgreen` or `orange`
still print correctly - just uncoloured.

### Config.Log

```lua
Config.Log = {}

Config.Log.Enabled = true

Config.Log.Webhooks = {
    default   = '',
    joinleave = '',
    anticheat = '',
}
```

`Config.Log.Enabled = false` drops the log entirely - no console line and no webhook. Anything other
than an explicit `false` leaves logging on.

`Config.Log.Webhooks` maps a category to a Discord webhook URL. Lookup is by exact category name and
falls back to `default`, so:

- give `anticheat` its own URL to route alerts to a private staff channel
- set `default` to catch every category you have not listed
- leave a value as an empty string to send nothing for it

Categories are just strings, so you can add keys for the ones the rest of the stack already uses:

```lua
Config.Log.Webhooks = {
    default         = 'https://discord.com/api/webhooks/...',
    joinleave       = 'https://discord.com/api/webhooks/...',
    anticheat       = 'https://discord.com/api/webhooks/...',
    playermoney     = 'https://discord.com/api/webhooks/...',
    playerinventory = 'https://discord.com/api/webhooks/...',
    executor        = 'https://discord.com/api/webhooks/...',
}
```

The console line is printed either way. The webhook is an addition, not a replacement, so pulling a
URL out never costs you the log.

If Discord answers with anything other than `200` or `204`, the failure is reported once per category
with a warning. It is intentionally not silent - a webhook that quietly stopped delivering is exactly
the failure this whole section exists to prevent.

### HexaCore:DebugSomething

An older indirection that dumped a table through an event still has a handler, for code that has not
been updated yet:

```lua
TriggerEvent('HexaCore:DebugSomething', someTable, 0, GetCurrentResourceName())
```

It prints the calling resource and then hands the table to `Core.DumpTable`. Like `CreateLog`, it is
registered with `AddEventHandler` and is not a net event. In new code call `Core.DumpTable` directly -
it is the same output without the round trip.
