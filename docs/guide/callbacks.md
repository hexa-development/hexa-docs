# Callbacks

Callback คือการ "ถาม-ตอบ" ข้ามฝั่งระหว่าง client กับ server — ฝั่งหนึ่งสร้าง callback ไว้ อีกฝั่ง trigger แล้วรอรับค่าที่ตอบกลับ

## Server Callback (client ถาม → server ตอบ)

ใช้บ่อยที่สุด เช่น client อยากรู้ข้อมูลจากฐานข้อมูล

**ฝั่ง server — สร้าง callback:**

```lua
local HexaCore = exports['hexa_core']:GetCoreObject()

HexaCore.Functions.CreateCallback('myscript:server:getBalance', function(source, cb)
    local Player = HexaCore.Functions.GetPlayer(source)
    if not Player then return cb(0) end
    cb(Player.Functions.GetMoney('bank'))
end)
```

**ฝั่ง client — เรียกใช้:**

```lua
local HexaCore = exports['hexa_core']:GetCoreObject()

HexaCore.Functions.TriggerCallback('myscript:server:getBalance', function(balance)
    print(('ยอดเงินในธนาคาร: %s'):format(balance))
end)
```

ส่งพารามิเตอร์เพิ่มได้ต่อท้าย:

```lua
-- client
HexaCore.Functions.TriggerCallback('myscript:server:hasItem', function(result)
    print(result)
end, 'bread', 2)

-- server
HexaCore.Functions.CreateCallback('myscript:server:hasItem', function(source, cb, item, amount)
    local Player = HexaCore.Functions.GetPlayer(source)
    cb(Player and Player.Functions.HasItem(item, amount) or false)
end)
```

## Client Callback (server ถาม → client ตอบ)

ใช้เมื่อ server ต้องการข้อมูลที่มีแต่ฝั่ง client เช่น ตำแหน่ง/สภาพแวดล้อมในเกม

**ฝั่ง client — สร้าง callback:**

```lua
HexaCore.Functions.CreateClientCallback('myscript:client:getCoords', function(cb)
    cb(GetEntityCoords(PlayerPedId()))
end)
```

**ฝั่ง server — เรียกใช้:**

```lua
HexaCore.Functions.TriggerClientCallback('myscript:client:getCoords', source, function(coords)
    print(coords)
end)
```

## Useable Items

ผูกไอเทมเข้ากับฟังก์ชัน — เมื่อผู้เล่นกดใช้ไอเทม ฟังก์ชันจะถูกเรียกฝั่ง server:

```lua
HexaCore.Functions.CreateUseableItem('bread', function(source, item)
    local Player = HexaCore.Functions.GetPlayer(source)
    if not Player then return end
    if Player.Functions.RemoveItem('bread', 1) then
        TriggerClientEvent('myscript:client:eat', source)
    end
end)
```

ตรวจสอบ/สั่งใช้ไอเทมจากโค้ด:

```lua
local usable = HexaCore.Functions.CanUseItem('bread')  -- คืน data ของ useable item
HexaCore.Functions.UseItem(source, item)               -- บังคับใช้ไอเทม
```
