# Exports

รวม export ทุกตัวที่ `hexa_core` ลงทะเบียนไว้ด้วย `exports('Name', fn)` ทั้งหมดเป็นการลงทะเบียนตอนรันไทม์
ไม่มีการประกาศ `export` หรือ `server_export` ใน `fxmanifest.lua` เลย ดังนั้นทุกตัวใช้ได้ทันทีที่ resource สตาร์ทเสร็จ

ทั้งหมดมี 43 ตัว แบ่งเป็นฝั่ง server 24 ตัว ฝั่ง client 18 ตัว และ shared อีก 1 ตัว

```lua
-- server
local Core = exports['hexa_core']:GetCoreObject()

-- client
local Core = exports['hexa_core']:GetCoreObject()
```

resource ส่วนใหญ่ใช้แค่บรรทัดเดียวข้างบนก็พอ ที่เหลือในหน้านี้มีไว้สำหรับกรณีที่ export ดีกว่าการหยิบจาก core object จริง ๆ
เช่น ลงทะเบียนไอเทม/อาชีพก่อนที่โค้ดของเราจะมีผู้เล่น อ่านข้อมูลที่ต้องคำนวณในรันไทม์ของ `hexa_core` เอง
หรือรอให้ตัวติดตั้งฐานข้อมูลทำงานเสร็จ

::: tip ทำไมบางอย่างถึงเป็น export ไม่ใช่ฟิลด์บน core object
`GetCoreObject()` ส่งค่าข้ามขอบเขต resource ตารางที่ได้กลับมาจึงเป็นสำเนา msgpack ที่ถ่ายไว้ตอนเรียกครั้งแรก
อะไรที่ต้องอ่านค่าสด ๆ เสมอ เช่น รายการอาวุธ แคตตาล็อกไอเทม หรือชุด codec ของกระเป๋า จึงเปิดเป็น export
เพื่อให้โค้ดวิ่งในรันไทม์ของ `hexa_core` และเห็นข้อมูลล่าสุดทุกครั้ง
:::

## กับดักที่ต้องเข้าใจก่อนอย่างอื่น: ไอเทม "ชนิด" กับไอเทม "ของผู้เล่น"

เรื่องนี้สำคัญที่สุดในหน้านี้

```lua
-- ลงทะเบียน "ชนิด" ของไอเทมเข้าแคตตาล็อก ทำครั้งเดียวทั้งเซิร์ฟ
exports['hexa_core']:AddItem('bread', { name = 'bread', label = 'Bread', weight = 100 })

-- ใส่ขนมปังลงกระเป๋าผู้เล่นคนหนึ่ง
local Player = Core.GetPlayer(source)
Player.AddItem('bread', 1)
```

::: danger ชื่อคล้ายกัน แต่คนละเรื่องกันคนละโลก
`exports['hexa_core']:AddItem(name, itemData)` เขียน definition ลง `Shared.Items` เท่านั้น
ไม่ได้ไปแตะกระเป๋าของใครทั้งสิ้น ส่วนการให้ไอเทมกับผู้เล่นคือ `Player.AddItem(name, amount)` บน player object
และไม่เคยเป็น export

`RemoveItem` ก็แบ่งแบบเดียวกัน ตัว export ลบ definition ออกจากแคตตาล็อก
ส่วน `Player.RemoveItem` เอาของออกจากตัวผู้เล่น
:::

บน core object เวอร์ชัน 3.0 เปลี่ยนชื่อฝั่งแคตตาล็อกใหม่หมดเพื่อไม่ให้สับสนได้อีก คือ `Core.RegisterItem`,
`Core.UnregisterItem`, `Core.RegisterItems`, `Core.UpdateItemDefinition`

แต่ **ชื่อฝั่ง export ตั้งใจไม่แตะ** `AddItem`, `AddItems`, `UpdateItem`, `RemoveItem` จะคงชื่อเดิมไว้ถาวร
เพราะนี่คือรูปแบบที่สคริปต์พอร์ตมาเรียกอยู่แล้ว ควรวางลงเซิร์ฟนี้แล้วใช้ได้เลยโดยไม่ต้องแก้
ฝั่งอาชีพก็ใช้กติกาเดียวกัน

---

## Export ฝั่ง server

### core object และเวอร์ชัน

#### GetCoreObject

```lua
local Core = exports['hexa_core']:GetCoreObject()
local Player = Core.GetPlayer(source)
```

คืนตารางหลักของเฟรมเวิร์กทั้งก้อนแบบแบนชั้นเดียว ไม่มี `.Functions` คั่นแล้ว
ตัว `.Functions` ยังอยู่และยังเรียกได้ โค้ดเก่าจึงทำงานต่อได้อีกหนึ่งรุ่น

#### GetCoreVersion

```lua
local version = exports['hexa_core']:GetCoreVersion()
```

อ่านค่า `version` จาก manifest ของ resource ถ้าอยากทิ้งร่องรอยไว้ในคอนโซล ส่งชื่อ resource ตัวเองเข้าไปด้วยได้

```lua
local version = exports['hexa_core']:GetCoreVersion(GetCurrentResourceName())
```

บรรทัด debug นั้นพิมพ์ผ่าน `Core.PrintDebug` ซึ่งเช็ก `Config.Debug` ก่อนฟอร์แมตสตริง ปิด debug ไว้ก็ไม่เสียค่าอะไรเลย

#### AwaitSchemaReady

```lua
CreateThread(function()
    exports['hexa_core']:AwaitSchemaReady(15000)
    -- จากบรรทัดนี้ไป query users / job_grades / items ได้ปลอดภัยแล้ว
end)
```

บล็อกเธรดที่เรียกจนกว่า `install.sql` จะถูกรันครบ แล้วคืน `true` ค่า timeout เป็นมิลลิวินาที ค่าเริ่มต้น `15000`

::: warning ต้องเรียกก่อน SELECT ครั้งแรก
`install.sql` ในนี้เป็น schema ชุดเดียวของทั้งสแตก บนฐานข้อมูลที่เพิ่งสร้างใหม่
resource ที่ query ตาราง `users` ตอนบูตมีโอกาสวิ่งแซง `CREATE TABLE` แล้วพังเงียบ export ตัวนี้มีไว้ปิดช่องนั้นโดยเฉพาะ
และเพราะมันบล็อกเธรด ต้องเรียกใน `CreateThread` เสมอ
:::

### แคตตาล็อกไอเทม

ทุกตัวในหมวดนี้แก้ `Shared.Items` แล้วผลักการเปลี่ยนแปลงไปหา client ทุกคนผ่าน `HexaCore:Client:OnSharedUpdate`
พร้อมยิง `HexaCore:Server:UpdateObject` ให้ resource ที่ถือสำเนา core object อยู่ไปดึงสำเนาใหม่

#### AddItem

```lua
local ok, err = exports['hexa_core']:AddItem('coffee', {
    name = 'coffee',
    label = 'Coffee',
    weight = 200,
    type = 'item',
    unique = false,
    useable = true,
})
```

คืน `false, 'invalid_item_name'` ถ้าชื่อไม่ใช่ string, คืน `false, 'item_exists'` ถ้าลงทะเบียนไว้แล้ว
นอกนั้นคืน `true, 'success'` ตัวนี้ไม่ยอมเขียนทับของเดิม ถ้าอยากทับต้องใช้ `UpdateItem`

#### AddItems

```lua
local ok, err, badItem = exports['hexa_core']:AddItems({
    coffee = { name = 'coffee', label = 'Coffee', weight = 200 },
    sugar  = { name = 'sugar',  label = 'Sugar',  weight = 50 },
})
```

ลงทะเบียนหลายตัวรวดเดียวและยิง `HexaCore:Client:OnSharedUpdateMultiple` แค่ครั้งเดียว แทนที่จะยิงทีละไอเทม
ถ้าล้มเหลวจะคืน `false`, เหตุผล, และตัวที่มีปัญหาเป็นค่าที่สาม

::: warning ไม่ใช่ transaction
`AddItems` หยุดที่รายการแรกที่ผิด แต่รายการที่เขียนไปแล้วก่อนหน้านั้นยังค้างอยู่ในแคตตาล็อก
ถ้ามันคืน `false` แปลว่าแคตตาล็อกถูกเขียนไปครึ่งทาง
:::

#### UpdateItem

```lua
local ok, err = exports['hexa_core']:UpdateItem('coffee', {
    name = 'coffee',
    label = 'Black Coffee',
    weight = 180,
})
```

แทนที่ definition เดิม ถ้ายังไม่เคยลงทะเบียนจะคืน `false, 'item_not_exists'`
ตารางที่ส่งเข้าไปจะไปแทนที่ของเดิมทั้งก้อน ไม่ได้ merge ทีละฟิลด์

#### RemoveItem

```lua
local ok, err = exports['hexa_core']:RemoveItem('coffee')
```

ลบ definition ออกจากแคตตาล็อก ถ้าไม่มีอยู่แล้วคืน `false, 'item_not_exists'`
ย้ำอีกครั้ง ตัวนี้ไม่ได้ไปลบของออกจากกระเป๋าใครทั้งนั้น

### แคตตาล็อกอาชีพ

โครงเหมือนฝั่งไอเทมเป๊ะ ต่างกันแค่ทำกับ `Shared.Jobs`

```lua
exports['hexa_core']:AddJob('miner', {
    label = 'Miner',
    defaultDuty = true,
    grades = {
        ['0'] = { name = 'Digger', payment = 50 },
        ['1'] = { name = 'Foreman', payment = 90, isboss = true },
    },
})

exports['hexa_core']:AddJobs(myJobTable)
exports['hexa_core']:UpdateJob('miner', updatedJob)
exports['hexa_core']:RemoveJob('miner')
```

ค่าที่คืนตรงกับฝั่งไอเทมทุกอย่าง เปลี่ยนแค่ข้อความเป็น `invalid_job_name`, `job_exists`, `job_not_exists`,
`success` และ `AddJobs` คืนตัวที่พังเป็นค่าที่สามเหมือนกัน

ชื่อบน core object คือ `Core.RegisterJob`, `Core.RegisterJobs`, `Core.UpdateJobDefinition`, `Core.UnregisterJob`

### การต่อเติม core object

#### SetField

```lua
exports['hexa_core']:SetField('Bank', {
    Accounts = {},
    MinDeposit = 5,
})
```

เขียนฟิลด์ลงตารางหลักแล้วยิง `HexaCore:Server:UpdateObject` เพื่อให้ทุก resource ที่ถือสำเนาอยู่ไปดึงใหม่
ถ้าชื่อไม่ใช่ string คืน `false, 'invalid_field_name'` นอกนั้น `true, 'success'`

#### SetMethod

```lua
exports['hexa_core']:SetMethod('GetBankBalance', function(citizenid)
    return MySQL.scalar.await('SELECT balance FROM bank WHERE citizenid = ?', { citizenid })
end)
```

ชื่อเดิมสำหรับแขวนฟังก์ชัน มันเขียนลง `HexaCore.Functions` ซึ่ง metatable ของ 3.0 ส่งกลับขึ้นไปที่ `Core` ให้อยู่ดี
ผลลัพธ์จึงเท่ากับเรียก `SetField` ด้วยค่าที่เป็นฟังก์ชัน คืน `false, 'invalid_method_name'` หรือ `true, 'success'`

::: tip ใช้ SetField ดีกว่า
`Core.SetMethod` บน core object เป็น alias ที่เตือนหนึ่งครั้งแล้วส่งต่อไปที่ `Core.SetField`
โค้ดใหม่ควรใช้ `SetField` ทั้งสองทาง
:::

### สถานะร่างกายของผู้เล่น

ค่า hunger / thirst / cleanliness / stress เก็บอยู่ใน `PlayerData.metadata` ถูกบีบให้อยู่ในช่วง `0-100`
และมีรอบลดค่าเดินอยู่ฝั่ง server ตาม `Config.Status` export สี่ตัวนี้คือทางเดียวที่ resource อื่นควรใช้ขยับค่าพวกนี้

```lua
-- กินอาหาร
exports['hexa_core']:AddStatus(source, 'hunger', 20)

-- ความเครียดจากการต่อสู้ค่อย ๆ คลายลง
exports['hexa_core']:RemoveStatus(source, 'stress', 15)

-- อาบน้ำ ตั้งค่าตรง ๆ ไปเลย
exports['hexa_core']:SetStatus(source, 'cleanliness', 100)

-- ตั้งหลายช่องพร้อมกัน
exports['hexa_core']:SetStatus(source, { hunger = 80, thirst = 75 })
```

ฝั่งอ่านค่า

```lua
local all = exports['hexa_core']:GetStatus(source)
local hunger = exports['hexa_core']:GetStatus(source, 'hunger')
```

`GetStatus` คืน `nil` ถ้ายังไม่มีตัวละครโหลดอยู่กับ source นั้น ส่วนตัวที่เขียนค่าจะคืนตารางของค่าที่ลงจริง
หรือ `nil` ถ้าไม่มีอะไรถูกต้องเลยสักช่อง คีย์ที่ไม่ใช่สี่ตัวนี้จะถูกทิ้งเงียบ ๆ ซึ่งตั้งใจให้เป็นแบบนั้น
เพราะ `injail`, `criminalrecord` และเพื่อน ๆ ต้องผ่าน `Player.SetMetaData` เท่านั้น

ทุกครั้งที่เขียน ค่าจะถูกมิเรอร์ลง statebag ของผู้เล่นด้วย resource ที่ไม่อยากยุ่งกับ core object เลย
จึงอ่าน `Player(src).state.hunger` ตรง ๆ ได้

### codec ของกระเป๋าและอาวุธ

`users.inventory` กับ `users.loadout` เป็นคอลัมน์ JSON ที่มีรูปแบบตายตัว ใครก็ตามที่อ่านหรือเขียนสองคอลัมน์นี้
นอกเหนือจาก core ต้องใช้ export ชุดนี้ เพื่อให้ฟอร์แมตเหมือนกันทุกที่ กติกาคือ อาวุธอยู่ใน `loadout` อย่างเดียว
ของทั่วไปอยู่ใน `inventory` อย่างเดียว

#### EncodeInventory / DecodeInventory

```lua
local rows = exports['hexa_core']:EncodeInventory(Player.PlayerData.items)
```

`EncodeInventory` รับตารางช่องในหน่วยความจำ แล้วคืน array ที่เรียงตามช่องในรูป `{ name, amount, slot, info }`
โดยข้ามอาวุธและข้ามของที่จำนวนไม่เกิน 0

`DecodeInventory(raw)` รับค่าดิบจากคอลัมน์ จะเป็น string หรือตารางที่ถอดแล้วก็ได้ และคืน array รูปเดียวกัน
อ่านได้ทั้งรูปแบบ array ปัจจุบัน array รุ่นก่อน และรูปแบบเก่าแบบ `{ name = count }`

#### EncodeLoadout / DecodeLoadout

```lua
local weapons = exports['hexa_core']:DecodeLoadout(row.loadout)
for _, w in ipairs(weapons) do
    print(w.name, w.serie, w.ammo)
end
```

คู่เดียวกันแต่สำหรับอาวุธ แต่ละรายการมี `name`, `slot`, `ammo`, `components`, `tintIndex`, `serie`, `quality`
ค่า `serie` คือรหัสประจำกระบอกที่ระบบอื่นใช้ชี้อาวุธเฉพาะกระบอก เวลาเขียน loadout กลับต้องรักษาค่านี้ไว้เสมอ

#### BuildSlots

```lua
local slots = exports['hexa_core']:BuildSlots(row.inventory, row.loadout)
```

รวมสองคอลัมน์กลับเป็นลิสต์ช่องเดียว เรียงตามเลขช่อง และมีอาวุธรวมอยู่ด้วย
รายการที่เคยเก็บเลขช่องไว้จะได้ช่องเดิมคืน ส่วนรายการที่ไม่มีเลขช่อง เช่น แถวรูปแบบเก่า หรือช่องชนกันเพราะข้อมูลเพี้ยน
จะถูกเติมลงช่องว่างที่เหลือตามลำดับ

#### IsWeapon

```lua
if exports['hexa_core']:IsWeapon(itemName) then
    -- ตัวนี้ต้องไปลง loadout ไม่ใช่ inventory
end
```

ตัวตัดสินเพียงตัวเดียวว่าชื่อนี้เป็นอาวุธหรือไม่ อ่าน `Shared.Weapons` ในรันไทม์ของ `hexa_core` เอง จึงไม่มีทางเห็นสำเนาเก่า

### ระบบกันโกง

#### ExploitBan

```lua
exports['hexa_core']:ExploitBan(source, 'negative money amount')
```

เตะผู้เล่นออกด้วยข้อความ `info.exploit_dropped` ที่แปลตามภาษาไว้แล้ว พร้อมเขียน log หมวด `anticheat`
ผ่าน `hexa_log:server:CreateLog` ซึ่งตอนนี้ `hexa_core` รับฟังเองและส่งต่อไป Discord webhook
ที่ตั้งไว้ใน `Config.Log.Webhooks.anticheat` ได้

::: warning ชื่อว่า Ban แต่จริง ๆ แค่เตะ
ถึงจะชื่อ `ExploitBan` แต่สิ่งที่มันทำคือ drop ผู้เล่นออกจากเซสชันปัจจุบันเท่านั้น
ไม่ได้บันทึกประวัติแบน และไม่ได้กันการเชื่อมต่อกลับเข้ามาใหม่ ให้คิดว่ามันคือ "เตะออกแล้วบันทึก log"
ถ้าต้องการแบนถาวรต้องต่อระบบเก็บแบนของตัวเองเพิ่ม
:::

---

## Export ฝั่ง client

### GetCoreObject

```lua
local Core = exports['hexa_core']:GetCoreObject()
```

สัญญาเดียวกับฝั่ง server คือได้ core table ฝั่ง client แบบแบนชั้นเดียว มี `Core.PlayerData`, `Core.Config`,
`Core.Shared` และฟังก์ชันฝั่ง client ครบทุกตัว

### Prompt

ชุด prompt เป็นแค่สะพานบาง ๆ `hexa_core` ยังเก็บบัญชีรายการ prompt ไว้เอง แต่ส่งงานวาดจริงไปให้ระบบ interaction
ซึ่งเรนเดอร์เป็น HTML overlay สไตล์ RedM แทนระบบ `UiPrompt` ของเนทีฟ
ชื่อและ signature ของ export ไม่เปลี่ยนเลย resource ที่เขียนไว้ตั้งแต่ 2.x จึงใช้ต่อได้โดยไม่ต้องแก้อะไร

```lua
exports['hexa_core']:createPrompt('saloon_bar', vector3(-321.4, 803.1, 118.4), 'ENTER', 'Order a drink', {
    type = 'client',
    event = 'myresource:client:OpenBarMenu',
})
```

```lua
-- ยิง server event พร้อมส่งอาร์กิวเมนต์
exports['hexa_core']:createPrompt('post_office', coords, 'ENTER', 'Collect mail', {
    type = 'server',
    event = 'myresource:server:CollectMail',
    args = { 'valentine' },
})
```

`options.type` ใส่ได้ `'client'` หรือ `'server'` อะไรที่ไม่ใช่ `'client'` จะถูกมองเป็น server event
`options.args` จะถูก unpack เข้าไปในการเรียก event และ `options.promptLabel` ใช้ทับป้ายปุ่มสั้น ๆ ในเกม
ถ้าไม่ส่งมา ระบบ interaction จะตกกลับไปใช้ค่า `text`

::: warning อาร์กิวเมนต์ key ถูกมองข้าม
ทั้งสแตกใช้มาตรฐานเดียวกันหมดคือกด ENTER ค้าง 1000ms ค่า `key` ที่ส่งเข้ามาถูกเก็บไว้ในตาราง prompt
เพื่อให้ `getPrompt()` คงรูปเดิมเท่านั้น ไม่ได้เปลี่ยนปุ่มจริง

ระยะมาจาก `Config.PromptDistance` (1.0 คือระยะที่กดใช้งานได้) และ `Config.PromptVisible` (3.0 คือระยะที่หมุดเริ่มโผล่)
:::

```lua
exports['hexa_core']:createPromptGroup('stable', 'Stable', coords, {
    { name = 'take_horse',  text = 'Take horse',  options = { type = 'client', event = 'stable:take' } },
    { name = 'store_horse', text = 'Store horse', options = { type = 'client', event = 'stable:store' } },
})
```

::: danger createPromptGroup ใช้ปุ่มร่วมกันทั้งกลุ่ม
เพราะทุกตัวในกลุ่มผูกกับ ENTER ค้างตัวเดียวกัน การกดค้างครบหนึ่งครั้งจะยิง `onComplete` ของสมาชิกทุกตัวพร้อมกัน
ตอนนี้ยังไม่มี resource ไหนในสแตกเรียก `createPromptGroup` เลย
ถ้าคุณกำลังจะเป็นคนแรก ให้เปลี่ยนไปเปิดเมนูให้เลือกรายการแทน หรือลงทะเบียน prompt แยกทีละตัว
:::

```lua
local prompts = exports['hexa_core']:getPrompt()
local groups  = exports['hexa_core']:getPromptGroup()

exports['hexa_core']:deletePrompt('saloon_bar')
exports['hexa_core']:deletePromptGroup('stable')
```

`getPrompt` และ `getPromptGroup` คืนตารางรายการที่ลงทะเบียนไว้ทั้งก้อน ส่วนคู่ delete จะล้างบัญชีในเครื่อง
แล้วเรียก `RemovePrompt` / `RemoveGroup` ของระบบ interaction ต่อ ทุกอย่างที่ resource นี้ลงทะเบียนไว้
จะถูกเก็บกวาดอัตโนมัติตอน `onResourceStop`

### ข้อความบนหน้าจอ

ตัววาดข้อความแบบง่ายของ RDR3 สร้างบน `CreateVarString` และ `DisplayText` แสดงได้ทีละหนึ่งข้อความ
ปักไว้ที่ตำแหน่งใดตำแหน่งหนึ่งในสามจุด

```lua
exports['hexa_core']:DrawText('Hold ENTER to mount', 'right')
exports['hexa_core']:ChangeText('Release to dismount', 'top')
exports['hexa_core']:HideText()
```

`DrawText(text, pos)` เริ่ม loop วาด `ChangeText(text, pos)` สลับข้อความในที่เดิม
ส่วน `HideText()` กับ `KeyPressed()` ทำงานเหมือนกันคือล้างข้อความทิ้ง
`KeyPressed` แยกเป็นอีกชื่อเพราะโค้ดรุ่นก่อนใช้มันเป็นจุดเรียกตอน "ผู้เล่นกดแล้ว เอาข้อความลง"

`pos` รับได้ทั้งชื่อสั้น `'left'`, `'right'`, `'top'` และชื่อเต็ม `'left-center'`, `'right-center'`, `'top-center'`
ถ้าใส่ค่าที่ไม่รู้จักจะตกกลับไปเป็น `'right-center'`

::: tip สั่งจากฝั่ง server ก็ได้
มี net event คู่กันอยู่ server จึงขึ้นข้อความบนจอผู้เล่นคนเดียวได้โดยไม่ต้องผ่าน export ฝั่ง client
ได้แก่ `hexa_core:client:DrawText`, `hexa_core:client:ChangeText`, `hexa_core:client:HideText`
และ `hexa_core:client:KeyPressed` อาร์กิวเมนต์เหมือนกันทุกตัว

```lua
TriggerClientEvent('hexa_core:client:DrawText', source, 'The sheriff is watching', 'top')
```
:::

### สถานะฝั่ง client

```lua
local all = exports['hexa_core']:GetStatus()
local hunger = exports['hexa_core']:GetStatus('hunger')
```

สำเนาค่าสถานะสี่ตัวฝั่ง client ที่ถูกอัปเดตด้วย `HexaCore:Client:UpdateNeeds`
ค่าเริ่มต้นตั้งไว้ที่ `100` ทุกช่อง เพื่อไม่ให้ HUD วาดแถบว่างเปล่าในไม่กี่เฟรมก่อนก้อนแรกจาก server จะมาถึง

::: warning ชื่อเดียวกัน แต่ signature คนละแบบ
`GetStatus` มีทั้งสองฝั่ง ฝั่ง server รับ `(src, key)` ส่วนฝั่ง client รับแค่ `(key)` ใช้แทนกันไม่ได้
:::

```lua
-- เติมแกนสถานะพร้อมหลอดสเตมินา
exports['hexa_core']:RefillCores()

-- เติมเฉพาะแกน ไม่ยุ่งกับสเตมินา
exports['hexa_core']:RefillCores(false)
```

`RefillCores` อ่านค่าเป้าหมายจาก `Config.Status.Cores` และไม่ทำอะไรเลยถ้าบล็อกนั้นถูกปิดไว้หรือ ped ตายอยู่
เหมาะกับการเรียกหลังชุบชีวิตหรือหลังเปลี่ยนโมเดล และมันถูกเรียกอัตโนมัติอยู่แล้วตอน `HexaCore:Client:OnPlayerLoaded`

### สีอาณาเขตบนแผนที่

ผูก hash ของโซน ไม่ว่าจะเป็น state, district หรือ region เข้ากับ blip style แล้วเกมจะวาดเส้นขอบและสีพื้นให้เอง
ทั้งบนมินิแมพและแผนที่ใหญ่ ตั้งค่าทั้งหมดอยู่ที่ `Config.Colormap`
ไม่มี loop เลย ทาสีครั้งเดียวตอน resource start แล้วค้างอยู่จนกว่าจะถูกล้าง

```lua
-- ทาสีโซน Ambarino ด้วยชื่อสีจากพาเลตต์
exports['hexa_core']:SetZoneColor(0x3B8DD21A, 'red')

-- หรือใส่ชื่อ blip style ตรง ๆ ข้ามพาเลตต์ไปเลย
exports['hexa_core']:SetZoneColor(0x3B8DD21A, 'BLIP_STYLE_TURRET_WEAPON')

exports['hexa_core']:ResetZoneColor(0x3B8DD21A)

local painted = exports['hexa_core']:RefreshZoneColors()
exports['hexa_core']:ClearZoneColors()
```

`SetZoneColor(zone, color)` รับได้ทั้งตัวเลข hash และสตริงในทั้งสองอาร์กิวเมนต์ ส่วน `color` ใส่ได้ทั้งชื่อสี
จาก `Config.Colormap.Colors` และชื่อ `BLIP_STYLE_*` ดิบ ๆ คืน `true` เมื่อสำเร็จ และ `false` ถ้าแปลงค่าไหนไม่ได้

`ResetZoneColor(zone)` ล้างโซนเดียวและคืนค่า boolean
`RefreshZoneColors()` ล้างทุกโซนที่ resource นี้ทาไว้ แล้วทาใหม่ตาม `Config.Colormap.Zones` และคืนจำนวนโซนที่ทาสำเร็จ
ถ้าปิด colormap ไว้จะคืน `0` ส่วน `ClearZoneColors()` ล้างอย่างเดียวไม่ทาใหม่

ระบบเก็บรายการเฉพาะโซนที่ `hexa_core` ทาเอง จึงไม่มีทางไปล้างของ resource อื่นทิ้ง

### ความปลอดภัยฝั่ง NUI

#### GenerateCSRFToken

```lua
local token = exports['hexa_core']:GenerateCSRFToken()
SendNUIMessage({ action = 'open', token = token })
```

ออก token ใช้ครั้งเดียวให้หน้า NUI ของคุณส่งกลับมาทาง callback ชื่อ `validateCSRF`

::: danger นี่ไม่ใช่ความปลอดภัยฝั่ง server
token ถูกสร้างที่ client ส่งเข้า NUI ของ client เอง แล้ว client เป็นคนตรวจเอง
ขอบเขตที่แท้จริงคือกันไม่ให้หน้า NUI อื่นหรือ iframe ที่หลุดเข้ามาใน CEF ของผู้เล่นยิง callback ปลอมเข้ามา
มันทำอะไรผู้เล่นที่ควบคุมเครื่องตัวเองอยู่ไม่ได้เลย เพราะเขาแค่ไม่เรียก `validateCSRF` ก็จบ

ทุกการตัดสินใจที่มีผลจริง ทั้งสิทธิ์ ระยะทาง เงิน และความเป็นเจ้าของไอเทม ต้องตรวจซ้ำที่ server เสมอ
เมื่อการตรวจไม่ผ่าน ระบบจะรายงานไปที่ `HexaCore:Server:ReportCSRFFailure` แล้ว server เป็นคนตัดสินเอง
ตาม `Config.Security.CSRFFailurePolicy` ไม่ใช่ให้ client สั่งเตะตัวเองเหมือนเดิมอีกแล้ว
:::

---

## Export ฝั่ง shared

### GetWeapons

```lua
local weapons = exports['hexa_core']:GetWeapons()
```

ลงทะเบียนใน `shared/main.lua` จึงตอบได้ทั้งฝั่ง client และ server คืนตาราง `Shared.Weapons` สด ๆ
จากรันไทม์ของ `hexa_core` ซึ่งเป็นเหตุผลที่มันเป็น export ไม่ใช่ค่าที่อ่านจากสำเนา core object

---

## อะไรเปลี่ยนใน 3.0

### ชื่อ export ไม่เปลี่ยน

การแบนชั้นใน 3.0 เปลี่ยนชื่อบน core object ไปเยอะมาก แต่แทบไม่แตะชื่อบน export เลย และนั่นเป็นความตั้งใจ
เพราะ export คือขอบเขตที่สคริปต์ภายนอกและสคริปต์ที่พอร์ตมาวางตัวอยู่ ถ้าทำพังก็คือสคริปต์ที่พอร์ตมา
ทั้งเซิร์ฟพังพร้อมกันทันที

| Export (ไม่เปลี่ยน) | core object (3.0)           |
| ------------------ | --------------------------- |
| `AddItem`          | `Core.RegisterItem`         |
| `AddItems`         | `Core.RegisterItems`        |
| `UpdateItem`       | `Core.UpdateItemDefinition` |
| `RemoveItem`       | `Core.UnregisterItem`       |
| `AddJob`           | `Core.RegisterJob`          |
| `AddJobs`          | `Core.RegisterJobs`         |
| `UpdateJob`        | `Core.UpdateJobDefinition`  |
| `RemoveJob`        | `Core.UnregisterJob`        |
| `SetMethod`        | `Core.SetField`             |
| `SetField`         | `Core.SetField`             |

การเรียกชื่อเก่าบน **core object** จะพิมพ์คำเตือน deprecation หนึ่งครั้ง พร้อมบอกว่า resource ไหนเป็นคนเรียก แล้วส่งต่อให้ตัวใหม่
ส่วนการเรียกชื่อเก่าผ่าน **export** ไม่พิมพ์อะไรเลย เพราะบนขอบเขตนั้นมันไม่ใช่ของ deprecated แต่เป็นชื่อที่รองรับอย่างเป็นทางการ

::: tip กติกาจำง่าย
ถ้าคุณถือ core object อยู่ ให้ใช้ชื่อแบบ 3.0
ถ้าคุณเรียกข้าม resource ด้วย `exports['hexa_core']:` ให้ใช้ชื่อตามหน้านี้
:::

### ไม่มี export ตัวไหนถูกถอดออก

3.0 ไม่ได้ลบ export ตัวใดเลย มีสองส่วนที่เปลี่ยนวิธีทำงานข้างในแต่คงรูปหน้าตาสาธารณะไว้เหมือนเดิม

- **Prompt** ไม่ได้วาดผ่านระบบ `UiPrompt` ของเนทีฟอีกแล้ว ตอนนี้ระบบ interaction เป็นคนเรนเดอร์
  ส่วน `createPrompt`, `createPromptGroup`, `getPrompt`, `getPromptGroup`, `deletePrompt`
  และ `deletePromptGroup` ยังอยู่ครบพร้อม signature เดิม โดย `hexa_core` ส่งต่อไปให้ระบบ interaction ข้างใน
  ผู้เรียกที่เขียนไว้ตั้งแต่ 2.x ไม่ต้องแก้อะไรเลย
- **ข้อความบนหน้าจอ** ยังเป็น `DrawText`, `ChangeText`, `HideText`, `KeyPressed` เหมือนเดิม
  ตัวที่ทำงานจริงใช้เส้นทาง `CreateVarString` / `DisplayText` ของ RDR3 ตลอดทั้งเส้น

### ของใหม่ใน 3.0

- `AwaitSchemaReady` ตัวติดตั้งฐานข้อมูลย้ายมาอยู่ใน core แล้ว และนี่คือวิธีรอให้มันเสร็จ
- `GetStatus`, `SetStatus`, `AddStatus`, `RemoveStatus` ฝั่ง server กับ `GetStatus`, `RefillCores` ฝั่ง client
  ระบบสถานะย้ายการนับเวลามาไว้ฝั่ง server และนี่คือขอบสาธารณะของมัน
- `EncodeInventory`, `DecodeInventory`, `EncodeLoadout`, `DecodeLoadout`, `BuildSlots`, `IsWeapon`
  ชุด codec ของกระเป๋าถูกรวมมาไว้ที่เดียว เพื่อไม่ให้ core กับระบบกระเป๋าเขียน `users.inventory`
  ด้วยฟอร์แมตคนละแบบอีกต่อไป
- `SetZoneColor`, `ResetZoneColor`, `RefreshZoneColors`, `ClearZoneColors` สำหรับระบายสีโซนบนแผนที่
- `GetCoreVersion` รับชื่อผู้เรียกเป็นอาร์กิวเมนต์เสริมได้แล้ว และพิมพ์ผ่านตัว debug ที่มีสวิตช์ควบคุม
