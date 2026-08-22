# Configuration

Everything hexa_core can be tuned from lives in a single file at the root of the resource:
`hexa_core/config.lua`.

It is declared in `fxmanifest.lua` as a **shared script**, so the exact same `Config` table exists on
the server and on every client. The core object republishes it as `Core.Config`, which is how other
resources should read it:

```lua
local Core = exports['hexa_core']:GetCoreObject()
-- same table on both sides, no round trip needed
local minutes = Core.Config.Save.Interval
```

Because it is a shared script, a change to `config.lua` needs a `restart hexa_core` (or a server
restart) before either side sees it.

::: warning Config is not a security boundary
The whole `Config` table is shipped to clients. Never put a database password, an API key, or a
Discord webhook you would mind a player reading into anything other than the keys documented here as
server-side, and understand that `Config.Log.Webhooks` is visible to clients too. Treat webhook URLs
as semi-public.
:::

## Day one checklist

These are the keys a new server owner actually has to make a decision about before opening. Everything
else in the file has a working default.

| Key | Why it matters on day one |
| --- | --- |
| `Config.IdentifierType` | Ships as `'steam'`. Players without a Steam ID are refused at connect. |
| `Config.DefaultSpawn` | Where every brand new character wakes up. |
| `Config.MultiCharacter` | Character picker on, or auto-login into the last character. |
| `Config.Log.Webhooks` | Empty by default, so logs only reach the console and nowhere else. |
| `Config.Money.MoneyTypes` | The money columns your whole economy will speak in, plus starting balances. |
| `Config.Player.CitizenIdPrefix` / `CitizenIdDigits` | Decides the shape and the size of your citizen id pool. |
| `Config.Save.Interval` | How much progress a crash is allowed to cost. |

Everything under [Leave these alone](#leave-these-alone) can stay untouched indefinitely.

## General server settings

```lua
Config.MaxPlayers = GetConvarInt('sv_maxclients', 48)
Config.IdentifierType = 'steam'
Config.MultiCharacter = true
Config.DefaultSpawn = vector4(-2784.2534, -3058.2639, -12.3404, 333.5929)
```

`Config.IdentifierType` picks which identifier is written into the `identifier` column of the `users`
table and used for every character lookup afterwards. `Core.GetIdentifier(source)` falls back to this
value when no type is passed:

```lua
local Core = exports['hexa_core']:GetCoreObject()
-- uses Config.IdentifierType
local license = Core.GetIdentifier(source)
-- or ask for one explicitly
local steam = Core.GetIdentifier(source, 'steam')
```

::: danger Changing IdentifierType after launch orphans characters
Characters are keyed on the identifier that was current when they were created. Switching from
`'steam'` to `'license'` on a live server means every existing character stops resolving. Pick one
before you open and keep it.

`'steam'` also means anyone not launching RDR2 through a logged-in Steam client is dropped during
`playerConnecting` with an explanatory message. `'license'` is the safer default because every RedM
player has a Rockstar license.
:::

`Config.MultiCharacter = true` hands the spawn decision to `hexa_multicharacter` and disables the
built-in auto-login path in `client/spawn.lua`. Setting it to `false` puts the last-played character
straight into the world with no picker.

`Config.DefaultSpawn` is a `vector4` — the `w` component is the heading. It is used both by
`server/spawn.lua` and by `Config.Player.PlayerDefaults.position`, so a character with no saved
position lands there.

## Debug output

```lua
Config.Debug = false
```

This single switch gates `Core.PrintDebug` on both sides. The check happens **before** the format
string is built, so leaving debug messages in shipped code costs nothing while the flag is off:

```lua
local Core = exports['hexa_core']:GetCoreObject()
-- silent and free while Config.Debug is false
Core.PrintDebug('player %s finished loading', source)
```

`Core.Log`, `Core.Warn` and `Core.Error` ignore this flag and always print. Note that
`Config.Colormap.Debug` is a separate, narrower switch — see [Colormap](#colormap).

## Saving and persistence

```lua
Config.Save = {}
Config.Save.Interval = 45
Config.Save.SpreadSeconds = 60
Config.Save.OnDrop = true
Config.Save.OnResourceStop = true
```

The save cadence runs entirely on the server in `server/save.lua`. Every `Interval` minutes the
server collects the players whose data actually changed since the last write and queues them.

- **`Interval`** — minutes between sweeps. Values below `1` are raised to `1`. Anything in the 30 to
  60 range is sane; a lower number means more MySQL traffic for very little gain, because a dirty
  flag already suppresses idle players.
- **`SpreadSeconds`** — the sweep spaces the queued writes evenly across this many seconds instead of
  firing them in one tick. With 48 players and `60`, that is roughly one write every 1.25 seconds.
  Set it to `0` to write everyone immediately.
- **`OnResourceStop`** — when `hexa_core` stops or the server shuts down, everyone currently online is
  written synchronously, no spreading. Set it to `false` only if you know why you want that.

Two functions are worth knowing about:

```lua
local Core = exports['hexa_core']:GetCoreObject()

-- write every online player right now, returns how many were written
local saved = Core.SaveAllPlayers()
Core.Log('saved %d player(s)', saved)
```

```lua
local Core = exports['hexa_core']:GetCoreObject()
local Player = Core.GetPlayer(source)
-- force this player into the next sweep after changing something the core cannot see
Player.MarkDirty()
```

Any core call that mutates player data already marks the player dirty through `Player.SyncPlayerData`.
`Player.MarkDirty()` exists for the case where your resource changed something behind the core's back.

::: warning Config.Save.OnDrop is not read in 3.0.0
The key exists in `config.lua`, but nothing in the resource reads it. The `playerDropped` handler in
`server/events.lua` calls `Player.Save()` unconditionally, so a drop is always saved regardless of
what this key is set to. Setting it to `false` will not stop that write.
:::

## Logging

```lua
Config.Log = {}
Config.Log.Enabled = true
Config.Log.Webhooks = {
    default   = '',
    joinleave = '',
    anticheat = '',
}
```

hexa_core listens for `hexa_log:server:CreateLog` itself. Any resource can push a line into it:

```lua
-- category, title, colour, message
TriggerEvent('hexa_log:server:CreateLog', 'joinleave', 'Dropped', 'red', 'Arthur left the server')
```

Every accepted line is printed to the server console. If a webhook URL is configured, the line is also
posted to Discord as an embed. The category is looked up in `Config.Log.Webhooks` first, and falls back
to `default`; a category with no match and an empty `default` simply is not forwarded.

`Config.Log.Enabled = false` silences both the console line and the webhook. It does not affect
`Core.Log` / `Core.Warn` / `Core.Error`, which print regardless.

::: tip Console colours
The colour argument recognises `red`, `green`, `yellow`, `blue` and `white`. Anything else — including
values that appear in the core's own log calls, such as `lightgreen` and `orange` — falls back to plain
white. It only affects the console tint; the Discord embed colour is fixed.
:::

A failing webhook is not silent: a non-2xx response warns once per category, so a bad URL shows up in
the console instead of quietly dropping every log line.

Log message text throughout hexa_core is deliberately English. Some server consoles mangle Thai, and
operators reading a live console need to scan fast.

## Money

```lua
Config.Money = {}
Config.Money.MoneyTypes = {
    cash = 50,
    bank = 0,
    gold = 0
}
Config.Money.DontAllowMinus = {'cash', 'gold', 'bank', 'bloodmoney'}
Config.Money.MinusLimit = 0
Config.Money.PayCheckTimeOut = 10
Config.Money.PayCheckSociety = false
Config.Money.SocietyExport = nil
Config.Money.EnableMoneyItems = false
```

### Money types

The keys of `Config.Money.MoneyTypes` are the complete set of money columns on this server, and the
values are what a freshly created character starts with. Other Hexa resources read the same list, so
adding a type here is what makes it selectable elsewhere.

```lua
local Core = exports['hexa_core']:GetCoreObject()
local Player = Core.GetPlayer(source)
-- money type names are the keys from Config.Money.MoneyTypes
Player.AddMoney('cash', 100, 'reward')
local balance = Player.GetMoney('bank')
```

::: tip One bank account, not one per town
Older builds had a separate money type per town bank (`valbank`, `rhobank`, `blkbank`, `armbank`).
They are gone. Characters carrying a balance in an old column get it merged into `bank` automatically
on load, and the merge is logged. Do not re-add the old keys.
:::

### Negative balances

`DontAllowMinus` lists money types that may never go below zero. `MinusLimit` is the floor for types
not on that list.

::: warning The floor is clamped to 0 in code
`Player.RemoveMoney` applies `math.max(0, MinusLimit)` unconditionally. A negative `MinusLimit` cannot
re-open the old hole where `RemoveMoney('bank', n)` returned `true` on an insufficient balance and every
script written against the standard `if Player.RemoveMoney(...) then giveGoods() end` contract handed
out free goods. Editing these two keys cannot make the server unsafe, which is exactly why they can be
left alone.
:::

### Paychecks

`PayCheckTimeOut` is the interval in minutes between paycheck runs. The amount comes from the player's
job grade (`Shared.Jobs[job].grades[level].payment`), and a player is only paid when they are on duty
or the job definition sets `offDutyPay`. The money lands in `bank`, falling back to `cash` if the
character has no bank column.

`PayCheckSociety = true` makes the paycheck come out of a company account instead of being created by
the system, and requires `SocietyExport` to point at a resource that provides one:

```lua
Config.Money.SocietyExport = {
    resource   = 'your_banking_resource',
    getBalance = 'GetAccountBalance',
    removeMoney = 'RemoveMoney',
}
```

The `getBalance` and `removeMoney` names default to `GetAccountBalance` and `RemoveMoney` if omitted.
If the resource is not started, or the lookup fails, the core warns once and pays from the system
instead of silently skipping wages. The Hexa stack does not currently ship a society system, so leave
`SocietyExport = nil` and `PayCheckSociety = false` unless you are wiring in something external.

### Money as items

`EnableMoneyItems = true` turns cash and gold into inventory items rather than plain numbers. It is
`false` by default and that is the supported configuration for this stack.

## Player and character defaults

```lua
Config.Player = {}
Config.Player.DefaultModel = 'mp_male'
Config.Player.CitizenIdPrefix = 'RB'
Config.Player.CitizenIdDigits = 4
Config.Player.RevealMap = true
```

`Config.Player.RevealMap = true` calls `SetMinimapHideFow(true)` on login, so the whole map is visible
from the first minute. Set it to `false` if you want players to discover the map by riding it.

::: warning Config.Player.DefaultModel is inert
Nothing in hexa_core 3.0.0 reads this key. Character models come from the character creator and the
clothing layer. It is documented here only so you are not surprised that changing it does nothing.
:::

### Citizen ids

A citizen id is `CitizenIdPrefix` followed by `CitizenIdDigits` random digits, always zero padded —
`'RB'` and `4` gives `RB0087`, `RB1234`. Four digits is a pool of ten thousand ids.

The generator checks issued ids for collisions and skips everything listed in
`Config.Player.LockedIds` — the repdigit vanity numbers (`1`, `99`, `7777`, `999999`, and so on) that
you probably want to hand out yourself rather than let the random draw burn.

::: tip Raise the digit count before the pool fills
When the pool looks exhausted the generator temporarily issues a longer id and logs a message telling
you to raise `Config.Player.CitizenIdDigits`. Characters are never blocked from being created, but you
will end up with mixed-length ids. Raise the digit count once your character count approaches a
meaningful fraction of the pool.
:::

Ids are produced by these functions, which is why `PlayerDefaults` can call them directly:

```lua
local Core = exports['hexa_core']:GetCoreObject()
local citizenid = Core.CreateCitizenId()
local account = Core.CreateAccountNumber()
local fingerprint = Core.CreateFingerprint()
local walletid = Core.CreateWalletId()
```

### PlayerDefaults

`Config.Player.PlayerDefaults` is the full shape of a new character: `citizenid`, `cid`, `money`,
`optin`, `charinfo`, `job`, `metadata`, `position`, `items`, `weight` and `slots`.

Defaults are applied recursively and only fill in what is missing — an existing value is never
overwritten. That has one very useful consequence: adding a new field to `metadata` here also
back-fills it on every character that was saved before the field existed.

Fields whose value is a `function` are called at character creation time, which is how each character
gets its own random citizen id, bank account number, fingerprint and wallet id:

```lua
Config.Player.PlayerDefaults = {
    metadata = {
        -- called once per character, not shared
        fingerprint = function() return HexaCore.CreateFingerprint() end,
    }
}
```

::: tip weight and slots live here, not in the database
`weight = 100` and `slots = 25` are read from this table on every load. Inventory size is intentionally
percentage based: an item's weight is a percentage of the 100 a character can carry. Runtime overrides
go through `Core.SetMaxWeight` and `Core.SetMaxSlots`.
:::

The four body-status values (`hunger`, `thirst`, `cleanliness`, `stress`) start here too, in
`PlayerDefaults.metadata`, and are driven by the next section.

## Body status

```lua
Config.Status = {}
Config.Status.Enabled = true
Config.Status.TickInterval = 5
```

Hunger, thirst, cleanliness and stress are `0`-`100` values stored in the character's metadata.
For hunger, thirst and cleanliness, `100` is best. For stress, `0` is best.

The drain loop runs on the **server** (`server/status.lua`). It is not a client timer that the client
could simply decline to run. The client's only job is applying damage to the actual ped, which cannot
be done server-side.

`Config.Status.Enabled = false` stops the drain and the damage entirely; the metadata values just sit
where they are.

### Drain rates

```lua
Config.Status.Drain = {
    hunger      = 2.0,
    thirst      = 3.0,
    cleanliness = 1.0,
    stress      = -1.0,
}
```

Each value is subtracted once per `TickInterval` minutes. With the defaults, a player who eats and
drinks nothing runs out of hunger in about four hours of real time (100 / 2.0 = 50 ticks, 50 x 5
minutes) and out of thirst in a bit under three hours.

A negative rate regenerates instead of draining — `stress = -1.0` means standing around slowly calms a
character down, and raising stress is left to other resources. Set a rate to `0` to freeze that value.

Dead players are skipped, so nobody respawns straight back into starvation damage.

Other resources move these values through exports rather than touching metadata:

```lua
-- server side
exports['hexa_core']:AddStatus(source, 'hunger', 20)
exports['hexa_core']:RemoveStatus(source, 'thirst', 10)
exports['hexa_core']:SetStatus(source, 'cleanliness', 100)
local hunger = exports['hexa_core']:GetStatus(source, 'hunger')
```

```lua
-- client side, read only
local status = exports['hexa_core']:GetStatus()
print(status.hunger, status.thirst, status.cleanliness, status.stress)
```

Admins can set a value directly with `/setstatus [id] [hunger|thirst|cleanliness|stress] [0-100]`.

### Starvation damage

```lua
Config.Status.Damage = {
    enabled   = true,
    threshold = 0,
    interval  = 10000,
    amount    = 5,
    minHealth = 100,
}
```

- **`threshold`** — the value at or below which a player counts as starving. `0` means completely empty.
  Raise it to start hurting people earlier.
- **`interval`** — milliseconds between damage ticks. Values below `1000` are raised to `1000`.
- **`amount`** — health removed per tick.
- **`minHealth`** — the floor. Damage never takes a player below this, so hunger alone cannot kill.
  Set it to `0` if you want starvation to be lethal.

### RDR2 gold cores

```lua
Config.Status.Cores = {
    enabled = true,
    health  = 100,
    stamina = 100,
    deadeye = 100,
    staminaOnSpawn = 100,
    interval = 5000,
}
```

RDR2 keeps two layers per attribute: the gold **core** in the middle, which drains on its own over
time, and the outer **bar**, which is the value you actually run and shoot with. Once the core drops,
the outer bar can no longer refill to full.

This server already runs its own hunger and thirst system, so the game's cores are simply held full
instead of being allowed to compete with it. Each of `health`, `stamina` and `deadeye` is a target value
from `0` to `100`; set one to `nil` to leave that core alone. Only cores that are actually below target
are written, so the core icons do not flash every few seconds.

`staminaOnSpawn` refills the outer stamina bar, and it fires only when the ped changes — a new
character, a clothing change, a revive. A fresh ped does not inherit the previous one's stamina, so
without this you spawn with a partly empty bar having never run. It deliberately does not fire every
tick, or nobody would ever get tired.

`interval` is the milliseconds between checks, with a floor of `1000`.

Scripts that swap a model or revive someone can top the cores up immediately:

```lua
-- cores plus the outer stamina bar
exports['hexa_core']:RefillCores()
-- cores only, leave stamina alone
exports['hexa_core']:RefillCores(false)
```

::: tip Health regeneration is not in config.lua
RDR2's passive health regeneration is switched off in `hexa_core/client/events.lua`, not here. If you
want the vanilla behaviour back, change the two multipliers in `DisableHealthRecharge` from `0.0` to
`1.0`. `Config.Status.Cores.enabled = false` only hands the gold cores back to the game.
:::

## Security

```lua
Config.Security = {}
Config.Security.CSRFFailurePolicy = 'log'
Config.Security.CSRFFailureThreshold = 5
```

NUI pages in the Hexa stack carry a CSRF token. When a client reports a token mismatch, this decides
what the server does about it.

- **`'log'`** (default) — record it in the console and the log sink, do nothing to the player.
- **`'kick'`** — drop the player once they report `CSRFFailureThreshold` mismatches inside the same
  ten second window. The window length is fixed in `server/events.lua` and is not configurable.

Only the first report per window is logged, so a client cannot flood the console by spamming the event.

::: warning This is a warning light, not an anti-cheat
The token is generated, sent and validated entirely on the client. The server has nothing to verify it
against, so a report is only ever a hint. Setting `'kick'` can drop honest players whose NUI loaded
slowly or stuttered, which is exactly why the default is `'log'`.
:::

## Colormap

```lua
Config.Colormap = {}
Config.Colormap.Enabled = true
Config.Colormap.Debug = false
```

Colormap paints RDR2 map regions using the game's wanted-region natives, which draw a border and a
tinted fill on both the minimap and the full map. It is entirely client-side and never talks to the
server. Zones are painted once at resource start and cleared on stop, so no loop and no thread.

### Palette and zones

```lua
Config.Colormap.Colors = {
    red    = 'BLIP_STYLE_WANTED_REGION',
    green  = 'BLIP_STYLE_DEBUG_GREEN',
    blue   = 'BLIP_STYLE_DEBUG_BLUE',
}

Config.Colormap.Zones = {
    -- AMBARINO state
    { hash = 0x3B8DD21A, color = 'red' },
    -- ROANOKE RIDGE district
    { hash = 0x30FAE29B, color = 'blue' },
}
```

The names on the left of `Colors` are yours; the real shade is whatever `BLIP_STYLE_*` you map them to.
The table is not limited to the six defaults that ship. A zone's `color` accepts either a palette name
or a raw `BLIP_STYLE_*` string, so a one-off shade does not need a palette entry.

Zone hashes are nested: the low zone types are small areas (region, district) and the high ones are the
big containers (state).

### Finding zone hashes

Setting `Config.Colormap.Debug = true` prints every paint and clear to the client console and registers
three throwaway commands:

- `/zonehash` — dumps every zone hash at your current position, in a format you can paste straight into
  `Zones`.
- `/zonestyle <zone> <style>` — paints a zone live, with no restart, for previewing a shade.
- `/zonereset [zone]` — clears one zone, or with no argument repaints everything from config.

Other resources can drive it at runtime:

```lua
exports['hexa_core']:SetZoneColor(0x30FAE29B, 'blue')
exports['hexa_core']:ResetZoneColor(0x30FAE29B)
exports['hexa_core']:RefreshZoneColors()
exports['hexa_core']:ClearZoneColors()
```

## World density

```lua
Config.Density = {
    [1] = 1.0, -- ambient animals
    [2] = 1.0, -- scenario animals
    [3] = 0.0, -- ambient humans
    [9] = 0.0, -- vehicles
}
```

Nine indexed multipliers, `0.0` for off and `1.0` for the game's normal value. The defaults keep animals
alive so hunting works, and switch off ambient NPCs, peds and wagons.

These are per-frame natives by engine design, so they have to be re-applied every frame. `client/density.lua`
precomputes only the entries that differ from `1.0`, and if every entry is `1.0` it does not create a
thread at all. Leaving a category at `1.0` is genuinely free.

## Eagle Eye

```lua
Config.EagleEye = {
    everyone = { enabled = true },
    vallaw   = { enabled = false },
    rholaw   = { enabled = false },
}
```

If `everyone.enabled` is `true`, everybody gets Eagle Eye and the rest of the table is ignored. Set it
to `false` to restrict the ability to specific jobs, then add a key per job name as it appears in the
`jobs` table:

```lua
Config.EagleEye = {
    everyone = { enabled = false },
    hunter   = { enabled = true },
}
```

Access is re-evaluated on login and on every job change.

## Prompts

```lua
Config.PromptDistance = 1.0
Config.PromptVisible  = 3.0
```

`PromptDistance` is the range in metres at which an interaction prompt can be pressed, and
`PromptVisible` is the range at which the marker first appears. These are the stack-wide defaults for
every prompt hexa_core registers; keep them consistent across resources so interactions feel the same
everywhere.

## Leave these alone

| Key | Why |
| --- | --- |
| `Config.MaxPlayers` | Reads `sv_maxclients` from `server.cfg` automatically, and nothing in hexa_core 3.0.0 reads it back. Set the convar, not this. |
| `Config.UpdateInterval` | A backwards-compatible mirror of `Config.Save.Interval` for old configs. Edit `Config.Save.Interval` instead. |
| `Config.Player.LockedIds` | Vanity numbers held back from the random draw. Fine as shipped. |
| `Config.Money.DontAllowMinus` / `MinusLimit` | Server-side clamping already makes negative balances impossible. |
| `Config.Money.EnableMoneyItems` | `false` is the supported configuration for this stack. |
| `Config.Security.*` | `'log'` is the correct default for a client-validated token. |
| `Config.Density` | Tuned so hunting works and towns are not full of ambient NPCs. |
| `Config.Status.Cores` | Holds the gold cores full so they do not fight the server's own hunger system. |
| `Config.Colormap.Zones` | The seven shipped zones cover every state plus Roanoke Ridge. |
