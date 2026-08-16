# Server Functions

ฟังก์ชันทั้งหมดอยู่ใต้ `HexaCore.Functions` (ฝั่ง server) — ดึง core object ก่อนใช้งาน:

```lua
local HexaCore = exports['hexa_core']:GetCoreObject()
```

## ผู้เล่น

### GetPlayer

```lua
local Player = HexaCore.Functions.GetPlayer(source)
```

คืน [Player object](/guide/player-object) จาก server id — คืน `nil` ถ้ายังไม่โหลดตัวละคร

### GetPlayerByCitizenId / GetOfflinePlayerByCitizenId

```lua
local Player = HexaCore.Functions.GetPlayerByCitizenId('RB1234')
local Player = HexaCore.Functions.GetOfflinePlayerByCitizenId('RB1234')
```

### GetPlayerByLicense

```lua
local Player = HexaCore.Functions.GetPlayerByLicense(license)
```

### GetPlayerByAccount / GetPlayerByCharInfo

```lua
local Player = HexaCore.Functions.GetPlayerByAccount(accountNumber)
local Player = HexaCore.Functions.GetPlayerByCharInfo('firstname', 'John')
```

### GetPlayers / GetHexaPlayers

```lua
local sources = HexaCore.Functions.GetPlayers()     -- รายชื่อ server id ทั้งหมด
local players = HexaCore.Functions.GetHexaPlayers() -- ตาราง Player object ทั้งหมด
```

### GetPlayersOnDuty / GetDutyCount

```lua
local players, count = HexaCore.Functions.GetPlayersOnDuty('police')
local count = HexaCore.Functions.GetDutyCount('police')
```

### GetIdentifier / GetSource

```lua
local identifier = HexaCore.Functions.GetIdentifier(source)
local src = HexaCore.Functions.GetSource(identifier)
```

## เงิน / ไอเทม

### HasItem

```lua
-- เช็คไอเทมเดียวหรือหลายชิ้นพร้อมกัน
local has = HexaCore.Functions.HasItem(source, 'bread', 2)
local has = HexaCore.Functions.HasItem(source, { 'bread', 'water' }, 1)
```

### CreateUseableItem / CanUseItem / UseItem

```lua
HexaCore.Functions.CreateUseableItem('bread', function(source, item) ... end)
local data = HexaCore.Functions.CanUseItem('bread')
HexaCore.Functions.UseItem(source, item)
```

### ChangeWeight / ChangeSlots

```lua
HexaCore.Functions.ChangeWeight(source, 50000)
HexaCore.Functions.ChangeSlots(source, 40)
```

## Callbacks

### CreateCallback / TriggerClientCallback

```lua
HexaCore.Functions.CreateCallback(name, function(source, cb, ...) cb(result) end)
HexaCore.Functions.TriggerClientCallback(name, source, function(result) ... end, ...)
```

ดูรายละเอียดที่ [Callbacks](/guide/callbacks)

## ยานพาหนะ / เอนทิตี

### SpawnVehicle / CreateVehicle

```lua
local netId = HexaCore.Functions.SpawnVehicle(source, model, coords, warp)
local veh   = HexaCore.Functions.CreateVehicle(source, model, vehtype, coords, warp)
```

### GetClosest*

```lua
local player, dist  = HexaCore.Functions.GetClosestPlayer(source, coords)
local object, dist  = HexaCore.Functions.GetClosestObject(source, coords)
local vehicle, dist = HexaCore.Functions.GetClosestVehicle(source, coords)
local ped, dist     = HexaCore.Functions.GetClosestPed(source, coords)
```

### GetCoords

```lua
local coords = HexaCore.Functions.GetCoords(entity) -- คืน vector4 (รวม heading)
```

## Routing Buckets

```lua
HexaCore.Functions.SetPlayerBucket(source, bucket)
HexaCore.Functions.SetEntityBucket(entity, bucket)
local players  = HexaCore.Functions.GetPlayersInBucket(bucket)
local entities = HexaCore.Functions.GetEntitiesInBucket(bucket)
local buckets  = HexaCore.Functions.GetBucketObjects()
```

## Permissions

```lua
HexaCore.Functions.AddPermission(source, 'admin')
HexaCore.Functions.RemovePermission(source, 'admin')
local has  = HexaCore.Functions.HasPermission(source, 'admin')
local perm = HexaCore.Functions.GetPermission(source)
```

## อื่น ๆ

### Notify

```lua
HexaCore.Functions.Notify(source, { text = 'สวัสดี', type = 'success' })
```

### Kick

```lua
HexaCore.Functions.Kick(source, 'เหตุผล', setKickReason, deferrals)
```

### PrepForSQL

```lua
local ok = HexaCore.Functions.PrepForSQL(source, data, pattern)
```

ตรวจข้อมูลจาก client ก่อนใช้กับ SQL — ถ้าพบความพยายาม inject จะ log เหตุการณ์ anticheat ให้อัตโนมัติ

### AddPlayerMethod / AddPlayerField

```lua
HexaCore.Functions.AddPlayerMethod(-1, 'MethodName', handler) -- -1 = ผู้เล่นทุกคน
HexaCore.Functions.AddPlayerField(-1, 'fieldName', data)
```
