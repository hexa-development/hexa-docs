# อ็อบเจกต์ผู้เล่น

ตัวละครทุกตัวที่โหลดอยู่บน server จะมี "อ็อบเจกต์ผู้เล่น" หนึ่งก้อนแทนตัวมัน ข้อมูลตัวละครทั้งหมดอยู่ใน
`PlayerData` และเมธอดที่ได้รับอนุญาตให้แก้ข้อมูลนั้นแขวนอยู่บนอ็อบเจกต์ตัวเดียวกัน ตั้งแต่ 3.0 เป็นต้นไป
เมธอดแขวนอยู่ชั้นเดียว ไม่ต้องผ่าน `.Functions` อีกแล้ว

```lua
local Core = exports['hexa_core']:GetCoreObject()

local Player = Core.GetPlayer(source)
if not Player then return end

Player.AddMoney('cash', 100, 'daily reward')
```

`Player.Functions.AddMoney(...)` ยังเรียกได้อีกหนึ่งรุ่น และจะพิมพ์คำเตือน deprecation ครั้งเดียว
พร้อมบอกชื่อ resource ที่เรียกมา โค้ดใหม่ให้เขียนแบบชั้นเดียวเท่านั้น

## การดึงอ็อบเจกต์ผู้เล่น

```lua
local Core = exports['hexa_core']:GetCoreObject()

local Player = Core.GetPlayer(source)
local Player = Core.GetPlayerByCitizenId('RB0087')
local Player = Core.GetPlayerByLicense('license:1100001abcdef')
local Player = Core.GetPlayerByAccount('US07HexaCore1234567812')
local Player = Core.GetPlayerByCharInfo('firstname', 'Arthur')
```

`Core.GetPlayer` รับได้ทั้ง server id และสตริง identifier ทุกตัวข้างบนคืน `nil` เมื่อไม่มีตัวละครตรงกับที่ขอ
จึงต้องเช็คก่อนใช้ผลลัพธ์เสมอ

ถ้าตัวละครไม่ได้ออนไลน์ ใช้ `Core.GetOfflinePlayerByCitizenId` ซึ่งประกอบอ็อบเจกต์เต็มรูปแบบขึ้นมาจากแถว
`users` ตรง ๆ

```lua
local Player = Core.GetOfflinePlayerByCitizenId('RB0087')
if Player then
    Player.AddMoney('bank', 500, 'court settlement')
    Player.Save()
end
```

อ็อบเจกต์แบบออฟไลน์จะมี `Player.Offline == true` เมธอดเงินและ metadata ยังแก้ `PlayerData` ได้ตามปกติ
แต่จะไม่ส่ง event ไปหาใครและไม่เขียน log และ `Player.Save()` จะวิ่งไปที่ `Core.SaveOfflinePlayer`
แทนเส้นทางออนไลน์

::: warning
อ็อบเจกต์ออฟไลน์คือ "ภาพนิ่ง" ของข้อมูล ณ ตอนที่ดึงมา ไม่ใช่ตัวจริงที่เชื่อมกับผู้เล่นอยู่ ถ้าตัวละครนั้น
ล็อกอินเข้ามาระหว่างที่คุณยังถืออยู่ `Save()` ของคุณจะเอาภาพนิ่งไปทับข้อมูลสด ๆ ของเขา หลักการคือ
ดึงมา แก้ เซฟ แล้วทิ้งทันที
:::

## โครงสร้าง PlayerData

`Player.PlayerData` คือตัวละคร โครงข้างล่างคือสิ่งที่ `Core.LoadPlayer` ประกอบเสร็จแล้ว หลังจาก
`Config.Player.PlayerDefaults` เติมช่องที่แถวในฐานข้อมูลไม่มีให้ครบ

| ฟิลด์ | ชนิด | คืออะไร |
| --- | --- | --- |
| `source` | number | server id ปัจจุบัน อ็อบเจกต์ออฟไลน์ไม่มีช่องนี้ |
| `citizenid` | string | รหัสประจำตัวละคร = `Config.Player.CitizenIdPrefix` + เลขสุ่ม เช่น `RB0087` |
| `cid` | number | ลำดับช่องตัวละครของบัญชีนั้น |
| `license` | string | identifier ของบัญชี ตรงกับคอลัมน์ `identifier` ในตาราง `users` |
| `name` | string | ชื่อผู้เล่นจาก `GetPlayerName` ถ้าไม่มีจะใช้ citizenid แทน |
| `money` | table | หนึ่งคีย์ต่อหนึ่งประเภทเงินใน `Config.Money.MoneyTypes` คือ `cash`, `bank`, `gold` |
| `charinfo` | table | `firstname`, `lastname`, `birthdate`, `gender`, `nationality`, `account` |
| `job` | table | `name`, `label`, `type`, `payment`, `onduty`, `isboss`, `grade` |
| `metadata` | table | ข้อมูลอื่น ๆ ของตัวละครทั้งหมด ดูหัวข้อถัดไป |
| `items` | table | ช่องเก็บของ ตอนรันไทม์ ระบบกระเป๋าเป็นเจ้าของข้อมูลชุดนี้ |
| `position` | table | พิกัดที่บันทึกไว้ล่าสุด |
| `weight` | number | น้ำหนักที่แบกได้ คิดเป็นเปอร์เซ็นต์ 100 = เต็มกระเป๋า |
| `slots` | number | จำนวนช่องในกระเป๋า |
| `optin` | boolean | รับการแจ้งเตือนสำหรับ admin หรือไม่ |

`job.grade` เป็นตารางย่อยอีกชั้น ประกอบด้วย `name`, `level`, `payment`, `isboss`

การอ่านทำได้ตรง ๆ ไม่มีอะไรห่อไว้

```lua
local data = Player.PlayerData

print(data.citizenid)
print(data.charinfo.firstname, data.charinfo.lastname)
print(data.money.cash, data.money.bank)
print(data.job.name, data.job.grade.level, data.job.onduty)
```

::: danger
อ่าน `PlayerData` ตรง ๆ ได้ แต่ห้ามเขียนตรง ๆ เด็ดขาด การสั่ง `Player.PlayerData.money.cash = 500`
เปลี่ยนแค่ตัวเลขในหน่วยความจำ ไม่ sync ไป client ไม่ยิง event เงินเปลี่ยน ไม่มี log และรอบกวาดเซฟ
จะข้ามผู้เล่นคนนี้ไปเพราะไม่มีอะไรปักธงว่าข้อมูลเปลี่ยน ให้ใช้เมธอดเสมอ
:::

### คีย์ metadata ที่มีมาให้ตั้งแต่ต้น

คีย์ชุดนี้มาจาก `Config.Player.PlayerDefaults.metadata` ตัวละครที่โหลดอยู่จึงมีครบทุกตัว

`health`, `hunger`, `thirst`, `cleanliness`, `stress`, `isdead`, `armor`, `ishandcuffed`,
`injail`, `jailitems`, `status`, `rep`, `callsign`, `fingerprint`, `walletid`, `criminalrecord`

ตัวละครที่ถูกเซฟไว้ก่อนที่จะมีคีย์ใดคีย์หนึ่งจะยังไม่มีคีย์นั้นจนกว่าจะโหลดใหม่ เพราะค่า default ถูกเติมให้
เฉพาะคีย์ที่ยังไม่มีในชั้นบนสุดของ `metadata` เท่านั้น

## เงิน

มีสี่เมธอด ทุกตัวรับชื่อประเภทเงินซึ่งจะถูกแปลงเป็นตัวพิมพ์เล็กให้เอง และรับ `reason` ที่จะไปโผล่ใน log เงิน

```lua
Player.AddMoney('cash', 100, 'bounty payout')
Player.RemoveMoney('bank', 50, 'stable fee')
Player.SetMoney('gold', 10, 'admin adjustment')

local cash = Player.GetMoney('cash')
```

`AddMoney`, `RemoveMoney` และ `SetMoney` คืนค่า boolean และจะปฏิเสธการเรียก คือคืน `false`
โดยไม่แตะข้อมูลเลย เมื่อ

- ชื่อประเภทเงินไม่ใช่สตริง หรือไม่ใช่คีย์ที่มีอยู่ใน `PlayerData.money`
- จำนวนเงินแปลงเป็นตัวเลขไม่ได้ เป็น `NaN` หรือติดลบ

`RemoveMoney` คืน `false` เพิ่มอีกกรณีคือยอดจะตกต่ำกว่าเพดานล่าง ประเภทที่อยู่ใน
`Config.Money.DontAllowMinus` มีเพดานล่างที่ 0 ส่วนประเภทอื่นใช้ `Config.Money.MinusLimit`
แต่ค่านั้นถูกบีบไว้ที่ 0 อีกชั้นในโค้ด ยอดเงินจึงติดลบไม่ได้ไม่ว่าจะตั้งคอนฟิกอย่างไร

`GetMoney` คืนตัวเลขที่เก็บอยู่ ถ้าส่งอะไรที่ไม่ใช่สตริงเข้าไปจะคืน `false` และถ้าเป็นประเภทเงินที่ตัวละคร
ไม่มีจะคืน `nil`

::: warning
ต้องเช็คค่าที่ `RemoveMoney` คืนกลับมาก่อนจ่ายของทุกครั้ง รูปแบบมาตรฐานคือแบบข้างล่างนี้
ถ้าข้ามการเช็ค ร้านค้าจะแจกของฟรี
:::

```lua
-- หักเงินก่อน จ่ายของเฉพาะตอนหักสำเร็จ
if Player.RemoveMoney('cash', 25, 'bought a coffee') then
    Player.AddItem('coffee', 1)
else
    Core.Notify(source, { title = 'เงินไม่พอ', type = 'error', duration = 5000 })
end
```

เมื่อเงินเปลี่ยนสำเร็จ ระบบจะ sync ผู้เล่น เขียน log ผ่าน `hexa_log:server:CreateLog` ในหมวด
`playermoney` แล้วยิงทั้ง `HexaCore:Server:OnMoneyChange` และ `HexaCore:Client:OnMoneyChange`
พร้อมพารามิเตอร์ `(source, moneytype, amount, action, reason)` โดย `action` เป็น `'add'`,
`'remove'` หรือ `'set'`

## อาชีพและการเข้าเวร

```lua
-- grade ส่งเป็นตัวเลขหรือสตริงก็ได้
local ok = Player.SetJob('police', 2)
```

`SetJob` แปลงชื่ออาชีพเป็นตัวพิมพ์เล็ก แล้วคืน `false` ถ้าอาชีพนั้นไม่มีใน `Core.Shared.Jobs`
ถ้าสำเร็จมันจะประกอบ `PlayerData.job` ขึ้นใหม่ทั้งก้อนจากแค็ตตาล็อกกลาง ทั้ง label, type,
สถานะเข้าเวรเริ่มต้น ชื่อขั้น เงินเดือน และธงหัวหน้า จากนั้น sync ผู้เล่นและยิง
`HexaCore:Server:OnJobUpdate` กับ `HexaCore:Client:OnJobUpdate` พร้อม `(source, job)`

ถ้าขั้นที่ส่งเข้าไปไม่มีอยู่ในอาชีพนั้น อาชีพจะถูกเปลี่ยนให้ แต่ขั้นจะค้างอยู่ที่ level 0 พร้อมชื่อสำรอง
`No Grades`

```lua
Player.SetJobDuty(true)
```

`SetJobDuty` แปลงค่าที่รับมาเป็น boolean เขียนลง `PlayerData.job.onduty` ยิง event อาชีพสองตัวเดิม
แล้ว sync ให้ ข้อควรระวังคือมันอ่าน `PlayerData.job` ตรง ๆ โดยไม่เช็คก่อน จึงต้องเรียกกับตัวละคร
ที่โหลดเสร็จแล้วเท่านั้น

สถานะเข้าเวรนี่เองคือสิ่งที่ `Core.GetPlayersOnDuty(job)` และ `Core.GetDutyCount(job)` นับ

## Metadata

```lua
Player.SetMetaData('callsign', '1-ADAM-12')
local callsign = Player.GetMetaData('callsign')
```

`SetMetaData` รับตารางได้ด้วย ซึ่งจะเขียนหลายคีย์พร้อมกันแล้ว sync แค่ครั้งเดียว ไม่ใช่ครั้งต่อคีย์

```lua
-- sync ครั้งเดียวสำหรับทั้งชุด
Player.SetMetaData({ hunger = 80, thirst = 65 })
```

คีย์ `hunger`, `thirst`, `cleanliness` และ `stress` จะถูกบีบให้อยู่ในช่วง 0-100 ตอนเขียนเสมอ
ไม่ว่าจะเขียนทีละตัวหรือส่งมาเป็นตาราง คีย์อื่นเก็บตามที่ส่งมา ส่วนค่าที่ไม่ใช่สตริงและไม่ใช่ตารางจะถูก
ปล่อยผ่านไปเฉย ๆ

`GetMetaData` ต้องรับสตริงเท่านั้น อย่างอื่นคืน `nil`

::: warning
ฝั่ง client ตั้งค่า metadata ตามใจไม่ได้ net event `HexaCore:Server:SetMetaData` รับแค่
`hunger`, `thirst`, `cleanliness`, `stress` เท่านั้น คีย์อื่นจะถูกปฏิเสธและถูกบันทึกไว้ ส่วนโค้ดฝั่ง
server เรียก `Player.SetMetaData` ได้ตรง ๆ ไม่ติดข้อจำกัดนี้
:::

## ไอเทม

เมธอดเกี่ยวกับของในตัวบนอ็อบเจกต์ผู้เล่นเป็นตัวส่งต่อไปยังระบบกระเป๋า ถ้า resource นั้นไม่ได้สตาร์ตอยู่
มันจะคืนค่าที่ปลอดภัยแทนการโยน error

```lua
local stored, dropped = Player.AddItem('bread', 2, false, false, 'starter kit')
local removed = Player.RemoveItem('bread', 1, false, 'ate it')

local slotItem = Player.GetItemBySlot(3)
local item     = Player.GetItemByName('bread')
local stacks   = Player.GetItemsByName('bread')
local weight   = Player.GetTotalWeight()
local has      = Player.HasItem('bread', 1)
```

| เมธอด | คืนค่า | ค่าที่ได้เมื่อระบบกระเป๋าไม่ได้สตาร์ต |
| --- | --- | --- |
| `AddItem(item, amount, slot, info, reason)` | `stored, dropped` | `false, false` |
| `RemoveItem(item, amount, slot, reason)` | boolean | `false` |
| `GetItemBySlot(slot)` | ตารางไอเทม หรือ `nil` | `nil` |
| `GetItemByName(item)` | ตารางไอเทม หรือ `nil` | `nil` |
| `GetItemsByName(item)` | อาร์เรย์ของ stack | `{}` |
| `GetTotalWeight()` | number | `0` |
| `HasItem(items, amount)` | boolean | `false` |

::: danger
`AddItem` คืนค่าสองตัว และตัวที่สองสำคัญมาก `dropped == true` แปลว่ากระเป๋าเต็ม ของจึงถูกวางลงพื้น
เป็นถุงแทน นั่นคือของมีอยู่จริง ผู้เรียกจึงห้ามคืนเงินให้ผู้เล่นในกรณีนี้ ให้ถือว่า `stored or dropped`
คือ "ส่งของถึงแล้ว"
:::

`slot` กับ `info` ต้องส่งเป็น `false` ไม่ใช่ `nil` โดยตั้งใจ เพราะ `nil` ที่อยู่กลางรายการพารามิเตอร์จะถูก
ตัดทิ้งตอนข้ามขอบเขต resource ทำให้ `reason` เลื่อนไปนั่งตำแหน่งของ `slot` แทน

### ให้ไอเทมกับผู้เล่น ไม่เหมือนกับการลงทะเบียนไอเทม

นี่คือเหตุผลทั้งหมดที่ 3.0 ต้องเปลี่ยนชื่อ

```lua
-- ให้ขนมปังหนึ่งชิ้นกับตัวละครคนนี้
Player.AddItem('bread', 1)

-- เพิ่มนิยามของขนมปังลงแค็ตตาล็อกกลาง มีผลกับทั้งเซิร์ฟเวอร์
Core.RegisterItem('bread', { name = 'bread', label = 'Bread', weight = 1, type = 'item' })
```

`Player.AddItem` คือการย้ายของเข้ากระเป๋าใครสักคน ส่วน `Core.RegisterItem` คือการประกาศว่าไอเทม
ชนิดนี้มีอยู่บนโลกนี้ เมื่อก่อนสองอย่างนี้ใช้คำกริยา `AddItem` ร่วมกันทั้งที่ความหมายตรงข้ามกัน

เฉพาะบนชั้น export เท่านั้นที่ `exports['hexa_core']:AddItem` และ `:RemoveItem` ยังคงเป็น alias
ของฝั่งแค็ตตาล็อกอย่างถาวร เพื่อให้สคริปต์ที่พอร์ตมาใช้ได้โดยไม่ต้องแก้

### ความจุกระเป๋า

```lua
if Player.CanCarryItem('bread', 5) then
    Player.AddItem('bread', 5)
end
```

`CanCarryItem` ส่งต่อไปที่ `Core.CanCarryItem(source, item, amount)` คืน `false` เมื่อไม่มีตัวละคร
โหลดอยู่ เมื่อไอเทมนั้นไม่มีใน `Core.Shared.Items` หรือเมื่อระบบกระเป๋าไม่ได้สตาร์ต ถ้าไม่ส่ง
`amount` มาจะถือเป็น 1

ส่วนการเปลี่ยนความจุทำที่ core ไม่ใช่ที่อ็อบเจกต์ผู้เล่น

```lua
Core.SetMaxWeight(source, 150)
Core.SetMaxSlots(source, 40)
```

ทั้งสองตัวเขียนผ่าน `Player.SetPlayerData` จึง sync ให้อัตโนมัติ

## การ sync และธง dirty

```lua
Player.SetPlayerData('weight', 150)
Player.SyncPlayerData()
```

`SetPlayerData(key, value)` เขียนฟิลด์ชั้นบนสุดของ `PlayerData` แล้ว sync คีย์ต้องเป็นสตริง
อย่างอื่นจะถูกเมิน

`SyncPlayerData()` คือตัวกระจายข้อมูล มันยิง `HexaCore:Player:SetPlayerData` ทั้งฝั่ง server และฝั่ง
client เจ้าของตัวละคร พร้อมส่ง `PlayerData` ทั้งก้อนไป และปักธง dirty ให้ มันไม่ได้แก้ข้อมูลอะไรเลย
ซึ่งเป็นเหตุผลที่ 3.0 เปลี่ยนชื่อจาก `UpdatePlayerData` มาเป็นชื่อนี้ ทุกเมธอดข้างบนเรียกมันให้อยู่แล้ว
คุณจึงต้องเรียกเองเฉพาะตอนที่ไปเขียน `PlayerData` ด้วยเส้นทางที่ไม่ผ่านเมธอด ซึ่งแทบไม่ควรเกิดขึ้น

`SyncPlayerData` คืนทันทีถ้าเป็นอ็อบเจกต์ออฟไลน์ เพราะไม่มี client ให้บอก

### MarkDirty

รอบกวาดเซฟจะเขียนเฉพาะผู้เล่นที่ข้อมูลเปลี่ยนจริง `Player.Dirty` คือธงตัวนั้น มันเริ่มเป็น `true`
ตั้งแต่ตัวละครโหลดเข้ามา ถูกปักโดยทุกเมธอดที่แก้ข้อมูล และถูกล้างก่อนสั่งเขียนลงฐานข้อมูล

```lua
-- บังคับให้ตัวละครนี้ติดรอบกวาดเซฟรอบหน้า
Player.MarkDirty()
```

ใช้เมื่อคุณเปลี่ยนอะไรผ่านเส้นทางที่ core มองไม่เห็น ถ้าเรียกเมธอดปกติอยู่แล้วไม่ต้องใช้

รอบกวาดทำงานทุก ๆ `Config.Save.Interval` นาที และเกลี่ยการเขียนกระจายภายใน
`Config.Save.SpreadSeconds` วินาที ส่วน `Core.SaveAllPlayers()` เขียนทุกคนทันทีและคืนจำนวนคนที่เซฟไป

## State bag

มีสองเมธอดที่ย้ายค่าห้าตัวเดียวกัน คือ `hunger`, `thirst`, `cleanliness`, `stress`, `health`
ไปมาระหว่าง `PlayerData.metadata` กับ state bag ของผู้เล่น ชื่อเมธอดบอกทิศทางไว้แล้ว

| เมธอด | ทิศทาง |
| --- | --- |
| `Player.PullStateBags()` | state bag เข้า metadata อ่าน `Player(source).state` แล้วเขียนค่าที่เจอผ่าน `SetMetaData` |
| `Player.PushStateBags()` | metadata ออก state bag อ่าน `PlayerData.metadata` แล้วเขียนลง `Player(source).state` |

`PushStateBags` ถูกเรียกหนึ่งครั้งตอนสร้างตัวละคร resource อื่นจึงอ่าน `Player(source).state.hunger`
ได้เลยโดยไม่ต้องไปขอ core object

`PullStateBags` ถูกเรียกอยู่ข้างใน `Player.Save()` สำหรับตัวละครออนไลน์ นี่คือสิ่งที่กันไม่ให้ค่าสถานะสด ๆ
หายตอนรีสตาร์ต การเซฟที่ข้ามขั้นนี้จะเขียนสำเนา metadata เก่าลงไปแทนค่าปัจจุบัน

```lua
-- ดึงค่าที่ resource อื่นเขียนไว้ใน state bag ก่อน แล้วค่อยเซฟ
Player.PullStateBags()
Player.Save()
```

::: warning
`Player.Save()` เรียก `PullStateBags` ให้อยู่แล้ว ห้ามเรียก `Core.SavePlayer(source)` ตรง ๆ เป็นทางลัด
เพราะมันข้ามการดึงค่า แล้วค่าหิว กระหาย สะอาด และเครียดของตัวละครจะถูกเขียนกลับด้วยค่าเดิม
ก่อนหน้าที่ state bag จะอัปเดตรอบล่าสุด
:::

ทั้งสองเมธอดย้ายแค่ห้าคีย์นั้น ค่าอื่นใน state bag หรือใน metadata ไม่ถูกแตะเลย

## การต่อยอดอ็อบเจกต์ผู้เล่น

```lua
local ok, err = Player.SetField('mailbox', {})
```

`SetField(name, value)` แขวนฟิลด์หรือเมธอดเพิ่มลงบนอ็อบเจกต์ผู้เล่นคนนี้ ชื่อต้องเป็นสตริงที่ไม่ว่าง
มันปฏิเสธชื่ออยู่สามตัวและจะคืน `false` พร้อมข้อความอธิบายถ้าคุณใช้ชื่อเหล่านั้น ได้แก่ `PlayerData`,
`Functions` และ `Offline` ซึ่งเป็นโครงของตัวอ็อบเจกต์เอง ชื่ออื่นนอกจากนี้มันเขียนทับให้ทันทีโดยไม่ถาม
จึงเป็นเหตุผลที่ชื่อเมธอดขึ้นต้นด้วย `Set` ไม่ใช่ `Add`

`Player.AddMethod` และ `Player.AddField` เป็น alias ของ `SetField` ที่เก็บไว้ช่วงเปลี่ยนผ่าน ทุกอย่าง
ที่คุณแขวนเพิ่มจะถูกมิเรอร์ลง `Player.Functions` ให้อัตโนมัติ โค้ดเก่าที่เรียกแบบเดิมจึงยังหาเจอ

ถ้าอยากติดตั้งฟิลด์ให้ผู้เล่นตอนโหลดเข้ามา หรือให้ทุกคนพร้อมกัน ใช้ตัวช่วยระดับ core

```lua
AddEventHandler('HexaCore:Server:PlayerLoaded', function(Player)
    Core.SetPlayerField(Player.PlayerData.source, 'GetNickname', function()
        return Player.PlayerData.charinfo.firstname
    end)
end)
```

`Core.SetPlayerField(ids, name, value)` รับได้ทั้ง server id ตัวเดียว อาร์เรย์ของ id หรือ `-1`
เพื่อทำกับผู้เล่นทุกคนที่โหลดอยู่ มันมาแทน `AddPlayerMethod` และ `AddPlayerField` เดิม ซึ่งเขียนลงที่
เดียวกันอยู่แล้วหลังจากยุบชั้น `.Functions`

## การเซฟและการออกจากตัวละคร

```lua
Player.Save()
Player.Logout()
```

`Save()` ดึงค่าจาก state bag ก่อน แล้วเขียนตัวละครผ่าน `Core.SavePlayer(source)` ซึ่ง upsert แถว
`users` และสั่งให้ระบบกระเป๋าเซฟกระเป๋า ถ้าเป็นอ็อบเจกต์ออฟไลน์จะไปที่
`Core.SaveOfflinePlayer(PlayerData)` แทน ตำแหน่งจะเอามาจาก ped จริงถ้ามีอยู่ และย้อนไปใช้ตำแหน่ง
ที่เก็บไว้เดิมถ้าไม่มี การเซฟที่ค้างคิวอยู่หลังผู้เล่นหลุดจึงไม่เขียนพิกัดกลางแผนที่ทับ

`Logout()` ถอดตัวละครออก มันยิง `HexaCore:Client:OnPlayerUnload` และ
`HexaCore:Server:OnPlayerUnload` แล้วลบผู้เล่นออกจาก `Core.Players` ถ้าเป็นอ็อบเจกต์ออฟไลน์
จะไม่ทำอะไรเลย จุดที่ต้องรู้คือมันไม่เซฟให้ก่อน ถ้าตัวละครยังมีข้อมูลค้างต้องเรียก `Save()` เอง

ตอนผู้เล่นหลุด core จะเซฟให้และยิง `HexaCore:Server:PlayerDropped` พร้อมส่งอ็อบเจกต์ผู้เล่นไป
ก่อนที่จะลบทิ้ง

## SetGang

```lua
-- คืน false เสมอ เซิร์ฟนี้ไม่มีระบบแก๊ง
local ok = Player.SetGang()
```

`Player.SetGang` มีอยู่เพื่อให้ bridge มีอะไรให้เรียกเท่านั้น มันไม่รับพารามิเตอร์ ไม่ทำอะไร
และคืน `false` มันไม่ใช่ฟังก์ชันที่รอการเขียนต่อ เพราะเซิร์ฟนี้ไม่มีข้อมูลแก๊งเลย และ `PlayerData`
ก็ไม่มีช่องเก็บแก๊ง

## Event ที่อ็อบเจกต์ผู้เล่นยิงออกมา

| Event | ฝั่ง | ข้อมูลที่ส่ง |
| --- | --- | --- |
| `HexaCore:Server:PlayerLoaded` | server | อ็อบเจกต์ผู้เล่น |
| `HexaCore:Player:SetPlayerData` | ทั้งสองฝั่ง | `PlayerData` |
| `HexaCore:Server:OnJobUpdate` | server | `source, job` |
| `HexaCore:Client:OnJobUpdate` | client | `source, job` |
| `HexaCore:Server:OnMoneyChange` | server | `source, moneytype, amount, action, reason` |
| `HexaCore:Client:OnMoneyChange` | client | `source, moneytype, amount, action, reason` |
| `HexaCore:Server:PlayerDropped` | server | อ็อบเจกต์ผู้เล่น |
| `HexaCore:Server:OnPlayerUnload` | server | `source` |
| `HexaCore:Client:OnPlayerUnload` | client | ไม่มี |

## ตัวอย่างเต็ม

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.CreateUseableItem('bandage', function(source, item)
    local Player = Core.GetPlayer(source)
    if not Player then return end

    local health = Player.GetMetaData('health') or 0
    if health >= 600 then
        return Core.Notify(source, { title = 'ยังไม่บาดเจ็บ', type = 'error', duration = 5000 })
    end

    -- หักของก่อน เพื่อไม่ให้รักษาฟรีตอนหักไม่สำเร็จ
    if not Player.RemoveItem('bandage', 1, item.slot, 'used a bandage') then return end

    Player.SetMetaData('health', math.min(600, health + 100))
    Core.Notify(source, { title = 'ปฐมพยาบาลเรียบร้อย', type = 'success', duration = 5000 })
end)
```
