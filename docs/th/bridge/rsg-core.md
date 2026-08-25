# ความเข้ากันได้กับ RSG Core

Bridge `rsg-core` คืน object รูปแบบ RSG แต่ให้ `hexa_core` เป็นแหล่งข้อมูลจริง export นี้ใช้ได้ทั้ง
server และ client:

```lua
local RSGCore = exports['rsg-core']:GetCoreObject()
```

ต้องเริ่ม `rsg-core` หลัง `hexa_core` และก่อน resource ทุกตัวที่เรียก export นี้หรือ include
`@rsg-core/shared/locale.lua`

## Core object และข้อมูล shared

object ที่ได้มีตาราง `Functions`, `Config`, `Shared`, ตาราง callback และฝั่ง server จะมี
`Commands`, `Player`, `Players` กับ `UsableItems` เพิ่มด้วย

- `Shared.Items`, `Shared.Jobs` และ `Shared.Weapons` มาจาก Hexa
- `Shared.Gangs`, `Shared.Vehicles` และ `Shared.Locations` เป็นตารางว่างเมื่อ Hexa ไม่มีระบบเทียบเท่า
- `Config.Player.MaxWeight` และ `MaxInvSlots` อ่านค่าจาก
  `Config.Player.PlayerDefaults.weight` กับ `.slots` เมื่อจำเป็น
- `Config.Server` สำรองฝั่ง server รายงานว่าเซิร์ฟเวอร์เปิด ไม่ใช้ whitelist และมีสิทธิ์ `admin` กับ
  `staff` ข้อมูลนี้มีไว้ให้สคริปต์อ่านโดยไม่เจอ nil ไม่ใช่ระบบควบคุมเซิร์ฟเวอร์
- `RSGCore.Functions` mirror ฟังก์ชัน Hexa ที่ชื่อเดียวกันแบบ late-bind เฉพาะ override ที่อธิบายในหน้านี้
  เท่านั้นที่แปลง signature อย่าถือว่าฟังก์ชันที่ mirror มาเองมี semantics แบบ RSG ทุกตัว

Bridge เปิดไฟล์ `shared/locale.lua` ไว้ด้วย resource ที่ประกาศ `@rsg-core/shared/locale.lua`
จึงยังใช้ `Locale` และ `Lang:t(...)` ได้

## ผู้เล่น

lookup ที่รองรับจะคืน player wrapper:

```lua
local Player = RSGCore.Functions.GetPlayer(source)
local byCitizenId = RSGCore.Functions.GetPlayerByCitizenId(citizenid)
```

ตัวที่มี wrapper โดยตรงคือ `GetPlayer`, `GetPlayerByCitizenId`,
`GetOfflinePlayerByCitizenId`, `GetPlayerByLicense`, `GetPlayerByAccount` และ
`GetPlayerByCharInfo` ส่วน `GetRSGPlayers`, `GetQBPlayers` และ `GetHexaPlayers` คืน map ที่ใช้
server id เป็นคีย์

`PlayerData` เก็บฟิลด์ร่วมของ Hexa และเติมตารางที่ขาด เช่น `money`, `charinfo`, `metadata`, `items`
และ `job` มีการเติม `gang` เริ่มต้นเพื่อให้สคริปต์อ่าน `PlayerData.gang.name` ได้โดยไม่พัง แต่ไม่ได้ทำให้
ระบบแก๊งใช้งานได้จริง

### เมธอดผู้เล่นแบบแบนและแบบซ้อน

เมธอดใน wrapper ใช้ได้ทั้งสองรูปแบบ:

```lua
Player.Functions.AddMoney('cash', 100, 'reward')
Player.AddMoney('cash', 100, 'reward')

Player.Functions.AddItem('bread', 1)
Player.AddItem('bread', 1)
```

ทั้งคู่เรียก wrapper ที่แปลงค่าแล้วตัวเดียวกัน แบบแบนถูกเพิ่มเข้ามาเพื่อให้ resource ที่ใช้สไตล์ RSG/QB
รุ่นใหม่ไม่เจอ `nil` ทั้งที่แบบ `.Functions` ทำงานได้

### Alias ประเภทเงิน

ค่าเริ่มต้นใน `rsg-core/config.lua` คือ:

```lua
BridgeConfig.MoneyAliases = {
    money  = 'cash',
    crypto = false,
}
```

`AddMoney`, `RemoveMoney`, `SetMoney` และ `GetMoney` จะแปลงชื่อก่อน ชื่อที่ไม่มีในตารางจะถูกส่งต่อ
ตรง ๆ ส่วนค่าที่ map เป็น `false` ถือว่าไม่รองรับ: ตัวเขียนคืน `false`, ตัวอ่านคืน `0` และ console เตือน
หนึ่งครั้ง ต้องกำหนดชื่อเงิน custom ให้ชัดก่อนทดสอบ resource

### พฤติกรรมของ inventory

`AddItem(item, amount, slot, info, reason)` บังคับค่า `slot` และ `info` ที่ไม่ส่งมาให้เป็น `false`
ขณะข้าม resource boundary และคืน boolean สองตัว:

```lua
local accepted, dropped = Player.AddItem('bread', 1)
```

`accepted` เป็น true ทั้งตอนเก็บลงกระเป๋าและตอนสร้างถุงของตกบนพื้น เพื่อไม่ให้สคริปต์ซื้อของคืนเงิน
หลังของถูกสร้างจริงแล้วจนเกิดการปั๊มของ ให้เช็ค `dropped` เมื่อต้องแยกสองกรณีนี้

`RemoveItem` คืน boolean ส่วน `ClearInventory`, `SetInventory`, `GetSlotsByItem` และ
`GetFirstSlotByItem` ต้องมี `hexa_inventory`; ถ้า resource นั้นไม่ทำงานจะคืน failure/ค่าว่างอย่างปลอดภัย

### การแก้ gang ที่ไม่รองรับ

`Player.SetGang()` และ `Player.SetGangDuty()` เตือนหนึ่งครั้งแล้วคืน `false` ค่า gang เริ่มต้นมีไว้กัน nil
เท่านั้น ส่วน `AddJobReputation(amount)` รองรับโดยเก็บตาราง `metadata.jobrep` แยกตามชื่ออาชีพปัจจุบัน

## Notification และสิทธิ์

ฝั่ง server ใช้ `Notify(source, text, type, length)` ส่วน client ใช้ `Notify(text, type, length)`
ทั้ง string และตาราง `{ text, caption }` จะถูกแปลงเป็น toast ของ Hexa ชนิดที่รู้จักมี `primary`,
`success`, `error`, `warning`, `info`, `police` และ `ambulance`; ชื่ออื่นถอยไป `primary`

ค่า alias สิทธิ์เริ่มต้นคือ:

```lua
BridgeConfig.PermissionAliases = {
    god = 'admin',
    mod = 'staff',
}
```

mapping นี้ใช้กับ `AddPermission`, `RemovePermission`, `HasPermission` และ
`RSGCore.Commands.Add` นอกจากนี้ยังมี `IsLicenseInUse` กับ `ExploitBan` ให้โดยตรง

## Callback

รูปแบบปกติใช้ได้ทั้งสองฝั่ง:

```lua
-- server
RSGCore.Functions.CreateCallback('example:get', function(src, cb, value)
    cb(value * 2)
end)

-- client
RSGCore.Functions.TriggerCallback('example:get', function(result)
    print(result)
end, 5)
```

`CreateClientCallback` กับ `TriggerClientCallback` รองรับคำขอจาก server ไป client ด้วย Bridge เก็บ
callback เป็นคิว FIFO จึงเรียกชื่อเดียวกันพร้อมกันได้โดยอันแรกไม่ถูกทับ และจะล้างรายการ server-to-client
ที่ค้างอยู่เมื่อผู้เล่นคนนั้นหลุด

## Event ที่ส่งต่อ

การเปลี่ยน lifecycle ของ Hexa ถูกยิงซ้ำด้วยชื่อ RSG:

| Event ของ RSG | ทิศทาง / ต้นทาง |
| --- | --- |
| `RSGCore:Client:OnPlayerLoaded`, `OnPlayerUnload` | client local จาก lifecycle ของ Hexa |
| `RSGCore:Player:SetPlayerData` | client และ server local พร้อม `PlayerData` ที่แปลงแล้ว |
| `RSGCore:Client:OnJobUpdate`, `OnMoneyChange`, `SetDuty` | client local |
| `RSGCore:Client:UpdateObject`, `OnSharedUpdate`, `OnSharedUpdateMultiple` | client local |
| `RSGCore:Server:PlayerLoaded`, `PlayerDropped`, `OnPlayerUnload`, `OnPlayerLoaded` | server local |
| `RSGCore:Server:OnJobUpdate`, `OnMoneyChange`, `SetDuty`, `UpdateObject`, `PermissionsChanged` | server local |

call ที่เข้ามาทาง `RSGCore:Server:SetMetaData`, `RSGCore:ToggleDuty` และ `RSGCore:UpdatePlayer`
จะถูกส่งต่อให้ handler ที่มีด่านตรวจของ Hexa ส่วน `RSGCore:CallCommand` ตรวจสิทธิ์คำสั่งก่อนเรียก
ฝั่ง client ยังแปล event teleport ไปหาผู้เล่น, teleport ไปพิกัด, spawn รถ และลบรถด้วย

::: warning Net event ไอเทมที่เลิกใช้แล้วเป็น no-op โดยตั้งใจ
`RSGCore:Server:UseItem`, `RSGCore:Server:AddItem` และ `RSGCore:Server:RemoveItem` รับไว้เพื่อพิมพ์
คำเตือนเท่านั้น ไม่แก้ inventory เพราะการเปิดคำสั่งเหล่านี้ให้ client ยิงได้เป็นช่องโหว่ ให้ใช้ player method
ฝั่ง server หลังตรวจข้อมูลแล้วแทน
:::

## ขอบเขตที่ต้องรู้

- ไม่มี backend ของ gang ค่าเริ่มต้นและ setter ไม่ได้บันทึกแก๊งจริง
- `Vehicles` และ `Locations` ที่ว่างกัน nil ได้ แต่ไม่ได้ให้ catalogue เหล่านั้น
- inventory helper บางตัวขึ้นกับ `hexa_inventory`
- ฟังก์ชัน Hexa ที่ mirror มาเป็น pass-through ถ้าหน้านี้ไม่ได้ระบุ contract ที่แปลงไว้
- ต้องทดสอบ resource ที่ผูกกับ RSG บางเวอร์ชันโดยเฉพาะ Bridge มุ่งรองรับ API ที่พบบ่อย ไม่ใช่ทุก release

