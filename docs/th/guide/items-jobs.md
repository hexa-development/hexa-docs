# ไอเทมและอาชีพ

ไอเทมกับอาชีพคือ "แคตตาล็อกกลาง" สองชุดของเฟรมเวิร์ก ทั้งคู่เก็บอยู่ในฐานข้อมูล โหลดครั้งเดียวตอน
`hexa_core` บูต แล้วไปจบที่ตารางเดียวกันเสมอคือ `Core.Shared.Items` และ `Core.Shared.Jobs` พร้อม sync
ให้ client ทุกคนอัตโนมัติ

```lua
local Core = exports['hexa_core']:GetCoreObject()

local item = Core.Shared.Items['bread']
local job  = Core.Shared.Jobs['medic']
```

## ลงทะเบียน "ชนิด" กับ ให้ของ "คน" ไม่ใช่เรื่องเดียวกัน

เรื่องนี้คือเรื่องเดียวในหน้านี้ที่พลาดไม่ได้จริง ๆ

::: danger Core.RegisterItem กับ Player.AddItem คนละเรื่องกันคนละทาง
`Core.RegisterItem('gold_ring', { ... })` = เพิ่ม **ชนิดของไอเทม** เข้าแคตตาล็อกของเซิร์ฟเวอร์
ไม่มีใครได้ของสักชิ้น มันแค่บอกเซิร์ฟเวอร์ว่าโลกนี้มีของชื่อ `gold_ring` อยู่ หนักเท่าไร รูปอะไร

`Player.AddItem('gold_ring', 1)` = ยัดแหวนหนึ่งวงลง **กระเป๋าของคนคนนั้น**

เมื่อก่อนสองอย่างนี้ใช้คำกริยาเดียวกันคือ `AddItem` บน core object ทำให้ `Core.AddItem` กับ
`Player.AddItem` หน้าตาแทบเหมือนกันแต่ผลลัพธ์คนละทิศ 3.0 จึงเปลี่ยนชื่อฝั่งแคตตาล็อกใหม่ทั้งชุด
ส่วนเมธอดบนตัวผู้เล่นไม่ได้เปลี่ยนอะไรเลย
:::

```lua
local Core = exports['hexa_core']:GetCoreObject()

-- สอนเซิร์ฟเวอร์ว่ามีไอเทมชนิดนี้อยู่
Core.RegisterItem('gold_ring', {
    name = 'gold_ring',
    label = 'แหวนทอง',
    weight = 1,
    type = 'item',
    image = 'gold_ring.png',
    unique = false,
    useable = false,
    shouldClose = true,
})

-- ยื่นให้คนที่ถือ server id 3 หนึ่งวง
local Player = Core.GetPlayer(3)
Player.AddItem('gold_ring', 1, false, false, 'quest_reward')
```

ฝั่งอาชีพก็แบ่งแบบเดียวกัน `Core.RegisterJob` คือประกาศว่ามีอาชีพนี้ในเซิร์ฟเวอร์ ส่วน `Player.SetJob`
คือจับคนเข้าอาชีพนั้น

## ฐานข้อมูลคือแหล่งข้อมูลจริงเพียงแหล่งเดียว

`Shared.Items` กับ `Shared.Jobs` ใน `shared/main.lua` เริ่มต้นเป็นตารางว่าง ไม่มีอะไร hardcode ไว้เลย
`install.sql` จะสร้างตารางและ seed ค่าเริ่มต้นให้ตอนบูตครั้งแรก จากนั้นตัวโหลดใน `server/items.lua`
กับ `server/jobs.lua` จะอ่านข้อมูลออกมาเมื่อ `MySQL.ready` ทำงาน

installer รันเองอัตโนมัติ ไม่ต้อง import SQL มือ แต่ resource ไหนจะยิงคิวรีตารางพวกนี้เองต้องรอให้
schema พร้อมก่อน:

```lua
CreateThread(function()
    exports['hexa_core']:AwaitSchemaReady(15000)
    -- ถัดจากบรรทัดนี้ไป schema พร้อมใช้แน่นอน
end)
```

### ตาราง items

มีห้าคอลัมน์เท่านั้น ไม่มีมากกว่านี้

| คอลัมน์ | ชนิด | ความหมาย |
| --- | --- | --- |
| `name` | `VARCHAR(50)` primary key | ชื่อไอเทมที่โค้ดทั้งระบบใช้อ้างถึง |
| `label` | `VARCHAR(100)` | ชื่อที่แสดงในเกม |
| `weight` | `INT` ค่าเริ่มต้น `1` | เปอร์เซ็นต์ของความจุกระเป๋าต่อหนึ่งชิ้น |
| `rare` | `TINYINT(1)` ค่าเริ่มต้น `0` | โหลดออกมาเป็น `rare` |
| `can_remove` | `TINYINT(1)` ค่าเริ่มต้น `1` | โหลดออกมาเป็น `canRemove` |

น้ำหนักที่นี่คิดเป็นเปอร์เซ็นต์ ไม่ใช่กรัม ผู้เล่นแบกได้ `100` ตาม
`Config.Player.PlayerDefaults.weight` ของกินที่ตั้ง weight ไว้ `1` จึงพกได้ร้อยชิ้นพอดี

```sql
INSERT INTO `items` (`name`, `label`, `weight`) VALUES ('gold_ring', 'แหวนทอง', 1);
```

::: warning ห้ามใส่แถวอาวุธในตาราง items
`server/items.lua` รวม `Shared.Weapons` จาก `shared/weapons.lua` เข้าแคตตาล็อกให้อยู่แล้วตอนบูต และ
บังคับ `type = 'weapon'` กับ `unique = true` ทุกตัว แถวอาวุธในตาราง `items` ทำได้อย่างมากแค่ทับ
`label` กับ `weight` เท่านั้น ไม่มีทางทำให้ของธรรมดากลายเป็นอาวุธ และไม่จำเป็นต้องมี
:::

### ตาราง jobs และ job_grades

| คอลัมน์ `jobs` | ชนิด | โหลดเป็น |
| --- | --- | --- |
| `name` | `VARCHAR(50)` primary key | `name` |
| `label` | `VARCHAR(100)` | `label` ถ้าว่างใช้ `name` แทน |
| `type` | `VARCHAR(50)` | `type` |
| `default_duty` | `TINYINT(1)` | `defaultDuty` |
| `offduty_pay` | `TINYINT(1)` | `offDutyPay` |
| `whitelisted` | `TINYINT(1)` | `whitelisted` |

| คอลัมน์ `job_grades` | ชนิด | โหลดเป็น |
| --- | --- | --- |
| `job_name` | `VARCHAR(50)` | คีย์ย้อนกลับไปที่ `jobs.name` |
| `grade` | `INT` | คีย์ของเกรด เก็บเป็น string |
| `name` | `VARCHAR(50)` | `name` ของเกรด ถ้าว่างใช้ `label` แล้วค่อยใช้ตัวเลข |
| `salary` | `INT` | กลายเป็น `payment` |
| `isboss` | `TINYINT(1)` | `isboss` |

`job_grades` ยังมีคอลัมน์ `label`, `skin_male`, `skin_female` และ unique key คู่
(`job_name`, `grade`) ด้วย แต่ `hexa_core` อ่าน `label` แค่ในฐานะตัวสำรองของ `name` ส่วนสองคอลัมน์
skin ไม่ได้ถูกอ่านเลย

อาชีพที่ไม่มีแถวเกรดสักแถวจะถูกใส่เกรด `0` ให้อัตโนมัติ ใช้ชื่อเดียวกับ label ของอาชีพและ
`payment = 0` โค้ดปลายทางจะได้ไม่ต้องเผื่อกรณีอาชีพไม่มีเกรด

```sql
INSERT INTO `jobs` (`name`, `label`, `type`, `whitelisted`) VALUES ('butcher', 'คนขายเนื้อ', NULL, 0);
INSERT INTO `job_grades` (`job_name`, `grade`, `name`, `salary`, `isboss`) VALUES
    ('butcher', 0, 'Apprentice', 10, 0),
    ('butcher', 1, 'Owner', 40, 1);
```

ค่า seed ที่มากับ install.sql คือ `unemployed`, กรมตำรวจห้าเมือง (`vallaw`, `rholaw`, `blklaw`,
`strlaw`, `stdenlaw`) และ `medic` ทุกคำสั่งเป็น `INSERT IGNORE` รันซ้ำกี่รอบก็ไม่ทับของที่แก้ไว้แล้ว

## ตัวโหลดสร้างอะไรออกมา

### หน้าตาไอเทมหนึ่งตัว

แต่ละแถวถูกขยายเป็นข้อมูลเต็มชุด เพราะตารางไม่มีคอลัมน์รองรับฟิลด์ที่ระบบกระเป๋าต้องใช้:

```lua
Core.Shared.Items['bread'] = {
    name = 'bread',
    label = 'ขนมปัง',
    weight = 1,
    rare = false,
    canRemove = true,
    type = 'item',
    image = 'bread.png',
    unique = false,
    useable = true,
    shouldClose = true,
}
```

ค่า `label` ที่ seed มากับ install.sql เป็นภาษาไทย ส่วน `name` เป็นชื่ออังกฤษเสมอ และโค้ดอ้างถึง `name`
เท่านั้น

`image` ใช้ธรรมเนียม `<name>.png` ส่วน `useable = true` ตรงนี้แปลว่า "ไม่ได้ถูกห้ามใช้" เท่านั้น
กดใช้แล้วจะเกิดอะไรขึ้นจริงหรือไม่ตัดสินที่ `Core.CreateUseableItem`
นอกจากนี้ ระบบกระเป๋ายังอ่าน `description` กับ `combinable` จากข้อมูลไอเทมด้วยถ้ามี ตอนลงทะเบียน
ตอน runtime จึงใส่สองฟิลด์นี้เพิ่มได้

อาวุธจะออกมาเป็น `type = 'weapon'` และ `unique = true` คือหนึ่งกระบอกกินหนึ่งช่อง ส่วนไอเทมเงิน
(`dollar`, `cent`, `money_clip`, `blood_dollar`, `blood_cent`, `blood_money_clip`) จะถูกเติมให้ก็ต่อเมื่อ
`Config.Money.EnableMoneyItems` เป็น `true` และตั้ง `useable = false` ไว้

::: tip เช็คอาวุธต้องใช้ Shared.IsWeapon
อย่าเช็คว่า `Core.Shared.Items[name].type == 'weapon'` เพื่อตัดสินว่าของชิ้นนั้นเป็นอาวุธ เพราะ
แคตตาล็อกเกิดขึ้นหลังต่อฐานข้อมูลเสร็จ ช่วงบูตต้น ๆ เงื่อนไขนี้เป็นเท็จเสมอ ถ้าเผลอเซฟในจังหวะนั้น
อาวุธจะเสีย ammo และ serial ทันที ให้ใช้ `Core.Shared.IsWeapon(name)` ซึ่งอ่านตารางอาวุธนิ่งที่มีอยู่
ตั้งแต่เฟรมแรก ฝั่ง server ยังเรียกผ่าน `exports['hexa_core']:IsWeapon(name)` ได้ด้วย
:::

### หน้าตาอาชีพหนึ่งตัว

```lua
Core.Shared.Jobs['medic'] = {
    name = 'medic',
    label = 'Medic',
    type = 'medic',
    defaultDuty = false,
    offDutyPay = false,
    whitelisted = true,
    grades = {
        ['0'] = { name = 'Recruit', payment = 5, isboss = false },
        ['4'] = { name = 'Manager', payment = 100, isboss = true },
    },
}
```

คีย์ของเกรดเป็น **string** ไม่ใช่ตัวเลข `Player.SetJob('medic', 2)` แปลงให้เอง แต่ถ้าอ่านตรง ๆ ต้อง
เขียน `job.grades['2']`

ค่า `payment` คือยอดที่รอบจ่ายเงินเดือนจ่ายให้ทุก ๆ `Config.Money.PayCheckTimeOut` นาที คนที่เข้าเวร
อยู่ได้เงิน ส่วนคนที่ไม่ได้เข้าเวรจะได้ก็ต่อเมื่ออาชีพนั้นตั้ง `offDutyPay` ไว้

## แคตตาล็อกเดินทางไปหา client อย่างไร

ตัวโหลดทั้งสองตัวจะยิงตารางที่สร้างเสร็จให้ทุกคน แล้วสั่งรีเฟรช core object ต่อทันที:

```lua
TriggerClientEvent('HexaCore:Client:OnSharedUpdateMultiple', -1, 'Items', items)
TriggerEvent('HexaCore:Server:UpdateObject')
```

มีสาม event จาก server ไป client ที่ทำหน้าที่นี้:

| Event | ข้อมูลที่ส่ง | ส่งตอนไหน |
| --- | --- | --- |
| `HexaCore:Client:SharedUpdate` | ตาราง `Shared` ทั้งก้อน | ตอน `playerConnecting` และตอนขอ spawn |
| `HexaCore:Client:OnSharedUpdateMultiple` | ชื่อตาราง + ข้อมูลหลายรายการ | ตอนโหลดแคตตาล็อก, `RegisterItems`, `RegisterJobs` |
| `HexaCore:Client:OnSharedUpdate` | ชื่อตาราง, คีย์, ค่า | ตอนลงทะเบียน/แก้ไข/ถอดทีละรายการ |

ทั้งสามตัวจบด้วยการยิง `HexaCore:Client:UpdateObject` ต่อบน client เสมอ และสัญญาณนี้สำคัญมาก เพราะ
resource ที่แคช core object ไว้ถือแค่ **สำเนา msgpack** ไม่ใช่ reference จริง ถ้าไม่ดึงใหม่ตอนได้รับ
สัญญาณ มันจะอ่านแคตตาล็อกว่างค้างไปทั้ง session

```lua
local Core = exports['hexa_core']:GetCoreObject()

RegisterNetEvent('HexaCore:Client:UpdateObject', function()
    Core = exports['hexa_core']:GetCoreObject()
end)
```

ฝั่ง server ใช้ชื่อคู่กันคือ `HexaCore:Server:UpdateObject`

## ลงทะเบียนตอน runtime

ทุกตัวด้านล่างอยู่ฝั่ง server บน core object แก้ `Core.Shared` ในหน่วยความจำแล้ว broadcast ให้ client
ทุกตัวคืนค่า `success, message`

| ฟังก์ชัน | รูปแบบ | ข้อความตอนล้มเหลว |
| --- | --- | --- |
| `Core.RegisterItem` | `(itemName, item)` | `invalid_item_name`, `item_exists` |
| `Core.RegisterItems` | `(items)` | `invalid_item_name`, `item_exists` |
| `Core.UpdateItemDefinition` | `(itemName, item)` | `invalid_item_name`, `item_not_exists` |
| `Core.UnregisterItem` | `(itemName)` | `invalid_item_name`, `item_not_exists` |
| `Core.RegisterJob` | `(jobName, job)` | `invalid_job_name`, `job_exists` |
| `Core.RegisterJobs` | `(jobs)` | `invalid_job_name`, `job_exists` |
| `Core.UpdateJobDefinition` | `(jobName, job)` | `invalid_job_name`, `job_not_exists` |
| `Core.UnregisterJob` | `(jobName)` | `invalid_job_name`, `job_not_exists` |

```lua
local Core = exports['hexa_core']:GetCoreObject()

local ok, err = Core.RegisterItem('gold_ring', {
    name = 'gold_ring',
    label = 'แหวนทอง',
    weight = 1,
    rare = false,
    canRemove = true,
    type = 'item',
    image = 'gold_ring.png',
    unique = false,
    useable = true,
    shouldClose = true,
    description = 'แหวนทองคำเนื้อดี',
})

if not ok then
    Core.Error('gold_ring was not registered: %s', err)
end
```

`RegisterItems` กับ `RegisterJobs` รับตารางที่คีย์เป็นชื่อ และคืนค่าตัวที่สามกลับมาด้วยคือรายการที่
ทำให้พัง จะได้บอกได้ว่าตัวไหนมีปัญหา:

```lua
local ok, err, offender = Core.RegisterItems({
    gold_ring   = { name = 'gold_ring',   label = 'แหวนทอง', weight = 1, type = 'item', image = 'gold_ring.png' },
    silver_ring = { name = 'silver_ring', label = 'แหวนเงิน', weight = 1, type = 'item', image = 'silver_ring.png' },
})

if not ok then
    Core.Error('item batch rejected (%s): %s', err, json.encode(offender))
end
```

ลงทะเบียนอาชีพก็รูปแบบเดียวกัน:

```lua
local ok, err = Core.RegisterJob('butcher', {
    name = 'butcher',
    label = 'คนขายเนื้อ',
    type = 'none',
    defaultDuty = true,
    offDutyPay = false,
    whitelisted = false,
    grades = {
        ['0'] = { name = 'Apprentice', payment = 10, isboss = false },
        ['1'] = { name = 'Owner', payment = 40, isboss = true },
    },
})
```

::: warning ลงทะเบียนตอน runtime ไม่ได้แปลว่าข้อมูลถูกบันทึก
`Core.RegisterItem` และพวกพ้องแตะแค่หน่วยความจำ `hexa_core` สร้าง `Shared.Items` กับ `Shared.Jobs`
ใหม่จากฐานข้อมูลทุกครั้งที่สตาร์ต ของที่ลงทะเบียนตอน runtime จึงหายหมดหลัง restart ถ้าไม่มีแถวใน DB
รองรับ และถ้าเผลอลงทะเบียนก่อน `MySQL.ready` จะเสร็จยิ่งแย่กว่า เพราะตัวโหลดไอเทมเอาตารางที่สร้างใหม่
ทับ `Shared.Items` ทั้งก้อน ของที่ใส่ไว้ก่อนหน้าหายเกลี้ยง ให้ลงทะเบียนจากเธรดที่เรียก
`AwaitSchemaReady` ไปแล้ว หรือไม่ก็ insert แถวลง DB ไปเลย
:::

มีกับดักอีกอย่างในคำสั่งแบบหลายรายการที่ควรรู้: `RegisterItems` กับ `RegisterJobs` เขียนข้อมูลทีละตัว
ระหว่างวนลูปแล้วหยุดที่ตัวแรกที่ผิด ผลคือรายการที่ผ่านไปก่อนหน้าค้างอยู่ใน `Core.Shared` จริงแต่ไม่เคย
ถูก broadcast ไปหา client เลย ถ้าข้อมูลไม่ได้อยู่ในมือเราทั้งหมด ให้ตรวจก่อนส่ง หรือลงทะเบียนทีละตัว

## ฝั่ง exports

คำกริยาชุดแคตตาล็อกยังถูก export ด้วยชื่อเดิม และเก็บไว้ถาวร สคริปต์ที่พอร์ตมาจะได้ใช้
ได้เลยโดยไม่ต้องแก้:

```lua
exports['hexa_core']:AddItem('gold_ring', itemDefinition)
exports['hexa_core']:AddItems(itemMap)
exports['hexa_core']:UpdateItem('gold_ring', itemDefinition)
exports['hexa_core']:RemoveItem('gold_ring')

exports['hexa_core']:AddJob('butcher', jobDefinition)
exports['hexa_core']:AddJobs(jobMap)
exports['hexa_core']:UpdateJob('butcher', jobDefinition)
exports['hexa_core']:RemoveJob('butcher')
```

::: warning export ชื่อ AddItem คือตัวแคตตาล็อก
`exports['hexa_core']:AddItem(name, definition)` คือการลงทะเบียน **ชนิด** ของไอเทม มันคือรูปแบบ export
ของ `Core.RegisterItem` ไม่ใช่ของ `Player.AddItem` จะให้ของกับผู้เล่นต้องผ่าน player object เท่านั้น
:::

บน core object ชื่อเก่ายังเรียกได้อีกหนึ่งเวอร์ชัน `Core.AddItem`, `Core.AddItems`, `Core.UpdateItem`,
`Core.RemoveItem`, `Core.AddJob`, `Core.AddJobs`, `Core.UpdateJob` และ `Core.RemoveJob` จะวิ่งต่อไปยัง
ชื่อใหม่ให้ พร้อมเตือนหนึ่งครั้งและบอกว่า resource ไหนเป็นคนเรียก

## ไอเทมที่กดใช้ได้

การลงทะเบียน callback คือสิ่งที่ทำให้ไอเทมกดใช้แล้วมีอะไรเกิดขึ้น ระบบกระเป๋าจะไปหา callback
ตอนผู้เล่นกดใช้ แล้วเรียกมันพร้อม server id ของคนใช้กับข้อมูลไอเทมในช่องนั้น

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.CreateUseableItem('bandage', function(source, item)
    local Player = Core.GetPlayer(source)
    if not Player then return end
    -- item.info กับ item.slot มาจากช่องที่ผู้เล่นกด
    Player.RemoveItem('bandage', 1, item.slot, 'used_bandage')
end)
```

`Core.GetUsableItem(itemName)` คืนสิ่งที่ลงทะเบียนไว้ หรือ `nil` ถ้าไอเทมนั้นไม่มี handler เป็นตัวแทน
ของ `CanUseItem` เดิมโดยตรง ซึ่งยังเรียกได้อยู่แต่จะเตือน

```lua
if Core.GetUsableItem('bandage') then
    -- ไอเทมนี้มีคนลงทะเบียนไว้แล้ว
end
```

`Core.UseItem(source, item)` ส่งต่อไปยัง export `UseItem` ของระบบกระเป๋า และจะออกจากฟังก์ชันพร้อม
เตือนถ้าระบบกระเป๋ายังไม่ started ปกติแล้ว inventory ยิงการใช้ไอเทมเองตอนผู้เล่นกด resource
ทั่วไปจึงแทบไม่ต้องเรียกตัวนี้

::: warning event ใช้ไอเทมแบบเก่าโดนโกงได้
`HexaCore:Server:UseItem` กับ `HexaCore:Client:UseItem` ยังอยู่ แต่จะ log เตือนพร้อมชื่อคนเรียก และมี
กำหนดถอดออก ให้ไปใช้ทางระบบกระเป๋าแทน
:::

มีตัวช่วยอีกสองตัวที่คุมทางเดินของไอเทม ทั้งคู่อยู่บน core object และมีคู่แฝดบน player object และ
คืน `false` เมื่อระบบกระเป๋าไม่ได้สตาร์ต:

```lua
local Player = Core.GetPlayer(source)

if Player.CanCarryItem('gold_ring', 5) then
    Player.AddItem('gold_ring', 5)
end

if Player.HasItem('bandage', 1) then
    -- ในตัวมีอย่างน้อยหนึ่งชิ้น
end
```

`Core.CanCarryItem(source, item, amount)` เอาน้ำหนักของจำนวนที่จะให้ไปบวกกับของที่ถืออยู่แล้วเทียบกับ
`PlayerData.weight` และจะ log error ถ้าไอเทมนั้นไม่มีในแคตตาล็อกเลย ส่วน
`Core.HasItem(source, items, amount)` รับได้ทั้ง string และตารางรายชื่อ

## ไอเทมบน player object

นี่คือเมธอดฝั่งกระเป๋าที่แขวนอยู่บนตัวผู้เล่น ทุกตัวส่งงานต่อให้ระบบกระเป๋า และถ้า inventory
ไม่ได้สตาร์ตจะคืนค่าที่ปลอดภัยแทนการ error

| เมธอด | คืนค่าเมื่อ inventory ไม่ทำงาน |
| --- | --- |
| `Player.AddItem(item, amount, slot, info, reason)` | `false, false` |
| `Player.RemoveItem(item, amount, slot, reason)` | `false` |
| `Player.GetItemBySlot(slot)` | `nil` |
| `Player.GetItemByName(item)` | `nil` |
| `Player.GetItemsByName(item)` | `{}` |
| `Player.GetTotalWeight()` | `0` |
| `Player.HasItem(items, amount)` | `false` |
| `Player.CanCarryItem(item, amount)` | `false` |

`Player.AddItem` คืนค่าบูลีนสองตัวคือ `stored` กับ `dropped` ถ้า `dropped = true` แปลว่ากระเป๋าเต็มแล้ว
ของถูกวางลงพื้นเป็นถุงแทน ของชิ้นนั้น **มีอยู่จริง** ร้านค้าจึงห้ามคืนเงินในกรณีนี้

```lua
local stored, dropped = Player.AddItem('gold_ring', 1, false, false, 'shop_purchase')

if not stored and not dropped then
    -- ไม่มีของเกิดขึ้นเลย มีแต่กรณีนี้เท่านั้นที่ควรคืนเงิน
end
```

ช่อง `slot` กับ `info` ที่ไม่ได้ใช้ให้ส่ง `false` อย่าส่ง `nil` เพราะ `nil` ที่อยู่กลางลิสต์อาร์กิวเมนต์
จะหายไประหว่างข้ามขอบ resource แล้วดัน `reason` เลื่อนไปนั่งตำแหน่ง slot แทน

`Player.AddItem` กับ `Player.RemoveItem` ตั้งธง dirty ให้เอง รอบเซฟถัดไปจึงเขียนข้อมูลลง DB แน่นอน
แต่ถ้าไปแก้ของในกระเป๋าด้วยทางอื่น ธงนี้ไม่ถูกตั้ง ต้องเรียก `Player.MarkDirty()` เอง

## อาชีพบน player object

```lua
local Player = Core.GetPlayer(source)

-- คืน false ถ้าอาชีพนั้นไม่มีในแคตตาล็อก
Player.SetJob('medic', 2)
Player.SetJobDuty(true)
```

`SetJob` แปลงชื่ออาชีพเป็นตัวพิมพ์เล็ก ตั้งเกรดเริ่มต้นเป็น `'0'` และปฏิเสธทุกชื่อที่ไม่มีใน
`Core.Shared.Jobs` ถ้าผ่านจะคัดลอก `label`, `type` และค่า `name`, `level`, `payment`, `isboss` ของเกรด
ลง `PlayerData.job` ตั้ง `onduty` ตาม `defaultDuty` ของอาชีพ แล้ว sync ข้อมูลพร้อมยิง
`HexaCore:Server:OnJobUpdate` และ `HexaCore:Client:OnJobUpdate` ด้วยพารามิเตอร์ `(source, job)`
ถ้าใส่เกรดที่ไม่มีอยู่ ค่าตั้งต้นจะค้างไว้คือ level `0` ชื่อ `No Grades` payment `30`

::: tip เซิร์ฟเวอร์นี้ไม่มีระบบแก๊ง
`Player.SetGang(gang, grade)` มีอยู่จริงและคืน `false` เสมอ ที่ยังเก็บไว้เพราะ bridge เรียกหา
อย่าเอาไปต่อยอดเป็นระบบอะไร
:::

นับคนที่เข้าเวรอยู่:

```lua
local players, count = Core.GetPlayersOnDuty('medic')
local onlyCount = Core.GetDutyCount('medic')
```

`GetPlayersOnDuty` คืนลิสต์ server id พร้อมจำนวน ส่วน `GetDutyCount` คืนแค่จำนวน

## น้ำหนักและช่องเก็บของ

ค่าความจุเริ่มต้นมาจาก `Config.Player.PlayerDefaults` คือ `weight = 100` และ `slots = 25` น้ำหนักคิด
เป็นเปอร์เซ็นต์ของกระเป๋า ของที่ weight `1` จึงกินความจุหนึ่งเปอร์เซ็นต์

```lua
Core.SetMaxWeight(source, 150)
Core.SetMaxSlots(source, 40)
```

ทั้งคู่เขียนลงข้อมูลผู้เล่นผ่าน `SetPlayerData` ชื่อเดิมคือ `ChangeWeight` กับ `ChangeSlots` ซึ่งยังเรียก
ได้อยู่และจะเตือนหนึ่งครั้ง

`Core.GetTotalWeight(items)` ใช้ชั่งน้ำหนักตารางไอเทมดิบ ๆ และคืน `0` เมื่อระบบกระเป๋าไม่ทำงาน

## คำสั่งแอดมิน

`hexa_core` มีสามคำสั่งที่เกี่ยวข้องกับแคตตาล็อกสองชุดนี้

| คำสั่ง | สิทธิ์ | หมายเหตุ |
| --- | --- | --- |
| `/giveitem [citizenid] [item] [amount]` | `admin` | อาร์กิวเมนต์แรกคือ **citizen id** ไม่ใช่ server id และปฏิเสธไอเทมที่ไม่มีในแคตตาล็อก |
| `/setjob [citizenid] [job] [grade]` | `admin` | ใช้ citizen id เหมือนกัน และปฏิเสธอาชีพที่ไม่มีในแคตตาล็อก |
| `/job` | `user` | ดูอาชีพ เกรด และสถานะเข้าเวรของตัวเอง |

## ชื่อที่เปลี่ยนใน 3.0

| ชื่อเดิม | ชื่อใหม่ |
| --- | --- |
| `Core.AddItem` | `Core.RegisterItem` |
| `Core.AddItems` | `Core.RegisterItems` |
| `Core.UpdateItem` | `Core.UpdateItemDefinition` |
| `Core.RemoveItem` | `Core.UnregisterItem` |
| `Core.AddJob` | `Core.RegisterJob` |
| `Core.AddJobs` | `Core.RegisterJobs` |
| `Core.UpdateJob` | `Core.UpdateJobDefinition` |
| `Core.RemoveJob` | `Core.UnregisterJob` |
| `Core.CanUseItem` | `Core.GetUsableItem` |
| `Core.ChangeWeight` | `Core.SetMaxWeight` |
| `Core.ChangeSlots` | `Core.SetMaxSlots` |

ส่วนชื่อที่ **ไม่ได้เปลี่ยน** และอย่าไปเดาเอาเองคือ `Core.CreateUseableItem`, `Core.UseItem`,
`Core.HasItem`, `Core.CanCarryItem`, `Core.GetPlayersOnDuty`, `Core.GetDutyCount` และบน player object
คือ `AddItem`, `RemoveItem`, `GetItemBySlot`, `GetItemByName`, `GetItemsByName`, `GetTotalWeight`,
`HasItem`, `SetJob`, `SetJobDuty`
