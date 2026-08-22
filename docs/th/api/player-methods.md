# เมธอดของอ็อบเจกต์ผู้เล่น

ตัวละครทุกตัวที่โหลดอยู่บนเซิร์ฟเวอร์คืออ็อบเจกต์ผู้เล่นหนึ่งก้อน สร้างจาก `Core.CreatePlayer`
ใน `server/player.lua` หน้านี้คืออ้างอิงฉบับเต็มของทุกเมธอดบนอ็อบเจกต์นั้น ทั้งพารามิเตอร์จริง
ค่าที่คืนจริง สิ่งที่มันยิงออกไป และค่าที่ได้เมื่อ resource ที่มันพึ่งพาไม่ได้สตาร์ตอยู่

ตั้งแต่ 3.0 เมธอดแขวนอยู่บนตัวอ็อบเจกต์ตรง ๆ ไม่ต้องผ่านชั้น `.Functions` อีกแล้ว

```lua
local Core = exports['hexa_core']:GetCoreObject()

local Player = Core.GetPlayer(source)
if not Player then return end

Player.AddMoney('cash', 100, 'reward')
```

ทุกเมธอดเป็นฟิลด์ธรรมดาบนตาราง จึงต้องเรียกด้วยจุดเสมอ ห้ามใช้โคลอน เพราะ
`Player:AddMoney(...)` จะส่งตัวอ็อบเจกต์เองเข้าไปเป็นพารามิเตอร์ตัวแรกแล้วพัง

## ลงทะเบียนไอเทม ไม่ใช่การให้ไอเทม

เรื่องนี้ต้องเข้าใจให้ตรงก่อนอย่างอื่นทั้งหมดในหน้านี้ เพราะเมื่อก่อนสองอย่างนี้ใช้คำกริยาเดียวกัน
ทั้งที่ความหมายตรงข้ามกัน

```lua
-- นิยามไอเทม "ชนิดใหม่" ให้ทั้งเซิร์ฟเวอร์รู้จัก
Core.RegisterItem('bandage', { name = 'bandage', label = 'Bandage', weight = 1 })

-- ใส่ไอเทมที่มีอยู่แล้วลงกระเป๋าของผู้เล่น "คนเดียว"
Player.AddItem('bandage', 1, false, false, 'medic supplies')
```

`Core.RegisterItem` / `Core.UnregisterItem` / `Core.RegisterItems` / `Core.UpdateItemDefinition`
ยุ่งกับแคตตาล็อกกลางใน `Core.Shared.Items` เท่านั้น ไม่แตะตัวผู้เล่นเลยแม้แต่นิดเดียว
ส่วน `Player.AddItem` กับ `Player.RemoveItem` ย้ายของเข้าออกกระเป๋าตัวละครคนเดียว
และไม่แตะแคตตาล็อก

::: danger
เฉพาะบนหน้า export เท่านั้น `exports['hexa_core']:AddItem` และ `exports['hexa_core']:RemoveItem`
คือฝั่ง **แคตตาล็อก** มันเป็น alias ถาวรของ `Core.RegisterItem` และ `Core.UnregisterItem`
ที่เก็บไว้ให้สคริปต์ที่ port มาโหลดผ่าน ถ้าตั้งใจจะยื่นของให้ผู้เล่น ต้องใช้ `Player.AddItem`
บนอ็อบเจกต์ผู้เล่น ไม่ใช่ export ตัวนี้
:::

## ฟิลด์บนอ็อบเจกต์

| ฟิลด์ | ชนิด | คืออะไร |
| --- | --- | --- |
| `PlayerData` | table | ตัวตัวละคร - `citizenid`, `money`, `charinfo`, `job`, `metadata`, `items`, `position` |
| `Offline` | boolean | `true` เมื่อสร้างจากแถวในฐานข้อมูลโดยไม่มี `source` |
| `Dirty` | boolean | ธงบอกว่ามีอะไรเปลี่ยนตั้งแต่เซฟรอบก่อน รอบกวาดเซฟจะข้ามคนที่ธงไม่ขึ้น |
| `Functions` | table | ตารางมิเรอร์ของทุกเมธอดบนอ็อบเจกต์ เก็บไว้รองรับโค้ดเก่า |

`Dirty` ถูกตั้งเป็น `true` ตั้งแต่ตอนสร้าง เพราะคนที่เพิ่งโหลดเข้ามายังไม่เคยถูกเขียนลง DB
ในรอบนี้เลย

`Player.Functions.AddMoney(...)` ยังเรียกได้อยู่ มันเป็นตารางจริงที่ metatable คอยซิงก์ให้
ของที่ resource อื่นแขวนเพิ่มตอน runtime ก็โผล่ในนั้นด้วย แต่โค้ดใหม่ให้เขียนแบบแบน

::: warning
`PlayerData` กับ `Functions` เป็นสองชื่อเดียวที่ resource อื่นควรอ่านตรง ๆ อย่าเขียนทับด้วยมือ
ให้ใช้เมธอดข้างล่าง เพราะเมธอดจะปักธง dirty และกระจายค่าใหม่ให้เองครบ
:::

## เงิน

ประเภทเงินมาจาก `Config.Money.MoneyTypes` ซึ่งค่าเริ่มต้นมี `cash`, `bank` และ `gold`
ทั้งสี่เมธอดแปลงชื่อประเภทเป็นตัวพิมพ์เล็กก่อนใช้เสมอ

### AddMoney

```lua
Player.AddMoney(moneytype, amount, reason)
```

คืน `boolean` ถ้าได้ `false` แปลว่าไม่มีเงินเข้าเลย ซึ่งเกิดได้สามทาง คือ `moneytype`
ไม่ใช่สตริง, `amount` แปลงเป็นตัวเลขไม่ได้หรือติดลบ, และ `moneytype` นั้นไม่มีอยู่ใน
`PlayerData.money`

```lua
local ok = Player.AddMoney('cash', 250, 'bounty payout')
if not ok then
    Core.Error('could not pay the bounty to %s', Player.PlayerData.citizenid)
end
```

เมื่อสำเร็จ และเฉพาะผู้เล่นที่ออนไลน์อยู่ มันจะเรียก `SyncPlayerData` เขียน log ผ่าน
`hexa_log:server:CreateLog` หมวด `playermoney` แล้วยิง `HexaCore:Client:OnMoneyChange`
กับ `HexaCore:Server:OnMoneyChange` ด้วย operation `'add'` ยอดที่เกิน 100000
จะถูก log พร้อมธงแจ้งเตือน

`reason` ถ้าไม่ส่งจะกลายเป็น `'unknown'` และค่านี้ไปโผล่ในบรรทัด log ฉะนั้นส่งมาเสมอ

### RemoveMoney

```lua
Player.RemoveMoney(moneytype, amount, reason)
```

คืน `boolean` เงื่อนไขที่ทำให้ได้ `false` เหมือน `AddMoney` ทุกข้อ บวกกับข้อสำคัญที่สุด
คือยอดเงินไม่พอ

::: warning
เมธอดนี้คือตัวตัดสินว่าผู้เล่นจ่ายไหวหรือไม่ ต้องเช็คค่าที่คืนก่อนยื่นของเสมอ
รูปแบบ `if Player.RemoveMoney(...) then giveGoods() end` คือสัญญาที่ทุกสคริปต์บนเซิร์ฟนี้
ต้องทำตาม
:::

```lua
if not Player.RemoveMoney('bank', 1500, 'horse purchase') then
    return Core.Notify(source, { type = 'error', description = 'Not enough money in the bank' })
end

Player.AddItem('horse_deed', 1, false, false, 'horse purchase')
```

เพดานล่างคิดแยกตามประเภทเงิน ประเภทที่อยู่ใน `Config.Money.DontAllowMinus`
(ค่าเริ่มต้นคือ `cash`, `gold`, `bank`, `bloodmoney`) ห้ามต่ำกว่า `0` เด็ดขาด
ส่วนประเภทอื่นใช้ `Config.Money.MinusLimit` ซึ่งตัวมันเองก็ถูกบีบไม่ให้ต่ำกว่า `0` อีกชั้น
ผลจริงคือยอดเงินบนเซิร์ฟนี้ติดลบไม่ได้ ต่อให้ไปแก้ค่าในคอนฟิกกลับก็ตาม

### SetMoney

```lua
Player.SetMoney(moneytype, amount, reason)
```

คืน `boolean` ตรวจค่าเข้าเหมือน `AddMoney` ทุกอย่าง แต่เป็นการ "ทับ" ยอดไม่ใช่บวกลบ
และยิง event เปลี่ยนแปลงด้วย operation `'set'`

```lua
Player.SetMoney('bank', 0, 'account seized')
```

### GetMoney

```lua
Player.GetMoney(moneytype)
```

คืนยอดเป็นตัวเลข จะคืน `false` เมื่อ `moneytype` ไม่ใช่สตริง และคืน `nil` เมื่อเป็นสตริง
แต่ตัวละครนี้ไม่มีประเภทเงินนั้น ถ้าจะเอาไปคำนวณต่อให้ใส่ค่าสำรองไว้ด้วย

```lua
local cash = Player.GetMoney('cash') or 0
```

## กระเป๋าและไอเทม

เมธอดกลุ่มนี้ส่งต่อไปที่ `hexa_inventory` ทั้งหมด แต่ละตัวเช็ค
`GetResourceState('hexa_inventory') == 'started'` ก่อนเสมอ ถ้า inventory หยุดอยู่หรือกำลัง
restart มันจะคืนค่าที่ปลอดภัยแทนการโยน error

| เมธอด | ค่าที่คืนเมื่อ `hexa_inventory` ไม่ได้สตาร์ต |
| --- | --- |
| `AddItem` | `false, false` |
| `RemoveItem` | `false` |
| `GetItemBySlot` | `nil` |
| `GetItemByName` | `nil` |
| `GetItemsByName` | `{}` |
| `GetTotalWeight` | `0` |
| `HasItem` | `false` |
| `CanCarryItem` | `false` |

::: warning
"ค่าที่ปลอดภัย" ไม่ได้แปลว่าสำเร็จ ตอน inventory ล่ม `AddItem` คืน `false, false`
ซึ่งหน้าตาเหมือนกระเป๋าเต็มเป๊ะสำหรับคนที่อ่านแค่ค่าแรก สคริปต์ที่หักเงินก่อนแล้วค่อยเพิ่มของ
จะกินเงินผู้เล่นแล้วไม่ให้อะไรเลย ให้หักเงินหลังของลงกระเป๋าแล้วเสมอ
:::

### AddItem

```lua
Player.AddItem(item, amount, slot, info, reason)
```

**คืนค่าสองตัว**: `stored, dropped`

- `stored` เป็น `true` เมื่อของเข้ากระเป๋าจริง
- `dropped` เป็น `true` เมื่อกระเป๋าเต็มจนของถูกวางเป็นถุงไว้กับพื้นแทน

`dropped = true` แปลว่า **ของมีอยู่จริงในโลก** ห้ามคืนเงินให้ และห้ามยิงซ้ำ

```lua
local stored, dropped = Player.AddItem('canned_beans', 2, false, false, 'store purchase')
if not stored and not dropped then
    Player.AddMoney('cash', 12, 'refund - could not deliver goods')
end
```

`slot` กับ `info` ไม่บังคับ และเมธอดจะส่ง `false` แทน `nil` ให้เองเมื่อไม่ได้ระบุ อันนี้ตั้งใจ
เพราะ `nil` ที่อยู่กลางรายการพารามิเตอร์จะหายไปตอนข้าม resource boundary ทำให้ `reason`
เลื่อนไปนั่งตำแหน่งของ slot ถ้าจะส่งเองก็ต้องส่ง `false` ไม่ใช่ `nil`

`reason` ถ้าไม่ส่งจะเป็น `'hexa_core:player.AddItem'` และการเรียกครั้งนี้จะปัก `Player.Dirty`
ให้เอง เพราะเส้นทางนี้ไม่ได้ผ่าน `SyncPlayerData`

### RemoveItem

```lua
Player.RemoveItem(item, amount, slot, reason)
```

คืน `boolean` เป็น `true` เมื่อหักของออกได้จริง จะได้ `false` เมื่อชื่อไอเทมไม่มีในแคตตาล็อก
เมื่อ `amount` ไม่ใช่จำนวนบวก และเมื่อของในกระเป๋าไม่พอ `reason` ถ้าไม่ส่งจะเป็น
`'hexa_core:player.RemoveItem'` และปัก `Player.Dirty` ให้เหมือนกัน

```lua
if Player.RemoveItem('lockpick', 1, false, 'lockpick broke') then
    TriggerClientEvent('hexa_lockpick:client:broke', source)
end
```

### GetItemBySlot

```lua
Player.GetItemBySlot(slot)
```

คืนตารางไอเทมในช่องนั้น หรือ `nil` เมื่อช่องว่าง ของที่คืนกลับมาผ่านการเช็คค่าเสื่อมสภาพแล้ว
ค่า `info.quality` บนมันจึงเป็นค่าปัจจุบัน

### GetItemByName

```lua
Player.GetItemByName(item)
```

คืนตารางไอเทมจากช่องแรกที่เจอชื่อนั้น หรือ `nil` ใช้ตอนที่แค่อยากรู้ว่ามีสักชิ้นไหม
และอยากอ่าน `info` ของมัน

```lua
local pocketWatch = Player.GetItemByName('pocket_watch')
if pocketWatch then
    print(pocketWatch.info.quality)
end
```

### GetItemsByName

```lua
Player.GetItemsByName(item)
```

คืน **อาเรย์ของทุกกอง** ที่เป็นไอเทมชื่อนั้น เรียงตามช่อง ถ้าไม่มีเลยจะคืน `{}`
จึงวนลูปได้เสมอโดยไม่ต้องเช็ค nil

```lua
local total = 0
for _, stack in ipairs(Player.GetItemsByName('gold_nugget')) do
    total = total + stack.amount
end
```

### GetTotalWeight

```lua
Player.GetTotalWeight()
```

คืนน้ำหนักรวมของทุกอย่างที่ผู้เล่นแบกอยู่ เป็นตัวเลข น้ำหนักบนเซิร์ฟนี้คิดเป็นเปอร์เซ็นต์
`Config.Player.PlayerDefaults.weight` คือ `100` และค่า `weight` ของไอเทมแต่ละชิ้นคือส่วนแบ่ง
ของ 100 นั้น

### HasItem

```lua
Player.HasItem(items, amount)
```

คืน `boolean` โดย `items` ใส่เป็นชื่อไอเทมตัวเดียวหรือเป็นตารางของชื่อก็ได้ ส่งต่อไปที่
`Core.HasItem` พร้อม source ของผู้เล่นคนนี้

```lua
if not Player.HasItem({ 'shovel', 'lantern' }) then
    return Core.Notify(source, { type = 'error', description = 'You need a shovel and a lantern' })
end
```

### CanCarryItem

```lua
Player.CanCarryItem(item, amount)
```

คืน `boolean` บอกว่าน้ำหนักที่เหลือพอรับ `amount` ชิ้นของ `item` หรือไม่ ถ้าไม่ส่ง `amount`
จะถือเป็น `1` ส่งต่อไปที่ `Core.CanCarryItem`

ถ้าชื่อไอเทมไม่มีใน `Core.Shared.Items` เลย มันจะคืน `false` พร้อมพิมพ์ error ผ่าน
`Core.Error` การพิมพ์ชื่อไอเทมผิดจึงอ่านออกมาเป็น "แบกไม่ไหว" ไม่ใช่สคริปต์พังกลางทาง

```lua
if not Player.CanCarryItem('bear_pelt', 3) then
    return Core.Notify(source, { type = 'error', description = 'Your satchel is too full' })
end

Player.AddItem('bear_pelt', 3, false, false, 'hunting')
```

## อาชีพ

### SetJob

```lua
Player.SetJob(job, grade)
```

คืน `boolean` จะได้ `false` กรณีเดียวคือ `job` ไม่ใช่คีย์ใน `Core.Shared.Jobs`
ชื่ออาชีพถูกแปลงเป็นตัวพิมพ์เล็ก และ `grade` ถ้าไม่ส่งจะเป็น `'0'`

```lua
if not Player.SetJob('sheriff', 2) then
    Core.Error('sheriff is not a registered job')
end
```

::: warning
ระดับขั้นที่ไม่มีอยู่จริง **ไม่ทำให้ล้มเหลว** อาชีพจะถูกตั้งพร้อมขั้นสำรอง
`{ name = 'No Grades', level = 0, payment = 30, isboss = false }` แล้วเมธอดยังคืน `true`
อยู่ดี ถ้าการแจกขั้นผิดเป็นเรื่องใหญ่สำหรับระบบของคุณ ต้องเช็ค
`Core.Shared.Jobs[job].grades` เองก่อนเรียก
:::

`onduty` ดึงมาจาก `defaultDuty` ของอาชีพ และ `type` ดึงจาก `type` ของอาชีพ ถ้าไม่มีจะเป็น
`'none'` ถ้าผู้เล่นออนไลน์อยู่ มันจะเรียก `SyncPlayerData` แล้วยิง
`HexaCore:Server:OnJobUpdate` กับ `HexaCore:Client:OnJobUpdate` ส่วนอ็อบเจกต์ออฟไลน์
จะเปลี่ยนแค่ `PlayerData` แล้วเงียบ

### SetJobDuty

```lua
Player.SetJobDuty(onDuty)
```

ไม่คืนค่า ค่าที่ส่งเข้าไปถูกบังคับให้เป็น boolean จริง อะไรก็ตามที่เป็น truthy จะกลายเป็น `true`
ยิง event `OnJobUpdate` ทั้งสองฝั่งแล้วตามด้วย `SyncPlayerData`

```lua
Player.SetJobDuty(not Player.PlayerData.job.onduty)
```

::: danger
เมธอดนี้ไม่ได้กันกรณีตัวละครไม่มี `PlayerData.job` และจะ error ทันทีถ้าเจอ ในทางปฏิบัติ
ตัวละครที่โหลดแล้วมี job เสมอเพราะ `applyDefaults` เติมอาชีพ `unemployed` ให้ แต่อย่าเอาไปเรียก
บนตารางที่ประกอบเองครึ่ง ๆ กลาง ๆ
:::

## ข้อมูลตัวละครและ metadata

### SetPlayerData

```lua
Player.SetPlayerData(key, val)
```

ไม่คืนค่า เขียนคีย์ชั้นบนสุดของ `PlayerData` แล้วเรียก `SyncPlayerData` ถ้า `key` ไม่ใช่สตริง
มันจะเงียบและไม่ทำอะไรเลย เมธอดนี้คือทางที่ `hexa_inventory` ใช้เขียน `items` กลับมาทุกครั้ง
ที่ของในกระเป๋าเปลี่ยน

```lua
Player.SetPlayerData('position', { x = -298.0, y = 780.0, z = 119.0 })
```

### SetMetaData

```lua
Player.SetMetaData(meta, val)
Player.SetMetaData(tableOfPairs)
```

ไม่คืนค่า รับได้สองแบบ คือคีย์เป็นสตริงพร้อมค่า หรือส่งตารางคู่คีย์-ค่าเข้ามาทีเดียว
ทั้งสองแบบจบด้วย `SyncPlayerData`

```lua
Player.SetMetaData('callsign', '1-Lincoln-18')

Player.SetMetaData({ hunger = 100, thirst = 100, stress = 0 })
```

`hunger`, `thirst`, `cleanliness` และ `stress` ถูกบีบให้อยู่ในช่วง `0-100` ตอนเขียน
สคริปต์ที่บวกความเครียดรัว ๆ จึงดันค่าทะลุจนแถบใน `hexa_status` ล้นกรอบไม่ได้
คีย์อื่นเก็บตามที่ส่งมาทุกประการ

### GetMetaData

```lua
Player.GetMetaData(meta)
```

คืนค่าที่อยู่ใต้คีย์นั้นใน `PlayerData.metadata` หรือ `nil` ถ้า `meta` ไม่ใช่สตริง
มันจะคืน `nil` ทันทีโดยไม่ไปอ่านอะไรเลย

```lua
local jailTime = Player.GetMetaData('injail') or 0
```

คีย์ metadata ที่ตัวละครใหม่มีตั้งแต่แรกดูได้จาก `Config.Player.PlayerDefaults.metadata` ได้แก่
`health`, `hunger`, `thirst`, `cleanliness`, `stress`, `isdead`, `armor`, `ishandcuffed`,
`injail`, `jailitems`, `status`, `rep`, `callsign`, `fingerprint`, `walletid` และ
`criminalrecord`

## ค่าชื่อเสียง

`metadata.rep` เป็นตารางตัวนับแยกตามชื่อ ทั้งสามเมธอดจะซ่อมตารางนี้ก่อนใช้เสมอ เพราะตัวละคร
ที่ถูกเซฟไว้ก่อนที่คีย์ `rep` จะมีอยู่จะไม่มีคีย์นี้เลย ถ้าอ่านตรง ๆ จะพังทันที มันจึงแทนที่
อะไรก็ตามที่ไม่ใช่ตารางด้วยตารางเปล่าก่อนแตะ

### AddRep

```lua
Player.AddRep(rep, amount)
```

ไม่คืนค่า ไม่ทำอะไรเลยถ้าไม่ส่ง `rep` หรือ `amount` ไม่ใช่ตัวเลข เมื่อบวกแล้วจะเรียก
`SyncPlayerData`

### RemoveRep

```lua
Player.RemoveRep(rep, amount)
```

ไม่คืนค่า หักออกโดยมีพื้นที่ `0` แล้วเรียก `SyncPlayerData`

### GetRep

```lua
Player.GetRep(rep)
```

คืนตัวนับเป็นตัวเลข คืน `0` เมื่อยังไม่เคยตั้งค่านั้น และคืน `nil` เมื่อไม่ได้ส่ง `rep` มา

```lua
Player.AddRep('hunting', 5)
local hunting = Player.GetRep('hunting')
```

::: warning
สามตัวนี้กำลังจะถูกถอด `server/compat.lua` ขึ้นบัญชีไว้ว่าเป็นเมธอดที่ถูกลบแล้ว และเตรียม stub
ที่พิมพ์คำเตือนครั้งเดียวพร้อมคืนค่าว่างไว้ให้ แต่ stub จะติดตั้งตัวเองเฉพาะตอนที่ไม่มีเมธอดจริง
อยู่ ตอนนี้ตัวจริงข้างบนจึงยังชนะและระบบชื่อเสียงยังทำงานได้จริง แค่เจตนาที่บันทึกไว้ในโค้ดคือ
เซิร์ฟนี้ไม่มีระบบชื่อเสียง อย่าเอาของใหม่ไปสร้างทับมัน
:::

## State bags

ค่าสถานะสี่ตัวบวกเลือดอยู่ในสองที่พร้อมกัน คือ `PlayerData.metadata` และ state bag ของผู้เล่น
`hexa_status` อ่านจาก state bag ส่วนฐานข้อมูลเก็บฝั่ง metadata สองเมธอดนี้คือตัวย้ายค่าระหว่าง
สองที่นั้น สำหรับคีย์ `hunger`, `thirst`, `cleanliness`, `stress` และ `health`

### PushStateBags

```lua
Player.PushStateBags()
```

ไม่คืนค่า คัดลอกจาก metadata ลง state bag โดยข้ามคีย์ที่ metadata ไม่มี `Core.CreatePlayer`
เรียกให้อัตโนมัติหนึ่งครั้งกับตัวละครออนไลน์ทุกตัวตอนสร้าง state bag จึงมีค่าครบก่อนที่
resource อื่นจะทันอ่าน

### PullStateBags

```lua
Player.PullStateBags()
```

ไม่คืนค่า คัดลอกจาก state bag กลับเข้า metadata และถ้าเจอค่าจะเรียก `SetMetaData` กับทั้งชุด
หมายความว่ามันวิ่งผ่านการบีบค่า `0-100` และ `SyncPlayerData` ด้วย

`Player.Save()` เรียกตัวนี้ให้กับตัวละครออนไลน์ สถานะจึงไม่หายตอนรีสตาร์ต

::: danger
ทั้งสองตัวใช้กับอ็อบเจกต์ออฟไลน์ไม่ได้ เพราะมันอ่าน `Player(PlayerData.source).state`
ซึ่งอ็อบเจกต์ออฟไลน์ไม่มี `source` เรียกเฉพาะกับผู้เล่นที่ได้จาก `Core.GetPlayer` เท่านั้น
:::

## การเซฟและการกระจายข้อมูล

### SyncPlayerData

```lua
Player.SyncPlayerData()
```

ไม่คืนค่า และ return ทันทีเมื่อเป็นอ็อบเจกต์ออฟไลน์

หน้าที่ของมันคือ "กระจายข้อมูล" ไม่เคยแก้ข้อมูล ชื่อเดิม `UpdatePlayerData` สื่อผิดจึงถูกเปลี่ยน
มันปักธง `Player.Dirty` กระทบยอดไอเทมเงินเมื่อ `Config.Money.EnableMoneyItems` เปิดอยู่
แล้วยิง `HexaCore:Player:SetPlayerData` ทั้งฝั่ง server และฝั่ง client ของผู้เล่นคนนั้น

ทุก setter ในหน้านี้เรียกให้อยู่แล้ว จะต้องเรียกเองก็ต่อเมื่อไปเขียน `PlayerData` ตรง ๆ
ซึ่งไม่ควรทำตั้งแต่ต้น

### MarkDirty

```lua
Player.MarkDirty()
```

ไม่คืนค่า ปักธงให้ตัวละครนี้ติดรอบกวาดเซฟรอบถัดไป โดยไม่กระจายอะไรออกไปเลย

```lua
Player.PlayerData.metadata.criminalrecord.hasRecord = true
Player.MarkDirty()
```

รอบกวาดใน `server/save.lua` เดินทุก `Config.Save.Interval` นาที เก็บรายชื่อคนที่ธงขึ้น
แล้วเกลี่ยการเขียนกระจายภายใน `Config.Save.SpreadSeconds` เพื่อไม่ให้เซิร์ฟเต็มคนยิง MySQL
พร้อมกันในติกเดียว

### Save

```lua
Player.Save()
```

ไม่คืนค่า แยกเป็นสองทางตามชนิดอ็อบเจกต์

- ออนไลน์: เรียก `PullStateBags()` ก่อน แล้วค่อย `Core.SavePlayer(source)` ซึ่ง upsert แถว
  `users` และสั่ง `hexa_inventory` เขียนกระเป๋า
- ออฟไลน์: ไปที่ `Core.SaveOfflinePlayer(PlayerData)` ตรง ๆ

```lua
local Player = Core.GetOfflinePlayerByCitizenId('RB0087')
if Player then
    Player.AddMoney('bank', 500, 'court settlement')
    Player.Save()
end
```

::: warning
ให้เรียกผ่าน `Player.Save()` เสมอ อย่าไปเรียก `Core.SavePlayer(source)` เอง เพราะทางตรงนั้น
ข้าม `PullStateBags` ทุกอย่างที่ค้างอยู่ใน state bag ทั้งหิว กระหาย สะอาด เครียด จะหายไป
กับการเขียนรอบนั้น
:::

ธง dirty ถูกลด *ก่อน* เข้าคิวเขียน ไม่ใช่หลังเขียนเสร็จ เพราะการเขียนไม่รอผล ถ้าลดทีหลัง
มันจะไปลบธงที่เพิ่งถูกปักใหม่ระหว่างที่ MySQL ยังทำงานอยู่ และถ้าผลการ insert กลับมาว่าง
ธงจะถูกปักคืนทันทีเพื่อให้คนนั้นถูกลองใหม่ในรอบกวาดถัดไป

### Logout

```lua
Player.Logout()
```

ไม่คืนค่า และไม่ทำอะไรกับอ็อบเจกต์ออฟไลน์ ส่งต่อไป `Core.LogoutPlayer(source)` ซึ่งยิง
`HexaCore:Client:OnPlayerUnload` และ `HexaCore:Server:OnPlayerUnload` รอ 200ms
แล้วถอดอ็อบเจกต์ออกจาก `Core.Players`

::: danger
`Logout` ไม่เซฟ มันแค่ถอดตัวละครออก ถ้าเซสชันนั้นมีอะไรที่เสียไม่ได้ ให้เรียก `Player.Save()`
ก่อน
:::

## การต่อของเพิ่มบนอ็อบเจกต์

### SetField

```lua
Player.SetField(name, value)
```

**คืนค่าสองตัว**: `ok, err`

- `true` เมื่อสำเร็จ
- `false, 'field name must be a non-empty string'` เมื่อ `name` ไม่ใช่สตริงที่ใช้ได้
- `false, 'cannot overwrite reserved field <name>'` สำหรับ `PlayerData`, `Functions` และ `Offline`

```lua
local ok, err = Player.SetField('GetBountyTotal', function()
    return Player.GetMetaData('bountytotal') or 0
end)

if not ok then Core.Error('SetField refused: %s', err) end
```

อะไรก็ตามที่แขวนเข้าไปเป็นฟังก์ชันจะถูกมิเรอร์ลง `Player.Functions` ให้อัตโนมัติโดย metatable
ของอ็อบเจกต์ โค้ดเก่าที่เรียกแบบเดิมจึงยังเข้าถึงได้

`Player.AddMethod` และ `Player.AddField` เป็น alias ตรง ๆ ของ `SetField` เดิมมันเป็นสองเมธอด
ที่เขียนลงคนละที่ พอชั้น `.Functions` ถูกยุบ ทั้งคู่ก็เขียนลงที่เดียวกันจึงยุบเหลือตัวเดียว
ที่ใช้ชื่อ `Set` เพราะมันเขียนทับ ซึ่งไม่ใช่ความหมายที่ `Add` สื่อ

ถ้าจะติดตั้งฟิลด์ให้ผู้เล่นจากภายนอก ใช้ `Core.SetPlayerField(ids, name, value)` รับได้ทั้ง
server id ตัวเดียว, `-1` แปลว่าทุกคนที่โหลดอยู่ หรืออาเรย์ของ id

```lua
AddEventHandler('HexaCore:Server:PlayerLoaded', function(Player)
    Core.SetPlayerField(Player.PlayerData.source, 'bountyBoard', {})
end)
```

### SetGang

```lua
Player.SetGang(gang, grade)
```

คืน `false` เสมอ และไม่เปลี่ยนอะไรเลย มันมีอยู่เพราะ bridge ของ rsg เรียกถึง และเซิร์ฟนี้
ไม่มีระบบแก๊ง การคืน `false` ให้คำตอบที่ชัดกว่าปล่อยให้เป็น `nil` แบบเมธอดที่ไม่มีอยู่

::: tip
ตัวจริงในซอร์สประกาศไว้โดยไม่รับพารามิเตอร์เลย Lua ทิ้งอาร์กิวเมนต์ส่วนเกินอยู่แล้ว
การเรียกพร้อมชื่อแก๊งกับขั้นจึงไม่มีผลเสีย มันก็ยังคืน `false` เหมือนเดิม
:::

## เมธอดที่คืนค่าสองตัว

มีแค่สองตัว และทั้งคู่พลาดง่ายถ้าอ่านแค่ค่าแรก

| เมธอด | คืน | ทำไมค่าที่สองถึงสำคัญ |
| --- | --- | --- |
| `AddItem` | `stored, dropped` | `dropped = true` แปลว่าของอยู่กับพื้นเป็นถุงแล้ว ของมีอยู่จริง ห้ามคืนเงิน |
| `SetField` | `ok, err` | `err` บอกว่าไปผิดกฎข้อไหน |

## อ็อบเจกต์ผู้เล่นแบบออฟไลน์

`Core.GetOfflinePlayerByCitizenId` คืนอ็อบเจกต์เต็มก้อนที่มี `Offline == true` พฤติกรรมที่
ต่างออกไปมีดังนี้

| เมธอด | เมื่อเป็นอ็อบเจกต์ออฟไลน์ |
| --- | --- |
| `SyncPlayerData` | return ทันที ไม่กระจายอะไร |
| `AddMoney` / `RemoveMoney` / `SetMoney` | ยอดใน `PlayerData` เปลี่ยน แต่ไม่มี event ไม่มี log |
| `SetJob` | อาชีพใน `PlayerData` เปลี่ยน แต่ไม่ยิง `OnJobUpdate` |
| `Save` | ไปที่ `Core.SaveOfflinePlayer` |
| `Logout` | ไม่ทำอะไร |
| `PullStateBags` / `PushStateBags` | เรียกไม่ได้ เพราะไม่มี `source` |
| เมธอดกลุ่มกระเป๋า | ถูกเรียกด้วย source ที่เป็น `nil` อย่าใช้กับอ็อบเจกต์ออฟไลน์ |

## ตารางสรุป

| เมธอด | คืน |
| --- | --- |
| `AddMoney(moneytype, amount, reason)` | `boolean` |
| `RemoveMoney(moneytype, amount, reason)` | `boolean` |
| `SetMoney(moneytype, amount, reason)` | `boolean` |
| `GetMoney(moneytype)` | `number` หรือ `nil` / `false` |
| `AddItem(item, amount, slot, info, reason)` | `boolean stored, boolean dropped` |
| `RemoveItem(item, amount, slot, reason)` | `boolean` |
| `GetItemBySlot(slot)` | `table` หรือ `nil` |
| `GetItemByName(item)` | `table` หรือ `nil` |
| `GetItemsByName(item)` | อาเรย์ `table`, `{}` เมื่อไม่มี |
| `GetTotalWeight()` | `number` |
| `HasItem(items, amount)` | `boolean` |
| `CanCarryItem(item, amount)` | `boolean` |
| `SetJob(job, grade)` | `boolean` |
| `SetJobDuty(onDuty)` | ไม่คืนค่า |
| `SetPlayerData(key, val)` | ไม่คืนค่า |
| `SetMetaData(meta, val)` | ไม่คืนค่า |
| `GetMetaData(meta)` | ค่าใดก็ได้ หรือ `nil` |
| `AddRep(rep, amount)` | ไม่คืนค่า |
| `RemoveRep(rep, amount)` | ไม่คืนค่า |
| `GetRep(rep)` | `number` หรือ `nil` |
| `PushStateBags()` | ไม่คืนค่า |
| `PullStateBags()` | ไม่คืนค่า |
| `SyncPlayerData()` | ไม่คืนค่า |
| `MarkDirty()` | ไม่คืนค่า |
| `Save()` | ไม่คืนค่า |
| `Logout()` | ไม่คืนค่า |
| `SetField(name, value)` | `boolean ok, string err` |
| `AddMethod(name, value)` | alias ของ `SetField` |
| `AddField(name, value)` | alias ของ `SetField` |
| `SetGang(gang, grade)` | `false` เสมอ |
