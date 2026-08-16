# Player Object

Player object คือหัวใจของ hexa_core — เก็บข้อมูลตัวละครทั้งหมดของผู้เล่นหนึ่งคน พร้อมเมธอดสำหรับแก้ไขข้อมูลอย่างปลอดภัย

## การดึง Player Object

```lua
-- ฝั่ง server
local HexaCore = exports['hexa_core']:GetCoreObject()

local Player = HexaCore.Functions.GetPlayer(source)            -- จาก server id
local Player = HexaCore.Functions.GetPlayerByCitizenId('RB1234')
local Player = HexaCore.Functions.GetPlayerByLicense(license)
local Player = HexaCore.Functions.GetOfflinePlayerByCitizenId('RB1234') -- ออฟไลน์ก็ได้
```

## โครงสร้าง PlayerData

| ฟิลด์ | คำอธิบาย |
| --- | --- |
| `source` | server id ปัจจุบัน |
| `citizenid` | รหัสประจำตัวละคร เช่น `RB1234` |
| `license` | identifier ของบัญชี (steam hex หรือ Rockstar license) |
| `cid` | ลำดับช่องตัวละคร (character slot) |
| `charinfo` | ชื่อ นามสกุล วันเกิด เพศ สัญชาติ เลขบัญชี |
| `money` | ตารางเงินทุกประเภท `{ cash = ..., bank = ..., gold = ... }` |
| `job` | อาชีพปัจจุบัน `{ name, label, grade, onduty, payment }` |
| `items` | ไอเทมทั้งหมดในกระเป๋า (พร้อม slot และน้ำหนัก) |
| `metadata` | ข้อมูลเสริม เช่น hunger, thirst, สถานะต่าง ๆ |
| `position` | ตำแหน่งล่าสุดที่บันทึกไว้ |

การอ่านข้อมูลทำได้ตรง ๆ:

```lua
print(Player.PlayerData.charinfo.firstname)
print(Player.PlayerData.money.cash)
print(Player.PlayerData.job.name)
```

## เมธอดที่ใช้บ่อย

การ **แก้ไข** ข้อมูลให้ทำผ่าน `Player.Functions.*` เสมอ เพื่อให้ระบบ sync/save ทำงานถูกต้อง:

```lua
-- เงิน
Player.Functions.AddMoney('cash', 100, 'เหตุผล (ใช้ใน log)')
Player.Functions.RemoveMoney('bank', 50, 'ค่าปรับ')
Player.Functions.SetMoney('gold', 10)
local cash = Player.Functions.GetMoney('cash')

-- ไอเทม
Player.Functions.AddItem('bread', 2)
Player.Functions.RemoveItem('bread', 1)
local item  = Player.Functions.GetItemByName('bread')
local has   = Player.Functions.HasItem('bread', 1)

-- อาชีพ
Player.Functions.SetJob('police', 2)
Player.Functions.SetJobDuty(true)

-- metadata
Player.Functions.SetMetaData('hunger', 100)
local hunger = Player.Functions.GetMetaData('hunger')

-- อื่น ๆ
Player.Functions.Save()    -- บังคับเซฟทันที
Player.Functions.Logout()  -- ออกจากตัวละคร
```

::: warning สำคัญ
`RemoveMoney` คืน `false` เมื่อยอดไม่พอ (สำหรับเงินประเภทห้ามติดลบ) — เขียนสคริปต์ตามแพตเทิร์นนี้เสมอ:

```lua
if Player.Functions.RemoveMoney('cash', price, 'ซื้อของ') then
    Player.Functions.AddItem(itemName, 1)
else
    HexaCore.Functions.Notify(src, { text = 'เงินไม่พอ', type = 'error' })
end
```
:::

## การขยาย Player Object

resource อื่นสามารถเพิ่มเมธอด/ฟิลด์ให้ player object ได้โดยไม่ต้องแก้ core:

```lua
-- เพิ่มเมธอดให้ผู้เล่นทุกคน (ids = -1)
exports['hexa_core']:SetMethod('GetFullName', function(self)
    return self.PlayerData.charinfo.firstname .. ' ' .. self.PlayerData.charinfo.lastname
end)

-- เพิ่มฟิลด์
exports['hexa_core']:SetField('customData', {})
```

ดูรายการเมธอดทั้งหมดได้ที่ [Player Methods](/api/player-methods)
