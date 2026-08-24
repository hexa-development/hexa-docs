# Events

รวม event ทั้งหมดที่ `hexa_core` ยิงออกและรับเข้า พร้อมทิศทาง พารามิเตอร์ และเรื่องสำคัญที่สุดของหน้านี้
คือ **client ยิง event ตัวนี้เองได้หรือไม่**

FXServer มีวิธีลงทะเบียนตัวรับ event สองแบบ และสองแบบนี้ต่างกันคนละเรื่อง

```lua
-- เฉพาะโค้ดฝั่งเดียวกันเท่านั้นที่ยิงถึง
AddEventHandler('HexaCore:Server:PlayerLoaded', function(Player) end)

-- เปิดรับจากเครือข่าย ถ้าอยู่ฝั่ง server แปลว่า client ทุกคนยิงเข้ามาได้
RegisterNetEvent('HexaCore:Server:RequestStatus', function() end)
```

`RegisterNetEvent` ฝั่ง server คือประตูสาธารณะ ใครใช้ injector อยู่ก็ยิงเข้ามาได้ ส่งอาร์กิวเมนต์อะไรก็ได้
ยิงถี่แค่ไหนก็ได้ ส่วน `AddEventHandler` ฝั่ง server มีแต่สคริปต์ฝั่ง server ด้วยกันที่เข้าถึงได้

ทุกตารางในหน้านี้จึงมีคอลัมน์ **client ยิงได้ไหม** อ่านคอลัมน์นี้ก่อนเสมอก่อนจะเอา event ไหนไปต่อยอด

::: danger
ห้ามเชื่อค่าที่มากับ net event ฝั่ง server เด็ดขาด มีแค่ `source` ตัวเดียวที่ FXServer เติมให้เอง
ที่เหลือคนยิงกำหนดได้ทั้งหมด ตัวรับ net event ทุกตัวของ `hexa_core` จึงตรวจชนิดของอาร์กิวเมนต์
ใส่คูลดาวน์ และอ่านผู้เล่นใหม่จาก `Core.GetPlayer(source)` ทุกครั้ง — ของคุณก็ควรทำแบบเดียวกัน
:::

## ความหมายของคอลัมน์ทิศทาง

| ทิศทาง | ความหมาย |
| ------ | -------- |
| client to server | client ยิงด้วย `TriggerServerEvent` ตัวรับฝั่ง server เป็น net event |
| server to client | server ยิงหา client ด้วย `TriggerClientEvent` |
| server local | ยิงและรับอยู่ในโปรเซส server เท่านั้น |
| client local | ยิงและรับอยู่ในเครื่อง client เครื่องเดียว |

## ประตูฝั่ง server ที่ client ยิงเข้าได้

นี่คือ net event ทั้งหมดที่ลงทะเบียนไว้ฝั่ง server สิบสองทาง และแต่ละทางมีด่านกันคนละแบบ

| Event | พารามิเตอร์ | client ยิงได้ไหม | ด่านกัน |
| ----- | ----------- | ---------------- | ------- |
| `HexaCore:Server:RequestSpawn` | ไม่มี | ได้ ตั้งใจให้ยิง | มีธงกันยิงซ้ำต่อคน ถ้า login แล้วจะส่งข้อมูล spawn เดิมกลับไปใหม่ |
| `HexaCore:Server:OnPlayerLoaded` | ไม่มี | ได้ ตั้งใจให้ยิง | การกระทบยอดไอเทมเงินทำครั้งเดียวต่อการเข้าเกมหนึ่งครั้ง |
| `HexaCore:Server:RequestStatus` | ไม่มี | ได้ ตั้งใจให้ยิง | อ่านอย่างเดียว และตอบกลับเฉพาะคนที่ขอ |
| `HexaCore:Server:SetMetaData` | `meta` (string), `data` (number หรือ boolean) | ได้ เฉพาะคีย์ในลิสต์ | รับแค่ `hunger`, `thirst`, `cleanliness`, `stress` |
| `HexaCore:ToggleDuty` | ไม่มี | ได้ | ไม่มีด่านอื่นนอกจาก "ต้องมีตัวละครโหลดอยู่" |
| `HexaCore:CallCommand` | `command` (string), `args` (table) | ได้ | เช็ค `Core.HasPermission(src, 'command.' .. name)` |
| `HexaCore:Server:TriggerCallback` | `name` (string), `...` | ได้ ตั้งใจให้ยิง | ตัว callback ต้องตรวจสิทธิ์เอง |
| `HexaCore:Server:TriggerClientCallback` | `name` (string), `...` | ได้ ตั้งใจให้ยิง | ใช้ตัวรับแบบครั้งเดียวแล้วล้างทิ้ง |
| `HexaCore:Server:ReportCSRFFailure` | ไม่มี | ได้ | จำกัดการพิมพ์ console เหลือครั้งเดียวต่อหน้าต่าง 10 วินาที |
| `HexaCore:Server:UseItem` | `item` (table) | ได้ เลิกใช้แล้ว | เตือนอย่างเดียว ไม่ทำอะไร |
| `HexaCore:Server:RemoveItem` | `itemName`, `amount` | ได้ เลิกใช้แล้ว | เตือนอย่างเดียว ไม่ทำอะไร |
| `HexaCore:Server:AddItem` | `itemName`, `amount` | ได้ เลิกใช้แล้ว | เตือนอย่างเดียว ไม่ทำอะไร |

### HexaCore:Server:RequestSpawn

`client/spawn.lua` ยิงเข้ามาเมื่อโลกในเกมโหลดเสร็จ ฝั่ง server จะหาตัวละครล่าสุดของ identifier นั้น
login ให้ (ถ้ายังไม่มีก็สร้างใหม่) ส่ง `Core.Shared` ไปให้ แล้วตอบกลับด้วย `HexaCore:Client:SpawnPlayer`
ฝั่ง client จะขอซ้ำทุก 10 วินาทีจนกว่าจะได้คำตอบ ตัวรับจึงต้องทนการยิงซ้ำได้ — คนที่ login ไปแล้ว
จะได้ข้อมูล spawn เดิมกลับไปใหม่ ไม่ใช่ return เงียบ ๆ

### HexaCore:Server:SetMetaData

คีย์ metadata ที่ client เขียนเองได้มีแค่สี่ค่าสถานะร่างกาย นอกนั้นถูกปฏิเสธและบันทึกไอดีคนยิงไว้

```lua
-- คีย์ที่อนุญาตให้ยิงจากฝั่ง client
TriggerServerEvent('HexaCore:Server:SetMetaData', 'thirst', 80)
```

::: danger
ห้ามเพิ่มคีย์เข้าไปใน `CLIENT_SETTABLE_META` เด็ดขาด ใส่ `injail`, `isdead`, `criminalrecord` หรือ
`walletid` เข้าไปเมื่อไหร่ ผู้เล่นแหกคุกได้ด้วยโค้ดบรรทัดเดียว คีย์พวกนี้ต้องเขียนจากฝั่ง server
ด้วย `Player.SetMetaData(key, value)` เท่านั้น
:::

### HexaCore:ToggleDuty

สลับค่า `PlayerData.job.onduty` แจ้งเตือนผู้เล่น แล้วกระจายต่อด้วย `HexaCore:Server:SetDuty` กับ
`HexaCore:Client:SetDuty`

::: warning
event นี้ไม่มีการเช็คสิทธิ์หรือเช็คอาชีพเลย client ทุกคนสลับสถานะเข้าเวรของตัวเองได้ตลอดเวลา แปลว่า
`onduty` เป็นแค่ธงอำนวยความสะดวก ไม่ใช่การอนุญาต ถ้าสคริปต์อาชีพจ่ายเงินเดือน เปิดประตู หรือปลดล็อกตู้เก็บของ
โดยดูจาก `onduty` ต้องตรวจ `PlayerData.job.name` และเกรดฝั่ง server เพิ่มด้วยเสมอ
:::

### HexaCore:CallCommand

ทางที่เมนูแอดมินใช้สั่งคำสั่งโดยไม่ต้องพิมพ์ในแชท ตัวรับจะหาคำสั่งใน `Core.Commands.List` เช็คสิทธิ์
`command.<ชื่อคำสั่ง>` ผ่านระบบ ace เช็คว่าอาร์กิวเมนต์ที่บังคับมาครบ แล้วค่อยเรียกตัวคำสั่งจริง

```lua
-- ยิงจากฝั่ง client ผ่านด่านสิทธิ์ชุดเดียวกับตอนพิมพ์ในแชท
TriggerServerEvent('HexaCore:CallCommand', 'tpm', {})
```

### HexaCore:Server:ReportCSRFFailure

NUI callback ชื่อ `validateCSRF` ฝั่ง client ยิงมาเมื่อ token ไม่ตรง มันคือ "รายงาน" ไม่ใช่ "คำสั่ง"
server เป็นคนตัดสินใจเองว่าจะทำอะไรตาม `Config.Security.CSRFFailurePolicy` (ค่าเริ่มต้น `'log'`
ตั้งเป็น `'kick'` ได้) และ `Config.Security.CSRFFailureThreshold`

::: warning
token ชุดนี้สร้าง ส่ง และตรวจอยู่ที่ client ทั้งหมด server ไม่มีอะไรเอาไปเทียบ event นี้จึงพิสูจน์อะไร
เกี่ยวกับคนยิงไม่ได้เลย มันเป็นแค่สัญญาณเตือนว่ามีหน้า NUI แปลกปลอม ไม่ใช่ระบบกันโกง และถ้าตั้ง `'kick'`
ผู้เล่นก็ยิงให้ตัวเองโดนเตะได้ด้วย
:::

## Event ฝั่ง server ที่ client ยิงไม่ถึง

กลุ่มนี้ลงทะเบียนด้วย `AddEventHandler` มีแต่โค้ดฝั่ง server ที่เข้าถึงได้

| Event | พารามิเตอร์ | client ยิงได้ไหม | หมายเหตุ |
| ----- | ----------- | ---------------- | -------- |
| `HexaCore:UpdatePlayer` | ไม่มี | ไม่ได้ | สั่งเซฟ `source` โดยมีคูลดาวน์ 30 วินาทีต่อคน |
| `HexaCore:Server:PlayerLoaded` | `Player` (อ็อบเจกต์ผู้เล่น) | ไม่ได้ | core ก็ยิงตัวนี้เองด้วย ดูหัวข้อถัดไป |
| `HexaCore:Server:OnMoneyChange` | `src`, `moneytype`, `amount`, `operation`, `reason` | ไม่ได้ | core รับเองเฉพาะตอน `Config.Money.EnableMoneyItems` เป็น true |
| `hexa_log:server:CreateLog` | `category`, `title`, `colour`, `message` | ไม่ได้ | ปลายทางของ log ดู [ระบบ log](/th/guide/logging) |
| `HexaCore:DebugSomething` | `tbl`, `indent`, `resource` | ไม่ได้ | พิมพ์ตารางลงคอนโซล เก็บไว้ให้โค้ดเก่า |

### HexaCore:UpdatePlayer

เดิมตัวนี้เป็น net event และรอบเวลาเซฟเดินอยู่ที่ client ตอนนี้เป็น event ฝั่ง server ล้วน client
สั่งเขียนฐานข้อมูลไม่ได้อีกแล้ว เหลือแต่ bridge ฝั่ง server ที่ยังยิงเข้ามา และก็ยังโดนคูลดาวน์
30 วินาทีต่อคนเหมือนกัน

```lua
-- ยิงได้จากฝั่ง server เท่านั้น และยังติดคูลดาวน์ต่อคนอยู่ดี
TriggerEvent('HexaCore:UpdatePlayer')
```

::: tip
อย่าใช้ event นี้เพื่อบันทึกค่าที่สคริปต์ของคุณเพิ่งแก้ ให้เรียก `Player.MarkDirty()` แล้วปล่อยให้
รอบกวาดตาม `Config.Save.Interval` เก็บไปเอง หรือเรียก `Player.Save()` ตรง ๆ ถ้าจำเป็นต้องเขียนเดี๋ยวนี้จริง ๆ
:::

### HexaCore:DebugSomething

ตั้งใจไม่ทำเป็น net event เพื่อไม่ให้ client ยิงถล่มคอนโซลด้วยการพิมพ์ตาราง โค้ดใหม่ควรเรียก
`Core.DumpTable(value)` ตรง ๆ

## Event ฝั่ง server ที่ hexa_core ยิงให้ resource อื่นฟัง

ฟังด้วย `AddEventHandler` ฝั่ง server ทั้งหมดนี้ไม่ใช่ net event client จึงปลอมไม่ได้

| Event | พารามิเตอร์ | ยิงเมื่อไหร่ |
| ----- | ----------- | ------------ |
| `HexaCore:Server:PlayerLoaded` | `Player` | ตัวละครโหลดเสร็จ ตอนท้ายของ `Core.CreatePlayer` |
| `HexaCore:Server:PlayerDropped` | `Player` | ผู้เล่นหลุด ยิงก่อนการเซฟรอบสุดท้าย |
| `HexaCore:Server:OnPlayerUnload` | `source` | มีการเรียก `Core.LogoutPlayer(source)` |
| `HexaCore:Server:OnJobUpdate` | `source`, `job` | `Player.SetJob` หรือ `Player.SetJobDuty` แก้ตารางอาชีพ |
| `HexaCore:Server:SetDuty` | `source`, `onduty` | ผู้เล่นสลับเข้าเวรผ่าน `HexaCore:ToggleDuty` |
| `HexaCore:Server:OnMoneyChange` | `source`, `moneytype`, `amount`, `operation`, `reason` | `Player.AddMoney`, `RemoveMoney` หรือ `SetMoney` ทำงานสำเร็จ |
| `HexaCore:Server:PermissionsChanged` | `source` | `Core.AddPermission` หรือ `Core.RemovePermission` เปลี่ยนสิทธิ์จริง |
| `HexaCore:Server:UpdateObject` | ไม่มี | แคตตาล็อกหรือ core object เปลี่ยน เช่นลงทะเบียนไอเทม อาชีพ หรือเรียก `Core.SetField` |

### HexaCore:Server:PlayerLoaded

จุดเริ่มมาตรฐานของทุกอย่างที่ต้องทำครั้งเดียวต่อตัวละคร และเป็นที่ที่ควรแขวนเมธอดเพิ่ม

```lua
local Core = exports['hexa_core']:GetCoreObject()

AddEventHandler('HexaCore:Server:PlayerLoaded', function(Player)
    -- แขวนเมธอดให้ผู้เล่นคนนี้คนเดียว
    Core.SetPlayerField(Player.PlayerData.source, 'GreetTown', function()
        Core.Notify(Player.PlayerData.source, { title = 'ยินดีต้อนรับกลับ', type = 'info', duration = 5000 })
    end)
end)
```

### HexaCore:Server:OnMoneyChange

`operation` เป็น `'add'`, `'remove'` หรือ `'set'` ส่วน `reason` คือสตริงที่คนเรียกส่งเข้ามา ถ้าไม่ส่ง
จะได้ `'unknown'`

```lua
AddEventHandler('HexaCore:Server:OnMoneyChange', function(src, moneytype, amount, operation, reason)
    if moneytype == 'gold' and operation == 'add' then
        Core.Log('id %s gained %s gold (%s)', src, amount, reason)
    end
end)
```

### HexaCore:Server:UpdateObject

ยิงทุกครั้งที่แคตตาล็อกเปลี่ยน ได้แก่ `Core.RegisterItem`, `Core.RegisterItems`,
`Core.UpdateItemDefinition`, `Core.UnregisterItem` ชุดของอาชีพอีกสี่ตัว `Core.SetField` และตอนโหลด
ไอเทมกับอาชีพจากฐานข้อมูลตอนเปิดเซิร์ฟ

::: tip
ถ้า resource ของคุณเก็บ `Core.Shared.Items` หรือ `Core.Shared.Jobs` ไว้ในตัวแปร local ต้องดึง
core object ใหม่เมื่อ event นี้ยิง ไม่งั้นสำเนาที่ถืออยู่จะค้างอยู่ที่สภาพตอนดึงมาครั้งแรกตลอด
:::

## Event ที่ server ส่งไปหา client

กลุ่มนี้ไม่ใช่ของที่คุณยิงเอง ยกเว้น `HexaCore:Notify` กับชุด `hexa_core:client:*` สำหรับข้อความบนจอ
ที่เหลือคือ core คุยกับฝั่ง client ของตัวเอง — client ยิงใส่ตัวเองได้ทั้งหมด คอลัมน์สุดท้ายบอกว่า
ยิงแล้วได้อะไร

| Event | พารามิเตอร์ | ยิงเมื่อไหร่ | ถ้า client ยิงใส่ตัวเอง |
| ----- | ----------- | ------------ | ----------------------- |
| `HexaCore:Client:SharedUpdate` | `shared` (table) | ตอนต่อเข้าเซิร์ฟ และทุกครั้งที่ขอ spawn | ทับสำเนาแคตตาล็อกของตัวเอง |
| `HexaCore:Client:OnSharedUpdate` | `tableName`, `key`, `value` | ลงทะเบียน แก้ไข หรือถอนไอเทม/อาชีพหนึ่งตัว | เหมือนกัน มีผลแค่ในเครื่องตัวเอง |
| `HexaCore:Client:OnSharedUpdateMultiple` | `tableName`, `values` | ไอเทมหรืออาชีพเปลี่ยนทีละหลายตัว | เหมือนกัน มีผลแค่ในเครื่องตัวเอง |
| `HexaCore:Client:SpawnPlayer` | `pos`, `health`, `gender` | คำตอบของ `HexaCore:Server:RequestSpawn` | มีธง `spawned` กันไว้ ทำได้อย่างมากครั้งเดียว |
| `HexaCore:Client:OnPlayerUnload` | ไม่มี | มีการเรียก `Core.LogoutPlayer` | ล้างสถานะ logged in ของตัวเอง |
| `HexaCore:Player:SetPlayerData` | `PlayerData` (table) | ทุกครั้งที่เรียก `Player.SyncPlayerData()` | ปลอม `Core.PlayerData` ในเครื่องตัวเองได้เท่านั้น |
| `HexaCore:Player:UpdatePlayerData` | ไม่มี | ส่งระหว่าง `Core.LogoutPlayer` | ไม่เกิดอะไร ดูหมายเหตุด้านล่าง |
| `HexaCore:Client:OnJobUpdate` | `job` (table) | `Player.SetJob` หรือ `Player.SetJobDuty` | ปลอมอาชีพที่แสดงในเครื่องตัวเองเท่านั้น |
| `HexaCore:Client:SetDuty` | `onduty` (boolean) | สลับเข้าเวรสำเร็จ | มีผลกับการแสดงผลในเครื่องตัวเองเท่านั้น |
| `HexaCore:Client:OnMoneyChange` | `moneytype`, `amount`, `operation`, `reason` | เมธอดเงินตัวไหนก็ได้ทำงานสำเร็จ | แค่การแสดงผล ยอดเงินจริงไม่ขยับ |
| `HexaCore:Client:UpdateNeeds` | `status` (ตารางค่าสถานะสี่ช่อง) | รอบลดค่า การเขียนค่าสถานะ หรือตอนโหลดตัวละคร | แค่ตัวเลขบน HUD ค่าจริงอยู่ที่ server |
| `HexaCore:Client:TriggerCallback` | `name`, `...` | server callback ตอบกลับ | ตอบ callback ที่ตัวเองค้างอยู่ |
| `HexaCore:Client:TriggerClientCallback` | `name`, `...` | server ถามคำถามมาที่ client | ตอบคำถามที่ไม่มีใครถาม |
| `HexaCore:Notify` | `data` (table หรือ string) | เรียก `Core.Notify(source, data)` | เด้งแจ้งเตือนให้ตัวเองดู |

### HexaCore:Notify

เป็น client event ตัวเดียวในชุดนี้ที่ตั้งใจให้ resource อื่นยิงตรงได้ `data` รับเป็นสตริงเปล่า ๆ ก็ได้
หรือเป็นตารางที่มี `title`, `description`, `type`, `duration` โดย `type` เป็นหนึ่งใน `error`,
`success`, `info`, `primary`, `warning`

```lua
-- ยิงจากฝั่ง server ถึงผู้เล่นคนเดียว
Core.Notify(source, { title = 'รับงานส่งของแล้ว', type = 'success', duration = 5000 })
```

```lua
-- ยิงจากฝั่ง client ให้ตัวเอง
TriggerEvent('HexaCore:Notify', { title = 'อยู่ไกลเกินไป', type = 'error', duration = 4000 })
```

::: warning
ห้าม resource อื่นเขียน `RegisterNetEvent('HexaCore:Notify')` ของตัวเองเพิ่ม `hexa_core` มีตัวรับ
อยู่แล้วและส่งต่อไประบบแจ้งเตือนให้เอง ถ้ามีตัวรับซ้ำ การแจ้งเตือนทุกครั้งในเซิร์ฟจะเด้งสองรอบ
:::

### HexaCore:Client:UpdateNeeds

ค่าสถานะร่างกายที่ server ส่งมา ตาราง `status` มีครบทั้งสี่คีย์เสมอ เป็นตัวเลข 0 ถึง 100

```lua
RegisterNetEvent('HexaCore:Client:UpdateNeeds', function(status)
    -- status.hunger, status.thirst, status.cleanliness, status.stress
    myHud:setBars(status)
end)
```

ฝั่ง client ของ `hexa_core` ไม่ได้เป็นคนลดค่าเลย server เป็นเจ้าของรอบเวลาทั้งหมด คนที่ฆ่า thread
ฝั่ง client ทิ้งจึงแค่ไม่เห็นตัวเลข แต่ค่าจริงยังลดตามปกติ

### HexaCore:Player:UpdatePlayerData

ส่งไปหา client ตอน logout ตัวรับฝั่ง client จะยิง `TriggerServerEvent('HexaCore:UpdatePlayer')` กลับมา
แต่ `HexaCore:UpdatePlayer` ตั้งใจไม่ให้เป็น net event แล้ว การยิงกลับนั้นจึงไม่ถึงใคร การเซฟที่เคยเกิด
ตรงนี้ย้ายไปอยู่ที่รอบกวาดตามธง dirty ของ server กับตัวรับ `playerDropped` แทน ถือว่า event นี้เป็นของเก่า
อย่าเขียนอะไรใหม่ให้พึ่งมัน

### ชุดสั่งงาน client ของคำสั่งแอดมิน

คำสั่ง `/tp`, `/tpm`, `/noclip`, `/vehicle`, `/dv` และ `/me` เช็คสิทธิ์ฝั่ง server แล้วผลักงานจริง
ไปทำที่ client

| Event | พารามิเตอร์ | ส่งโดย |
| ----- | ----------- | ------ |
| `HexaCore:Command:TeleportToPlayer` | `coords` (vector3) | `/tp <id>` |
| `HexaCore:Command:TeleportToCoords` | `x`, `y`, `z` | `/tp <x> <y> <z>` |
| `HexaCore:Command:GoToMarker` | ไม่มี | `/tpm` |
| `HexaCore:Command:ToggleNoClip` | ไม่มี | `/noclip` |
| `HexaCore:Command:SpawnVehicle` | `vehName` (string) | `/vehicle <model>` |
| `HexaCore:Command:DeleteVehicle` | ไม่มี | `/dv` |
| `HexaCore:Command:ShowMe3D` | `senderId`, `msg` | `/me` ส่งให้ทุกคนในรัศมี 20 เมตร |

::: warning
ทั้งเจ็ดตัวเป็น net event ฝั่ง client แปลว่า client ยิงใส่ตัวเองได้และข้ามด่านสิทธิ์ฝั่ง server ไปเลย
กรณีวาร์ปกับ noclip พอรับได้ เพราะคนที่ยิง event เองได้ก็ขยับ ped ตัวเองได้อยู่แล้ว แต่ต้องเข้าใจว่า
event ชุดนี้ไม่ใช่เส้นแบ่งสิทธิ์ อย่าถือว่าใครได้รับ event พวกนี้แปลว่าคนนั้นเป็นแอดมิน และสังเกตว่า
`HexaCore:Command:SpawnVehicle` สร้างรถในเครื่อง client เอง คนละตัวกับ `Core.SpawnVehicle` ฝั่ง server
:::

### Event ข้อความบนจอ

`client/drawtext.lua` ลงทะเบียน net event ไว้สี่ตัวคู่กับ export ปกติควรเรียกผ่าน export ส่วน event
มีไว้ให้สคริปต์ฝั่ง server สั่งข้อความบนจอได้ตรง ๆ

| Event | พารามิเตอร์ | export ที่ทำงานเหมือนกัน |
| ----- | ----------- | ------------------------ |
| `hexa_core:client:DrawText` | `text`, `pos` | `exports['hexa_core']:DrawText(text, pos)` |
| `hexa_core:client:ChangeText` | `text`, `pos` | `exports['hexa_core']:ChangeText(text, pos)` |
| `hexa_core:client:HideText` | ไม่มี | `exports['hexa_core']:HideText()` |
| `hexa_core:client:KeyPressed` | ไม่มี | `exports['hexa_core']:KeyPressed()` |

`pos` ใส่ได้เป็น `left`, `right`, `top` หรือชื่อเต็ม `left-center`, `right-center`, `top-center`
ค่าอื่นจะตกไปที่ `right-center`

```lua
TriggerClientEvent('hexa_core:client:DrawText', source, 'กด ENTER ค้างเพื่อเปิด', 'right')
```

## Event ที่อยู่ในเครื่อง client

| Event | พารามิเตอร์ | วิธีลงทะเบียน | ยิงเมื่อไหร่ |
| ----- | ----------- | ------------- | ------------ |
| `HexaCore:Client:OnPlayerLoaded` | ไม่มี | `RegisterNetEvent` | จบขั้นตอน spawn แล้ว `client/spawn.lua` ยิงเองในเครื่อง |
| `HexaCore:Client:UpdateObject` | ไม่มี | `TriggerEvent` เท่านั้น | แคตตาล็อกในเครื่องนี้ถูกเปลี่ยนหรือถูกแก้บางส่วน |
| `HexaCore:Client:UseItem` | `item` (table) | `RegisterNetEvent` เลิกใช้แล้ว | เตือนแล้วพิมพ์พารามิเตอร์ทิ้งไว้ |

### HexaCore:Client:OnPlayerLoaded

สัญญาณเริ่มงานมาตรฐานของ resource ฝั่ง client server ไม่เคยยิงตัวนี้ — `client/spawn.lua` ยิงเองในเครื่อง
ตอนจบขั้นตอน spawn จังหวะเดียวกับที่บอก server ด้วย `HexaCore:Server:OnPlayerLoaded`

```lua
RegisterNetEvent('HexaCore:Client:OnPlayerLoaded', function()
    -- ถึงตรงนี้ตัวละครยืนอยู่บนพื้นและเล่นได้แล้ว
end)
```

อีกทางที่ทนการ restart resource กลางเกมได้ คือ state bag ที่ตัวรับเดียวกันตั้งไว้

```lua
if LocalPlayer.state.isLoggedIn then
    -- โหลดตัวละครไปแล้วก่อน resource นี้จะเริ่ม
end
```

::: warning
เพราะเป็น net event client จึงยิงใส่ตัวเองตอนไหนก็ได้ แล้วทำให้ resource ฝั่ง client ทุกตัวเชื่อว่า
เพิ่งมีตัวละครโหลดเข้ามา อะไรที่ต้องจริงเฉพาะกับคนที่โหลดตัวละครแล้วจริง ๆ ต้องไปตรวจฝั่ง server
ไม่ใช่อาศัย event ตัวนี้
:::

### HexaCore:Client:UpdateObject

ยิงต่อท้าย `HexaCore:Client:SharedUpdate`, `HexaCore:Client:OnSharedUpdate` และ
`HexaCore:Client:OnSharedUpdateMultiple` เสมอ resource ที่เก็บ core object ไว้ — ของที่
`GetCoreObject()` คืนมาเป็นสำเนา msgpack ไม่ใช่ตัวอ้างอิงจริง — ใช้ตัวนี้เป็นสัญญาณดึงสำเนาใหม่

```lua
local Core = exports['hexa_core']:GetCoreObject()

AddEventHandler('HexaCore:Client:UpdateObject', function()
    Core = exports['hexa_core']:GetCoreObject()
end)
```

การไม่ฟัง event นี้คือต้นเหตุคลาสสิกของอาการ "ไอเทมมีอยู่ในฐานข้อมูลแล้วแต่สคริปต์บอกว่าไม่มี" ค้างยาว
ทั้ง session

## Event ที่เลิกใช้แล้ว

สี่ตัวนี้ยังอยู่เพื่อไม่ให้ resource ที่ยังพอร์ตไม่เสร็จ error ทั้งสี่เป็น net event client ยิงได้หมด
และทั้งสี่ไม่ทำอะไรเลยนอกจากพิมพ์คำเตือนพร้อมชื่อ resource ที่เรียกเข้ามา

| Event | ฝั่ง | ใช้อะไรแทน |
| ----- | ---- | ---------- |
| `HexaCore:Server:AddItem` | server | `Player.AddItem(name, amount, slot, info)` ฝั่ง server |
| `HexaCore:Server:RemoveItem` | server | `Player.RemoveItem(name, amount, slot)` ฝั่ง server |
| `HexaCore:Server:UseItem` | server | ระบบกระเป๋า |
| `HexaCore:Client:UseItem` | client | ระบบกระเป๋า |

::: danger
`HexaCore:Server:AddItem` คือรูรั่วที่ใหญ่ที่สุดของ API ชุดเก่า client เสกไอเทมอะไรก็ได้ในแคตตาล็อก
จำนวนเท่าไหร่ก็ได้ ด้วยโค้ดบรรทัดเดียว ตอนนี้มันไม่ทำงานแล้วและจะถูกถอดออกในรุ่นถัดไป การให้ไอเทมกับผู้เล่น
ต้องเรียกบนอ็อบเจกต์ผู้เล่นฝั่ง server เท่านั้น

```lua
local Player = Core.GetPlayer(source)
Player.AddItem('bread', 1, false, false, 'quest reward')
```

สังเกตการแยกคำที่ตั้งใจทำใน 3.0: `Core.RegisterItem` คือการประกาศว่ามีไอเทมชนิดนี้อยู่ในระบบ ส่วน
`Player.AddItem` คือการยัดของใส่กระเป๋าใครสักคน เดิมสองอย่างนี้ใช้คำว่า `AddItem` เหมือนกันทั้งที่
ความหมายตรงข้ามกัน
:::

## Callback สร้างยานพาหนะ

`HexaCore:Server:SpawnVehicle` ไม่ใช่ event แต่เป็น server callback มันจึงเดินทางผ่าน
`HexaCore:Server:TriggerCallback` เหมือน callback ตัวอื่น และ client ทุกคนเรียกถึงได้

```lua
Core.TriggerCallback('HexaCore:Server:SpawnVehicle', function(netId)
    if not netId then return end
    local veh = NetToVeh(NetworkGetEntityFromNetworkId(netId))
end, model, coords, warp)
```

มีด่านกันสามชั้น: คนเรียกต้องมีตัวละครโหลดอยู่ `model` ต้องเป็น string หรือ number และมีคูลดาวน์
3 วินาทีต่อคน ถ้าไม่มีสามด่านนี้ client ถมเซิร์ฟด้วยยานพาหนะได้ในไม่กี่วินาที ทุกครั้งที่ถูกปฏิเสธมันคืน
`nil` จึงต้องเช็คค่าที่ได้กลับมาเสมอ

## Event ของ resource อื่นที่ hexa_core ยิงหา

กลุ่มนี้เป็นของสคริปต์อื่น `hexa_core` เป็นแค่คนยิง

| Event | ทิศทาง | พารามิเตอร์ | เจ้าของ |
| ----- | ------ | ----------- | ------- |
| `hexa_log:server:CreateLog` | server local | `category`, `title`, `colour`, `message` | ยิงกันทั่วทั้งสแตก และตอนนี้ `hexa_core` รับเองด้วย |
| `hud:client:OnMoneyChange` | server to client | `moneytype`, `amount`, `isRemove` | HUD ตัวไหนก็ได้ที่ฟังยอดเงินเปลี่ยน |
| `chat:addMessage` | client local | `{ color, multiline, args }` | ทางถอยของ `HexaCore:Notify` เมื่อระบบแจ้งเตือนไม่ได้ start |
| `chat:addSuggestions` | server to client | `suggestions` (array) | รายการคำสั่งในแชท รีเฟรชโดย `Core.Commands.Refresh` |
| `chat:removeSuggestion` | server to client | `'/' .. command` | ถอนคำสั่งที่ผู้เล่นไม่มีสิทธิ์ออกจากรายการ |

### hexa_log:server:CreateLog

ตอนนี้ `hexa_core` รับ event นี้เอง พิมพ์ลงคอนโซล และส่งต่อ Discord webhook ถ้าตั้งค่าไว้ใน
`Config.Log.Webhooks` ก่อนหน้า 3.0 ไม่เคยมี resource ชื่อ `hexa_log` อยู่จริง log ทุกบรรทัดจึงหายเงียบ

```lua
TriggerEvent('hexa_log:server:CreateLog', 'joinleave', 'Store opened', 'green', 'Blackwater general store is open')
```

`category` เป็นตัวเลือก webhook ถ้าชื่อหมวดมีอยู่ใน `Config.Log.Webhooks` จะใช้ URL นั้น ถ้าไม่มีจะตกไปที่
`Config.Log.Webhooks.default` และถ้าตั้ง `Config.Log.Enabled = false` จะเงียบทั้งคอนโซลและ webhook

## Event มาตรฐานของ FXServer ที่ hexa_core ดักไว้

รายการนี้บอกว่าอะไรถูกจัดการไปแล้วบ้าง จะได้ไม่ไปทำซ้ำ

| Event | ฝั่ง | hexa_core ทำอะไร |
| ----- | ---- | ---------------- |
| `playerConnecting` | server | หน่วงการเชื่อมต่อ หา identifier เตะออกถ้าไม่มี แล้วส่ง `Core.Shared` ไปให้ |
| `playerDropped` | server | เซฟผู้เล่น ยิง `HexaCore:Server:PlayerDropped` เขียน log เข้าออก ล้าง bucket ตารางคูลดาวน์ และถอนสิทธิ์ ace |
| `chatMessage` | server | ยกเลิกข้อความที่ขึ้นต้นด้วย `/` เพื่อไม่ให้คำสั่งที่ไม่รู้จักโผล่ในแชท |
| `onResourceStop` | server | เซฟผู้เล่นออนไลน์ทุกคน ยกเว้นตั้ง `Config.Save.OnResourceStop` เป็น false |
| `onResourceStop` | client | ล้างข้อความบนจอ prompt และสีโซนบนแผนที่ |
| `onResourceStart` | client | ตั้งสิทธิ์ Eagle Eye ตามอาชีพปัจจุบัน |
| `onClientResourceStart` | client | ทาสีโซนบนแผนที่ใหม่ และขอค่าสถานะร่างกายอีกรอบถ้า login อยู่แล้ว |

::: warning
`playerDropped` ฝั่ง server ยิงตอนการเชื่อมต่อขาดไปแล้ว ตัวรับของ `hexa_core` จะเซฟผู้เล่นแล้วถอดออกจาก
`Core.Players` ตัวรับของคุณที่ทำงานทีหลังจึงอาจเจอ `Core.GetPlayer(src)` เป็น `nil` ไปแล้ว ให้ไปอ่านค่า
ที่ต้องใช้จากอ็อบเจกต์ `Player` ที่ `HexaCore:Server:PlayerDropped` ส่งมาให้แทน
:::

## สรุปรวบรัด

ทุกอย่างที่ client ยิงเข้า server ได้ รวมไว้ที่เดียว

```lua
TriggerServerEvent('HexaCore:Server:RequestSpawn')
TriggerServerEvent('HexaCore:Server:OnPlayerLoaded')
TriggerServerEvent('HexaCore:Server:RequestStatus')
TriggerServerEvent('HexaCore:Server:SetMetaData', 'hunger', 60)
TriggerServerEvent('HexaCore:ToggleDuty')
TriggerServerEvent('HexaCore:CallCommand', 'tpm', {})
TriggerServerEvent('HexaCore:Server:TriggerCallback', 'my:callback')
TriggerServerEvent('HexaCore:Server:TriggerClientCallback', 'my:clientcallback')
TriggerServerEvent('HexaCore:Server:ReportCSRFFailure')
```

ถ้า resource ของคุณจะเพิ่ม net event ของตัวเอง ให้ยึดกฎเดียวกับที่ core ยึดกับ event ชุดนี้: server
เป็นคนตัดสิน client ทำได้แค่ขอ
