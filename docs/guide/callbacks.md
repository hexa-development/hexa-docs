# Callbacks

A callback is a question asked across the client/server boundary that comes back with an answer.
One side registers a handler under a name, the other side triggers that name and receives whatever
the handler passes to its `cb`.

In 3.0 the whole surface is flat. There is no `.Functions` layer:

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.CreateCallback('myscript:server:getBalance', function(source, cb)
    local Player = Core.GetPlayer(source)
    if not Player then return cb(0) end
    cb(Player.GetMoney('bank'))
end)
```

`Core.Functions.CreateCallback` still resolves for one more release and prints a one-time
deprecation warning naming the resource that called it.

## The four entry points

Both sides expose the same three names, but they do not mean the same thing on each side. Read this
table before writing anything.

| Side   | Function                                     | Network? | What it does |
| ------ | -------------------------------------------- | -------- | ------------ |
| Server | `Core.CreateCallback(name, cb)`               | no       | Registers a **server** callback into `Core.ServerCallbacks` |
| Server | `Core.TriggerClientCallback(name, source, cb, ...)` | yes | Asks one player's **client** callback |
| Server | `Core.TriggerCallback(name, source, cb, ...)`  | no      | Runs a locally registered **server** callback without a round trip |
| Client | `Core.CreateCallback(name, cb)`               | no       | Registers a **client** callback into `Core.ClientCallbacks` |
| Client | `Core.TriggerCallback(name, cb, ...)`          | yes     | Asks the **server** |
| Client | `Core.TriggerClientCallback(name, cb, ...)`    | no      | Runs a locally registered **client** callback without a round trip |

The rule underneath it: `TriggerClientCallback` crosses the wire on the server and is local on the
client; `TriggerCallback` crosses the wire on the client and is local on the server. The local
variants are what the net event handlers inside `hexa_core` call to dispatch an incoming request,
and they are perfectly usable from your own code when you want to reuse a handler in-process.

::: tip
The client-side registration function used to be `Core.CreateClientCallback`. It is now
`Core.CreateCallback`, matching the server. The old name still forwards and warns once.
:::

## Server callbacks

The common direction: the client asks, the server answers. Use it for anything the client must not
be trusted to decide - balances, inventory checks, database reads, purchases.

### Register on the server

The handler always receives `source` first and `cb` second. Anything the caller passed follows.

```lua
local Core = exports['hexa_core']:GetCoreObject()
local stock = { { name = 'bread', price = 5 }, { name = 'water', price = 3 } }

Core.CreateCallback('myshop:server:getStock', function(source, cb)
    local Player = Core.GetPlayer(source)
    if not Player then return cb(nil) end
    cb({ money = Player.GetMoney('cash'), items = stock })
end)
```

Call `cb` exactly once, on every path. A handler that returns without calling `cb` leaves the client
waiting forever - see [The registry is keyed by name](#the-registry-is-keyed-by-name-only).

### Trigger from the client

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.TriggerCallback('myshop:server:getStock', function(stock)
    if not stock then return end
    SetNuiFocus(true, true)
    SendNUIMessage({ action = 'open', stock = stock })
end)
```

### Passing arguments

Extra arguments go after the response function on the client, and arrive after `cb` on the server.

```lua
-- client
Core.TriggerCallback('myshop:server:buy', function(ok, reason)
    if not ok then return print(reason) end
    print('bought')
end, 'bread', 2)
```

```lua
-- server
local prices = { bread = 5, water = 3 }

Core.CreateCallback('myshop:server:buy', function(source, cb, item, amount)
    local Player = Core.GetPlayer(source)
    if not Player then return cb(false, 'no player') end

    amount = tonumber(amount) or 0
    if not prices[item] then return cb(false, 'unknown item') end
    if amount < 1 or amount > 10 then return cb(false, 'bad amount') end
    if not Player.CanCarryItem(item, amount) then return cb(false, 'inventory full') end

    local price = prices[item] * amount
    if not Player.RemoveMoney('cash', price, 'shop-purchase') then return cb(false, 'not enough cash') end

    Player.AddItem(item, amount, false, false, 'shop-purchase')
    cb(true)
end)
```

::: danger
Everything after `cb` came from a client and is attacker-controlled. Validate the type and the range
of every one of them before touching money or items. `hexa_core` does not validate them for you -
the built-in `HexaCore:Server:SpawnVehicle` callback does its own type check and cooldown for
exactly this reason.
:::

### Reusing a server callback from server code

`Core.TriggerCallback` on the server runs the registered handler in-process. No event is sent, so
`source` is whatever you pass.

```lua
Core.TriggerCallback('myshop:server:getStock', source, function(stock)
    Core.Log('stock snapshot for id %s: %s items', source, #stock.items)
end)
```

If no handler is registered under that name it returns silently and your `cb` never runs.

## Client callbacks

The other direction: the server asks one player for something only that player's game session knows.

### Register on the client

The client handler receives `cb` first - there is no `source`, the handler is already running on the
player being asked.

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.CreateCallback('myshop:client:getCoords', function(cb)
    cb(Core.GetCoords(PlayerPedId()))
end)
```

### Trigger from the server

`source` is the player server id, and it sits between the name and the response function.

```lua
Core.TriggerClientCallback('myshop:client:getCoords', source, function(coords)
    Core.Log('id %s answered from %s', source, tostring(coords))
end)
```

Extra arguments go after the response function, same as the other direction:

```lua
-- client
Core.CreateCallback('myshop:client:isAlone', function(cb, radius)
    local near = Core.GetLocalPlayersInRadius(GetEntityCoords(PlayerPedId()), radius)
    cb(#near <= 1)
end)
```

```lua
-- server
Core.TriggerClientCallback('myshop:client:isAlone', source, function(alone)
    if alone then return end
    Core.Notify(source, { title = 'Someone is watching', type = 'error', duration = 4000 })
end, 15.0)
```

## What travels on the wire

Four net events carry all of it. You do not need to touch them, but knowing the names makes a
stalled callback readable in a network dump.

| Event | Direction | Meaning |
| ----- | --------- | ------- |
| `HexaCore:Server:TriggerCallback` | client to server | ask a server callback |
| `HexaCore:Client:TriggerCallback` | server to client | the answer to that ask |
| `HexaCore:Client:TriggerClientCallback` | server to client | ask a client callback |
| `HexaCore:Server:TriggerClientCallback` | client to server | the answer to that ask |

The two registries are plain tables on the core object, `Core.ServerCallbacks` and
`Core.ClientCallbacks`. On the server, `ServerCallbacks` holds your registered handlers and
`ClientCallbacks` holds responses still in flight. On the client it is the mirror image.

## The registry is keyed by name only

This is the transport's real limitation and it is easy to hit.

An in-flight request is stored as `registry[name] = cb`. One slot per name, nothing else in the
key - no request id, no player id. When the answer arrives, the core reads that slot, calls it, and
sets it back to `nil`.

Three consequences follow.

### Two overlapping calls of the same name interfere

If a client fires `myshop:server:getStock` twice before the first answer comes back, the second
`cb` overwrites the first in `Core.ServerCallbacks`. The first answer to return runs the **second**
`cb` and clears the slot; the first `cb` never runs at all, and the second answer is dropped
because the slot is already empty.

### On the server it is worse: the slot is shared by every player

`Core.ClientCallbacks` on the server is one table for the whole server, not one per player. Asking
two different players the same client callback name at the same time collides the same way - and
the answer that arrives first is handed to whichever `cb` happens to be sitting in the slot, so you
can hand player A's coordinates to the code that asked about player B.

::: danger
Never loop over players calling `Core.TriggerClientCallback` with the same name without waiting for
each answer. That loop looks correct and returns wrong data under any real player count.
:::

### A name with no handler never answers

`Core.TriggerCallback` on the server begins with `if not Core.ServerCallbacks[name] then return end`,
and the client-side dispatcher does the same. Nothing sends an empty reply back. A typo in a
callback name, or a resource that has not started yet, produces no error and no answer - the caller
just waits, and the stale entry sits in the registry until some later response of that same name
consumes it.

There is no timeout anywhere in this transport. If you need one, build it.

### Patterns that avoid it

**One in-flight request per name, client side.** A boolean guard is enough and covers the common
case of a player spamming a key or an NUI button.

```lua
local Core = exports['hexa_core']:GetCoreObject()
local pending = false

local function openShop()
    if pending then return end
    pending = true

    Core.TriggerCallback('myshop:server:getStock', function(stock)
        pending = false
        if not stock then return end
        SetNuiFocus(true, true)
        SendNUIMessage({ action = 'open', stock = stock })
    end)
end
```

**Serialize server-to-client asks, and give each one a deadline.** Wrap a single ask in a promise so
the loop cannot overlap, and resolve it yourself if the player never answers.

```lua
local Core = exports['hexa_core']:GetCoreObject()

local function askCoords(src, timeout)
    local p = promise.new()
    local answered = false

    Core.TriggerClientCallback('myshop:client:getCoords', src, function(coords)
        if answered then return end
        answered = true
        p:resolve(coords)
    end)

    SetTimeout(timeout or 5000, function()
        if answered then return end
        answered = true
        p:resolve(nil)
    end)

    return Citizen.Await(p)
end

CreateThread(function()
    for _, src in pairs(Core.GetPlayers()) do
        local coords = askCoords(src)
        if coords then Core.Log('id %s is at %s', src, tostring(coords)) end
    end
end)
```

Each iteration finishes before the next one starts, so the shared slot only ever holds one request.

**Or do not ask at all.** A client callback per player is the expensive way to collect something the
server can push. If the data changes rarely, have the client send it once on load and cache it
server side.

::: tip
Ported `rsg-core` scripts that go through `[bridge]/rsg-core` do not hit this: the bridge keeps a real
queue keyed by name **and** player id, so overlapping `RSGCore.Functions.TriggerClientCallback`
calls are safe there. That queue belongs to the bridge, not to `hexa_core` - code written directly
against `Core` gets the single slot described above.
:::

## The built-in callback

`hexa_core` ships exactly one server callback of its own, registered in `server/events.lua`:

```lua
Core.TriggerCallback('HexaCore:Server:SpawnVehicle', function(netId)
    if not netId then return end
    CreateThread(function()
        -- the entity has to stream in before the net id resolves locally
        while not NetworkDoesEntityExistWithNetworkId(netId) do Wait(0) end
        TaskWarpPedIntoVehicle(PlayerPedId(), NetToVeh(netId), -1)
    end)
end, 'buggy01', GetEntityCoords(PlayerPedId()), true)
```

It answers with a network id, or `nil` when it refuses. It refuses in three cases: the caller has no
loaded character, `model` is neither a string nor a number, or the same player asked less than three
seconds ago.

## Usable items are not callbacks

They look similar and use the word "callback" loosely, but they are a separate mechanism with no
response channel.

```lua
Core.CreateUseableItem('bread', function(source, item)
    local Player = Core.GetPlayer(source)
    if not Player then return end
    if Player.RemoveItem('bread', 1, nil, 'eat') then
        TriggerClientEvent('myscript:client:eat', source)
    end
end)
```

`Core.GetUsableItem(item)` returns the registered handler (this was `Core.CanUseItem`), and
`Core.UseItem(source, item)` forwards to `hexa_inventory`, warning and doing nothing if that
resource is not started.

## Renamed in 3.0

Two symbols on this page changed name.

| Old | New | Side |
| --- | --- | ---- |
| `Core.CreateClientCallback(name, cb)` | `Core.CreateCallback(name, cb)` | client |
| `Core.CanUseItem(item)` | `Core.GetUsableItem(item)` | server |

`TriggerCallback`, `TriggerClientCallback`, `CreateUseableItem` and `UseItem` kept their names on
both sides, and `CreateCallback` kept its name on the server. Only the client half of
`CreateCallback` is new, and it is the renamed `CreateClientCallback`. What changed for them is the path: `Core.CreateCallback` rather than
`Core.Functions.CreateCallback`, and `Player.GetMoney` rather than `Player.Functions.GetMoney`
inside your handlers.
