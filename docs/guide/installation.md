# Installation

hexa_core is a single resource. You clone it, point oxmysql at a database, put two lines in
`server.cfg` in the right order, and start the server. There is no SQL file to import by hand:
`server/installer.lua` applies `install.sql` on every boot.

This page covers a clean install of hexa_core 3.0.0.

## Requirements

| Requirement | Notes |
| --- | --- |
| FXServer artifact with `rdr3` | A recent RedM artifact. The manifest declares `fx_version 'cerulean'`, `game 'rdr3'` and `lua54 'yes'` — an artifact too old for Lua 5.4 will fail to load the resource. |
| MariaDB or MySQL | Player rows, jobs, items and the inventory tables live here. MariaDB 10.4+ or MySQL 8 both work; the installer tolerates both dialects of "already exists". |
| [oxmysql](https://github.com/CommunityOx/oxmysql) | The only declared dependency. It must be started before hexa_core. |

hexa_core loads `@oxmysql/lib/MySQL.lua` as its first server script and does all of its work inside
`MySQL.ready`. If oxmysql is missing or starts late, hexa_core never reaches its ready callback and
every connecting player is refused with the database error message.

## Step 1 - clone the resource

Clone into your resources folder. The folder name must stay `hexa_core`, because every other
resource on the stack addresses it as `exports['hexa_core']`.

```bash
git clone https://github.com/hexa-development/hexa_core.git
```

## Step 2 - set the connection string

oxmysql reads `mysql_connection_string` from `server.cfg`. Create an empty database first; the
installer creates the tables, not the schema itself.

```ini
set mysql_connection_string "mysql://user:password@localhost/hexa?charset=utf8mb4"
```

::: tip
Keep `charset=utf8mb4`. Every table in `install.sql` is created as `utf8mb4`, and the seeded item
labels are Thai. On a `latin1` connection those labels come back as mojibake.
:::

## Step 3 - server.cfg ordering

Order matters. oxmysql first, hexa_core second, everything that consumes the core object after that.

```ini
ensure oxmysql
ensure hexa_core

# resources that call exports['hexa_core'] go below this line
ensure my_resource
```

Two things depend on this ordering:

- hexa_core waits for oxmysql's `MySQL.ready`, so starting them the other way round only delays the
  install, but starting hexa_core without oxmysql at all leaves the framework permanently
  unavailable.
- `install.sql` is the only schema in the stack. The inventory resource has no installer of its
  own; its `users_vault` and `item_drops` tables are created here. A resource that queries them
  before hexa_core has finished must wait (see [Waiting for the schema](#waiting-for-the-schema)).

## Step 4 - choose an identifier type

This is the one setting you must decide before the first player connects. It selects which
identifier goes into the `identifier` column of `users`, and therefore which identifier a character
is bound to for the rest of its life.

```lua
Config.IdentifierType = 'steam' -- 'steam' or 'license'
```

`Core.GetIdentifier(source)` resolves it, and `server/events.lua` calls that during
`playerConnecting`:

```lua
local Core = exports['hexa_core']:GetCoreObject()

-- resolves through Config.IdentifierType unless you pass a type explicitly
local identifier = Core.GetIdentifier(source)
local license = Core.GetIdentifier(source, 'license')
```

::: danger Picking 'steam' refuses players
With `Config.IdentifierType = 'steam'`, a player whose game was not launched through Steam has no
Steam identifier. `Core.GetIdentifier` returns `nil`, and the connect handler calls
`deferrals.done(...)` with a message telling them to launch RDR2 through Steam. They never reach
the loading screen. That includes Rockstar Launcher and Epic players — a large share of the RDR2
population.

`'license'` is the safe choice. Every RedM player has a Rockstar license, so nobody is refused for
lacking one.
:::

Note that the shipped `config.lua` sets `'steam'`. If you want the safe behaviour, change it before
your first boot — changing it later re-binds everyone to a different identifier and their existing
characters stop resolving.

::: warning Do not change this on a live server
The `identifier` column is written once per character. Switching from `'steam'` to `'license'`
after players have created characters means their old rows no longer match, and the server hands
them a fresh character list. Decide now.
:::

The refusal text for the Steam case is hardcoded Thai in `server/events.lua`; the generic
"no valid license" refusal comes from the locale files (`error.no_valid_license`).

## Step 5 - first boot

Start the server. Everything below happens automatically, in this order.

### The installer applies install.sql

`server/installer.lua` waits for `MySQL.ready`, reads `install.sql` out of the resource, strips
whole-line `--` comments, splits the file on `;`, and runs the statements one at a time.

It is written to run on every boot, not only the first one:

- All table creation is `CREATE TABLE IF NOT EXISTS`, and all seed rows are `INSERT IGNORE`.
- The `ALTER TABLE` migrations are expected to fail on a fresh database. Errors matching
  "duplicate column name", "duplicate key name", "already exists", "check that it exists",
  "can't drop" and similar are treated as benign and skipped silently.
- Any other failure is printed with the offending statement, and the installer keeps going. One bad
  statement cannot leave the rest of the schema uncreated.

On success you get one line in the console:

```
[hexa_core] Database schema verified/installed.
```

If some statement failed for a real reason you get a warning with the count instead.

### Tables it creates

| Table | What it holds |
| --- | --- |
| `users` | One row per character. `citizenid` is the primary key, `identifier` is indexed. `accounts`, `inventory`, `loadout`, `metadata`, `status`, `position` and `skin` are JSON columns. |
| `jobs` | Job definitions. Seeded with `unemployed`, five law jobs and `medic`. |
| `job_grades` | Grades per job, with `salary` and `isboss`. |
| `items` | The item catalogue: `name`, `label`, `weight`, `rare`, `can_remove`. Seeded with food, drink, medicine and the two system items `clothes` and `toilet`. |
| `users_vault` | Non-player persistent storage for the inventory resource (stashes, safes, horse bags). |
| `item_drops` | Bags left on the ground, so they survive a restart. |

Weapons deliberately have no rows in `items`. `server/items.lua` merges `Shared.Weapons` from
`shared/weapons.lua` into the catalogue at boot.

### What loads after the schema

Both loaders wait for the installer before they read anything, so they cannot race the
`CREATE TABLE` on a fresh database:

- `server/jobs.lua` reads `jobs` and `job_grades` into `Shared.Jobs` and logs
  `loaded N job(s) from the database`.
- `server/items.lua` reads `items`, merges the weapons, and logs
  `item catalogue ready: N entries (N weapons, N general)`.

The database is the only source of truth for both. Adding a job or an item later means inserting
the row and restarting hexa_core — or calling `Core.RegisterJob` / `Core.RegisterItem` at runtime.

::: warning An empty items table silently strips inventories
If the `items` query fails or returns nothing, only weapons get registered, and loading a player
drops every item the catalogue does not recognise. The resource warns loudly when this happens:
`the items table is empty - only weapons will be registered`. Treat that line as a stop-the-server
condition.
:::

### Waiting for the schema

Another resource that touches `users`, `users_vault` or `item_drops` must wait for the installer.
The wait is exported. It blocks the calling thread, so call it inside a `CreateThread`.

```lua
CreateThread(function()
    exports['hexa_core']:AwaitSchemaReady(15000)
    local rows = MySQL.query.await('SELECT citizenid FROM users LIMIT 1')
    print(('users table reachable: %s'):format(rows ~= nil))
end)
```

The argument is a timeout in milliseconds and defaults to 15000. The flag is released even if some
statements failed, because a stuck flag would block player connections forever.

## Step 6 - give yourself admin

Permissions are FXServer aces. hexa_core recognises two levels, `admin` and `staff`
(`HexaCore.Commands.Permissions`). At boot it runs `add_ace hexacore.admin admin allow` and
`add_ace hexacore.staff staff allow` for you, and registers a `command.<name>` ace for every
command added at a level other than `admin` or `user`.

What is left for you is granting the ace to yourself, in `server.cfg` or a `permissions.cfg`:

```ini
add_ace hexacore.admin command allow
add_principal identifier.license:110000112345678 hexacore.admin
```

Once you are in the game with that principal, `/addpermission` and `/removepermission` handle
everyone else. Both take a **citizen id**, not a session id:

```
/addpermission RB0042 staff
```

Runtime grants made through `Core.AddPermission(source, permission)` are bound to the session id
and are removed on `playerDropped`, so they do not survive a reconnect. Only the `server.cfg`
principal is permanent.

## Step 7 - verify

Drop a throwaway resource in with this and run `/coretest` in game:

```lua
local Core = exports['hexa_core']:GetCoreObject()

RegisterCommand('coretest', function(source)
    local Player = Core.GetPlayer(source)
    if not Player then return Core.Warn('no player object for id %s', source) end
    Core.Log('%s has %s cash', Player.PlayerData.citizenid, Player.GetMoney('cash'))
end, false)
```

Two things are being checked there. `Core.GetPlayer` proves the core object is flat — there is no
`.Functions` layer in 3.0 — and `Player.GetMoney` proves the player object is flat too. The old
`Core.Functions.GetPlayer` and `Player.Functions.GetMoney` spellings still resolve for one release
and print a one-time deprecation warning naming the calling resource.

The running version is also readable:

```lua
print(exports['hexa_core']:GetCoreVersion())
```

## Settings worth reviewing before you open

You do not have to touch these to boot, but they decide how the server behaves under load.

### Saving

The save cadence runs on the server. A player is only written when their data actually changed.

```lua
Config.Save.Interval = 45       -- minutes between sweeps, minimum 1
Config.Save.SpreadSeconds = 60  -- spread the writes across this many seconds
Config.Save.OnDrop = true
Config.Save.OnResourceStop = true
```

`Config.UpdateInterval` is kept as an alias of `Config.Save.Interval` so older configs keep working.
`Core.SaveAllPlayers()` writes everyone immediately and returns the count; it is what runs on
`onResourceStop`. Another resource can push a player into the next sweep with `Player.MarkDirty()`.

::: warning Config.Save.OnDrop is not read
The key exists in `config.lua`, but nothing in the source reads it. The `playerDropped` handler in
`server/events.lua` calls `Player.Save()` unconditionally. Setting it to `false` does not disable
the save on drop.
:::

### Logging

hexa_core listens for `hexa_log:server:CreateLog` itself, prints every log line to the console, and
forwards to Discord when a webhook URL is configured.

```lua
Config.Log.Enabled = true

Config.Log.Webhooks = {
    default   = '',
    joinleave = '',
    anticheat = '',
}
```

A category with no URL of its own falls back to `default`. An empty `default` means console only.
A webhook that answers with anything but 200 or 204 is reported once in the console rather than
failing silently.

### Debug output

```lua
Config.Debug = false
```

`Core.PrintDebug` checks this switch before it formats anything, so leaving debug off costs nothing
at runtime. The full printf-style logging set is `Core.Log`, `Core.Warn`, `Core.Error`,
`Core.PrintDebug` and `Core.DumpTable`, with identical signatures on client and server.

### Character selection and spawn

```lua
Config.MultiCharacter = true
Config.DefaultSpawn = vector4(-2784.2534, -3058.2639, -12.3404, 333.5929)
```

`Config.MultiCharacter = true` hands character selection to the multicharacter resource and disables
auto-login. With `false`, the most recent character is logged in automatically and no selection
screen appears. `Config.MaxPlayers` is not a literal — it reads the `sv_maxclients` convar from
your `server.cfg` and falls back to 48.

### Language

The console log lines are English on purpose, and that is not configurable — operators scan fast
and some consoles mangle Thai. Player-facing strings come from the locale files. `locale/en.lua`
loads first and `locale/th.lua` overrides it, so Thai wins by default; delete or rename
`locale/th.lua` to fall back to English.

## Troubleshooting

**Every player is refused with a database error.** oxmysql never reached `MySQL.ready`. Check
`mysql_connection_string`, check the database exists, and check `ensure oxmysql` comes before
`ensure hexa_core`.

**Players who use the Rockstar Launcher cannot connect.** `Config.IdentifierType` is `'steam'`.
See [Step 4](#step-4-choose-an-identifier-type).

**`the items table is empty` in the console.** The seed did not apply. Look further up the console
for the failing statement the installer printed, fix it in the database, and restart hexa_core.

**Jobs all show as unemployed.** The `jobs` query failed. `Shared.Jobs` is populated only from the
database; `install.sql` seeds it, so an empty result means the seed never ran.

**A resource errors on `users_vault` at boot.** It queries before the schema exists. Wrap its first
query with `exports['hexa_core']:AwaitSchemaReady(15000)`.
