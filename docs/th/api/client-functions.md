# ฟังก์ชันฝั่ง client

ทุกอย่างที่ `hexa_core` ฝั่ง client เปิดให้ใช้ แขวนอยู่บน core object ชั้นเดียว ไม่มี `.Functions`
คั่นกลางอีกแล้ว

```lua
local Core = exports['hexa_core']:GetCoreObject()

local players = Core.GetLocalPlayers()
```

`HexaCore` คือตารางเดียวกันแค่คนละชื่อ ไฟล์เก่าที่เขียน `HexaCore.GetCoords(ped)` จึงยังทำงานได้
โดยไม่ต้องแก้อะไร และ `Core.Functions.GetCoords(ped)` ก็ยังเรียกได้อีกหนึ่งรุ่น

::: warning
ทั้ง client และ server ต่างก็มีตารางชื่อ `Core` และมีหลายชื่อที่อยู่ทั้งสองฝั่งแต่
**รับพารามิเตอร์คนละชุดและคืนค่าคนละอย่าง** เช่น `Core.HasItem`, `Core.SpawnVehicle`,
`Core.TriggerCallback`, `Core.GetClosestPed` ก่อนจะก๊อปโค้ดจากไฟล์ฝั่ง server มาวางในไฟล์ฝั่ง client
ให้อ่านหัวข้อ "ชื่อที่ความหมายไม่ตรงกันสองฝั่ง" ข้างล่างก่อน
:::

## core object ฝั่ง client

`client/main.lua` เป็นคนสร้างอ็อบเจกต์และใส่ฟิลด์เหล่านี้ให้

| ฟิลด์ | เก็บอะไร |
| ----- | -------- |
| `Core.PlayerData` | ข้อมูลตัวละครของผู้เล่นเครื่องนี้ server ส่งมาทาง `HexaCore:Player:SetPlayerData` ก่อนตัวละครโหลดเสร็จจะเป็นตารางว่าง |
| `Core.Config` | ตาราง `Config` จาก `config.lua` |
| `Core.Shared` | แคตตาล็อกร่วม เช่น `Items`, `Jobs`, `Weapons` จะถูกแทนที่ทั้งก้อนเมื่อ server ส่ง `HexaCore:Client:SharedUpdate` |
| `Core.ClientCallbacks` | handler ที่ลงทะเบียนไว้ด้วย `Core.CreateCallback` ฝั่งนี้ |
| `Core.ServerCallbacks` | คำตอบที่ยังรอ server ตอบกลับ เก็บตามชื่อ callback |
| `Core.Functions` | ชั้นรองรับชื่อเก่า ฟังก์ชันทุกตัวที่แขวนบน `Core` จะถูกมิเรอร์ลงมาที่นี่อัตโนมัติ |

`Core.Functions` เป็นตารางจริงที่มีสมาชิกอยู่จริง ไม่ใช่ proxy เพราะ bridge ยกฟังก์ชันออกไป
ด้วย `pairs()` และการเรียกผ่านชั้นนี้จะเงียบ ไม่มีคำเตือนเหมือนกรณีชื่อที่ถูกเปลี่ยน

::: tip
`Core.Shared` ถูกสลับเป็นตารางใหม่ตอนแคตตาล็อกส่งมาถึง ถ้า resource ของคุณ cache `Core.Shared.Items`
ไว้ในตัวแปร local ต้องฟัง `HexaCore:Client:UpdateObject` แล้วอ่านใหม่ ไม่อย่างนั้นจะถือแคตตาล็อกว่าง
ค้างไปทั้ง session
:::

## ชื่อที่ความหมายไม่ตรงกันสองฝั่ง

ชื่อเหล่านี้มีอยู่ทั้งสองฝั่ง แต่ใช้แทนกันไม่ได้

| ชื่อ | ฝั่ง client | ฝั่ง server |
| ---- | ----------- | ----------- |
| `HasItem` | `(items, amount)` ถามถึงผู้เล่นเครื่องนี้ | `(source, items, amount)` |
| `CreateCallback` | ลงทะเบียนลง `ClientCallbacks` | ลงทะเบียนลง `ServerCallbacks` |
| `TriggerCallback` | `(name, cb, ...)` ยิงข้ามไปถาม server | `(name, source, cb, ...)` เรียก server callback ในเครื่อง |
| `TriggerClientCallback` | `(name, cb, ...)` เรียก client callback ในเครื่อง | `(name, source, cb, ...)` ยิงข้ามไปถาม client รายนั้น |
| `SpawnVehicle` | `(model, cb, coords, isnetworked, teleportInto)` ไม่คืนค่า ส่ง entity เข้า `cb` | `(source, model, coords, warp)` คืน entity |
| `GetClosestPed` | `(coords, ignoreList)` | `(source, coords)` |
| `GetClosestVehicle` | `(coords)` | `(source, coords)` |
| `GetClosestObject` | `(coords)` | `(source, coords)` |
| `GetCoords` | `(entity)` รูปแบบเดียวกันทั้งสองฝั่ง คืน `vector4` | `(entity)` |
| `GetPlayerData` | `(cb?)` เฉพาะผู้เล่นเครื่องนี้ | ไม่มี ใช้ `Player.PlayerData` แทน |

และมีอีกกลุ่มที่มีอยู่ฝั่งเดียว `Core.GetPlayer`, `Core.Notify`, `Core.HasPermission`, `Core.Kick`,
`Core.CreateVehicle` รวมถึงฟังก์ชันวงจรชีวิตตัวละครทั้งชุด เป็นของฝั่ง **server เท่านั้น**
ฝั่ง client ไม่มี `Core.Notify` แต่รับ net event ชื่อ `HexaCore:Notify` ซึ่ง `hexa_core`
ลงทะเบียน handler ไว้ให้แล้ว

## ตระกูล Local

สามฟังก์ชันนี้ถูกเปลี่ยนชื่อใน 3.0 ด้วยเหตุผลเดียว คือมันคืน **client player index** ซึ่งเป็นเลขที่
ตัวเกมใช้ในเครื่องตัวเอง ไม่ใช่ server id การเผลอส่งเลขพวกนี้ไปให้ server คือบั๊กที่เจอบ่อยที่สุด
และเป็นเหตุผลทั้งหมดของการเปลี่ยนชื่อรอบนี้

```lua
-- เลข index ในเครื่อง ใช้ได้เฉพาะใน session นี้
local locals = Core.GetLocalPlayers()

-- แปลงเป็นเลขที่ server เข้าใจก่อนส่งข้าม
local serverId = GetPlayerServerId(locals[1])
```

### Core.GetLocalPlayers()

คืน player index ของผู้เล่นที่ active อยู่รอบตัว มาจาก `GetActivePlayers()` ตรง ๆ จะเห็นเฉพาะคนที่
เกมสตรีมเข้ามาแล้วเท่านั้น จึงเป็นคำตอบของคำถาม "ตอนนี้ใครอยู่ใกล้ฉันบ้าง" ไม่ใช่จำนวนคนในเซิร์ฟเวอร์
ตัวที่คืน server id คือ `Core.GetPlayers()` ของฝั่ง server

### Core.GetLocalPlayersInRadius(coords, distance)

คืน player index ที่อยู่ในระยะ `distance` จาก `coords` โดย `coords` รับได้ทั้ง vector3 และตารางที่มี
`x`, `y`, `z` ถ้าไม่ส่งจะวัดจากตำแหน่ง ped ของตัวเอง ส่วน `distance` ถ้าไม่ส่งจะเป็น `5`

```lua
local nearby = Core.GetLocalPlayersInRadius(nil, 20.0)
```

### Core.GetClosestLocalPlayer(coords)

คืน `closestPlayer, closestDistance` ถ้าไม่เจอใครจะได้ `-1` ทั้งคู่ และจะไม่นับตัวเราเองเข้าไปด้วย

::: warning
ตัวนี้ค้นเฉพาะระยะเริ่มต้นเท่านั้น เพราะข้างในเรียก `Core.GetLocalPlayersInRadius(coords)` โดยไม่ส่ง
`distance` ชุดผู้เล่นที่ถูกนำมาเทียบจึงถูกจำกัดไว้ที่ 5 หน่วย ใครอยู่ไกลกว่านั้นจะได้ `-1` เสมอ
ถ้าต้องการค้นระยะกว้างกว่านี้ ให้เรียก `Core.GetLocalPlayersInRadius` เองพร้อมระบุระยะ
แล้วเลือกคนที่ใกล้ที่สุดเอง
:::

## ข้อมูลผู้เล่นและ ped ในเครื่อง

### Core.GetPlayerData(cb)

ถ้าไม่ส่งอะไรจะคืน `Core.PlayerData` กลับมาตรง ๆ ถ้าส่งฟังก์ชันเข้าไปจะเรียกฟังก์ชันนั้นพร้อมตาราง
เดียวกัน ทั้งสองแบบอ่านสำเนาในเครื่อง ไม่ได้ยิงไปถาม server

```lua
local PlayerData = Core.GetPlayerData()

Core.GetPlayerData(function(data)
    print(data.citizenid)
end)
```

### Core.GetCoords(entity)

คืน `vector4(x, y, z, heading)` ของ entity ที่ส่งเข้าไป

### Core.HasItem(items, amount)

ถามระบบกระเป๋าว่าผู้เล่นเครื่องนี้มี `items` ซึ่งจะเป็นชื่อไอเทมเดี่ยวหรือตารางของชื่อก็ได้
อย่างน้อย `amount` ชิ้นหรือไม่ ถ้าระบบกระเป๋ายังไม่ started จะคืน `false` ทันที
resource ที่ถามเร็วเกินไปจึงได้ `false` ธรรมดา ไม่ใช่ error

```lua
if Core.HasItem('bread', 1) then
    print('has bread')
end
```

### Core.IsWearingGloves()

อ่าน drawable ของแขนแล้วเทียบกับ `Core.Shared.MaleNoGloves` หรือ `Core.Shared.FemaleNoGloves`
ตาม hash ของโมเดล คืน `true` เมื่อแขนชุดปัจจุบันไม่ใช่แบบมือเปล่า

### Core.PlayAnim(animDict, animName, upperbodyOnly, duration)

โหลด dict สั่งท่าทางให้ ped ในเครื่อง แล้วคืน dict ให้เกมทันที `upperbodyOnly` แปลงเป็น flag `16`
ส่วน `duration` ถ้าไม่ส่งจะเป็น `-1` คือเล่นวนไปเรื่อย ๆ

```lua
-- ส่ง true ที่พารามิเตอร์ที่สาม เท่ากับเล่นเฉพาะท่อนบน
Core.PlayAnim(animDict, animName, true, 4000)
```

ฟังก์ชันนี้คืนค่าทันที ไม่ได้รอให้ท่าทางเล่นจบ และปลด dict ทิ้งหลังสั่งเสร็จเลย ถ้าต้องรอให้จบก่อน
ค่อยทำขั้นถัดไป ต้อง `Wait` เอง

### Core.TurnPedToFaceEntity(entity, timeout, speed)

หมุน ped ในเครื่องให้หันไปทาง `entity` โดย `entity` ต้องเป็นตัวเลขที่มีอยู่จริง ไม่อย่างนั้นฟังก์ชัน
จะคืนออกไปเฉย ๆ `speed` ถูกตัดไม่ให้เกิน `5.0` และ `timeout` ถูกตัดไม่ให้เกิน `5000` ms
ถ้าไม่ส่งมาก็ใช้ `5000`

```lua
Core.TurnPedToFaceEntity(GetPlayerPed(closestPlayer), 2000, 2.0)
```

## เอนทิตีรอบตัว

### Core.GetVehicles()

พาหนะทุกคันใน pool ของเครื่องนี้

### Core.GetObjects()

อ็อบเจกต์ทุกชิ้นใน pool ของเครื่องนี้

### Core.GetPeds(ignoreList)

ped ทุกตัวใน pool ยกเว้น handle ที่อยู่ใน `ignoreList`

### Core.GetClosestPed(coords, ignoreList)

คืน `closestPed, closestDistance` ถ้าไม่มีอะไรใน pool จะได้ `-1, -1` ถ้าไม่ส่ง `coords` จะวัดจาก
ตำแหน่งตัวเอง ตัวนี้ไม่มีการจำกัดรัศมี มันไล่ทั้ง pool

### Core.GetClosestVehicle(coords)

คืน `closestVehicle, closestDistance`

### Core.GetClosestObject(coords)

คืน `closestObject, closestDistance`

```lua
local vehicle, distance = Core.GetClosestVehicle()
if vehicle ~= -1 and distance < 3.0 then
    print(Core.GetPlate(vehicle))
end
```

## พาหนะ

### Core.SpawnVehicle(model, cb, coords, isnetworked, teleportInto)

สร้างพาหนะจากฝั่ง client `model` เป็น string หรือ hash ก็ได้ และจะถูกเช็คด้วย `IsModelInCdimage`
ก่อน ถ้าโมเดลไม่มีอยู่จริงฟังก์ชันจะเงียบและคืนออกไป `coords` รับ vector4 หรือตาราง ถ้าไม่ส่งจะใช้
ตำแหน่งและ heading ของตัวเอง `isnetworked` ค่าเริ่มต้นเป็น `true` ตัว handle จะถูกส่งเข้า `cb`
ส่วนตัวฟังก์ชันเองไม่คืนค่า

```lua
Core.SpawnVehicle(model, function(veh)
    SetVehicleDirtLevel(veh, 0.0)
end, nil, true, true)
```

### Core.DeleteVehicle(vehicle)

ตั้งเป็น mission entity แล้วลบทิ้ง

### Core.GetPlate(vehicle)

ข้อความบนป้ายทะเบียนที่ตัดช่องว่างหัวท้ายแล้ว ถ้า handle เป็น `0` จะคืน `nil`

### Core.GetVehicleLabel(vehicle)

ชื่อที่แสดงผลของโมเดลคันนั้น ถ้าส่ง `nil` หรือ `0` จะคืน `nil`

### Core.GetVehicleProperties(vehicle)

คืนตารางสภาพรถทั้งคัน ประกอบด้วย `model`, `plate`, `plateIndex`, `bodyHealth`, `engineHealth`,
`tankHealth`, `fuelLevel`, `dirtLevel`, `oilLevel`, `color1`, `color2`, `pearlescentColor`,
`dashboardColor`, `wheelColor`, `wheels`, `wheelSize`, `wheelWidth`, `tireHealth`, `tireBurstState`,
`tireBurstCompletely`, `windowTint`, `windowStatus`, `doorStatus` และ `extras`
ถ้า entity ไม่มีอยู่จริงจะคืน `nil`

`color1` กับ `color2` จะเป็นตัวเลขเมื่อเป็นสีมาตรฐาน และเป็นตาราง `{r, g, b}` เมื่อรถใช้สีกำหนดเอง

### Core.SetVehicleProperties(vehicle, props)

ใส่ค่าจากตารางรูปแบบเดียวกับที่ `Core.GetVehicleProperties` คืนมา ทุกคีย์เป็น optional
มีคีย์ไหนก็เขียนเฉพาะคีย์นั้น จึงส่งตารางบางส่วนเข้าไปแก้เฉพาะจุดได้

```lua
local props = Core.GetVehicleProperties(veh)
Core.SetVehicleProperties(otherVeh, props)
```

## การโหลด asset

ทั้งสี่ตัวรอ asset โหลดโดยมีเส้นตายกำกับ สำเร็จจะคืนตัว asset กลับมา ถ้าหมดเวลาจะคืน `nil`
ค่า timeout เริ่มต้นคือ 10000 ms

### Core.LoadModel(model, timeout)

รับ string หรือ hash ถ้าโมเดลไม่มีในไฟล์เกมจะคืน `nil` โดยไม่ request อะไรเลย

### Core.LoadAnimDict(animDict, timeout)

ถ้า `DoesAnimDictExist` บอกว่าไม่มี dict นี้จะคืน `nil` ทันที

### Core.LoadAnimSet(animSet, timeout)

รอจนกว่า `HasAnimSetLoaded` จะเป็นจริง หรือหมดเวลา

### Core.LoadPtfxAsset(ptFxName, timeout)

รอจนกว่า `HasNamedPtfxAssetLoaded` จะเป็นจริง หรือหมดเวลา

```lua
local hash = Core.LoadModel(model)
if hash then
    -- สร้างของได้ก็ต่อเมื่อโมเดลเข้าหน่วยความจำจริงแล้ว
    local obj = CreateObject(hash, coords.x, coords.y, coords.z, true, false, false)
end
```

## พร็อพและกระดูก

### Core.CreateAttachedProp(ped, model, boneId, x, y, z, xR, yR, zR, vertex)

โหลดโมเดล สร้างอ็อบเจกต์ แปะเข้ากับ `boneId` ของ `ped` แล้วคืน handle ของพร็อพกลับมา
`vertex` เป็นตัวเลือกโหมดการแปะ ถ้าเป็นเท็จจะใช้โหมด `2` ถ้าเป็นจริงจะใช้โหมด `0`

```lua
-- boneId คือเลขกระดูกดิบ ข้างในจะแปลงด้วย GetPedBoneIndex ให้เอง
local prop = Core.CreateAttachedProp(PlayerPedId(), model, boneId, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, false)
```

### Core.GetClosestBone(entity, list)

รับรายการเลขกระดูก หรือรายการตารางที่มีฟิลด์ `id` แล้วคืน `bone, coords, distance` ของกระดูกที่ใกล้
ped ของเราที่สุด ถ้าไม่เข้าเงื่อนไขเลยจะถอยไปใช้กระดูก `bodyshell` และคืนออกมาในรูป
`{ id = ..., type = 'remains', name = 'bodyshell' }`

### Core.GetBoneDistance(entity, boneType, boneIndex)

ระยะจาก ped ของเราถึงกระดูกที่ระบุ ถ้า `boneType == 1` จะแปลง `boneIndex` ด้วย `GetPedBoneIndex`
กรณีอื่นจะแปลงจากชื่อด้วย `GetEntityBoneIndexByName`

## ข้อมูลจากโลกในเกม

### Core.IsAreaClearOfVehicles(coords, radius)

คืน `true` เมื่อไม่มีพาหนะคันไหนอยู่ในระยะ `radius` จาก `coords` ถ้าไม่ส่ง `coords` จะวัดจาก
ตำแหน่งตัวเอง

### Core.GetStreetNamesAtCoords(coords)

คืน `{ main = ..., cross = ... }` โดยแปลงเป็นชื่อที่อ่านออกให้แล้ว

```lua
local streets = Core.GetStreetNamesAtCoords(GetEntityCoords(PlayerPedId()))
print(streets.main, streets.cross)
```

### Core.GetZoneAtCoords(coords)

ชื่อโซนที่พิกัดนั้น

### Core.GetCardinalDirection(entity)

คืน `'North'`, `'East'`, `'South'` หรือ `'West'` จาก heading ของ entity ถ้า entity ไม่มีอยู่จริง
จะถอยไปใช้ ped ของเราแทน

### Core.GetInGameTime()

คืนตารางที่สร้างจากนาฬิกาในเกม

| คีย์ | มีเสมอหรือไม่ | ความหมาย |
| ---- | ------------- | -------- |
| `min` | มีเสมอ | นาที `0`-`59` |
| `hour` | มีเสมอ | ชั่วโมง `0`-`23` |
| `ampm` | มีเสมอ | `'AM'` เมื่อชั่วโมงไม่เกิน 12 และ `'PM'` ตั้งแต่ 13 ขึ้นไป |
| `formattedHour` | ไม่แน่ | มีเฉพาะกรณี PM เท่านั้น ค่าคือ `hour - 12` |
| `formattedMin` | ไม่แน่ | มีเฉพาะตอน `min <= 9` เป็นสตริงที่เติมศูนย์นำหน้า |

::: warning
`formattedHour` กับ `formattedMin` ส่วนใหญ่ไม่มีค่า ให้ถอยไปใช้ `hour` และ `min` เองแทน
อย่านำไปต่อสตริงตรง ๆ เพราะจะเจอ `nil`
:::

### Core.GetGroundCoords(coords)

คืน vector3 ที่ `z` ถูกดึงลงมาติดพื้น ถ้าไม่ส่งอะไรเข้าไปจะคืน `nil` และถ้าตรวจพื้นไม่สำเร็จจะคืน
`coords` เดิมกลับมาตามที่ส่งไป

### Core.GetGroundMaterial(entity)

ยิง shape test capsule ลงพื้นจากตำแหน่ง entity แล้วคืนค่าตามลำดับนี้
`materialHash, entityHit, surfaceNormal, endCoords, success, retval`

::: tip
บิลด์ RedM แต่ละตัวผูกชื่อ native สำหรับอ่านผล shape test ไม่เหมือนกัน `hexa_core` จึงเลือกตัวที่มี
อยู่จริงให้ครั้งเดียวตอนโหลด บนบิลด์ที่มีแต่ตัวธรรมดาจะไม่มีข้อมูล material เลย และ `materialHash`
จะออกมาเป็น `0` ให้เช็คกรณีนี้ไว้ด้วย อย่าเชื่อว่าจะได้ hash เสมอ
:::

## การวาดข้อความ

### Core.DrawText(x, y, width, height, scale, r, g, b, a, text)

### Core.DrawText3D(x, y, z, text)

ทั้งสองตัวเป็นตัวช่วยแบบพื้นฐานที่ต้องเรียกทุกเฟรมจากลูปของคุณเอง ถ้าเป็นข้อความที่ผู้เล่นต้องอ่าน
นานกว่าแวบเดียว ให้ใช้ตัววาดที่ `client/drawtext.lua` เตรียมไว้แทน เพราะตัวนั้นมีลูปวาดของตัวเอง
และรับตำแหน่งเป็น `'left'`, `'right'` หรือ `'top'`

```lua
exports['hexa_core']:DrawText('กด [E] เพื่อคุย', 'left')
exports['hexa_core']:ChangeText('ข้อความใหม่', 'left')
exports['hexa_core']:HideText()
```

เรียกผ่าน event ก็ได้เหมือนกัน `hexa_core:client:DrawText`, `hexa_core:client:ChangeText`,
`hexa_core:client:HideText` และ `hexa_core:client:KeyPressed`

## Callbacks

### Core.CreateCallback(name, cb)

ลงทะเบียน client callback ฝั่ง server จะเรียกถึงด้วย `Core.TriggerClientCallback(name, source, cb, ...)`

```lua
Core.CreateCallback('myscript:client:getHeading', function(cb)
    cb(GetEntityHeading(PlayerPedId()))
end)
```

### Core.TriggerCallback(name, cb, ...)

ยิงไปถาม server เก็บ `cb` ไว้ใน `Core.ServerCallbacks` แล้วส่ง `HexaCore:Server:TriggerCallback`
คำตอบจะกลับมาที่ `HexaCore:Client:TriggerCallback` และรายการนั้นจะถูกล้างทิ้งหลังใช้ครั้งเดียว

```lua
Core.TriggerCallback('myscript:server:getBalance', function(balance)
    print(balance)
end)
```

### Core.TriggerClientCallback(name, cb, ...)

เรียก client callback ที่ลงทะเบียนไว้ในเครื่องโดยไม่ยุ่งกับเน็ตเวิร์ก ถ้าไม่เคยลงทะเบียน `name` นั้น
ไว้จะคืนออกไปเฉย ๆ ตัวนี้คือสิ่งที่ handler ของ net event ขาเข้าเรียกใช้ และเรียกเองได้เลยเมื่ออยาก
ใช้ handler เดิมซ้ำในเครื่อง

รายละเอียดเต็มอยู่ที่หน้า [Callbacks](/th/guide/callbacks)

::: tip
ชื่อเดิมของฟังก์ชันลงทะเบียนคือ `Core.CreateClientCallback` ตอนนี้เปลี่ยนเป็น `Core.CreateCallback`
ให้ตรงกับฝั่ง server ชื่อเก่ายังส่งต่อให้และเตือนหนึ่งครั้ง
:::

## ระบบ log

ตัวพิมพ์ทั้งห้าตัวมีอยู่ทั้งสองฝั่งด้วย signature เดียวกันเป๊ะ นิยามไว้ที่ `shared/log.lua`
ที่เดียว รูปแบบเป็น printf

```lua
Core.Log('spawned %d wagons', count)
Core.Warn('%s has no job data', citizenid)
Core.Error('failed to load %s', model)
Core.PrintDebug('ground material %s', materialHash)
Core.DumpTable(Core.PlayerData)
```

`Core.PrintDebug` ผูกกับ `Config.Debug` และเช็คสวิตช์ **ก่อน** ฟอร์แมตสตริง การทิ้งบรรทัด debug ไว้ใน
ลูปที่วิ่งทุกเฟรมจึงแทบไม่มีต้นทุนตอนปิด debug อยู่

`Core.ShowError(resource, msg)` และ `Core.ShowSuccess(resource, msg)` พิมพ์บรรทัดเดียวในรูปแบบเดิม
`[resource:ERROR]` และใช้ได้จากฝั่งนี้เช่นกัน

ข้อความ log เป็นภาษาอังกฤษโดยตั้งใจ เพราะคอนโซลเซิร์ฟเวอร์บางตัวแสดงตัวไทยเพี้ยน และคนดูแลเซิร์ฟ
ต้องกวาดตาอ่านเร็ว ดูเพิ่มที่ [ระบบ log](/th/guide/logging)

## ชื่อเก่าที่เลิกใช้แล้ว

ชื่อเก่าฝั่ง client ทุกตัวข้างล่างนี้ยังเรียกได้ผ่าน `client/compat.lua` มันจะส่งต่อไปยังฟังก์ชันจริง
และพิมพ์คำเตือนหนึ่งครั้งพร้อมบอกว่า resource ไหนเป็นคนเรียก ทั้งหมดจะถูกถอดออกในรุ่นถัดไป

| ชื่อเก่า | ใช้ตัวนี้แทน |
| -------- | ------------ |
| `Core.CreateClientCallback` | `Core.CreateCallback` |
| `Core.GetPlayers` | `Core.GetLocalPlayers` |
| `Core.GetPlayersFromCoords` | `Core.GetLocalPlayersInRadius` |
| `Core.GetClosestPlayer` | `Core.GetClosestLocalPlayer` |
| `Core.LookAtEntity` | `Core.TurnPedToFaceEntity` |
| `Core.RequestAnimDict` | `Core.LoadAnimDict` |
| `Core.LoadParticleDictionary` | `Core.LoadPtfxAsset` |
| `Core.AttachProp` | `Core.CreateAttachedProp` |
| `Core.SpawnClear` | `Core.IsAreaClearOfVehicles` |
| `Core.GetStreetNametAtCoords` | `Core.GetStreetNamesAtCoords` |
| `Core.GetCurrentTime` | `Core.GetInGameTime` |
| `Core.GetGroundZCoord` | `Core.GetGroundCoords` |
| `Core.GetGroundHash` | `Core.GetGroundMaterial` |
| `Core.Debug` | ใช้ `Core.PrintDebug` เมื่อพิมพ์บรรทัด และ `Core.DumpTable` เมื่อพิมพ์ตาราง |

::: danger
`Core.GetPlayers` คือตัวที่พลาดแล้วเจ็บจริง ฝั่ง client ตอนนี้มันแปลว่า "ผู้เล่นที่สตรีมอยู่รอบตัวฉัน
ในรูป client index" ส่วนฝั่ง server ชื่อเดียวกันเป๊ะแปลว่า "ผู้เล่นทุกคนที่ต่ออยู่ ในรูป server id"
โค้ดที่ย้ายข้ามฝั่งโดยไม่แก้ชื่อจะรันผ่านแต่ผิดตอนทำงานจริง เขียนเป็น `Core.GetLocalPlayers`
ฝั่ง client แล้วความผิดพลาดแบบเงียบ ๆ นี้จะเกิดขึ้นไม่ได้อีก
:::

`Core.Debug` เป็นกรณีพิเศษ ของเดิมฝั่ง client รับ `(resource, obj, depth)` ส่วนฝั่ง server รับ
`(tbl, indent)` การเรียกแบบเดียวกันจึงหมายถึงคนละเรื่องขึ้นกับว่าโค้ดอยู่ไฟล์ไหน ตัว alias จะเดา
จากชนิดของอาร์กิวเมนต์แล้วส่งต่อไปที่ `Core.DumpTable` หรือ `Core.PrintDebug`
ถ้าเลือกตัวที่ถูกเองตั้งแต่แรก ก็ไม่ต้องให้ใครเดาให้

## ตัวช่วย particle ที่เลิกใช้แล้ว

`Core.StartParticleAtCoord(dict, ptName, looped, coords, rot, scale, alpha, color, duration)` และ
`Core.StartParticleOnEntity(dict, ptName, looped, entity, bone, offset, rot, scale, alpha, color, evolution, duration)`
ยังอยู่และยังทำงานได้ แต่ในซอร์สมาร์กไว้ว่า deprecated แล้ว โค้ดใหม่ให้เรียก native ของ ParticleFx
ตรง ๆ และพึงระวังว่าทั้งสองตัวจะบล็อกตามค่า `duration` ที่ส่งเข้าไป เพราะมัน `Wait` ก่อนสั่งหยุด
เอฟเฟกต์แบบวนลูป
