# Client Functions

ฟังก์ชันฝั่ง client อยู่ใต้ `HexaCore.Functions` เช่นเดียวกับฝั่ง server:

```lua
local HexaCore = exports['hexa_core']:GetCoreObject()
```

## ข้อมูลผู้เล่น

### GetPlayerData

```lua
-- แบบรับค่าตรง
local PlayerData = HexaCore.Functions.GetPlayerData()

-- แบบ callback
HexaCore.Functions.GetPlayerData(function(PlayerData)
    print(PlayerData.citizenid)
end)
```

### HasItem

```lua
local has = HexaCore.Functions.HasItem('bread', 1)
local has = HexaCore.Functions.HasItem({ 'bread', 'water' }, 1)
```

## Callbacks

```lua
HexaCore.Functions.CreateClientCallback(name, function(cb, ...) cb(result) end)
HexaCore.Functions.TriggerCallback(name, function(result) ... end, ...)
```

ดูรายละเอียดที่ [Callbacks](/guide/callbacks)

## เอนทิตีรอบตัว

```lua
local players            = HexaCore.Functions.GetPlayers()
local players            = HexaCore.Functions.GetPlayersFromCoords(coords, distance)
local player, dist       = HexaCore.Functions.GetClosestPlayer(coords)
local ped, dist          = HexaCore.Functions.GetClosestPed(coords, ignoreList)
local vehicle, dist      = HexaCore.Functions.GetClosestVehicle(coords)
local object, dist       = HexaCore.Functions.GetClosestObject(coords)
local vehicles           = HexaCore.Functions.GetVehicles()
local objects            = HexaCore.Functions.GetObjects()
local peds               = HexaCore.Functions.GetPeds(ignoreList)
```

## ยานพาหนะ

```lua
HexaCore.Functions.SpawnVehicle(model, function(veh) ... end, coords, isnetworked, teleportInto)
HexaCore.Functions.DeleteVehicle(vehicle)
local plate = HexaCore.Functions.GetPlate(vehicle)
local label = HexaCore.Functions.GetVehicleLabel(vehicle)
local props = HexaCore.Functions.GetVehicleProperties(vehicle)
HexaCore.Functions.SetVehicleProperties(vehicle, props)
```

## แอนิเมชัน / เอฟเฟกต์

### PlayAnim

```lua
HexaCore.Functions.PlayAnim(animDict, animName, upperbodyOnly, duration)
```

### LookAtEntity

```lua
HexaCore.Functions.LookAtEntity(entity, timeout, speed)
```

### Particle Effects

```lua
HexaCore.Functions.StartParticleAtCoord(dict, ptName, looped, coords, rot, scale, alpha, color, duration)
HexaCore.Functions.StartParticleOnEntity(dict, ptName, looped, entity, bone, offset, rot, scale, alpha, color, evolution, duration)
```

### AttachProp

```lua
HexaCore.Functions.AttachProp(ped, model, boneId, x, y, z, xR, yR, zR, vertex)
```

## การแสดงข้อความ

```lua
HexaCore.Functions.DrawText(x, y, width, height, scale, r, g, b, a, text)
HexaCore.Functions.DrawText3D(x, y, z, text)
```

รวมถึง event สำหรับ DrawText UI:

```lua
TriggerEvent('hexa_core:client:DrawText', 'กด [E] เพื่อคุย', 'left')
TriggerEvent('hexa_core:client:ChangeText', 'ข้อความใหม่', 'left')
TriggerEvent('hexa_core:client:HideText')
```

## ตำแหน่ง / โลก

```lua
local street    = HexaCore.Functions.GetStreetNametAtCoords(coords)
local zone      = HexaCore.Functions.GetZoneAtCoords(coords)
local direction = HexaCore.Functions.GetCardinalDirection(entity)
local time      = HexaCore.Functions.GetCurrentTime()
local z         = HexaCore.Functions.GetGroundZCoord(coords)
local hash      = HexaCore.Functions.GetGroundHash(entity)
HexaCore.Functions.SpawnClear(coords, radius)  -- เช็คว่าบริเวณโล่งพอจะ spawn
```

## กระดูก (Bones)

```lua
local bone = HexaCore.Functions.GetClosestBone(entity, list)
local dist = HexaCore.Functions.GetBoneDistance(entity, boneType, boneIndex)
```

## อื่น ๆ

```lua
local wearing = HexaCore.Functions.IsWearingGloves()
local coords  = HexaCore.Functions.GetCoords(entity)
HexaCore.Debug(resourceName, obj, depth) -- print ตารางสวย ๆ ช่วย debug
```
