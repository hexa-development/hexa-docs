# การติดตั้ง

hexa_core เป็น resource เดียวจบ แค่ clone ลงโฟลเดอร์ resources ตั้ง connection string ให้ oxmysql
ใส่สองบรรทัดใน `server.cfg` ให้ถูกลำดับ แล้วเปิดเซิร์ฟ ไม่ต้อง import ไฟล์ SQL เองเลย เพราะ
`server/installer.lua` รัน `install.sql` ให้อัตโนมัติทุกครั้งที่บูต

หน้านี้อธิบายการติดตั้ง hexa_core 3.0.0 บนเซิร์ฟเวอร์ใหม่

## สิ่งที่ต้องมีก่อน

| ต้องมี | รายละเอียด |
| --- | --- |
| FXServer artifact ที่รองรับ `rdr3` | ใช้ artifact ใหม่พอสมควร ใน fxmanifest ประกาศ `fx_version 'cerulean'`, `game 'rdr3'` และ `lua54 'yes'` ไว้ artifact เก่าที่ยังไม่รองรับ Lua 5.4 จะโหลด resource ไม่ขึ้น |
| MariaDB หรือ MySQL | ที่เก็บข้อมูลตัวละคร อาชีพ ไอเทม และตารางของระบบกระเป๋า ใช้ได้ทั้ง MariaDB 10.4 ขึ้นไปและ MySQL 8 ตัว installer รองรับข้อความ error ของทั้งสองค่าย |
| [oxmysql](https://github.com/CommunityOx/oxmysql) | dependency ตัวเดียวที่ประกาศไว้ ต้องสตาร์ทก่อน hexa_core เสมอ |

hexa_core โหลด `@oxmysql/lib/MySQL.lua` เป็น server script ตัวแรก และงานทุกอย่างรออยู่ใน
`MySQL.ready` ถ้าไม่มี oxmysql หรือสตาร์ททีหลัง hexa_core จะไม่มีวันถึงจุด ready และผู้เล่นทุกคน
จะถูกปฏิเสธตอน connect ด้วยข้อความว่าเชื่อมต่อฐานข้อมูลไม่ได้

## ขั้นที่ 1 - clone resource

clone ลงโฟลเดอร์ resources โดยต้องคงชื่อโฟลเดอร์เป็น `hexa_core` เท่านั้น เพราะ resource อื่น
ทั้งสแตกเรียกผ่าน `exports['hexa_core']`

```bash
git clone https://github.com/hexa-development/hexa_core.git
```

## ขั้นที่ 2 - ตั้ง connection string

oxmysql อ่านค่า `mysql_connection_string` จาก `server.cfg` ให้สร้าง database เปล่าไว้ก่อน
ตัว installer สร้างแค่ "ตาราง" ไม่ได้สร้าง database ให้

```ini
set mysql_connection_string "mysql://user:password@localhost/hexa?charset=utf8mb4"
```

::: tip
อย่าตัด `charset=utf8mb4` ออก ทุกตารางใน `install.sql` สร้างเป็น utf8mb4 และ label ของไอเทม
ที่ seed ไว้เป็นภาษาไทย ถ้าต่อด้วย latin1 ชื่อไอเทมจะกลายเป็นตัวอักษรเพี้ยนทั้งหมด
:::

## ขั้นที่ 3 - ลำดับใน server.cfg

ลำดับสำคัญมาก oxmysql ก่อน แล้วค่อย hexa_core จากนั้นที่เหลือที่เรียกใช้ core object

```ini
ensure oxmysql
ensure hexa_core

# resource ที่เรียก exports['hexa_core'] ให้อยู่ใต้บรรทัดนี้
ensure my_resource
```

เหตุผลที่ลำดับต้องเป็นแบบนี้มีสองข้อ

- hexa_core รอ `MySQL.ready` ของ oxmysql สลับลำดับกันแค่ทำให้ติดตั้งช้าลง แต่ถ้าไม่มี oxmysql
  เลย เฟรมเวิร์กจะไม่พร้อมใช้งานถาวร
- `install.sql` เป็นสคีมาที่เดียวของทั้งสแตก ระบบกระเป๋าไม่มี installer ของตัวเองแล้ว ตาราง
  `users_vault` กับ `item_drops` ถูกสร้างที่นี่ resource ไหนจะแตะตารางพวกนี้ต้องรอให้ hexa_core
  สร้างเสร็จก่อน (ดูหัวข้อ "รอให้สคีมาพร้อม" ด้านล่าง)

## ขั้นที่ 4 - เลือกชนิดของ identifier

นี่คือค่าเดียวที่ต้องตัดสินใจให้จบ "ก่อน" ผู้เล่นคนแรกจะเข้าเซิร์ฟ เพราะมันคือค่าที่ถูกเขียนลง
คอลัมน์ `identifier` ของตาราง `users` และเป็นตัวผูกตัวละครกับเจ้าของไปตลอดอายุตัวละครนั้น

```lua
Config.IdentifierType = 'steam' -- ใส่ได้สองค่า 'steam' หรือ 'license'
```

`Core.GetIdentifier(source)` เป็นตัวแปลงค่านี้ให้ และ `server/events.lua` เรียกฟังก์ชันนี้ตอน
`playerConnecting`

```lua
local Core = exports['hexa_core']:GetCoreObject()

-- ไม่ระบุชนิด = ใช้ค่าจาก Config.IdentifierType
local identifier = Core.GetIdentifier(source)
local license = Core.GetIdentifier(source, 'license')
```

::: danger เลือก 'steam' แปลว่าไล่ผู้เล่นบางกลุ่มออก
ถ้าตั้ง `Config.IdentifierType = 'steam'` ผู้เล่นที่ไม่ได้เปิดเกมผ่าน Steam จะไม่มี steam id
`Core.GetIdentifier` คืน `nil` แล้วตัวจัดการ connect เรียก `deferrals.done(...)` พร้อมข้อความ
ให้ไปเปิดเกมผ่าน Steam ใหม่ คนกลุ่มนี้เข้าไม่ถึงหน้าโหลดด้วยซ้ำ ซึ่งรวมถึงคนที่เล่นผ่าน
Rockstar Launcher และ Epic ที่มีจำนวนไม่น้อยเลย

ค่าที่ปลอดภัยกว่าคือ `'license'` เพราะผู้เล่น RedM ทุกคนมี Rockstar license อยู่แล้ว ไม่มีใคร
ถูกปฏิเสธเพราะไม่มี identifier
:::

ข้อควรรู้: `config.lua` ที่แถมมาตั้งไว้เป็น `'steam'` ถ้าอยากได้พฤติกรรมที่ปลอดภัยกว่า
ต้องแก้เองก่อนบูตครั้งแรก

::: warning ห้ามเปลี่ยนค่านี้ตอนเซิร์ฟเปิดอยู่แล้ว
คอลัมน์ `identifier` ถูกเขียนครั้งเดียวตอนสร้างตัวละคร ถ้าเปลี่ยนจาก `'steam'` เป็น `'license'`
หลังจากมีคนสร้างตัวละครไปแล้ว แถวเดิมจะจับคู่กับผู้เล่นไม่ได้อีก ผู้เล่นจะเห็นช่องตัวละคร
ว่างเปล่าเหมือนเพิ่งเข้าเซิร์ฟครั้งแรก ตัดสินใจให้จบตั้งแต่ตอนนี้
:::

ข้อความที่เด้งให้คนไม่มี steam id เป็นภาษาไทย hardcode อยู่ใน `server/events.lua` ส่วนข้อความ
กรณีไม่มี license มาจากไฟล์ locale (คีย์ `error.no_valid_license`)

## ขั้นที่ 5 - สิ่งที่เกิดขึ้นตอนบูตครั้งแรก

เปิดเซิร์ฟได้เลย ทุกอย่างข้างล่างนี้ทำงานให้อัตโนมัติตามลำดับ

### installer รัน install.sql ให้

`server/installer.lua` รอ `MySQL.ready` แล้วอ่าน `install.sql` ออกมาจาก resource ตัดคอมเมนต์
ที่ขึ้นต้นบรรทัดด้วย `--` ทิ้ง แยก statement ด้วย `;` แล้วรันทีละคำสั่ง

ตัวมันถูกเขียนให้รันซ้ำได้ทุกบูต ไม่ใช่แค่ครั้งแรก

- การสร้างตารางทุกจุดเป็น `CREATE TABLE IF NOT EXISTS` และ seed ทุกจุดเป็น `INSERT IGNORE`
- คำสั่ง `ALTER TABLE` ที่เป็น migration ตั้งใจให้ fail บน DB ใหม่ error ที่เข้าข่าย
  "duplicate column name", "duplicate key name", "already exists", "check that it exists",
  "can't drop" ฯลฯ ถือเป็น benign แล้วข้ามไปเงียบ ๆ
- error อื่นจะถูกพิมพ์พร้อม statement ที่พังออกมาให้ดู แล้ว installer ทำงานต่อจนครบ
  statement เดียวพังจึงไม่ทำให้สคีมาที่เหลือไม่ถูกสร้าง

ถ้าผ่านหมดจะเห็นบรรทัดเดียวในคอนโซล

```
[hexa_core] Database schema verified/installed.
```

ถ้ามี statement ที่พังจริง ๆ จะได้ warning บอกจำนวนแทน

### ตารางที่ถูกสร้าง

| ตาราง | เก็บอะไร |
| --- | --- |
| `users` | หนึ่งแถวต่อหนึ่งตัวละคร PRIMARY KEY คือ `citizenid` ส่วน `identifier` เป็น index คอลัมน์ `accounts`, `inventory`, `loadout`, `metadata`, `status`, `position`, `skin` เก็บเป็น JSON |
| `jobs` | นิยามอาชีพ seed มาให้แล้วคือ `unemployed`, กฎหมาย 5 เมือง และ `medic` |
| `job_grades` | เกรดของแต่ละอาชีพ พร้อม `salary` และ `isboss` |
| `items` | แคตตาล็อกไอเทม (`name`, `label`, `weight`, `rare`, `can_remove`) seed อาหาร เครื่องดื่ม ยา และไอเทมระบบ `clothes` กับ `toilet` |
| `users_vault` | ที่เก็บของถาวรที่ไม่ใช่ของผู้เล่นสำหรับระบบกระเป๋าเช่นสแตช ตู้เซฟ กระเป๋าม้า |
| `item_drops` | ถุงของที่ทิ้งไว้บนพื้น เก็บลง DB เพื่อให้ยังอยู่หลังรีสตาร์ท |

อาวุธ "ไม่ต้อง" มีแถวในตาราง `items` เพราะ `server/items.lua` ดึง `Shared.Weapons` จาก
`shared/weapons.lua` มารวมเข้าแคตตาล็อกให้เองตอนบูต

### สิ่งที่โหลดต่อหลังสคีมาพร้อม

ทั้งสองตัวรอ installer ก่อนเสมอ จึงไม่มีทางแย่งกับ `CREATE TABLE` บน DB ใหม่

- `server/jobs.lua` อ่าน `jobs` กับ `job_grades` เข้า `Shared.Jobs` แล้ว log ว่า
  `loaded N job(s) from the database`
- `server/items.lua` อ่าน `items` รวมอาวุธเข้าไป แล้ว log ว่า
  `item catalogue ready: N entries (N weapons, N general)`

ฐานข้อมูลเป็นแหล่งข้อมูลที่เดียวของทั้งสองอย่าง จะเพิ่มอาชีพหรือไอเทมทีหลังให้ insert แถวแล้ว
restart hexa_core หรือเรียก `Core.RegisterJob` / `Core.RegisterItem` ตอน runtime ก็ได้

::: warning ตาราง items ว่าง = ของในกระเป๋าผู้เล่นหายเงียบ
ถ้าคิวรีตาราง `items` พังหรือไม่ได้แถวกลับมาเลย ระบบจะลงทะเบียนแค่อาวุธ แล้วตอนโหลดผู้เล่น
ของทุกชิ้นที่แคตตาล็อกไม่รู้จักจะถูกตัดทิ้ง กรณีนี้จะมี warning ขึ้นคอนโซลว่า
`the items table is empty - only weapons will be registered` เห็นบรรทัดนี้ให้ปิดเซิร์ฟแก้ทันที
:::

### รอให้สคีมาพร้อม

resource อื่นที่แตะตาราง `users`, `users_vault` หรือ `item_drops` ต้องรอ installer ก่อน
ตัวรอเปิดเป็น export ไว้แล้ว และมันบล็อกเธรดที่เรียก จึงต้องเรียกใน `CreateThread`

```lua
CreateThread(function()
    exports['hexa_core']:AwaitSchemaReady(15000)
    local rows = MySQL.query.await('SELECT citizenid FROM users LIMIT 1')
    print(('users table reachable: %s'):format(rows ~= nil))
end)
```

พารามิเตอร์คือ timeout หน่วยมิลลิวินาที ค่าเริ่มต้น 15000 และ flag จะถูกปล่อยเสมอแม้บาง
statement จะพัง เพราะ flag ที่ค้างจะบล็อกการ connect ของผู้เล่นตลอดไป ซึ่งแย่กว่า error
เพิ่มมาหนึ่งบรรทัด

## ขั้นที่ 6 - ตั้งสิทธิ์แอดมินให้ตัวเอง

ระบบสิทธิ์ใช้ ace ของ FXServer โดย hexa_core รู้จักสองระดับคือ `admin` กับ `staff`
(ดู `HexaCore.Commands.Permissions`) ตอนบูตมันรัน `add_ace hexacore.admin admin allow` และ
`add_ace hexacore.staff staff allow` ให้เอง และสร้าง ace `command.<ชื่อคำสั่ง>` ให้ทุกคำสั่ง
ที่ระดับไม่ใช่ `admin` หรือ `user`

ที่เหลือคือผูก principal ให้ตัวเอง ใส่ใน `server.cfg` หรือ `permissions.cfg`

```ini
add_ace hexacore.admin command allow
add_principal identifier.license:110000112345678 hexacore.admin
```

พอเข้าเกมด้วย principal นี้แล้ว ที่เหลือใช้ `/addpermission` กับ `/removepermission` จัดการคนอื่น
ได้เลย ทั้งสองคำสั่งรับ **citizen id** ไม่ใช่ server id

```
/addpermission RB0042 staff
```

สิทธิ์ที่ให้ตอน runtime ผ่าน `Core.AddPermission(source, permission)` ผูกกับเลข server id และถูก
ถอนตอน `playerDropped` จึงไม่อยู่ข้ามการ reconnect มีแต่ principal ใน `server.cfg` เท่านั้น
ที่อยู่ถาวร

## ขั้นที่ 7 - ทดสอบว่าติดตั้งสำเร็จ

ทำ resource ทิ้ง ๆ ขึ้นมาตัวหนึ่ง ใส่โค้ดนี้ แล้วพิมพ์ `/coretest` ในเกม

```lua
local Core = exports['hexa_core']:GetCoreObject()

RegisterCommand('coretest', function(source)
    local Player = Core.GetPlayer(source)
    if not Player then return Core.Warn('no player object for id %s', source) end
    Core.Log('%s has %s cash', Player.PlayerData.citizenid, Player.GetMoney('cash'))
end, false)
```

โค้ดสั้น ๆ นี้ทดสอบสองเรื่องพร้อมกัน `Core.GetPlayer` ยืนยันว่า core object แบนแล้ว (3.0 ไม่มี
ชั้น `.Functions` คั่นอีก) และ `Player.GetMoney` ยืนยันว่า player object ก็แบนเหมือนกัน
ชื่อเดิมอย่าง `Core.Functions.GetPlayer` กับ `Player.Functions.GetMoney` ยังเรียกได้อีกหนึ่ง
เวอร์ชัน แต่จะพิมพ์ deprecation warning ครั้งเดียวพร้อมบอกชื่อ resource ที่เรียกมา

เช็คเวอร์ชันที่รันอยู่ได้ด้วย

```lua
print(exports['hexa_core']:GetCoreVersion())
```

## ค่าที่ควรดูก่อนเปิดเซิร์ฟจริง

ไม่แก้ก็บูตได้ แต่ค่ากลุ่มนี้เป็นตัวกำหนดพฤติกรรมตอนคนเยอะ

### รอบการเซฟ

รอบเวลาเดินอยู่ฝั่ง server และเขียนเฉพาะคนที่ข้อมูลเปลี่ยนจริง

```lua
Config.Save.Interval = 45       -- กี่นาทีต่อหนึ่งรอบกวาด ต่ำสุด 1
Config.Save.SpreadSeconds = 60  -- เกลี่ยการเขียนให้กระจายภายในกี่วินาที
Config.Save.OnDrop = true
Config.Save.OnResourceStop = true
```

`Config.UpdateInterval` ยังอยู่ในฐานะชื่อเดิมของ `Config.Save.Interval` เพื่อไม่ให้คอนฟิกเก่าพัง
ส่วน `Core.SaveAllPlayers()` เขียนทุกคนทันทีและคืนจำนวนคนที่เซฟ ซึ่งเป็นตัวที่ถูกเรียกตอน
`onResourceStop` และถ้า resource อื่นอยากดันผู้เล่นเข้ารอบกวาดถัดไปให้เรียก `Player.MarkDirty()`

::: warning Config.Save.OnDrop ไม่ได้ถูกอ่านจริง
คีย์นี้มีอยู่ใน `config.lua` แต่ไม่มีโค้ดจุดไหนอ่านมันเลย ตัวจัดการ `playerDropped` ใน
`server/events.lua` เรียก `Player.Save()` ทุกครั้งโดยไม่เช็คค่านี้ ตั้งเป็น `false` ก็ไม่ได้ปิด
การเซฟตอนหลุด
:::

### ปลายทางของ log

hexa_core รับ event `hexa_log:server:CreateLog` เองแล้ว พิมพ์ลงคอนโซลเสมอ และส่งต่อ Discord
ให้ถ้าใส่ URL ไว้

```lua
Config.Log.Enabled = true

Config.Log.Webhooks = {
    default   = '',
    joinleave = '',
    anticheat = '',
}
```

หมวดไหนไม่ได้ตั้ง URL ของตัวเองจะตกไปใช้ `default` ถ้า `default` ว่างด้วยก็คือพิมพ์แค่คอนโซล
และถ้า webhook ตอบกลับมาไม่ใช่ 200 หรือ 204 จะมี warning ขึ้นคอนโซลหนึ่งครั้ง ไม่ปล่อยให้เงียบ

### ข้อความ debug

```lua
Config.Debug = false
```

`Core.PrintDebug` เช็คสวิตช์นี้ "ก่อน" จะ format สตริง ปิดไว้จึงไม่เสียแรงประมวลผลเลย ชุดฟังก์ชัน
log แบบ printf ทั้งหมดคือ `Core.Log`, `Core.Warn`, `Core.Error`, `Core.PrintDebug` และ
`Core.DumpTable` โดย signature เหมือนกันเป๊ะทั้งฝั่ง client และ server

### หน้าเลือกตัวละครกับจุดเกิด

```lua
Config.MultiCharacter = true
Config.DefaultSpawn = vector4(-2784.2534, -3058.2639, -12.3404, 333.5929)
```

`Config.MultiCharacter = true` คือยกหน้าที่เลือกตัวละครให้ระบบหลายตัวละคร และปิด auto-login
ถ้าตั้ง `false` ระบบจะ auto-login ตัวละครล่าสุดให้เลยโดยไม่มีหน้าเลือก ส่วน `Config.MaxPlayers`
ไม่ใช่ตัวเลขตายตัว มันอ่าน convar `sv_maxclients` จาก `server.cfg` ของคุณ ถ้าไม่ได้ตั้งไว้จะใช้ 48

### เรื่องภาษา

log ในคอนโซลเป็นภาษาอังกฤษโดยตั้งใจและแก้ไม่ได้ เพราะคอนโซลบางตัวแสดงภาษาไทยเพี้ยน และคนดูแล
เซิร์ฟต้องกวาดตาอ่านเร็ว ส่วนข้อความที่ผู้เล่นเห็นมาจากไฟล์ locale โดย `locale/en.lua` โหลดก่อน
แล้ว `locale/th.lua` ทับทีหลัง ค่าเริ่มต้นจึงเป็นภาษาไทย ถ้าอยากกลับไปใช้อังกฤษให้ลบหรือ
เปลี่ยนชื่อไฟล์ `locale/th.lua`

## แก้ปัญหาที่เจอบ่อย

**ผู้เล่นทุกคนถูกปฏิเสธด้วยข้อความเรื่องฐานข้อมูล** แปลว่า oxmysql ไปไม่ถึง `MySQL.ready`
ให้ตรวจ `mysql_connection_string` ตรวจว่ามี database อยู่จริง และตรวจว่า `ensure oxmysql`
อยู่เหนือ `ensure hexa_core`

**คนที่เล่นผ่าน Rockstar Launcher เข้าเซิร์ฟไม่ได้** เพราะ `Config.IdentifierType` เป็น `'steam'`
ดูขั้นที่ 4

**คอนโซลขึ้นว่า `the items table is empty`** แปลว่า seed ไม่ผ่าน ให้เลื่อนดูคอนโซลขึ้นไปหา
statement ที่ installer พิมพ์ไว้ว่าพัง แก้ที่ฐานข้อมูลแล้ว restart hexa_core

**อาชีพขึ้นเป็น unemployed หมดทั้งเซิร์ฟ** แปลว่าคิวรีตาราง `jobs` พัง `Shared.Jobs` ถูกเติมจาก
ฐานข้อมูลอย่างเดียว และ `install.sql` มี seed ให้อยู่แล้ว ได้ผลลัพธ์ว่างจึงแปลว่า seed ไม่เคยรัน

**resource อื่น error ที่ตาราง `users_vault` ตอนบูต** แปลว่ามันคิวรีก่อนตารางถูกสร้าง ให้ครอบ
คิวรีแรกด้วย `exports['hexa_core']:AwaitSchemaReady(15000)`
