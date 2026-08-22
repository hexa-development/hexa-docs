# ระบบ log และการ debug

ทุกบรรทัดที่ `hexa_core` พิมพ์ออกคอนโซล ผ่านฟังก์ชันชุดเดียวที่นิยามไว้ใน `shared/log.lua` ไฟล์นี้ถูกโหลด
เป็น `shared_script` ทั้ง client และ server จึงได้ฟังก์ชันตัวเดียวกัน ชื่อเดียวกัน รับอาร์กิวเมนต์เหมือนกันเป๊ะ
เขียน helper ตัวเดียวใช้ได้ทั้งสองฝั่งโดยไม่ต้องแยกเงื่อนไขด้วย `IsDuplicityVersion()`

ตัวพิมพ์ทั้งชุดถูกแขวนไว้บนอ็อบเจกต์หลักใน `client/main.lua` และ `server/main.lua` resource ไหนที่ดึง
core object มาได้ ก็เรียกใช้ได้ทันที

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.Log('shop opened at %s', 'Valentine')
```

## ระดับของ log ทั้งสี่

| ฟังก์ชัน | คำนำหน้า | พิมพ์เมื่อ |
| --- | --- | --- |
| `Core.Log(fmt, ...)` | `[hexa_core]` | ทุกครั้ง |
| `Core.Warn(fmt, ...)` | `[hexa_core] [WARN]` | ทุกครั้ง |
| `Core.Error(fmt, ...)` | `[hexa_core] [ERROR]` | ทุกครั้ง |
| `Core.PrintDebug(fmt, ...)` | `[hexa_core] [DEBUG]` | เฉพาะตอน `Config.Debug` เป็น `true` |

ทั้งสี่ตัวรับอาร์กิวเมนต์แบบเดียวกันทั้งฝั่ง server และ client ไม่มีการตั้งระดับความรุนแรงและไม่มีการเขียนลงไฟล์
ทุกอย่างออกคอนโซล FXServer (ฝั่ง server) หรือคอนโซลในเกม (ฝั่ง client)

```lua
local Core = exports['hexa_core']:GetCoreObject()

Core.Log('catalogue ready: %d entries', 412)
Core.Warn('paycheck skipped for id %s - no job grade', tostring(source))
Core.Error('could not read the jobs table: %s', tostring(err))
```

การใส่สีใช้โค้ดสีของ FiveM (`^1` ถึง `^9`) ล้วน ไม่ใช้ ANSI escape เพราะคอนโซล FXServer แต่ละตัวแสดงผล
ANSI ไม่เหมือนกัน

### ShowError กับ ShowSuccess

อีกสองตัวที่คงไว้เพราะโค้ดเดิมในเซิร์ฟใช้อยู่ รูปแบบต่างจากสี่ตัวข้างบนคือรับ "ชื่อ resource" แทน format string
และตอนนี้มีครบทั้งสองฝั่งแล้ว (เดิมมีเฉพาะฝั่ง server และใช้ ANSI)

```lua
Core.ShowError(GetCurrentResourceName(), 'config.lua has no Config.Money.MoneyTypes')
Core.ShowSuccess(GetCurrentResourceName(), 'loaded 12 shop locations')
```

## เขียนแบบ printf ไม่ใช่ต่อสตริงเอง

ตัวพิมพ์ทุกตัวเป็นแบบ printf ส่ง format string แล้วตามด้วยค่า อย่าประกอบสตริงเองมาก่อน

```lua
-- แบบนี้
Core.Log('player %s bought %d x %s', name, amount, item)

-- ไม่ใช่แบบนี้
Core.Log('player ' .. name .. ' bought ' .. amount .. ' x ' .. item)
```

การ format จะเกิดขึ้นก็ต่อเมื่อมีค่าส่งตามมาจริง ถ้าเรียกด้วยอาร์กิวเมนต์ตัวเดียว สตริงนั้นจะถูกส่งผ่าน
`tostring` ตรง ๆ ข้อความที่มีเครื่องหมาย `%` ติดอยู่จึงไม่ทำให้พัง

```lua
Core.Log('discount is 50% off')
```

ในโค้ดของ core จะห่อค่าที่มีโอกาสเป็น `nil` ด้วย `tostring()` ก่อนส่งเข้า `%s` เสมอ ควรทำตามนิสัยนี้
เพราะค่าที่หายไปหนึ่งตัวไม่ควรกลายเป็น error ตอนรันไทม์

## ทำไม Core.PrintDebug ต้องเช็กสวิตช์ก่อน format

`Core.PrintDebug` เป็นตัวเดียวในชุดที่ถูกเรียกถี่มากในเส้นทางร้อน มันจึงเช็ก `Config.Debug` **ก่อน** ที่จะ
format อะไรทั้งสิ้น ถ้าปิดอยู่ก็ไม่มีสตริงถูกสร้างเลย ต้นทุนเหลือแค่การอ่านตารางหนึ่งครั้งแล้ว return

แต่ข้อดีนี้จะหายไปทันทีถ้าคุณไปประกอบสตริงเองที่จุดเรียก เพราะงานนั้นเกิดขึ้นก่อนฟังก์ชันจะได้ทำงาน
จะเปิดหรือปิด debug ก็จ่ายเท่ากัน

```lua
-- ดี: ตอน Config.Debug เป็น false ไม่มีการ format เกิดขึ้นเลย
Core.PrintDebug('inventory sync for %s took %dms', citizenid, elapsed)

-- ไม่ดี: การต่อสตริงและ json.encode ทำงานทุกครั้งไม่ว่าจะเปิดหรือปิด
Core.PrintDebug('inventory sync ' .. citizenid .. ' ' .. json.encode(payload))
```

::: tip
`Config.Debug` อยู่ใน `hexa_core/config.lua` ค่าเริ่มต้นเป็น `false` และเป็นสวิตช์กลางของทั้งเฟรมเวิร์ก
เปิดทีเดียวบรรทัด `[DEBUG]` ของทุก resource ในสแตกจะโผล่พร้อมกันหมด
:::

## Core.DumpTable สำหรับตาราง

ตัวพิมพ์รายบรรทัดรับ format string ถ้าจะดูทั้งตารางให้ใช้ `Core.DumpTable`

```lua
local Core = exports['hexa_core']:GetCoreObject()
local Player = Core.GetPlayer(source)

Core.DumpTable(Player.PlayerData)
```

อาร์กิวเมนต์ตัวที่สองคือระดับย่อหน้าเริ่มต้น ปกติไม่ต้องใส่

```lua
Core.DumpTable(Player.PlayerData.metadata, 1)
```

key พิมพ์ด้วยสีเหลือง ส่วนค่าจะไล่สีตามชนิด string เขียว number ฟ้า boolean แดง ที่เหลือสีเทา ถ้าส่งค่าที่
ไม่ใช่ตารางเข้าไปก็แค่พิมพ์ค่านั้นออกมาเฉย ๆ ไม่ error

ความลึกถูกตัดที่ระดับ 6 แล้วแทนด้วย `...`

::: warning
`Core.DumpTable` ไม่ได้ถูกคุมด้วย `Config.Debug` และการพิมพ์คอนโซลบล็อกเธรดหลัก การ dump ตารางใหญ่
หรือตารางที่ซ้อนลึกทุก tick จะทำให้เซิร์ฟกระตุกเห็นได้ชัด ใช้จากคำสั่งหรือจุดที่เรียกครั้งเดียว อย่าใส่ไว้ในลูป
:::

## Core.Debug ถูกแยกเป็นสองตัว

ใน 2.x ชื่อ `Debug` ทำคนละหน้าที่กันสองฝั่ง ฝั่ง client รับ `(resource, obj, depth)` ส่วนฝั่ง server รับ
`(tbl, indent)` จึงเขียน helper ตัวเดียวให้ใช้ได้ทั้งสองฝั่งไม่ได้เลย ตอนนี้แยกเป็นสองตัวที่ทำอย่างละหน้าที่

- `Core.PrintDebug(fmt, ...)` พิมพ์หนึ่งบรรทัด คุมด้วย `Config.Debug`
- `Core.DumpTable(value, indent)` พิมพ์ตาราง พิมพ์เสมอ

::: warning
alias ของ `Core.Debug` มีอยู่ **เฉพาะฝั่ง client** เท่านั้น มันเดาจากชนิดของอาร์กิวเมนต์ว่าคุณหมายถึงตัวไหน
แล้วเตือน deprecation ให้ครั้งเดียว ฝั่ง server ไม่มี alias ตัวนี้ โค้ดฝั่ง server ที่ยังเรียก `Core.Debug` จะ
error เพราะค่าเป็น nil ให้ย้ายไปใช้ `Core.PrintDebug` หรือ `Core.DumpTable` เลย
:::

## ทำไมข้อความ log เป็นอังกฤษ

ข้อความ log ทั้งหมดที่เฟรมเวิร์กพิมพ์เป็นภาษาอังกฤษโดยตั้งใจ ด้วยเหตุผลสองข้อ

- คอนโซลเซิร์ฟเวอร์และเครื่องมือเก็บ log บางตัวแสดงตัวอักษรไทยเพี้ยน ซึ่งจะทำให้ไล่ไทม์ไลน์ของเหตุการณ์
  ไม่ได้เลยในจังหวะที่ต้องอ่านให้ออกที่สุด
- คนดูแลเซิร์ฟกวาดตาอ่าน log เร็ว ๆ ภาษาเดียวตลอดอ่านง่ายกว่าปนกันไปมา

ข้อนี้ใช้กับ "ข้อความ log" เท่านั้น คอมเมนต์ในโค้ดยังเป็นไทยตามเดิม และข้อความที่ผู้เล่นเห็น เช่น notification
prompt หรือคำอธิบายคำสั่ง ก็ยังเป็นไทยและควรอยู่ใน `locale/th.lua` ไม่ใช่ในตัว log

ในทางปฏิบัติ การกระทำหนึ่งครั้งมักออกทั้งสองอย่าง คือข้อความไทยให้ผู้เล่น และบรรทัดอังกฤษให้คนดูแล

```lua
local Core = exports['hexa_core']:GetCoreObject()
local Player = Core.GetPlayer(source)

Player.AddItem('bread', 1)
Core.Notify(source, { title = 'ได้รับขนมปัง 1 ชิ้น', type = 'success', duration = 5000 })
Core.Log('gave bread x1 to %s', Player.PlayerData.citizenid)
```

## log สำหรับตรวจสอบย้อนหลัง: hexa_log:server:CreateLog

อันนี้คนละเรื่องกับตัวพิมพ์คอนโซลข้างบน `hexa_log:server:CreateLog` คือ event ฝั่ง server ที่ resource ต่าง ๆ
ยิงเข้ามาเพื่อบันทึกเหตุการณ์ที่คนต้องกลับมาตรวจย้อนหลังได้ เช่น เงินเข้าออก การลบตัวละคร การเตะจาก
anticheat หรือแอดมินรันโค้ด

```lua
TriggerEvent('hexa_log:server:CreateLog', 'joinleave', 'Dropped', 'red',
    ('**%s** left. Reason: %s'):format(GetPlayerName(src), reason))
```

| อาร์กิวเมนต์ | ชนิด | ความหมาย |
| --- | --- | --- |
| `category` | string | ช่องของ log เช่น `joinleave`, `anticheat`, `playermoney` |
| `title` | string | หัวข้อสั้น ๆ จะกลายเป็น title ของ embed ใน Discord |
| `colour` | string | สีที่ใช้ตอนพิมพ์คอนโซล ดูหัวข้อถัดไป |
| `message` | string | เนื้อความ ใช้ markdown ของ Discord ได้ |

ทุกค่าถูกแปลงด้วย `tostring` และถ้าไม่ส่ง `category` มาจะกลายเป็น `general`

::: danger log พวกนี้เคยหายไปเฉย ๆ
event นี้ถูกยิงอยู่ 23 จุดใน 4 resource แต่ไม่เคยมี resource ชื่อ `hexa_log` อยู่จริงบนเซิร์ฟนี้ และไม่มีใคร
ลงทะเบียนรับ event นี้เลยสักคน คนเข้าคนออก การลบตัวละคร การขยับเงินทุกก้อน และการแจ้งเตือนของ
anticheat ทั้งหมด ถูกเขียนทิ้งลงความว่างเปล่า

ตั้งแต่ 3.0 `hexa_core` ลงทะเบียนรับ event นี้เองใน `server/debug.lua` จุดเรียกเดิมทั้ง 23 จุดจึงเริ่มทำงาน
ทันทีโดยไม่ต้องแก้อะไรเลยสักบรรทัด
:::

ตัวรับใช้ `AddEventHandler` ไม่ใช่ `RegisterNetEvent` ซึ่งเป็นความตั้งใจ client ยิง event นี้ไม่ได้ จึงไม่มีใคร
ยิงถล่มคอนโซลหรือถล่ม webhook ของคุณจากในเกมได้

### สี

`colour` เป็น "ชื่อสี" ไม่ใช่โค้ดสี ชื่อที่รู้จักมี `red`, `green`, `yellow`, `blue` และ `white` ชื่ออื่นนอกจากนี้
จะตกไปที่สีขาว จุดเรียกเก่า ๆ ที่ส่ง `lightgreen` หรือ `orange` มาจึงยังพิมพ์ออกได้ปกติ แค่ไม่ได้สีตามที่ตั้งใจ

### Config.Log

```lua
Config.Log = {}

Config.Log.Enabled = true

Config.Log.Webhooks = {
    default   = '',
    joinleave = '',
    anticheat = '',
}
```

`Config.Log.Enabled = false` คือปิดทั้งหมด ไม่พิมพ์คอนโซลและไม่ส่ง webhook ค่าอื่นที่ไม่ใช่ `false` ตรง ๆ
ถือว่ายังเปิดอยู่

`Config.Log.Webhooks` คือการจับคู่ category กับ URL ของ Discord webhook ระบบจะหาจากชื่อ category
ตรง ๆ ก่อน ถ้าไม่เจอถึงตกไปใช้ `default` ดังนั้น

- ตั้ง URL แยกให้ `anticheat` เพื่อส่งแจ้งเตือนเข้าห้องทีมงานโดยเฉพาะ
- ตั้ง `default` ไว้รับ category ที่เหลือทั้งหมดที่ไม่ได้ระบุไว้
- ปล่อยค่าเป็นสตริงว่าง = ไม่ส่งอะไรสำหรับช่องนั้น

category เป็นแค่สตริง เพิ่มคีย์เองได้ตามที่ resource อื่นในสแตกใช้อยู่จริง

```lua
Config.Log.Webhooks = {
    default         = 'https://discord.com/api/webhooks/...',
    joinleave       = 'https://discord.com/api/webhooks/...',
    anticheat       = 'https://discord.com/api/webhooks/...',
    playermoney     = 'https://discord.com/api/webhooks/...',
    playerinventory = 'https://discord.com/api/webhooks/...',
    executor        = 'https://discord.com/api/webhooks/...',
}
```

บรรทัดในคอนโซลพิมพ์ออกเสมอไม่ว่าจะตั้ง webhook หรือไม่ webhook เป็นของเพิ่ม ไม่ใช่ของแทน ถอด URL ออก
ก็ไม่ได้ทำให้ log หายไปไหน

ถ้า Discord ตอบกลับมาด้วยสถานะอื่นที่ไม่ใช่ `200` หรือ `204` ระบบจะเตือนหนึ่งครั้งต่อ category ที่ยิงพลาด
ตรงนี้ตั้งใจให้ไม่เงียบ เพราะ webhook ที่แอบส่งไม่ผ่านคือปัญหาแบบเดียวกับที่หัวข้อนี้ทั้งหัวข้อพยายามแก้อยู่

### HexaCore:DebugSomething

ทางอ้อมแบบเก่าที่ dump ตารางผ่าน event ยังมีตัวรับอยู่ สำหรับโค้ดที่ยังไม่ได้ตามไปแก้

```lua
TriggerEvent('HexaCore:DebugSomething', someTable, 0, GetCurrentResourceName())
```

มันจะพิมพ์ชื่อ resource ที่เรียกแล้วส่งตารางต่อให้ `Core.DumpTable` เหมือนกับ `CreateLog` คือลงทะเบียนด้วย
`AddEventHandler` และไม่ใช่ net event ถ้าเขียนโค้ดใหม่ให้เรียก `Core.DumpTable` ตรง ๆ ได้ผลเหมือนกัน
โดยไม่ต้องอ้อมผ่าน event
