# ฟังก์ชันฝั่ง server

ทุกฟังก์ชันที่เฟรมเวิร์กเปิดให้ใช้ฝั่ง server แขวนอยู่บน core object ชั้นเดียว ไม่มี `.Functions` คั่นอีกแล้ว

```lua
local Core = exports['hexa_core']:GetCoreObject()

local Player = Core.GetPlayer(source)
```

`Core.Functions` ยังเรียกได้อีกหนึ่งรุ่น มันเป็นตารางจริงที่มิเรอร์ทุกฟังก์ชันบน `Core` ไว้ `Core.Functions.GetPlayer(source)`
จึงยังทำงาน แต่ถือว่าเลิกใช้แล้วและชั้นนี้จะถูกถอดออก

โค้ดของหน้านี้อยู่ที่ `server/functions.lua`, `server/player.lua`, `server/exports.lua`, `server/commands.lua`,
`server/save.lua` และ `server/main.lua`

::: danger ลงทะเบียนไอเทม ไม่ใช่ การให้ไอเทม
`Core.RegisterItem(name, definition)` คือการเพิ่ม **ชนิดของไอเทม** เข้าแคตตาล็อกกลาง ไม่ยุ่งกับผู้เล่นคนไหนเลย

`Player.AddItem(name, amount)` คือการ **ใส่ของลงกระเป๋าตัวละคร**

สองตัวนี้เคยใช้คำว่า `AddItem` เหมือนกันทั้งที่ความหมายตรงข้ามกัน ถ้ากำลังจะยื่นของให้คน ต้องเรียกผ่าน player object เท่านั้น
ไม่ใช่ `Core`
:::

## ชื่อเก่าที่เลิกใช้แล้ว

ชื่อเดิมยังเรียกได้อยู่ เรียกแล้วจะพิมพ์คำเตือนหนึ่งครั้งพร้อมบอกว่า resource ไหนเป็นคนเรียก แล้วส่งต่อไปยังฟังก์ชันตัวใหม่ ทั้งหมดนี้
จะถูกถอดออกในรุ่นถัดไป

| ชื่อเดิม | เรียกตัวนี้แทน |
| --- | --- |
| `Core.GetSource` | `Core.GetSourceByIdentifier` |
| `Core.GetHexaPlayers` | `Core.GetPlayerObjects` |
| `Core.CanUseItem` | `Core.GetUsableItem` |
| `Core.GetPermission` | `Core.GetPermissions` |
| `Core.IsOptin` | `Core.IsAdminAlertsEnabled` |
| `Core.ToggleOptin` | `Core.ToggleAdminAlerts` |
| `Core.ChangeWeight` | `Core.SetMaxWeight` |
| `Core.ChangeSlots` | `Core.SetMaxSlots` |
| `Core.AddPlayerMethod`, `Core.AddPlayerField` | `Core.SetPlayerField` |
| `Core.SetMethod` | `Core.SetField` |
| `Core.AddJob` | `Core.RegisterJob` |
| `Core.AddJobs` | `Core.RegisterJobs` |
| `Core.RemoveJob` | `Core.UnregisterJob` |
| `Core.UpdateJob` | `Core.UpdateJobDefinition` |
| `Core.AddItem` | `Core.RegisterItem` |
| `Core.AddItems` | `Core.RegisterItems` |
| `Core.UpdateItem` | `Core.UpdateItemDefinition` |
| `Core.RemoveItem` | `Core.UnregisterItem` |
| `Core.CreateFingerId` | `Core.CreateFingerprint` |
| `Core.CreateSerialNumber` | `Core.CreatePhoneSerial` |

เนมสเปซ `Core.Player.*` ทั้งก้อนถูกยุบขึ้นมาอยู่บน `Core` แล้ว ตัว `Core.Player` ยังเหลือไว้ในฐานะตัวส่งต่อที่เตือนก่อนทำงาน

| ชื่อเดิม | เรียกตัวนี้แทน |
| --- | --- |
| `Core.Player.Login` | `Core.LoginPlayer` |
| `Core.Player.Logout` | `Core.LogoutPlayer` |
| `Core.Player.Save` | `Core.SavePlayer` |
| `Core.Player.SaveOffline` | `Core.SaveOfflinePlayer` |
| `Core.Player.CheckPlayerData` | `Core.LoadPlayer` |
| `Core.Player.GetOfflinePlayer` | `Core.GetOfflinePlayerByCitizenId` |
| `Core.Player.CreatePlayer`, `Core.Player.DeleteCharacter`, `Core.Player.CreateCitizenId` และตัวอื่น ๆ | ชื่อเดิมแต่แขวนตรงบน `Core` |

## ผู้เล่น

### GetPlayer

```lua
Core.GetPlayer(source) --> table|nil
```

คืน player object ของ server id นั้น หรือ `nil` ถ้า id นั้นยังไม่มีตัวละครโหลดอยู่ ถ้าส่งเป็นสตริงจะถือว่าเป็น identifier แล้วหาให้ผ่าน
`Core.GetSourceByIdentifier` ก่อน

```lua
RegisterCommand('whoami', function(source)
    local Player = Core.GetPlayer(source)
    if not Player then return end
    Core.Notify(source, { title = Player.PlayerData.citizenid, type = 'info', duration = 5000 })
end, false)
```

### GetPlayerByCitizenId

```lua
Core.GetPlayerByCitizenId(citizenid) --> table|nil
```

ไล่หาในรายชื่อคนที่ออนไลน์อยู่ตาม `PlayerData.citizenid` ใช้ได้กับคนที่อยู่ในเกมเท่านั้น ถ้าต้องการตัวละครที่ไม่ได้ออนไลน์ให้ใช้
`Core.GetOfflinePlayerByCitizenId`

### GetPlayerByLicense

```lua
Core.GetPlayerByLicense(license) --> table|nil
```

ถ้ามีคนออนไลน์ที่ถือ identifier นั้นจะคืนตัวนั้น ถ้าไม่มีจะตกไปที่ `Core.GetOfflinePlayerByLicense` แล้วอ่านแถวจากฐานข้อมูลให้

### GetPlayerByAccount

```lua
Core.GetPlayerByAccount(account) --> table|nil
```

หาคนออนไลน์จาก `PlayerData.charinfo.account` ซึ่งคือเลขบัญชีธนาคารที่สร้างตอนสร้างตัวละคร

### GetPlayerByCharInfo

```lua
Core.GetPlayerByCharInfo(property, value) --> table|nil
```

หาคนออนไลน์ที่ `charinfo[property]` เท่ากับ `value`

```lua
local Player = Core.GetPlayerByCharInfo('firstname', 'Arthur')
```

### GetPlayers

```lua
Core.GetPlayers() --> table
```

อาร์เรย์ของ server id ทุกคนที่มีตัวละครโหลดอยู่ ได้มาแค่เลข id ไม่ใช่ player object

### GetPlayerObjects

```lua
Core.GetPlayerObjects() --> table
```

คืนตารางรายชื่อตัวจริงเลย คีย์เป็น server id ค่าเป็น player object เพราะเป็นตารางตัวจริงไม่ใช่สำเนา ห้ามเพิ่มหรือลบสมาชิกเอง

```lua
for src, Player in pairs(Core.GetPlayerObjects()) do
    Player.AddMoney('cash', 5, 'server wide bonus')
end
```

ชื่อเดิมที่เลิกใช้แล้ว: `Core.GetHexaPlayers`

### GetPlayersOnDuty

```lua
Core.GetPlayersOnDuty(job) --> table, number
```

คืนอาร์เรย์ของ server id ที่เข้าเวรอยู่ในอาชีพนั้น และคืนจำนวนเป็นค่าที่สอง

```lua
local medics, count = Core.GetPlayersOnDuty('doctor')
```

### GetDutyCount

```lua
Core.GetDutyCount(job) --> number
```

เอาแค่จำนวน ไม่ต้องสร้างอาร์เรย์

### GetIdentifier

```lua
Core.GetIdentifier(source, idtype) --> string|nil
```

อ่าน identifier หนึ่งตัวของผู้เล่นที่ต่ออยู่ ถ้าไม่ระบุ `idtype` จะใช้ค่า `Config.IdentifierType` ซึ่งเซิร์ฟนี้ตั้งเป็น `steam`

### GetSourceByIdentifier

```lua
Core.GetSourceByIdentifier(identifier) --> number
```

ไล่หาคนออนไลน์ที่ถือ identifier นั้น ถ้าไม่เจอจะคืน `0` ไม่ใช่ `nil`

ชื่อเดิมที่เลิกใช้แล้ว: `Core.GetSource`

### GetOfflinePlayerByCitizenId

```lua
Core.GetOfflinePlayerByCitizenId(citizenid) --> table|nil
```

อ่านตัวละครจากตาราง `users` แล้วประกอบเป็น player object เต็มตัวโดยที่คนนั้นไม่ต้องออนไลน์ ตัวที่ได้ถูกทำเครื่องหมายว่า `Offline`
เมธอดของมันจะแก้ `PlayerData` ได้ แต่ไม่ยิงอะไรไปหา client เลย

```lua
local Player = Core.GetOfflinePlayerByCitizenId('RB0087')
if Player then
    Player.AddMoney('bank', 250, 'offline payout')
    Player.Save()
end
```

::: warning
ตัวออฟไลน์คือสำเนาที่ตัดขาดจากของจริง ถ้าตัวละครนั้นล็อกอินเข้ามาระหว่างที่ยังถืออยู่ ทั้งสองฝั่งจะเขียนแถวเดียวกันแล้วใครเซฟทีหลัง
ก็ทับของอีกฝั่ง ทำให้จบเร็วที่สุด: หยิบมา แก้ `Save()` แล้วปล่อยทิ้ง
:::

### GetOfflinePlayerByLicense

```lua
Core.GetOfflinePlayerByLicense(license) --> table|nil
```

ตัวเดียวกันแต่หาจากคอลัมน์ `identifier` แทน citizen id

### Notify

```lua
Core.Notify(source, data)
```

ส่งการแจ้งเตือนในตัวไปหาผู้เล่นคนเดียว `data` รับ `title`, `description`, `type` และ `duration` ถ้า `source` เป็น `0` หรือ `nil`
(สั่งจาก console หรือ hook ที่ทำ id หาย) จะพิมพ์ลงคอนโซลแทน ไม่ทำให้ error

```lua
Core.Notify(source, {
    title = 'Delivery complete',
    description = 'The wagon reached Valentine.',
    type = 'success',
    duration = 5000
})
```

### Kick

```lua
Core.Kick(source, reason, setKickReason, deferrals)
```

เตะผู้เล่นออกพร้อมเหตุผล และเตะซ้ำอีกช่วงหนึ่งเพื่อกัน client ที่ไม่ยอมออกรอบแรก ถ้าเตะระหว่าง `playerConnecting` ให้ส่งฟังก์ชัน
`setKickReason` กับอ็อบเจกต์ `deferrals` ของ deferral นั้นเข้ามาด้วย ถ้าคนนั้นอยู่ในเกมแล้วให้ส่ง `nil` ทั้งสองตัว

### GetCoords

```lua
Core.GetCoords(entity) --> vector4
```

ตำแหน่งพร้อมทิศทางของ entity ใด ๆ รวมเป็น `vector4(x, y, z, heading)`

### GetClosestPlayer, GetClosestPed, GetClosestVehicle, GetClosestObject

```lua
Core.GetClosestPlayer(source, coords)  --> number, number
Core.GetClosestPed(source, coords)     --> number, number
Core.GetClosestVehicle(source, coords) --> number, number
Core.GetClosestObject(source, coords)  --> number, number
```

แต่ละตัวคืน entity ที่ใกล้ที่สุดกับระยะห่าง ถ้าไม่เจออะไรเลยจะคืน `-1, -1` ค่า `coords` ใส่หรือไม่ใส่ก็ได้ ถ้าไม่ใส่จะใช้ตำแหน่ง ped
ของ `source` เอง `GetClosestPlayer` คืน server id และข้ามตัวคนเรียกให้ ส่วนอีกสามตัวคืน entity handle

```lua
local target, distance = Core.GetClosestPlayer(source)
if target ~= -1 and distance < 3.0 then
    Core.Notify(target, { title = 'Someone is right next to you', type = 'info', duration = 3000 })
end
```

### PrepForSQL

```lua
Core.PrepForSQL(source, data, pattern) --> boolean
```

คืน `true` เมื่อ `data` ตรงกับ `pattern` ตลอดทั้งความยาว ถ้าไม่ตรงจะบันทึก log หมวด anticheat พร้อมระบุตัวผู้เล่น แล้วคืน `false`

### GetDatabaseInfo

```lua
Core.GetDatabaseInfo() --> table
```

แกะ convar `mysql_connection_string` แล้วคืน `{ exists = boolean, database = string }`

## เงินและไอเทม

เงินอยู่บน player object ไม่ได้อยู่บน `Core` ไม่มี `Core.AddMoney`

```lua
local Player = Core.GetPlayer(source)
Player.AddMoney('cash', 100, 'reward')
Player.RemoveMoney('bank', 40, 'stamp duty')
local balance = Player.GetMoney('cash')
```

ประเภทเงินมีเท่าที่ `Config.Money.MoneyTypes` กำหนด ค่าเริ่มต้นคือ `cash`, `bank` และ `gold` ถ้าเรียก `AddMoney` หรือ
`RemoveMoney` ด้วยประเภทที่ตัวละครนั้นไม่มี จะคืน `false`

### CanCarryItem

```lua
Core.CanCarryItem(source, item, amount) --> boolean
```

เทียบน้ำหนักของไอเทมจากแคตตาล็อกกับน้ำหนักที่ตัวละครแบกอยู่ คืน `false` เมื่อไม่รู้จักไอเทมนั้น เมื่อผู้เล่นยังไม่โหลด หรือเมื่อ
ระบบกระเป๋าไม่ได้รันอยู่ ถ้าไม่ส่ง `amount` จะถือว่าเป็น `1`

```lua
if not Core.CanCarryItem(source, 'bread', 5) then
    return Core.Notify(source, { title = 'Your satchel is full', type = 'error', duration = 4000 })
end
```

ตัวเดียวกันนี้อยู่บน player object ในชื่อ `Player.CanCarryItem(item, amount)` ด้วย

### HasItem

```lua
Core.HasItem(source, items, amount) --> boolean
```

ส่งต่อไปที่ระบบกระเป๋า ค่า `items` เป็นชื่อเดี่ยวหรือตารางของชื่อก็ได้ ถ้า resource inventory ไม่ได้สตาร์ตจะคืน `false`
บน player object เรียกได้เป็น `Player.HasItem(items, amount)`

### CreateUseableItem

```lua
Core.CreateUseableItem(item, handler)
```

ลงทะเบียนว่าเกิดอะไรขึ้นเมื่อผู้เล่นกดใช้ไอเทมนั้น handler จะได้รับ source กับตารางของไอเทม

```lua
Core.CreateUseableItem('bread', function(source, item)
    local Player = Core.GetPlayer(source)
    if not Player then return end
    Player.RemoveItem('bread', 1, item.slot, 'eaten')
    Player.SetMetaData('hunger', Player.GetMetaData('hunger') + 20)
end)
```

### GetUsableItem

```lua
Core.GetUsableItem(item) --> function|nil
```

คืน handler ที่ลงทะเบียนไว้กับไอเทมนั้น หรือ `nil` ใช้เช็คว่าไอเทมนั้นกดใช้ได้หรือไม่

ชื่อเดิมที่เลิกใช้แล้ว: `Core.CanUseItem`

### UseItem

```lua
Core.UseItem(source, item)
```

สั่งให้ระบบกระเป๋ารันขั้นตอนการใช้ไอเทม ถ้า resource inventory ไม่ได้สตาร์ตจะพิมพ์คำเตือนแล้วไม่ทำอะไร

### SetMaxWeight

```lua
Core.SetMaxWeight(source, weight)
```

ตั้งความจุที่ตัวละครแบกได้ เซิร์ฟนี้คิดน้ำหนักเป็นเปอร์เซ็นต์ ค่าเริ่มต้นจึงเป็น `100` เขียนผ่าน `SetPlayerData` จึง sync ให้และปักธง
dirty ให้เอง ไม่คืนค่าอะไร

ชื่อเดิมที่เลิกใช้แล้ว: `Core.ChangeWeight`

### SetMaxSlots

```lua
Core.SetMaxSlots(source, slots)
```

ตั้งจำนวนช่องในกระเป๋า ค่าเริ่มต้น `25` ไม่คืนค่าอะไร

ชื่อเดิมที่เลิกใช้แล้ว: `Core.ChangeSlots`

### GetTotalWeight, GetSlotsByItem, GetFirstSlotByItem

```lua
Core.GetTotalWeight(items)               --> number|nil
Core.GetSlotsByItem(items, itemName)     --> table|nil
Core.GetFirstSlotByItem(items, itemName) --> number|nil
```

เป็นทางผ่านบาง ๆ ไปที่ระบบกระเป๋า รับตารางช่องเก็บของเข้ามา (ปกติคือ `Player.PlayerData.items`) ทั้งสามตัวคืน `nil`
เมื่อ resource inventory ไม่ได้สตาร์ต

### SaveInventory, SaveOfflineInventory

```lua
Core.SaveInventory(source)
Core.SaveOfflineInventory(PlayerData)
```

เขียนเฉพาะกระเป๋ากลับลงฐานข้อมูล ปกติ `Core.SavePlayer` ทำให้อยู่แล้ว ใช้สองตัวนี้เฉพาะตอนที่ตั้งใจจะเขียนของในกระเป๋าโดยไม่แตะ
ข้อมูลส่วนอื่นของแถวจริง ๆ

## แคตตาล็อกไอเทมและอาชีพ

ชุดนี้แก้ **นิยาม** ของไอเทมและอาชีพในแคตตาล็อกกลาง ทุกตัวจะกระจายการเปลี่ยนแปลงไปหา client ที่ออนไลน์อยู่และยิง
`HexaCore:Server:UpdateObject` ให้ ทุกตัวคืน `success, message` และตัวที่เพิ่มทีละหลายรายการจะคืนค่าที่สามเป็นรายการที่ล้มเหลว

แหล่งข้อมูลจริงของทั้งสองแคตตาล็อกคือฐานข้อมูล `hexa_core` อ่านตาราง `items`, `jobs` และ `job_grades` ตอนบูต ฟังก์ชันชุดนี้
ไว้ใช้กับนิยามที่ resource ของคุณเป็นเจ้าของเองตอนรันไทม์

### RegisterItem

```lua
Core.RegisterItem(itemName, item) --> boolean, string
```

เพิ่มไอเทมหนึ่งชนิด ล้มเหลวเป็น `item_exists` ถ้าชื่อซ้ำ และ `invalid_item_name` ถ้าชื่อไม่ใช่สตริง

```lua
Core.RegisterItem('brew_coffee', {
    name = 'brew_coffee',
    label = 'Hot Coffee',
    weight = 1,
    type = 'item',
    image = 'brew_coffee.png',
    unique = false,
    useable = true,
    shouldClose = true
})
```

ชื่อเดิมที่เลิกใช้แล้ว: `Core.AddItem`

### RegisterItems

```lua
Core.RegisterItems(items) --> boolean, string, table|nil
```

ลงทะเบียนนิยามทั้งตารางโดยใช้ชื่อไอเทมเป็นคีย์ มันจะหยุดที่รายการแรกที่ผิดแล้วคืนรายการนั้นเป็นค่าที่สาม แปลว่ารายการที่มาก่อนหน้านั้น
ถูกลงทะเบียนไปเรียบร้อยแล้ว

ชื่อเดิมที่เลิกใช้แล้ว: `Core.AddItems`

### UpdateItemDefinition

```lua
Core.UpdateItemDefinition(itemName, item) --> boolean, string
```

เขียนทับนิยามที่มีอยู่แล้ว ล้มเหลวเป็น `item_not_exists` ถ้าไม่เคยลงทะเบียนไว้

ชื่อเดิมที่เลิกใช้แล้ว: `Core.UpdateItem`

### UnregisterItem

```lua
Core.UnregisterItem(itemName) --> boolean, string
```

ถอดนิยามออกจากแคตตาล็อก ของที่อยู่ในกระเป๋าตัวละครไม่ถูกแตะ แต่ระบบ inventory จะตัดของที่หานิยามไม่เจอทิ้งตอนโหลดรอบถัดไป

ชื่อเดิมที่เลิกใช้แล้ว: `Core.RemoveItem`

### RegisterJob, RegisterJobs, UpdateJobDefinition, UnregisterJob

```lua
Core.RegisterJob(jobName, job)         --> boolean, string
Core.RegisterJobs(jobs)                --> boolean, string, table|nil
Core.UpdateJobDefinition(jobName, job) --> boolean, string
Core.UnregisterJob(jobName)            --> boolean, string
```

รูปแบบเหมือนชุดไอเทมทุกอย่าง แต่ทำกับ `Shared.Jobs` ข้อความล้มเหลวคือ `invalid_job_name`, `job_exists` และ `job_not_exists`

```lua
Core.RegisterJob('ferrier', {
    label = 'Ferrier',
    type = 'none',
    defaultDuty = true,
    offDutyPay = false,
    grades = {
        ['0'] = { name = 'Apprentice', payment = 25 },
        ['1'] = { name = 'Master', payment = 60, isboss = true }
    }
})
```

ชื่อเดิมที่เลิกใช้แล้ว: `Core.AddJob`, `Core.AddJobs`, `Core.UpdateJob`, `Core.RemoveJob`

::: warning ฝั่ง export ยังใช้คำกริยาชุดเก่าอยู่
`exports['hexa_core']:AddItem(name, definition)` กับ `exports['hexa_core']:RemoveItem(name)` เป็น export ที่ลงทะเบียนไว้จริง
และทั้งคู่คือฟังก์ชัน **แคตตาล็อก** ตัวเดียวกับ `Core.RegisterItem` และ `Core.UnregisterItem` มันไม่ได้ให้หรือยึดของจากผู้เล่น
`:AddJob`, `:AddJobs`, `:AddItems`, `:UpdateItem`, `:UpdateJob` และ `:RemoveJob` ก็เป็นแบบเดียวกัน

ถ้าจะย้ายของเข้าออกจากตัวละคร ให้ทำผ่าน player object หรือเรียกระบบกระเป๋าตรง ๆ
:::

## อาชีพ

การเปลี่ยนอาชีพเป็นเมธอดของ player object

```lua
local Player = Core.GetPlayer(source)
Player.SetJob('sheriff', 2)
Player.SetJobDuty(true)
```

`Player.SetJob(job, grade)` คืน `false` ถ้าอาชีพนั้นไม่มีในแคตตาล็อก เมื่อสำเร็จจะยิง `HexaCore:Server:OnJobUpdate` และ
`HexaCore:Client:OnJobUpdate` พร้อม sync ให้

`Player.SetGang(gang, grade)` เป็น no-op ที่คืน `false` เสมอ เซิร์ฟนี้ไม่มีระบบแก๊ง เมธอดนี้มีอยู่เพราะ bridge เรียกหามัน

## สิทธิ์

ระดับสิทธิ์มาจาก `Core.Commands.Permissions` ซึ่งคือ `{ 'admin', 'staff' }` ตัว ace ถูกสร้างเป็น `hexacore.<ระดับ>` ตอนบูต

### HasPermission

```lua
Core.HasPermission(source, permission) --> boolean
```

`permission` ส่งเป็นสตริงหรืออาร์เรย์ของสตริงก็ได้ ถ้าเป็นอาร์เรย์ ตรงตัวใดตัวหนึ่งก็คืน `true`

```lua
if not Core.HasPermission(source, { 'admin', 'staff' }) then return end
```

### AddPermission

```lua
Core.AddPermission(source, permission)
```

เพิ่ม principal รีเฟรชรายการคำสั่งที่ผู้เล่นคนนั้นมองเห็น แล้วยิง `HexaCore:Server:PermissionsChanged` ถ้าคนนั้นมีสิทธิ์อยู่แล้วจะไม่ทำอะไร

### RemovePermission

```lua
Core.RemovePermission(source, permission)
```

ถอนสิทธิ์ทีละตัว ถ้าเรียกโดยไม่ส่ง `permission` จะถอนทุกระดับใน `Core.Commands.Permissions` และยิง
`HexaCore:Server:PermissionsChanged` ครั้งเดียวหลังจบทุกการเปลี่ยนแปลง

::: tip
principal ผูกกับเลข server id และ FXServer เอาเลข id กลับมาใช้ซ้ำ `hexa_core` จึงถอน principal ทั้งชุดทิ้งตอน `playerDropped`
ด้วยเหตุผลนี้พอดี ไม่งั้นคนถัดไปที่ได้ id เดิมจะได้สิทธิ์ staff ติดมาด้วย
:::

### GetPermissions

```lua
Core.GetPermissions(source) --> table
```

คืนเซ็ตของระดับที่คนนั้นถืออยู่ เช่น `{ staff = true }`

ชื่อเดิมที่เลิกใช้แล้ว: `Core.GetPermission`

### IsAdminAlertsEnabled

```lua
Core.IsAdminAlertsEnabled(source) --> boolean
```

บอกว่าแอดมินคนนี้เปิดรับการแจ้งเตือนสำหรับแอดมินอยู่หรือไม่ คืน `false` ให้คนที่ไม่มีสิทธิ์ `admin` และให้แอดมินที่ยังไม่มีตัวละครโหลดอยู่

ชื่อเดิมที่เลิกใช้แล้ว: `Core.IsOptin`

### ToggleAdminAlerts

```lua
Core.ToggleAdminAlerts(source)
```

สลับสถานะรับแจ้งเตือนแล้วบันทึกผ่าน `SetPlayerData` ถ้าไม่ใช่แอดมินจะเงียบไม่ทำอะไร

ชื่อเดิมที่เลิกใช้แล้ว: `Core.ToggleOptin`

## Routing bucket

### SetPlayerBucket

```lua
Core.SetPlayerBucket(source, bucket) --> boolean
```

ย้ายผู้เล่นเข้า bucket เขียนค่า `instance` ลง statebag ของคนนั้น และจดการย้ายไว้ในทะเบียน bucket คืน `false` ถ้าขาดอาร์กิวเมนต์
ตัวใดตัวหนึ่ง

```lua
Core.SetPlayerBucket(source, 42)
```

### SetEntityBucket

```lua
Core.SetEntityBucket(entity, bucket) --> boolean
```

ตัวเดียวกันแต่ใช้กับ entity ที่ไม่ใช่ผู้เล่น เช่น ped ยานพาหนะ พร็อพ

### GetPlayersInBucket

```lua
Core.GetPlayersInBucket(bucket) --> table|false
```

อาร์เรย์ของ server id ที่อยู่ใน bucket นั้น ถ้ายังไม่เคยมีผู้เล่นคนไหนถูกจัดเข้า bucket เลย จะคืน `false` ไม่ใช่ตารางว่าง

### GetEntitiesInBucket

```lua
Core.GetEntitiesInBucket(bucket) --> table|false
```

อาร์เรย์ของ entity handle ใน bucket นั้น พฤติกรรมเรื่อง `false` เหมือนกัน

### GetBucketObjects

```lua
Core.GetBucketObjects() --> table, table
```

คืนทะเบียนดิบทั้งสองชุด ตัวแรกคือ bucket ของผู้เล่นที่คีย์ด้วย identifier ตัวที่สองคือ bucket ของ entity ที่คีย์ด้วย entity handle

## ยานพาหนะ

### SpawnVehicle

```lua
Core.SpawnVehicle(source, model, coords, warp) --> number
```

สร้างยานพาหนะด้วยเส้นทาง `CreateVehicle` แบบเดิม ซึ่งต้องมี client อยู่ใกล้พิกัดนั้นเป็นคนสร้าง entity จริง `model` ส่งเป็นสตริงหรือ
hash ก็ได้ ถ้าไม่ส่ง `coords` จะใช้ตำแหน่งของผู้เล่น และใช้ `coords.w` เป็นทิศทาง ทุกจุดที่ต้องรอมีเพดานสิบวินาที ถ้า entity ไม่เกิดขึ้นจริง
จะคืน `0` ส่วนกรณีที่รอวาร์ปขึ้นรถหรือรอโอนเจ้าของไม่ทัน จะพิมพ์คำเตือนแต่ยังคืน handle ให้

```lua
local veh = Core.SpawnVehicle(source, 'wagon01x', GetEntityCoords(GetPlayerPed(source)), true)
```

### CreateVehicle

```lua
Core.CreateVehicle(source, model, vehtype, coords, warp) --> number
```

ตัวสร้างฝั่ง server รุ่นใหม่ และเชื่อถือได้กว่าตัวบน `vehtype` คือชนิดของยานพาหนะแบบเดียวกับใน `vehicles.meta` เช่น `automobile`,
`boat`, `heli` คืน `0` ถ้าหมดเวลารอ

::: tip
สคริปต์ฝั่ง client ควรขอยานพาหนะผ่าน callback `HexaCore:Server:SpawnVehicle` แทนที่จะเรียกสองตัวนี้ตรง ๆ เพราะเส้นทางนั้น
มีคูลดาวน์หนึ่งคันต่อคนต่อสามวินาที และปฏิเสธคนที่ยังไม่มีตัวละครโหลดอยู่
:::

## Callback

### CreateCallback

```lua
Core.CreateCallback(name, handler)
```

ลงทะเบียน callback ฝั่ง server ตัว handler ถูกเรียกเป็น `handler(source, cb, ...)` และต้องเรียก `cb` หนึ่งครั้งเสมอ

```lua
Core.CreateCallback('myresource:server:getBalance', function(source, cb)
    local Player = Core.GetPlayer(source)
    if not Player then return cb(0) end
    cb(Player.GetMoney('bank'))
end)
```

### TriggerCallback

```lua
Core.TriggerCallback(name, source, cb, ...)
```

เรียก callback ฝั่ง server จากโค้ดฝั่ง server ด้วยกัน ถ้าชื่อนั้นไม่เคยถูกลงทะเบียนไว้ มันจะคืนออกทันทีโดยไม่ทำอะไร

### TriggerClientCallback

```lua
Core.TriggerClientCallback(name, source, cb, ...)
```

ถาม client คนหนึ่งด้วย callback ที่ลงทะเบียนไว้ฝั่ง client คำตอบจะกลับมาที่ `cb` และ handler ที่เก็บไว้จะถูกทิ้งหลังทำงานหนึ่งครั้ง

## วงจรชีวิตของตัวละคร

ชุดนี้คือขั้นตอน login เซฟ และลบตัวละคร resource ทั่วไปแทบไม่ต้องเรียกเอง `hexa_core` เรียกให้อยู่แล้วจาก `server/spawn.lua`
และ `server/save.lua`

### LoginPlayer

```lua
Core.LoginPlayer(source, citizenid, newData) --> boolean
```

โหลดตัวละครเดิมตาม citizen id หรือสร้างตัวใหม่จาก `Config.Player.PlayerDefaults` เมื่อ `citizenid` เป็น `nil` identifier ของคนที่
ต่ออยู่ต้องตรงกับคอลัมน์ `identifier` ของแถวตัวละครนั้น ไม่งั้นผู้เล่นจะถูกเตะออกพร้อมบันทึก log หมวด anticheat และจะล้างธง `isdead`
ที่ค้างอยู่ให้เสมอตอนเข้าเกม

ชื่อเดิมที่เลิกใช้แล้ว: `Core.Player.Login`

### LogoutPlayer

```lua
Core.LogoutPlayer(source)
```

ยิง `HexaCore:Client:OnPlayerUnload` และ `HexaCore:Server:OnPlayerUnload` รอสั้น ๆ แล้วเอาคนนั้นออกจากรายชื่อ ตัวมันเอง
ไม่เซฟ ถ้าต้องการให้แถวถูกเขียนต้องเรียก `Player.Save()` ก่อน

ชื่อเดิมที่เลิกใช้แล้ว: `Core.Player.Logout`

### LoadPlayer

```lua
Core.LoadPlayer(source, PlayerData) --> table|nil
```

เติมค่าเริ่มต้นที่ขาด ตรวจอาชีพกับแคตตาล็อก รวมบัญชีธนาคารสาขาเก่าเข้า `bank` ดึงของในกระเป๋าจากระบบกระเป๋า แล้วประกอบ
เป็น player object

ถ้าส่ง source เป็น `nil` จะได้ตัว **offline** กลับมา แต่ถ้าส่ง source จริง มันจะลงทะเบียนตัวนั้นในรายชื่อ เซฟให้หนึ่งรอบ ยิง
`HexaCore:Server:PlayerLoaded` แล้ว **ไม่คืนค่าอะไรกลับมา**

ชื่อเดิมที่เลิกใช้แล้ว: `Core.Player.CheckPlayerData`

### CreatePlayer

```lua
Core.CreatePlayer(PlayerData, Offline) --> table|nil
```

ตัวประกอบอ็อบเจกต์ที่ `LoadPlayer` เรียก มันแขวนเมธอดทุกตัวลงบนอ็อบเจกต์ ตั้ง `Dirty` เป็น `true` และผลัก metadata ลง statebag
ปกติควรเรียก `LoadPlayer` แทน เพราะตัวนั้นตรวจข้อมูลให้ก่อน

### SavePlayer

```lua
Core.SavePlayer(source)
```

เขียนแถว `users` ทั้งแถว: เงิน อาชีพ charinfo ตำแหน่ง กระเป๋า loadout metadata และสถานะตาย ถ้า id นั้นไม่มีตัวละครโหลดอยู่
จะพิมพ์ error แล้วไม่ทำอะไร ธง dirty ถูกล้างก่อนส่งคิวรี ไม่ใช่หลัง และจะถูกปักกลับถ้าเขียนไม่สำเร็จ เพื่อให้รอบกวาดถัดไปลองใหม่

::: warning
`Core.SavePlayer` ไม่ได้ดึงค่าจาก statebag ก่อนเขียน ค่าหิว กระหาย สะอาด เครียด และเลือด จึงมีโอกาสถูกเขียนเป็นค่าเก่า
ให้เรียก `Player.Save()` แทน ตัวนั้นเรียก `Player.PullStateBags()` ก่อนแล้วค่อยมาที่นี่
:::

ชื่อเดิมที่เลิกใช้แล้ว: `Core.Player.Save`

### SaveOfflinePlayer

```lua
Core.SaveOfflinePlayer(PlayerData)
```

เขียนตาราง `PlayerData` ของตัวละครที่ไม่ได้ต่ออยู่ พร้อมเซฟกระเป๋าในโหมด offline นี่คือตัวที่ `Player.Save()` เรียกเมื่ออ็อบเจกต์
เป็นแบบ offline

ชื่อเดิมที่เลิกใช้แล้ว: `Core.Player.SaveOffline`

### SaveAllPlayers

```lua
Core.SaveAllPlayers() --> number
```

เซฟทุกคนที่ออนไลน์อยู่เดี๋ยวนี้ ไม่มีการเกลี่ยเวลาแบบรอบกวาดปกติ และคืนจำนวนคนที่เขียนไป `hexa_core` เรียกตัวนี้เองตอน
`onResourceStop` เว้นแต่ตั้ง `Config.Save.OnResourceStop` เป็น `false`

```lua
Core.Commands.Add('saveall', 'Save every online player now', {}, false, function(source)
    Core.Log('manual save wrote %d player(s)', Core.SaveAllPlayers())
end, 'admin')
```

รอบกวาดอัตโนมัติเดินทุก ๆ `Config.Save.Interval` นาที (ค่าเริ่มต้น 45 ค่าที่ต่ำกว่า 1 ถูกดันขึ้นเป็น 1) และเกลี่ยการเขียนให้กระจาย
ภายใน `Config.Save.SpreadSeconds` มันเขียนเฉพาะคนที่ธง `Dirty` ถูกปักไว้ คนที่ยืนเฉย ๆ จึงไม่ถูกเขียนซ้ำ ถ้าอยากบังคับให้ใคร
เข้ารอบกวาดรอบหน้าให้เรียก `Player.MarkDirty()`

### DeleteCharacter

```lua
Core.DeleteCharacter(source, citizenid)
```

ลบตัวละคร แต่จะลบก็ต่อเมื่อ identifier ของคนที่ต่ออยู่เป็นเจ้าของตัวละครนั้นจริง ถ้าไม่ใช่ ผู้เล่นจะถูกเตะออกพร้อมบันทึก log
หมวด anticheat

### ForceDeleteCharacter

```lua
Core.ForceDeleteCharacter(citizenid)
```

ลบตัวละครโดยไม่ตรวจความเป็นเจ้าของ ถ้าตัวละครนั้นอยู่ในเกม ผู้เล่นจะถูกเตะออกก่อน ตัวนี้คือเส้นทางสำหรับแอดมิน

## การต่อขยาย core

### SetField

```lua
Core.SetField(fieldName, data) --> boolean, string
```

แขวนอะไรก็ได้ลงบน core object แล้วยิง `HexaCore:Server:UpdateObject` ให้ resource ที่ถือสำเนาอยู่รู้ว่าต้องรีเฟรช คืน
`false, 'invalid_field_name'` ถ้าชื่อไม่ใช่สตริง

```lua
Core.SetField('MyRegistry', {})
Core.SetField('GetTownFor', function(coords) return 'valentine' end)
```

เพราะ `Core` มิเรอร์ทุกฟังก์ชันที่แขวนเข้ามาลง `Core.Functions` ให้อัตโนมัติ ฟังก์ชันที่ใส่ตรงนี้จึงเรียกได้ทั้งสองชื่อตลอดช่วงเปลี่ยนผ่าน

ชื่อเดิมที่เลิกใช้แล้ว: `Core.SetMethod`

### SetPlayerField

```lua
Core.SetPlayerField(ids, fieldName, data)
```

แขวนฟิลด์หรือเมธอดลงบน player object ตัวเดียว บนอาร์เรย์ของหลายตัว หรือบนทุกคนที่ออนไลน์เมื่อส่ง `ids` เป็น `-1` ชื่อที่สงวนไว้
(`PlayerData`, `Functions`, `Offline`) จะถูกปฏิเสธ

```lua
AddEventHandler('HexaCore:Server:PlayerLoaded', function(Player)
    Core.SetPlayerField(Player.PlayerData.source, 'GetTownDues', function()
        return math.floor(Player.GetMoney('bank') * 0.02)
    end)
end)
```

ถ้าถือ player object อยู่แล้ว ตัวเทียบเท่าคือ `Player.SetField(name, value)`

ชื่อเดิมที่เลิกใช้แล้ว: `Core.AddPlayerMethod`, `Core.AddPlayerField`

### GetCoreVersion

```lua
Core.GetCoreVersion(invokingResource) --> string
```

คืนค่า `version` จาก `fxmanifest.lua` ถ้าส่งชื่อ resource เข้ามาด้วยจะบันทึกการเรียกไว้ในระดับ debug เรียกเป็น export ได้ด้วย:
`exports['hexa_core']:GetCoreVersion()`

## รหัสที่ระบบสร้างให้

ทุกตัวในกลุ่มนี้สุ่มค่าแล้ววนเช็คกับตาราง `users` จนกว่าจะได้ค่าที่ยังไม่มีใครถือ ทุกตัวรอผลคิวรีฐานข้อมูล จึงควรเรียกตอนสร้างตัวละคร
ไม่ใช่เรียกในลูป

### CreateCitizenId

```lua
Core.CreateCitizenId() --> string
```

ประกอบจาก `Config.Player.CitizenIdPrefix` ตามด้วยเลขสุ่มเติมศูนย์หน้าให้ครบ `Config.Player.CitizenIdDigits` หลัก เช่น `RB`
กับ `4` จะได้ `RB0087` เลขที่อยู่ใน `Config.Player.LockedIds` จะไม่ถูกแจกออกไปเลย ถ้าสุ่มห้าสิบครั้งแล้วชนหมด มันจะขยายจำนวนหลัก
ขึ้นทีละหลัก ได้สูงสุดสี่หลัก พร้อมพิมพ์ log บอกให้ไปเพิ่มค่า `Config.Player.CitizenIdDigits`

### CreateAccountNumber

```lua
Core.CreateAccountNumber() --> string
```

เลขบัญชีธนาคารที่เก็บไว้ใน `charinfo.account`

### CreateWalletId

```lua
Core.CreateWalletId() --> string
```

รหัสกระเป๋าเงินที่ขึ้นต้นด้วย `Hexa-` เก็บไว้ใน `metadata.walletid`

### CreateFingerprint

```lua
Core.CreateFingerprint() --> string
```

รหัสลายนิ้วมือที่ผสมตัวอักษรกับตัวเลข เก็บไว้ใน `metadata.fingerprint`

ชื่อเดิมที่เลิกใช้แล้ว: `Core.CreateFingerId`

### CreatePhoneSerial

```lua
Core.CreatePhoneSerial() --> number
```

ซีเรียลของโทรศัพท์ เก็บไว้ใน `metadata.phonedata.SerialNumber`

ชื่อเดิมที่เลิกใช้แล้ว: `Core.CreateSerialNumber`

## ระบบ log

ตัวพิมพ์ทั้งห้ารับ format string แบบ printf พร้อมอาร์กิวเมนต์ และมี signature เหมือนกันเป๊ะทั้งฝั่ง client และ server
ข้อความ log เป็นภาษาอังกฤษโดยตั้งใจ เพราะคอนโซลเซิร์ฟเวอร์บางตัวแสดงตัวไทยเพี้ยน และคนที่ไล่ log ต้องกวาดตาเร็ว

```lua
Core.Log('shop opened in %s', 'valentine')
Core.Warn('%s asked for an item that does not exist: %s', resource, item)
Core.Error('could not write ledger for %s', citizenid)
Core.PrintDebug('cart %s now holds %d entries', cartId, count)
Core.DumpTable(Player.PlayerData)
```

### Log, Warn, Error

```lua
Core.Log(fmt, ...)
Core.Warn(fmt, ...)
Core.Error(fmt, ...)
```

ทั้งสามพิมพ์พร้อมคำนำหน้า `[hexa_core]` และติดป้าย `[WARN]` กับ `[ERROR]` ตามลำดับ ไม่มีคอนฟิกไหนปิดสามตัวนี้ได้

### PrintDebug

```lua
Core.PrintDebug(fmt, ...)
```

พิมพ์เฉพาะตอน `Config.Debug` เป็น `true` และมันเช็คสวิตช์ **ก่อน** ที่จะฟอร์แมตสตริง การทิ้งบรรทัด debug ไว้ในเส้นทางที่วิ่งถี่
จึงไม่มีต้นทุนเลยเมื่อปิด debug อยู่

::: tip
`Core.Debug` เคยหมายถึงคนละอย่างระหว่างฝั่ง client กับ server ตอนนี้แยกออกจากกันแล้ว: `Core.PrintDebug` พิมพ์ข้อความหนึ่งบรรทัด
ส่วน `Core.DumpTable` พิมพ์ตาราง
:::

### DumpTable

```lua
Core.DumpTable(value, indent)
```

พิมพ์ตารางลงคอนโซลแบบจัดรูป แยกสีตามชนิดของค่า และตัดที่ความลึกหกชั้น เพื่อไม่ให้ตารางที่วนหาตัวเองลากคอนโซลค้าง

### ShowError, ShowSuccess

```lua
Core.ShowError(resource, message)
Core.ShowSuccess(resource, message)
```

รูปแบบเก่าแบบสองอาร์กิวเมนต์ที่โค้ดในเซิร์ฟใช้กันอยู่ ยกมาไว้บนตัวพิมพ์ชุดเดียวกันเพื่อให้คำนำหน้าไม่แตกแถว

### ส่ง log ต่อไปที่ Discord

`hexa_core` รับ event `hexa_log:server:CreateLog` เอง เดิมไม่มี resource ไหนรับ event นี้เลย log ทุกบรรทัดที่เซิร์ฟยิงออกมา
จึงหายเงียบทั้งหมด

```lua
TriggerEvent('hexa_log:server:CreateLog', 'joinleave', 'Store opened', 'green', 'Valentine store is open')
```

อาร์กิวเมนต์คือ หมวด หัวข้อ สี และข้อความ ทุก log พิมพ์ลงคอนโซลเสมอ และถูกส่งต่อไป Discord webhook ด้วยถ้าตั้งค่าไว้

```lua
Config.Log.Enabled = true
Config.Log.Webhooks = {
    default   = '',
    joinleave = '',
    anticheat = ''
}
```

หมวดที่ไม่มีรายการของตัวเองจะตกไปใช้ `Webhooks.default` ค่าว่างแปลว่าไม่ส่ง ถ้าตั้ง `Config.Log.Enabled = false` จะปิดทั้ง
บรรทัดในคอนโซลและการส่ง webhook

## คำสั่ง

### Commands.Add

```lua
Core.Commands.Add(name, help, arguments, argsrequired, callback, permission, ...)
```

ลงทะเบียนคำสั่งแชต สร้าง ace ให้ และเพิ่มเข้าไปในรายการที่ผู้เล่นมองเห็น ค่า `permission` ถ้าไม่ส่งจะเป็น `'user'` ซึ่งแปลว่าเปิดให้ทุกคน
ส่วน `'admin'` และ `'staff'` จะจำกัดสิทธิ์ ระดับสิทธิ์เพิ่มเติมส่งต่อท้ายเป็นอาร์กิวเมนต์เสริมได้ ถ้า `argsrequired` เป็น `true` แล้วผู้เล่น
พิมพ์อาร์กิวเมนต์ไม่ครบตามที่ `arguments` ระบุไว้ callback จะไม่ถูกเรียกและผู้เล่นจะได้รับการแจ้งเตือนแบบ error แทน

```lua
Core.Commands.Add('openstore', 'Open the town store', {
    { name = 'town', help = 'Town name' }
}, true, function(source, args)
    Core.Notify(source, { title = ('Opening %s'):format(args[1]), type = 'info', duration = 4000 })
end, 'staff')
```

### Commands.Refresh

```lua
Core.Commands.Refresh(source)
```

สร้างรายการคำสั่งของผู้เล่นคนนั้นใหม่ เพิ่มคำสั่งที่เขาใช้ได้แล้วและถอดคำสั่งที่เขาใช้ไม่ได้ออก `AddPermission` กับ `RemovePermission`
เรียกตัวนี้ให้อยู่แล้ว

`Core.Commands.List` เก็บคำสั่งทั้งหมดโดยคีย์เป็นชื่อตัวพิมพ์เล็ก ส่วน `Core.Commands.Permissions` คือรายชื่อระดับสิทธิ์ที่เซิร์ฟรู้จัก

## ตารางที่แขวนอยู่บน core object

| ฟิลด์ | เก็บอะไรไว้ |
| --- | --- |
| `Core.Players` | รายชื่อคนออนไลน์ คีย์เป็น server id ตารางเดียวกับที่ `GetPlayerObjects` คืนมา |
| `Core.Config` | ตาราง `Config` ทั้งก้อน |
| `Core.Shared` | `Shared` รวมถึง `Shared.Items`, `Shared.Jobs` และ `Shared.Weapons` |
| `Core.Functions` | ตัวมิเรอร์ของทุกฟังก์ชันบน `Core` ที่เลิกใช้แล้ว |
| `Core.UsableItems` | handler ที่ลงทะเบียนผ่าน `CreateUseableItem` |
| `Core.ServerCallbacks` | handler ที่ลงทะเบียนผ่าน `CreateCallback` |
| `Core.ClientCallbacks` | handler ของ client callback ที่ยังรอคำตอบอยู่ |
| `Core.Player_Buckets` | ทะเบียน bucket ของผู้เล่น คีย์ด้วย identifier |
| `Core.Entity_Buckets` | ทะเบียน bucket ของ entity คีย์ด้วย entity handle |
| `Core.Commands.List` | คำสั่งที่ลงทะเบียนไว้ คีย์เป็นชื่อตัวพิมพ์เล็ก |
| `Core.Commands.Permissions` | `{ 'admin', 'staff' }` |

::: warning Core.Storage ไม่ได้อยู่ในสัญญาของ core object
codec ของกระเป๋า (`EncodeInventory`, `DecodeInventory`, `EncodeLoadout`, `DecodeLoadout`, `BuildSlots`, `IsWeapon`)
มีอยู่ในชื่อ `Core.Storage` ก็จริง แต่ต้องเรียกผ่าน export เท่านั้น

```lua
local slots = exports['hexa_core']:BuildSlots(inventoryColumn, loadoutColumn)
```

`GetCoreObject()` ส่งค่าข้ามขอบเขต resource ซึ่งได้เป็นสำเนาที่ถ่ายไว้ตอนเรียกครั้งแรก แต่ codec ต้องอ่านรายการอาวุธล่าสุดทุกครั้ง
การเรียกผ่าน export ทำให้โค้ดรันอยู่ในรันไทม์ของ `hexa_core` เอง จึงเห็นข้อมูลปัจจุบันเสมอ
:::
