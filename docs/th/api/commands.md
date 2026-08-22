# คำสั่ง

hexa_core ลงทะเบียนคำสั่งแชทฝั่ง server ไว้ 18 คำสั่ง และคำสั่ง debug ฝั่ง client อีก 3 คำสั่ง
หน้านี้ไล่ให้ครบทุกตัว แล้วต่อด้วย `Core.Commands.Add` สำหรับคนที่จะเพิ่มคำสั่งของตัวเอง
พร้อมอธิบายว่าระดับสิทธิ์ใน `Core.Commands.Permissions` ไปผูกกับระบบ ace ของ FXServer อย่างไร

ที่มาของหน้านี้คือ `server/commands.lua`, `server/status.lua` (คำสั่ง `/setstatus`),
`client/colormap.lua` (คำสั่ง debug ของ colormap) และ `client/events.lua` (ฝั่ง client ของคำสั่ง
วาร์ป ยานพาหนะ และ `/me`)

::: warning คำสั่งแอดมินระบุเป้าหมายด้วย citizen id ไม่ใช่ server id
คำสั่งแอดมินใน `server/commands.lua` ทุกตัวหาเป้าหมายผ่าน `Core.GetPlayerByCitizenId`
ดังนั้น `/givemoney RB0421 cash 100` หมายถึงตัวละครที่มี citizen id เป็น `RB0421`
ไม่ใช่คนที่กำลังอยู่ที่ server id 421 — citizen id คือเลขประจำตัวถาวรที่ได้ตอนสร้างตัวละคร
ประกอบขึ้นจาก `Config.Player.CitizenIdPrefix` และ `Config.Player.CitizenIdDigits`

มีข้อยกเว้นตัวเดียวคือ `/setstatus` ที่รับเป็น **server id**
:::

## วาร์ปและการเคลื่อนที่

| คำสั่ง | อาร์กิวเมนต์ | สิทธิ์ |
| --- | --- | --- |
| `/tp` | `[id]` หรือ `[x] [y] [z]` | admin |
| `/tpm` | ไม่มี | admin |
| `/noclip` | ไม่มี | admin |

`/tp` ใช้ได้สองแบบ ใส่สามอาร์กิวเมนต์คือวาร์ปไปพิกัดนั้น โดยตัดเครื่องหมายจุลภาคทิ้งให้ก่อน
เลยก๊อบพิกัดแบบ `-1024.5, 328.2, 44.1` จากเครื่องมือดูแผนที่มาวางได้เลย
ส่วนแบบใส่อาร์กิวเมนต์เดียวคือหาผู้เล่นจาก citizen id แล้ววาร์ปไปหาตัวเขา
ถ้าพิกัดตัวใดตัวหนึ่งแปลงเป็นเลขไม่ได้ หรือใส่มาแค่สองตัว จะได้แจ้งเตือนรูปแบบผิดแทน

::: warning `/tp` แบบระบุ id ใช้ได้เฉพาะ citizen id ที่เป็นตัวเลขล้วน
เส้นทางอาร์กิวเมนต์เดียวเรียก `tonumber(args[1])` ก่อนไปค้นหา และค่าเริ่มต้น
`Config.Player.CitizenIdPrefix = 'RB'` ทำให้ citizen id ทุกตัวขึ้นต้นด้วยตัวอักษร
`/tp RB0421` จึงถูกตีกลับว่ารูปแบบผิดตั้งแต่ต้น ไม่เคยไปถึงขั้นค้นหาผู้เล่นเลย
เซิร์ฟที่ตั้ง prefix เป็นค่าว่างเท่านั้นที่ใช้ท่านี้ได้ ส่วนการวาร์ปด้วยพิกัดใช้ได้ปกติทุกกรณี
:::

`/tpm` วาร์ปไปที่หมุดบนแผนที่ โดยหย่อนลงมาเหนือพื้นตาม heightmap 3 หน่วยแล้วเรียก
`PlacePedOnGroundProperly` และลากม้าหรือยานพาหนะที่ขี่อยู่ไปด้วย ถ้ายังไม่ได้ปักหมุด
จะขึ้นแจ้งเตือน `No Waypoint Set.` แล้วจบ

`/noclip` สั่ง noclip ของ txAdmin ที่เครื่อง client ตัวเอง hexa_core ไม่ได้เขียน noclip ของตัวเองไว้
เซิร์ฟที่ไม่ได้เปิดเมนูในเกมของ txAdmin คำสั่งนี้จะกดแล้วไม่มีอะไรเกิดขึ้น

## สิทธิ์

| คำสั่ง | อาร์กิวเมนต์ | สิทธิ์ |
| --- | --- | --- |
| `/addpermission` | `[id] [permission]` | admin |
| `/removepermission` | `[id] [permission]` | admin |

ทั้งคู่รับ citizen id กับชื่อระดับสิทธิ์ และบังคับให้ใส่ครบทั้งสองช่อง ชื่อระดับจะถูกแปลงเป็นตัวพิมพ์เล็กก่อนใช้
และควรเป็นค่าที่มีอยู่ใน `Core.Commands.Permissions` ซึ่งค่าเริ่มต้นคือ `admin` กับ `staff`
เบื้องหลังคือ `Core.AddPermission` และ `Core.RemovePermission` แปลว่าสิทธิ์ที่ให้ไปเกาะอยู่กับ
**server id ปัจจุบัน** ของคนนั้นในรูป principal ของ FXServer และหลุดทันทีที่เขาออกจากเซิร์ฟ
ไม่มีการเขียนลงฐานข้อมูล

## ยานพาหนะ ped และวัตถุ

| คำสั่ง | อาร์กิวเมนต์ | สิทธิ์ |
| --- | --- | --- |
| `/vehicle` | `[model]` | admin |
| `/dv` | ไม่มี | admin |
| `/dvall` | ไม่มี | admin |
| `/dvp` | ไม่มี | admin |
| `/dvo` | ไม่มี | admin |

`/vehicle` เรียกยานพาหนะตรงหน้าแล้วจับตัวเราขึ้นไปนั่งให้เลย ถ้าโมเดลไม่มีอยู่ในเกมจะเงียบไปเฉยๆ
และถ้าตอนนั้นนั่งอยู่บนคันอื่นอยู่แล้ว คันเดิมจะถูกลบก่อน

`/dv` ลบคันที่นั่งอยู่ ถ้ายืนอยู่เฉยๆ จะกวาดลบทุกคันในรัศมี 5 หน่วยแทน
ส่วน `/dvall` `/dvp` `/dvo` เป็นการกวาดฝั่ง server ผ่าน `GetAllVehicles` `GetAllPeds` และ
`GetAllObjects` แล้วลบทุกอย่างที่เจอทั้งแมพ

::: danger `/dvall` `/dvp` `/dvo` มีผลทั้งเซิร์ฟ ไม่ใช่แค่รอบตัว
สามคำสั่งนี้ไม่ได้จำกัดรัศมีและไม่ได้จำกัดเฉพาะของที่เราสร้าง `/dvp` ลบ ped ทุกตัวบนเซิร์ฟรวมถึงม้าของผู้เล่นคนอื่น
และ `/dvo` ลบวัตถุทุกชิ้นรวมถึง prop ที่ resource อื่นวางไว้ ใช้เป็นเครื่องมือกู้สถานการณ์เท่านั้น
ไม่ใช่คำสั่งเก็บกวาดประจำวัน
:::

## เงิน

| คำสั่ง | อาร์กิวเมนต์ | สิทธิ์ |
| --- | --- | --- |
| `/givemoney` | `[id] [moneytype] [amount]` | admin |
| `/setmoney` | `[id] [moneytype] [amount]` | admin |

`moneytype` คือชื่อกระเป๋าเงินที่ player object ถืออยู่ ได้แก่ `cash` `bank` หรือ `bloodmoney`
`/givemoney` เรียก `Player.AddMoney(type, amount, 'Admin give money')` และข้อความเหตุผลนี้จะติดไปกับ
log หมวด `playermoney` ที่ player object ยิงออกมา ส่วน `/setmoney` เรียก `Player.SetMoney(type, amount)`
คือเขียนทับยอดเดิมไปเลย

## ไอเทม

| คำสั่ง | อาร์กิวเมนต์ | สิทธิ์ |
| --- | --- | --- |
| `/giveitem` | `[id] [item] [amount]` | admin |

ชื่อไอเทมจะถูกแปลงเป็นตัวพิมพ์เล็กแล้วตรวจกับ `Core.Shared.Items` ก่อน พิมพ์ผิดจึงได้ข้อความ
`Item does not exist` แทนที่จะได้ไอเทมพังๆ ติดกระเป๋า ส่วน `amount` ถ้าไม่ใส่หรือใส่ค่าที่แปลงไม่ได้จะเป็น 1
จากนั้นคำสั่งต้องการให้ `hexa_inventory` อยู่ในสถานะ `started` แล้วส่งของผ่าน
`exports['hexa_inventory']:AddItem(source, item, amount)` ถ้า resource นั้นไม่ได้รันอยู่จะตอบว่า
`Inventory resource not running`

## อาชีพ

| คำสั่ง | อาร์กิวเมนต์ | สิทธิ์ |
| --- | --- | --- |
| `/job` | ไม่มี | user |
| `/setjob` | `[id] [job] [grade]` | admin |

`/job` แจ้งอาชีพของตัวเอง ทั้งชื่ออาชีพ ชื่อยศ และสถานะเข้าเวร กรณีที่ยังไม่ได้เลือกตัวละคร
หรือพิมพ์จากคอนโซล คำสั่งนี้จะแจ้ง `Player not online` แทนที่จะ error

`/setjob` ตรวจชื่ออาชีพกับ `Core.Shared.Jobs` ก่อน ถ้าไม่มีจะปฏิเสธ และถ้า `Hexa-multijob`
รันอยู่จะเพิ่มอาชีพเข้าไปในระบบนั้นก่อนด้วย
`exports['Hexa-multijob']:AddJobToPlayer(citizenid, job, grade)` แล้วค่อยเรียก
`Player.SetJob(job, grade)` เพื่อตั้งเป็นอาชีพที่ใช้งานอยู่

## สถานะร่างกาย

| คำสั่ง | อาร์กิวเมนต์ | สิทธิ์ |
| --- | --- | --- |
| `/setstatus` | `[id] [key] [value]` | admin |

คำสั่งนี้ลงทะเบียนอยู่ใน `server/status.lua` ไม่ได้อยู่ใน `commands.lua` โดย `key` เลือกได้จาก
`hunger` `thirst` `cleanliness` `stress` และ `value` จะถูกบีบให้อยู่ในช่วง 0-100 เสมอ
การเขียนค่าเดินผ่านเส้นทางเดียวกับ export `SetStatus` จึงอัปเดตทั้ง metadata, statebag ของผู้เล่น
และ HUD ฝั่ง client ในครั้งเดียว

::: warning `/setstatus` รับเป็น server id
ต่างจากคำสั่งแอดมินตัวอื่นในหน้านี้ `/setstatus` อ่านเป้าหมายด้วย `tonumber(args[1])` เป็น server id ตรงๆ
`/setstatus 12 hunger 100` จึงหมายถึงคนที่อยู่ server id 12
:::

## คำสั่งของผู้เล่นทั่วไป

| คำสั่ง | อาร์กิวเมนต์ | สิทธิ์ |
| --- | --- | --- |
| `/me` | `[message]` | user |
| `/id` | ไม่มี | user |

`/me` วาดข้อความลอยเหนือหัวตัวเองแบบ 3D นาน 10 วินาที ให้ทุกคนที่อยู่ในระยะ 20 หน่วยเห็น
ข้อความจะถูกตัดโค้ดสีและมาร์กอัป (ลำดับที่มี `~` และ `<>`) ทิ้งก่อนส่ง จึงเอาไปยัดฟอร์แมตใส่จอคนอื่นไม่ได้
และถ้าไม่พิมพ์ข้อความมาเลยจะถูกปฏิเสธ

`/id` แจ้ง citizen id ของตัวเอง ไม่ใช่ server id

::: warning `/id` ถือว่ามีตัวละครโหลดอยู่แล้วเสมอ
`/id` อ่าน `Player.PlayerData.citizenid` โดยไม่เช็ค nil ก่อน ถ้าพิมพ์จากคอนโซลของ server
หรือพิมพ์ก่อนเลือกตัวละคร จะเกิด Lua error แทนที่จะแจ้งเตือน — `/job` กันเคสนี้ไว้แล้ว แต่ `/id` ยังไม่ได้กัน
:::

## คำสั่ง debug ของ colormap

สามคำสั่งนี้อยู่ใน `client/colormap.lua` ทำงานฝั่ง client ล้วน และจะถูกลงทะเบียนก็ต่อเมื่อ
`Config.Colormap.Debug = true` เท่านั้น ทั้งสามไม่ได้ล็อกด้วย ace ซึ่งไม่เป็นปัญหาเพราะสีที่ทาลงไป
อยู่แค่ในเครื่องของคนที่พิมพ์ ไม่กระเด็นไปหาใคร พอทำงานเสร็จก็ปิด `Config.Colormap.Debug`
แล้วคำสั่งจะหายไปเอง

| คำสั่ง | อาร์กิวเมนต์ | ฝั่ง |
| --- | --- | --- |
| `/zonehash` | ไม่มี | client |
| `/zonestyle` | `[zone] [style]` | client |
| `/zonereset` | `[zone]` (ใส่หรือไม่ก็ได้) | client |

`/zonehash` พิมพ์ hash ของโซนทุกชั้นตรงจุดที่ยืนอยู่ ไล่ zone type ตั้งแต่ 0 ถึง 15
ข้ามชั้นที่ไม่มีโซน ชั้นเลขน้อยคือพื้นที่ย่อย (region / district) ชั้นเลขมากคือก้อนใหญ่ (state)
ก๊อบเลขฐานสิบหกที่ได้ไปใส่ `Config.Colormap.Zones` ได้เลย ถ้ายืนอยู่กลางน้ำหรือนอกแมพจะขึ้นว่า
`no zone here`

`/zonestyle` ทาสีโซนเดียวแบบสดๆ ไม่ต้อง restart ช่อง zone ใส่ได้ทั้ง hash (`0x3B8DD21A`) และชื่อโซน
ส่วน style ใส่ได้ทั้งชื่อสีในพาเลตต์ `Config.Colormap.Colors` เช่น `red` หรือชื่อ `BLIP_STYLE_*` ตรงๆ
เวลาอยากลองเฉดที่ยังไม่ได้ใส่ไว้ในพาเลตต์

```
/zonestyle 0x3B8DD21A BLIP_STYLE_TURRET_WEAPON
```

`/zonereset` ถ้าใส่ชื่อโซนมาจะล้างสีเฉพาะโซนนั้น ถ้าไม่ใส่อะไรเลยจะทาใหม่ทั้งหมดตาม
`Config.Colormap.Zones` ซึ่งเท่ากับย้อนทุกอย่างที่ `/zonestyle` ทำค้างไว้

## Core.Commands.Add

```lua
Core.Commands.Add(name, help, arguments, argsrequired, callback, permission, ...)
```

| อาร์กิวเมนต์ | ชนิด | ความหมาย |
| --- | --- | --- |
| `name` | string | ชื่อคำสั่ง ไม่ต้องใส่ `/` เก็บเป็นตัวพิมพ์เล็ก |
| `help` | string | คำอธิบายที่โผล่ใน chat suggestion |
| `arguments` | table | อาร์เรย์ของ `{ name = ..., help = ... }` ช่องละหนึ่งตัว |
| `argsrequired` | boolean | true = ไม่ให้รันถ้าใส่อาร์กิวเมนต์ไม่ครบ |
| `callback` | function | `function(source, args, rawCommand)` |
| `permission` | string | ระดับสิทธิ์ที่ต้องมี ไม่ใส่ = `'user'` |
| `...` | string | ระดับสิทธิ์เพิ่มเติมที่ใช้คำสั่งนี้ได้ด้วย |

ตัวอย่างการลงทะเบียนจาก resource อื่น

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.Commands.Add('heal', 'รักษาผู้เล่น', {
    { name = 'id', help = 'Citizen id' },
}, true, function(source, args)
    local Player = Core.GetPlayerByCitizenId(tostring(args[1]))
    if not Player then
        return Core.Notify(source, { title = 'Player not online', type = 'error', duration = 5000 })
    end
    -- ใส่โค้ดรักษาตรงนี้
end, 'admin')
```

`argsrequired` ถูกตรวจโดยตัวห่อก่อนถึง callback ของเรา ถ้า `#args` น้อยกว่า `#arguments`
คนพิมพ์จะได้แจ้งเตือน `All arguments must be filled out!` และ callback ไม่ถูกเรียกเลย
คำสั่งที่มีอาร์กิวเมนต์ไม่บังคับ (อย่าง `/tp`) ให้ตั้งเป็น `false` แล้วไปตรวจเองใน callback

ถ้าอยากให้หลายระดับใช้คำสั่งเดียวกันได้ ใส่ระดับเพิ่มต่อท้ายจาก `permission`

```lua
Core.Commands.Add('announce', 'ประกาศข้อความ', {
    { name = 'message', help = 'ข้อความที่จะส่ง' },
}, true, function(source, args)
    TriggerClientEvent('chat:addMessage', -1, { args = { 'SERVER', table.concat(args, ' ') } })
end, 'staff', 'admin')
```

::: warning ตัวที่ตัดสินว่าคำสั่งถูกล็อกหรือไม่คืออาร์กิวเมนต์ตัวที่หกเท่านั้น
ค่า `restricted` คำนวณจาก `permission` ตัวเดียว ก่อนที่ระดับเพิ่มเติมจะถูกรวบเข้ามา
ถ้าใส่ `'user'` ไว้ในช่องที่หกแล้วไปใส่ระดับจริงต่อท้าย ผลคือคำสั่งนั้นทุกคนพิมพ์ได้
ให้เอาระดับที่เข้มที่สุดไว้ในช่อง `permission` เสมอ
:::

## Core.Commands.Refresh

```lua
Core.Commands.Refresh(source)
```

สร้างรายการ chat suggestion ของผู้เล่นคนนั้นใหม่ทั้งชุด โดยไล่ทุกคำสั่งใน `Core.Commands.List`
แล้วเช็ค ace ชื่อ `command.<name>` ตัวที่ผ่านจะถูกส่งไปด้วย `chat:addSuggestions`
ตัวที่ไม่ผ่านถูกถอนออกด้วย `chat:removeSuggestion` และถ้า `Core.GetPlayer(source)` เป็น nil
ฟังก์ชันจะคืนค่าออกไปเฉยๆ

hexa_core เรียกให้เองอยู่แล้วภายใน `Core.AddPermission` และ `Core.RemovePermission`
คนที่เพิ่งได้สิทธิ์กลางเกมจึงเห็นคำสั่งใหม่โดยไม่ต้อง relog แต่ตอนโหลดตัวละครไม่มีการเรียก
ถ้าอยากให้ suggestion ขึ้นตั้งแต่ spawn ต้องเรียกเองหลังตัวละครพร้อมแล้ว

## Core.Commands.List

ตารางคำสั่งทั้งหมดที่ลงทะเบียนไว้ คีย์เป็นชื่อคำสั่งตัวพิมพ์เล็ก

```lua
local info = Core.Commands.List['givemoney']
-- info.name, info.permission, info.help, info.arguments, info.argsrequired, info.callback
```

`info.permission` เป็น string ถ้ามีระดับเดียว และเป็นอาร์เรย์ของ string ถ้าใส่ระดับเพิ่มเติมไว้
ตารางนี้คือสิ่งที่ `Core.Commands.Refresh` และ event `HexaCore:CallCommand` อ่าน

## ระดับสิทธิ์กับการตั้ง ace

```lua
Core.Commands.Permissions = { 'admin', 'staff' }
```

นี่คือระดับสิทธิ์ที่ framework รู้จัก และต้องตรงกับที่ตั้งไว้ใน `permissions.cfg`
ตอน resource เริ่มทำงาน hexa_core จะรัน `add_ace hexacore.<level> <level> allow` ให้ทุกระดับ
ซึ่งเป็นสิ่งที่ทำให้ `Core.HasPermission(source, 'admin')` ตอบได้ตั้งแต่แรก

```lua
Core.Commands.IgnoreList = { ['admin'] = true, ['user'] = true }
```

ระดับที่อยู่ในรายการนี้จะไม่ถูกสร้าง ace รายคำสั่ง — `user` ไม่ต้องมีเพราะคำสั่งกลุ่มนั้นลงทะเบียนแบบ
ไม่ล็อกอยู่แล้ว ส่วน `admin` ไม่ต้องมีเพราะถือว่ามีสิทธิ์เหมาครอบทุกคำสั่งอยู่แล้ว
ระดับอื่นนอกจากสองตัวนี้จะได้ ace หนึ่งบรรทัดต่อหนึ่งคำสั่งตอนลงทะเบียน

```
add_ace hexacore.staff command.announce allow
```

สรุปเส้นทางทั้งเส้นของคำสั่งระดับ `staff` คือ hexa_core สร้าง
`add_ace hexacore.staff command.announce allow` ให้ตอนคำสั่งถูกลงทะเบียน ฝั่ง `permissions.cfg` ของเรา
เอาผู้เล่นใส่เข้า principal `hexacore.staff` แล้ว FXServer ก็ตอบการเช็ค `command.announce`
ทั้งใน `Core.Commands.Refresh` และในตัวล็อกของคำสั่งเองได้

ส่วนสิทธิ์เหมาของ admin เป็นบรรทัดเดียวที่เราต้องเขียนเอง

```
add_ace hexacore.admin command allow
add_principal identifier.license:0000000000000000 hexacore.admin
```

`command` เป็นตัวแม่ของ ace ทุกตัวที่ชื่อ `command.<name>` บรรทัดเดียวนี้จึงครอบทั้งคำสั่งที่มีอยู่ตอนนี้
และคำสั่งที่จะเพิ่มเข้ามาทีหลัง

::: tip `user` ไม่ได้เป็น ace เลย
คำสั่งที่ลงทะเบียนด้วย `'user'` ถูกส่งเข้า `RegisterCommand` พร้อม `restricted = false`
ไม่มี ace ไม่มีการเช็คใดๆ ใครก็พิมพ์ได้ ตัวอย่างที่มากับ core คือ `/job` `/me` และ `/id`
:::

การให้สิทธิ์ระหว่างเกมเป็นหน้าที่ของ `Core.AddPermission` ซึ่งเพิ่ม principal
`player.<source> hexacore.<level>` แล้วรีเฟรช suggestion ให้คนนั้น พร้อมยิง event
`HexaCore:Server:PermissionsChanged` ต่อ และเพราะ principal ผูกอยู่กับ server id ที่ FXServer
เอากลับมาใช้ซ้ำได้ hexa_core จึงถอนทุกระดับออกจาก id นั้นตอน `playerDropped` เสมอ

```lua
Core.AddPermission(source, 'staff')
Core.RemovePermission(source, 'staff')
Core.RemovePermission(source) -- ถอนทุกระดับใน Core.Commands.Permissions
```

## เรียกคำสั่งโดยไม่ผ่านแชท

เมนูแอดมินหรือ UI อื่นสั่งคำสั่งที่ลงทะเบียนไว้ได้ผ่าน net event `HexaCore:CallCommand`

```lua
TriggerServerEvent('HexaCore:CallCommand', 'givemoney', { 'RB0421', 'cash', '100' })
```

ฝั่ง server จะหาคำสั่งใน `Core.Commands.List` บังคับว่าต้องมีตัวละครโหลดอยู่ แล้วเช็ค
`command.<name>` ด้วย `Core.HasPermission` ก่อนเรียก callback ซึ่งเป็นด่านเดียวกับทางแชท
ทางนี้จึงไม่ใช่ช่องลัดข้ามการเช็ค ace และยังบังคับ `argsrequired` ด้วย ถ้าสิทธิ์ไม่ผ่านจะแจ้งว่า
`No access to this command`
