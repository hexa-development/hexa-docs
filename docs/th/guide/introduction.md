# แนะนำ hexa_core

`hexa_core` คือ resource แกนกลางที่สคริปต์อื่นทั้งเซิร์ฟเวอร์ต้องคุยด้วย มันดูแลตัวตนผู้เล่น ตัวละคร เงิน
แคตตาล็อกไอเทมกับอาชีพ สิทธิ์ callback และรอบการเซฟทั้งหมด ทำงานบน RedM (RDR2 บน FXServer)
และพึ่งพา resource ภายนอกแค่ `oxmysql` ตัวเดียว

หน้านี้อธิบายว่า hexa_core ดูแลอะไรบ้าง ฐานข้อมูลออกแบบมาแบบไหน โครงสร้างไฟล์เป็นอย่างไร
และจะดึง core object มาใช้ใน resource ของคุณอย่างไร

::: tip เวอร์ชัน 3.0.0
API สาธารณะถูกแบนราบตั้งแต่ 3.0.0 ชื่อที่ใช้ตอนนี้คือ `Core.GetPlayer(source)` และ `Player.AddMoney(...)`
ส่วนชั้น `Core.Functions.*` กับ `Player.Functions.*` แบบเดิมยังเรียกได้อีกหนึ่งรุ่น แต่จะพิมพ์คำเตือน
พร้อมบอกชื่อ resource ที่เป็นคนเรียก
:::

## hexa_core ดูแลอะไรบ้าง

- **ตัวละคร** — สร้าง โหลด เซฟ ลบ และเลขประจำตัวที่ผูกกับตัวละคร (citizen id, wallet id, เลขบัญชีธนาคาร,
  fingerprint, phone serial)
- **เงิน** — ประเภทเงินที่ประกาศไว้ใน `Config.Money.MoneyTypes` (มาตรฐานคือ `cash`, `bank`, `gold`)
  กฎเรื่องยอดติดลบ และรอบจ่ายเงินเดือน
- **ไอเทม** — แคตตาล็อกกลางใน `Core.Shared.Items` ที่ประกอบขึ้นตอนบูตจากตาราง `items`
  รวมกับรายการอาวุธใน `shared/weapons.lua` และไอเทมเงิน (ถ้าเปิดใช้)
- **อาชีพ** — `Core.Shared.Jobs` ประกอบขึ้นตอนบูตจากตาราง `jobs` และ `job_grades` พร้อมสถานะเข้าเวร
  และค่าจ้างตามเกรด
- **สิทธิ์และคำสั่ง** — ระดับ `admin` / `staff` ที่ผูกกับ ace และ `Core.Commands.Add`
- **Callback** — `CreateCallback` / `TriggerCallback` ใช้ได้ทั้งสองทิศทาง
- **สถานะร่างกาย** — ความหิว กระหาย ความสะอาด ความเครียด และแกน (cores) ของ RDR2 โดยฝั่ง server
  เป็นคนเดินรอบเวลาให้
- **ระบบ log** — ตัวพิมพ์คอนโซลที่ signature เหมือนกันเป๊ะทั้งสองฝั่ง และตัวส่งต่อ
  `hexa_log:server:CreateLog` ไป Discord
- **ของเฉพาะ RedM** — prompt, eagle eye, IPL และ interior, ความหนาแน่นของ ped/ยานพาหนะ,
  การระบายสีมินิแมป

งานที่เกี่ยวกับกระเป๋าของถูกส่งต่อให้ระบบกระเป๋าทุกจุดที่ `hexa_core` เรียก export ของมัน
จะเช็คก่อนว่า resource นั้น started จริงไหม ถ้ายังไม่ขึ้นจะคืนค่าที่ปลอดภัยแทน กระเป๋าที่ยังไม่สตาร์ต
จึงไม่กลายเป็น Lua error กลาง core

## ฐานข้อมูลออกแบบมาแบบไหน

ตัวละครเก็บอยู่ในตาราง `users` คีย์ด้วย `identifier` แยกคอลัมน์ตามเรื่องอย่างชัดเจน: `accounts`,
`job`, `job_grade`, `firstname`, `lastname`, `dateofbirth`, `sex`, `position`, `inventory`, `loadout`,
`metadata`, `status`, `is_dead` ส่วนอาชีพมาจาก `jobs` + `job_grades` และนิยามไอเทมมาจาก `items`
ทุกอย่างถูกสร้างและ seed ให้อัตโนมัติโดย `install.sql` ตอนบูตครั้งแรก

โครงแบบนี้ให้ผลสามข้อ

1. **เป็นคอลัมน์จริง ไม่ใช่ blob ก้อนเดียว** ทุกอย่างที่ query ต้องใช้มีคอลัมน์ของตัวเอง
   จะอ่านหรือแก้ตัวละครจากฐานข้อมูลตรง ๆ ก็ได้
2. **เครื่องมือภายนอกใช้ได้** แผงแอดมิน เว็บ dashboard หรือรายงาน SQL อ่านคอลัมน์ชุดเดียวกับที่เฟรมเวิร์กใช้
   รวมถึงคอลัมน์ `status` แบบย่อด้วย
3. **แก้ไอเทมกับอาชีพที่เดิม** ฐานข้อมูลคือแหล่งความจริงเพียงแหล่งเดียวของทั้งสองแคตตาล็อก
   `Core.Shared.Items` และ `Core.Shared.Jobs` เริ่มต้นว่างเปล่าแล้วถูกเติมตอนบูต ดังนั้นการเพิ่มของ
   คือแก้แถวใน DB แล้ว restart `hexa_core` ไม่ใช่ไปแก้ตาราง Lua

ส่วนรูปทรงในหน่วยความจำตั้งใจให้ต่างออกไป แถวหนึ่งแถวจะถูกแปลงเป็น `PlayerData` ที่มี `citizenid`,
`money`, `charinfo`, `job`, `metadata` เพื่อให้สคริปต์ที่เขียนตามโครง `citizenid` / `charinfo` เดิมทำงานต่อได้
และสองคอลัมน์ของกระเป๋า (`inventory` เก็บของทั่วไป, `loadout` เก็บอาวุธ) จะถูกรวมเป็นตารางช่องก้อนเดียว
ตอนโหลด แล้วแยกกลับตอนเซฟ

::: warning อย่าเขียนลงตาราง users ข้ามหลังเฟรมเวิร์ก
`Core.SavePlayer` เขียนทับทั้งแถวแบบ upsert การเขียนที่แทรกเข้ามาระหว่างสองรอบเซฟจะถูกทับหายในรอบถัดไป
ให้แก้ข้อมูลผ่าน player object แล้วปล่อยให้รอบเซฟเป็นคนบันทึก
:::

## โครงสร้างไฟล์

```
hexa_core/
├── client/          -- ฝั่ง client
│   ├── main.lua           -- ตัว Core object และ GetCoreObject
│   ├── functions.lua      -- helper สำหรับ entity ยานพาหนะ ped anim ptfx และโลก
│   ├── spawn.lua          -- การเกิดของตัวละคร
│   ├── prompts.lua        -- prompt แบบ RDR2
│   ├── status.lua         -- แสดงสถานะและแกนบนหน้าจอ
│   ├── interiors.lua      -- interior
│   ├── ipls.lua           -- โหลด IPL
│   ├── colormap.lua       -- ระบายสีโซนบนมินิแมป
│   ├── eagleeye.lua       -- สีของ eagle eye
│   └── compat.lua         -- ชื่อเก่าฝั่ง client โหลดท้ายสุด
├── server/          -- ฝั่ง server
│   ├── main.lua           -- ตัว Core object และ GetCoreObject
│   ├── installer.lua      -- รัน install.sql ตอนบูต
│   ├── storage.lua        -- codec ของคอลัมน์ inventory/loadout
│   ├── functions.lua      -- getter, bucket, สิทธิ์, callback, เงินเดือน
│   ├── jobs.lua           -- โหลด jobs + job_grades
│   ├── items.lua          -- ประกอบแคตตาล็อกไอเทม
│   ├── player.lua         -- player object และวงจรชีวิตของมัน
│   ├── commands.lua       -- Core.Commands
│   ├── exports.lua        -- การลงทะเบียนแคตตาล็อกและหน้าตาของ export
│   ├── debug.lua          -- ตัวรับ hexa_log:server:CreateLog และส่งต่อ Discord
│   ├── save.lua           -- รอบกวาดเซฟ
│   └── compat.lua         -- ชื่อเก่าฝั่ง server โหลดท้ายสุด
├── shared/          -- โหลดทั้งสองฝั่ง
│   ├── log.lua            -- Log, Warn, Error, Debug, DumpTable
│   ├── locale.lua         -- เครื่องยนต์ระบบภาษา
│   ├── main.lua           -- helper กลาง, Shared.Items, Shared.Jobs
│   ├── weapons.lua        -- นิยามอาวุธ
│   └── keybinds.lua       -- การผูกปุ่ม
├── locale/          -- en.lua, th.lua
├── stream/          -- ไฟล์ texture ที่ stream เข้าเกม
├── config/           -- แยกหนึ่ง shared file ต่อ subsystem
│   ├── main.lua            -- ค่าทั่วไปและสร้าง Config ก่อน
│   ├── player.lua          -- ค่าเริ่มต้นผู้เล่นและตัวละคร
│   ├── money.lua           -- เศรษฐกิจและเงินเดือน
│   ├── save.lua            -- รอบบันทึกข้อมูล
│   ├── status.lua          -- สถานะ การหักเลือด และแกน RDR2
│   └── ...                 -- log, colormap, density และ eagle eye
├── install.sql      -- โครงสร้างฐานข้อมูลและข้อมูลตั้งต้น
└── fxmanifest.lua
```

ลำดับการโหลดสำคัญและเขียนไว้ครบใน `fxmanifest.lua` ถ้าจะแก้ให้จำสามข้อ: `config/main.lua`
ต้องมาก่อนไฟล์ config อื่น, `server/storage.lua` ต้องมาก่อน `server/player.lua` และไฟล์ `compat.lua`
ทั้งสองตัวต้องอยู่ท้ายสุดเสมอ เพราะชั้นรองรับชื่อเก่า
จะผูก alias ได้ก็ต่อเมื่อเห็นฟังก์ชันตัวจริงครบแล้ว

## การดึง Core Object

มี export ตัวเดียว ชื่อเดียวกันทั้งสองฝั่ง

```lua
-- ใช้ได้ทั้ง server และ client เหมือนกันเป๊ะ
local Core = exports['hexa_core']:GetCoreObject()
```

ทุกอย่างแขวนอยู่บนตารางนั้นชั้นเดียว ตัวอย่างฝั่ง server

```lua
local Core = exports['hexa_core']:GetCoreObject()

RegisterNetEvent('myresource:server:payout', function()
    local Player = Core.GetPlayer(source)
    if not Player then return end
    -- แบนราบทั้งบน Core และบนตัวผู้เล่น
    Player.AddMoney('cash', 100, 'bounty payout')
    Core.Notify(source, { title = 'Bounty', description = 'Paid in full', type = 'success' })
end)
```

ฝั่ง client ตารางเดียวกันนี้จะมี helper ของ client และ `Core.PlayerData` ที่แคชไว้

```lua
local Core = exports['hexa_core']:GetCoreObject()

CreateThread(function()
    local data = Core.GetPlayerData()
    -- PlayerData จะยังว่างจนกว่า HexaCore:Client:OnPlayerLoaded จะยิง
    Core.PrintDebug('spawned as %s', tostring(data.citizenid))
end)
```

::: tip ชื่อเดิมยังเรียกได้อยู่
`Core.Functions.GetPlayer(source)` และ `Player.Functions.AddMoney(...)` ยังทำงานได้ตามปกติ
`.Functions` เป็นตารางจริงที่ถูกมิเรอร์ให้ตรงกับชั้นแบน ไม่ใช่ proxy เปล่า เพราะ bridge
ยกเมธอดออกไปด้วย `pairs()` ทุกการเรียกชื่อเก่าจะเตือนหนึ่งครั้งต่อหนึ่งชื่อ พร้อมบอกว่า resource ไหนเรียก

```
[hexa_core] [WARN] myresource calls Core.GetSource which was renamed to Core.GetSourceByIdentifier
```

รีบไล่แก้จุดที่เรียกตอนที่คำเตือนยังอยู่
:::

## "ลงทะเบียนไอเทม" กับ "ให้ไอเทม" คนละเรื่องกัน

นี่คือเรื่องเดียวที่ต้องเข้าใจให้ถูกก่อนเขียนอะไรก็ตามกับ hexa_core เพราะเดิมสองอย่างนี้ใช้คำกริยาเดียวกัน
ทั้งที่ความหมายตรงข้ามกัน

| ต้องการทำอะไร | เรียกอะไร | ผลไปลงที่ไหน |
| --- | --- | --- |
| นิยามไอเทมชนิดใหม่ | `Core.RegisterItem('bread', def)` | `Core.Shared.Items` คือแคตตาล็อก |
| ใส่ของลงกระเป๋าผู้เล่น | `Player.AddItem('bread', 1)` | กระเป๋าของผู้เล่นคนนั้น |

```lua
local Core = exports['hexa_core']:GetCoreObject()

-- แคตตาล็อก: เซิร์ฟเวอร์รู้จักแล้วว่า bread คืออะไร
Core.RegisterItem('bread', { name = 'bread', label = 'Bread', weight = 1 })

-- กระเป๋า: ผู้เล่นคนนี้มี bread อยู่ในตัวจริง
local Player = Core.GetPlayer(source)
Player.AddItem('bread', 1)
```

คำกริยาฝั่งแคตตาล็อกคือ `Core.RegisterItem`, `Core.RegisterItems`, `Core.UnregisterItem` และ
`Core.UpdateItemDefinition` ส่วนอาชีพใช้รูปเดียวกันสี่ตัว: `Core.RegisterJob`, `Core.RegisterJobs`,
`Core.UnregisterJob`, `Core.UpdateJobDefinition`

::: danger export ที่ชื่อ AddItem คือฝั่งแคตตาล็อก
`exports['hexa_core']:AddItem(name, def)` และ `exports['hexa_core']:RemoveItem(name)` ถูกเก็บไว้ถาวร
และทำหน้าที่ลงทะเบียน/ถอนนิยามไอเทม ซึ่งเป็นความหมายเดียวกับ export ชื่อนี้ในที่อื่น
นี่คือเหตุผลที่สคริปต์ที่พอร์ตมาวางแล้วใช้ได้เลยโดยไม่ต้องแก้ export คู่นี้ไม่ยุ่งกับกระเป๋าของใครทั้งนั้น
ถ้าจะให้ของผู้เล่นต้องผ่าน player object เท่านั้น
:::

## รอบเซฟเป็นหน้าที่ของ server

รอบเวลาการเซฟอยู่ฝั่ง server ทั้งหมด ตัวละครแต่ละคนมีธง dirty ที่ถูกปักเมื่อข้อมูลเปลี่ยนจริง
รอบกวาดจะเขียนเฉพาะคนที่ปักธงไว้ คนที่ยืนเฉย ๆ ไม่ถูกเขียนซ้ำ

```lua
Config.Save.Interval = 45        -- กี่นาทีต่อหนึ่งรอบกวาด ต่ำสุด 1
Config.Save.SpreadSeconds = 60   -- เกลี่ยเวลาเขียน ไม่ให้ทั้งเซิร์ฟยิง MySQL พร้อมกัน
Config.Save.OnResourceStop = true
```

เรียกจาก resource อื่น

```lua
local Core = exports['hexa_core']:GetCoreObject()

-- บังคับให้ผู้เล่นคนนี้ติดรอบกวาดถัดไป หลังจากคุณไปแก้ข้อมูลเขาเอง
Core.GetPlayer(source).MarkDirty()

-- เขียนทุกคนเดี๋ยวนี้ ไม่เกลี่ยเวลา
local written = Core.SaveAllPlayers()
```

## ระบบ log

ตัวพิมพ์ห้าตัว signature เหมือนกันทั้งสองฝั่ง ใช้รูปแบบ printf

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.Log('boot finished in %dms', elapsed)
Core.Warn('no bank account on %s', citizenid)
Core.Error('save failed for %s', citizenid)
Core.PrintDebug('drained %s by %.1f', 'hunger', 1.0)
Core.DumpTable(Player.PlayerData)
```

`Core.PrintDebug` ผูกกับ `Config.Debug` และเช็คสวิตช์ก่อนจะฟอร์แมตสตริง การทิ้งบรรทัด debug ไว้ใน
เส้นทางที่ถูกเรียกถี่จึงไม่มีต้นทุนตอนปิด debug ส่วนข้อความ log เป็นภาษาอังกฤษโดยตั้งใจ เพราะคอนโซล
เซิร์ฟเวอร์บางตัวแสดงตัวไทยเพี้ยน และคนไล่ log ต้องกวาดตาเร็ว

`hexa_core` ยังรับ event `hexa_log:server:CreateLog` เองด้วย มันพิมพ์ทุกบรรทัดลงคอนโซลเสมอ
และส่งต่อไป Discord ถ้ามี webhook ของหมวดนั้นตั้งไว้ใน `Config.Log.Webhooks` โดยตกไปใช้ช่อง
`default` เป็นตัวรับที่เหลือ

## ไปต่อ

- [การติดตั้ง](/th/guide/installation) — ฐานข้อมูล `server.cfg` และการบูตครั้งแรก
- [การตั้งค่า](/th/guide/configuration) — ทุกไฟล์ใน `config/`
- [Player object](/th/guide/player-object) — เมธอดแบบแบนของตัวผู้เล่น
- [Server functions](/th/api/server-functions) — API ฝั่ง server ทั้งหมด
