# Callbacks

callback คือการถามข้ามฝั่งแล้วรอคำตอบ ฝั่งหนึ่งลงทะเบียน handler ไว้ใต้ชื่อหนึ่ง อีกฝั่งเรียกชื่อนั้น
แล้วรับค่าที่ handler ส่งกลับมาทาง `cb`

ตั้งแต่ 3.0 ทุกฟังก์ชันแขวนอยู่บน `Core` ชั้นเดียว ไม่มี `.Functions` คั่นอีกแล้ว

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.CreateCallback('myscript:server:getBalance', function(source, cb)
    local Player = Core.GetPlayer(source)
    if not Player then return cb(0) end
    cb(Player.GetMoney('bank'))
end)
```

`Core.Functions.CreateCallback` ยังเรียกได้อีกหนึ่งรุ่น แต่จะพิมพ์คำเตือนครั้งเดียวพร้อมบอกว่า resource ไหนเป็นคนเรียก

## ทางเข้าทั้งสี่ทาง

สองฝั่งใช้ชื่อฟังก์ชันชุดเดียวกัน แต่ความหมายไม่เหมือนกัน อ่านตารางนี้ก่อนเขียนโค้ด

| ฝั่ง | ฟังก์ชัน | ข้ามเน็ต | ทำอะไร |
| ---- | -------- | -------- | ------ |
| server | `Core.CreateCallback(name, cb)` | ไม่ | ลงทะเบียน **server callback** ลง `Core.ServerCallbacks` |
| server | `Core.TriggerClientCallback(name, source, cb, ...)` | ใช่ | ถาม **client callback** ของผู้เล่นคนนั้น |
| server | `Core.TriggerCallback(name, source, cb, ...)` | ไม่ | เรียก server callback ที่ลงทะเบียนไว้ตรง ๆ ในเครื่องเดียวกัน |
| client | `Core.CreateCallback(name, cb)` | ไม่ | ลงทะเบียน **client callback** ลง `Core.ClientCallbacks` |
| client | `Core.TriggerCallback(name, cb, ...)` | ใช่ | ถาม **server** |
| client | `Core.TriggerClientCallback(name, cb, ...)` | ไม่ | เรียก client callback ของตัวเองตรง ๆ ในเครื่องเดียวกัน |

กฎที่อยู่เบื้องหลังคือ `TriggerClientCallback` ข้ามเน็ตเมื่ออยู่ฝั่ง server และเป็นการเรียกในเครื่องเมื่ออยู่ฝั่ง client
ส่วน `TriggerCallback` กลับกันทุกประการ ตัวที่ไม่ข้ามเน็ตคือตัวที่ event handler ภายใน `hexa_core` ใช้กระจายงาน
เมื่อมีคำขอวิ่งเข้ามา และเราหยิบมาใช้เองได้ถ้าอยากเรียกซ้ำ handler เดิมโดยไม่ต้องวิ่งข้ามเน็ต

::: tip
ฝั่ง client เดิมใช้ชื่อ `Core.CreateClientCallback` ตอนนี้เปลี่ยนเป็น `Core.CreateCallback` ให้ตรงกับฝั่ง server
ชื่อเก่ายังส่งต่อให้ได้อยู่และเตือนหนึ่งครั้ง
:::

## Server callback

ทิศทางที่ใช้บ่อยที่สุด client ถาม server ตอบ เหมาะกับทุกอย่างที่ไว้ใจ client ไม่ได้ ไม่ว่าจะเป็นยอดเงิน
การเช็คของในกระเป๋า การอ่านฐานข้อมูล หรือการซื้อขาย

### ลงทะเบียนฝั่ง server

handler จะได้ `source` เป็นตัวแรกและ `cb` เป็นตัวที่สองเสมอ อาร์กิวเมนต์ที่คนเรียกส่งมาต่อท้ายจากนั้น

```lua
local Core = exports['hexa_core']:GetCoreObject()
local stock = { { name = 'bread', price = 5 }, { name = 'water', price = 3 } }

Core.CreateCallback('myshop:server:getStock', function(source, cb)
    local Player = Core.GetPlayer(source)
    if not Player then return cb(nil) end
    cb({ money = Player.GetMoney('cash'), items = stock })
end)
```

ต้องเรียก `cb` ให้ครบทุกเส้นทางและเรียกครั้งเดียว ถ้า handler จบโดยไม่เรียก `cb` ฝั่งที่ถามจะรอค้างตลอดไป
รายละเอียดอยู่ที่หัวข้อ [รีจิสทรีใช้ชื่อเป็นคีย์อย่างเดียว](#รีจิสทรีใช้ชื่อเป็นคีย์อย่างเดียว)

### เรียกจากฝั่ง client

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.TriggerCallback('myshop:server:getStock', function(stock)
    if not stock then return end
    SetNuiFocus(true, true)
    SendNUIMessage({ action = 'open', stock = stock })
end)
```

### การส่งอาร์กิวเมนต์

ฝั่ง client วางอาร์กิวเมนต์ต่อจากฟังก์ชันรับคำตอบ ฝั่ง server จะได้รับต่อจาก `cb`

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
ทุกอย่างที่อยู่หลัง `cb` มาจาก client ทั้งหมด ถือว่าผู้เล่นกำหนดค่าเองได้ ต้องตรวจชนิดและช่วงของค่าให้ครบ
ก่อนแตะเงินหรือไอเทม `hexa_core` ไม่ตรวจให้ ดูตัวอย่างได้จาก callback `HexaCore:Server:SpawnVehicle`
ที่ตัวมันเองตรวจชนิดอาร์กิวเมนต์และตั้งคูลดาวน์ไว้ด้วยเหตุผลนี้
:::

### เรียก server callback ซ้ำจากโค้ดฝั่ง server

`Core.TriggerCallback` ฝั่ง server เรียก handler ตรง ๆ ไม่ยิง event ออกไปไหน ดังนั้น `source` คือค่าที่เราส่งเข้าไปเอง

```lua
Core.TriggerCallback('myshop:server:getStock', source, function(stock)
    Core.Log('stock snapshot for id %s: %s items', source, #stock.items)
end)
```

ถ้าไม่มี handler ชื่อนั้นลงทะเบียนไว้ ฟังก์ชันจะ return เงียบ ๆ และ `cb` ของเราจะไม่ถูกเรียกเลย

## Client callback

ทิศทางกลับกัน server ถามผู้เล่นคนหนึ่งถึงข้อมูลที่มีอยู่เฉพาะในเกมของคนนั้น

### ลงทะเบียนฝั่ง client

handler ฝั่ง client รับ `cb` เป็นตัวแรก ไม่มี `source` เพราะโค้ดกำลังรันอยู่บนเครื่องของผู้เล่นที่ถูกถามอยู่แล้ว

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.CreateCallback('myshop:client:getCoords', function(cb)
    cb(Core.GetCoords(PlayerPedId()))
end)
```

### เรียกจากฝั่ง server

`source` คือ server id ของผู้เล่น และอยู่ระหว่างชื่อกับฟังก์ชันรับคำตอบ

```lua
Core.TriggerClientCallback('myshop:client:getCoords', source, function(coords)
    Core.Log('id %s answered from %s', source, tostring(coords))
end)
```

อาร์กิวเมนต์เพิ่มเติมวางต่อท้ายฟังก์ชันรับคำตอบ เหมือนอีกทิศทางหนึ่ง

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

## อะไรวิ่งอยู่บนสาย

ทั้งหมดนี้วิ่งด้วย net event สี่ตัว ปกติไม่ต้องแตะเอง แต่รู้ชื่อไว้ช่วยให้ไล่ปัญหา callback ค้างได้เร็วขึ้น

| Event | ทิศทาง | ความหมาย |
| ----- | ------ | -------- |
| `HexaCore:Server:TriggerCallback` | client ไป server | ถาม server callback |
| `HexaCore:Client:TriggerCallback` | server ไป client | คำตอบของคำถามข้างบน |
| `HexaCore:Client:TriggerClientCallback` | server ไป client | ถาม client callback |
| `HexaCore:Server:TriggerClientCallback` | client ไป server | คำตอบของคำถามข้างบน |

รีจิสทรีทั้งสองตัวเป็นตารางธรรมดาบนอ็อบเจกต์หลัก คือ `Core.ServerCallbacks` กับ `Core.ClientCallbacks`
ฝั่ง server `ServerCallbacks` เก็บ handler ที่เราลงทะเบียนไว้ ส่วน `ClientCallbacks` เก็บคำขอที่ยังรอคำตอบอยู่
ฝั่ง client สลับกันพอดี

## รีจิสทรีใช้ชื่อเป็นคีย์อย่างเดียว

นี่คือข้อจำกัดจริงของกลไกนี้ และชนได้ง่ายกว่าที่คิด

คำขอที่ยังรอคำตอบถูกเก็บเป็น `registry[name] = cb` หนึ่งชื่อได้หนึ่งช่อง ไม่มี request id ไม่มี player id
อยู่ในคีย์เลย พอคำตอบวิ่งกลับมา core จะอ่านช่องนั้น เรียกมัน แล้วเซ็ตช่องกลับเป็น `nil`

ผลที่ตามมามีสามข้อ

### ยิงชื่อเดิมซ้อนกันสองครั้ง คำขอแรกหาย

ถ้า client ยิง `myshop:server:getStock` ครั้งที่สองก่อนคำตอบของครั้งแรกจะกลับมา `cb` ตัวที่สองจะทับตัวแรก
ใน `Core.ServerCallbacks` คำตอบที่มาถึงก่อนจะไปเข้า `cb` **ตัวที่สอง** แล้วล้างช่องทิ้ง `cb` ตัวแรกจึงไม่ถูกเรียกเลย
และคำตอบชุดที่สองก็ตกหายเพราะช่องว่างไปแล้ว

### ฝั่ง server หนักกว่านั้น เพราะช่องเดียวใช้ร่วมกันทั้งเซิร์ฟ

`Core.ClientCallbacks` ฝั่ง server เป็นตารางเดียวของทั้งเซิร์ฟเวอร์ ไม่ได้แยกตามผู้เล่น การถาม client callback
ชื่อเดียวกันกับผู้เล่นสองคนพร้อมกันจึงชนกันแบบเดียวกัน และคำตอบที่มาถึงก่อนจะถูกส่งเข้า `cb` ตัวที่ค้างอยู่ในช่อง
ณ ตอนนั้น แปลว่าพิกัดของผู้เล่น A อาจไปโผล่ในโค้ดที่ถามเรื่องผู้เล่น B ได้

::: danger
ห้ามวนลูปผู้เล่นแล้วเรียก `Core.TriggerClientCallback` ชื่อเดิมรวดเดียวโดยไม่รอคำตอบทีละคน
ลูปแบบนั้นดูเหมือนถูกต้อง แต่ได้ข้อมูลผิดทันทีที่มีคนออนไลน์จริง
:::

### ชื่อที่ไม่มี handler จะไม่มีคำตอบกลับมาเลย

`Core.TriggerCallback` ฝั่ง server ขึ้นต้นด้วย `if not Core.ServerCallbacks[name] then return end`
และตัวกระจายงานฝั่ง client ก็ทำแบบเดียวกัน ไม่มีใครยิงคำตอบเปล่ากลับไป พิมพ์ชื่อ callback ผิดหนึ่งตัวอักษร
หรือเรียกตอน resource ปลายทางยังไม่ start จึงไม่มี error และไม่มีคำตอบ คนถามรอค้างไปเรื่อย ๆ
ส่วนช่องที่ค้างอยู่ในรีจิสทรีจะอยู่ตรงนั้นจนกว่าจะมีคำตอบของชื่อเดียวกันวิ่งมากินมันไป

กลไกนี้ไม่มี timeout อยู่ในตัวเลย ถ้าต้องการก็ต้องทำเอง

### รูปแบบที่เลี่ยงปัญหานี้ได้

**ฝั่ง client จำกัดให้มีคำขอค้างได้ชื่อละหนึ่ง** แค่ตัวแปร boolean ตัวเดียวก็พอ และครอบเคสที่เจอบ่อยที่สุด
คือผู้เล่นรัวปุ่มหรือรัวคลิกบน NUI

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

**ฝั่ง server ถามทีละคนและตั้งเส้นตายไว้ด้วย** ห่อการถามหนึ่งครั้งไว้ใน promise ลูปจะได้ซ้อนกันไม่ได้
แล้ว resolve เองเมื่อผู้เล่นไม่ตอบ

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

แต่ละรอบจบก่อนรอบถัดไปจะเริ่ม ช่องที่ใช้ร่วมกันจึงมีคำขออยู่ครั้งละหนึ่งเสมอ

**หรือเลี่ยงการถามไปเลย** ถ้าข้อมูลไม่ได้เปลี่ยนบ่อย ให้ client ส่งขึ้นมาครั้งเดียวตอนโหลดตัวละครแล้ว cache ไว้ฝั่ง server
จะถูกกว่าการยิง client callback ไล่ทีละคน

::: tip
สคริปต์ที่พอร์ตเข้ามาและวิ่งผ่าน bridge ไม่เจอปัญหานี้ เพราะ bridge ทำคิวจริงที่คีย์ด้วยชื่อ
**และ** id ของผู้เล่น การเรียก client callback ซ้อนกันจึงปลอดภัยในฝั่งนั้น
คิวตัวนั้นเป็นของ bridge ไม่ใช่ของ `hexa_core` โค้ดที่เขียนตรงกับ `Core` ยังได้ช่องเดียวตามที่อธิบายข้างบน
:::

## callback ที่มากับ core

`hexa_core` ลงทะเบียน server callback ของตัวเองไว้ตัวเดียว อยู่ใน `server/events.lua`

```lua
Core.TriggerCallback('HexaCore:Server:SpawnVehicle', function(netId)
    if not netId then return end
    CreateThread(function()
        -- ต้องรอให้ entity สตรีมเข้ามาก่อน net id ถึงจะแปลงเป็นรถได้
        while not NetworkDoesEntityExistWithNetworkId(netId) do Wait(0) end
        TaskWarpPedIntoVehicle(PlayerPedId(), NetToVeh(netId), -1)
    end)
end, 'buggy01', GetEntityCoords(PlayerPedId()), true)
```

มันตอบกลับเป็น network id หรือ `nil` เมื่อปฏิเสธ ซึ่งปฏิเสธในสามกรณีคือ คนเรียกยังไม่ได้โหลดตัวละคร
`model` ไม่ใช่ string และไม่ใช่ number หรือคนเดิมเพิ่งขอไปเมื่อไม่ถึงสามวินาทีที่แล้ว

## useable item ไม่ใช่ callback

หน้าตาคล้ายกันและคนมักเรียกรวม ๆ ว่า callback แต่มันเป็นคนละกลไกและไม่มีช่องทางตอบกลับ

```lua
Core.CreateUseableItem('bread', function(source, item)
    local Player = Core.GetPlayer(source)
    if not Player then return end
    if Player.RemoveItem('bread', 1, nil, 'eat') then
        TriggerClientEvent('myscript:client:eat', source)
    end
end)
```

`Core.GetUsableItem(item)` คืน handler ที่ลงทะเบียนไว้ (เดิมชื่อ `Core.CanUseItem`) ส่วน
`Core.UseItem(source, item)` ส่งต่อไปที่ระบบกระเป๋า และจะเตือนแล้วไม่ทำอะไรถ้า resource นั้นยังไม่ start

## ชื่อที่เปลี่ยนใน 3.0

ในหน้านี้มีสัญลักษณ์เปลี่ยนชื่อสองตัว

| ชื่อเดิม | ชื่อใหม่ | ฝั่ง |
| -------- | -------- | ---- |
| `Core.CreateClientCallback(name, cb)` | `Core.CreateCallback(name, cb)` | client |
| `Core.CanUseItem(item)` | `Core.GetUsableItem(item)` | server |

`CreateCallback`, `TriggerCallback`, `TriggerClientCallback`, `CreateUseableItem` และ `UseItem`
ใช้ชื่อเดิมทั้งหมด สิ่งที่เปลี่ยนคือเส้นทางที่ไปถึงมัน เขียน `Core.CreateCallback` แทน
`Core.Functions.CreateCallback` และเขียน `Player.GetMoney` แทน `Player.Functions.GetMoney`
ภายใน handler ของเรา
