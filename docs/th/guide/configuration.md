# การตั้งค่า

ค่าที่ปรับได้ของ hexa_core อยู่ใน `hexa_core/config/` โดยแยกหนึ่งไฟล์ต่อ subsystem `main.lua`
สร้างตารางกลางก่อน แล้วไฟล์อื่นเติมค่าลงตารางเดียวกันตามลำดับใน `fxmanifest.lua`

| ไฟล์ | การตั้งค่า |
| --- | --- |
| `config/main.lua` | ค่าทั่วไป ระยะ prompt และสัญญาณความปลอดภัยฝั่ง client |
| `config/player.lua` | ค่าเริ่มต้นผู้เล่น citizen id อาชีพ metadata และการเปิดแผนที่ |
| `config/money.lua` | ประเภทเงิน กติกาเงินติดลบ และเงินเดือน |
| `config/save.lua` | รอบเซฟ การเกลี่ยเวลา ตอนหลุด และตอน resource หยุด |
| `config/status.lua` | รายชื่อสถานะ อัตราลด การหักเลือด และแกน RDR2 |
| `config/log.lua` | สวิตช์ log และปลายทาง Discord webhook |
| `config/colormap.lua` | พาเลตต์และโซนบนแผนที่ |
| `config/density.lua`, `config/eagleeye.lua` | ความหนาแน่นของโลกและสิทธิ์ใช้ Eagle Eye |

ทุกไฟล์ประกาศเป็น **shared script** ตาราง `Config` ที่รวมแล้วจึงมีอยู่ทั้ง server และ client
core object เอามาแขวนต่อเป็น `Core.Config` ซึ่งเป็นทางที่ resource อื่นควรใช้อ่าน

```lua
local Core = exports['hexa_core']:GetCoreObject()
-- ตารางเดียวกันทั้งสองฝั่ง ไม่ต้องยิงถามข้ามฝั่ง
local minutes = Core.Config.Save.Interval
```

หลังแก้ไฟล์ใดก็ตามใน `config/` ต้อง `restart hexa_core` (หรือรีสตาร์ตเซิร์ฟ) ก่อน ทั้งสองฝั่งถึงจะเห็นค่าใหม่

::: warning โฟลเดอร์ config ไม่ใช่ที่เก็บความลับ
ตาราง `Config` ทั้งก้อนถูกส่งไปให้ client ห้ามใส่รหัสฐานข้อมูลหรือ API key ลงในไฟล์นี้ และให้เข้าใจไว้ว่า
`Config.Log.Webhooks` ก็มองเห็นได้จากฝั่ง client เหมือนกัน ให้ถือว่า URL ของ webhook เป็นของกึ่งสาธารณะ
:::

## ต้องแก้อะไรบ้างในวันแรก

รายการนี้คือค่าที่เจ้าของเซิร์ฟต้องตัดสินใจจริง ๆ ก่อนเปิดเซิร์ฟ ที่เหลือในไฟล์มีค่าเริ่มต้นที่ใช้งานได้อยู่แล้ว

| คีย์ | ทำไมต้องดูตั้งแต่วันแรก |
| --- | --- |
| `Config.IdentifierType` | ค่าที่แถมมาคือ `'steam'` ใครไม่มี Steam ID จะเข้าเซิร์ฟไม่ได้เลย |
| `Config.DefaultSpawn` | จุดที่ตัวละครใหม่ทุกตัวจะไปโผล่ |
| `Config.MultiCharacter` | เปิดหน้าเลือกตัวละคร หรือ auto-login ตัวล่าสุด |
| `Config.Log.Webhooks` | ว่างมาแต่แรก log จึงไปได้แค่คอนโซล ไม่ไปไหนต่อ |
| `Config.Money.MoneyTypes` | ช่องเงินทั้งหมดที่ระบบเศรษฐกิจทั้งเซิร์ฟจะใช้ พร้อมยอดตั้งต้น |
| `Config.Player.CitizenIdPrefix` / `CitizenIdDigits` | กำหนดหน้าตาและขนาดของคลัง citizen id |
| `Config.Save.Interval` | เซิร์ฟล่มทีหนึ่ง ผู้เล่นจะเสียความคืบหน้ากี่นาที |

ส่วนที่อยู่ในหัวข้อ "ปล่อยไว้ได้เลย" ท้ายหน้า ไม่ต้องไปยุ่งก็ได้ตลอดอายุเซิร์ฟ

## ค่าทั่วไปของเซิร์ฟเวอร์

```lua
Config.MaxPlayers = GetConvarInt('sv_maxclients', 48)
Config.IdentifierType = 'steam'
Config.MultiCharacter = true
Config.DefaultSpawn = vector4(-2784.2534, -3058.2639, -12.3404, 333.5929)
```

`Config.IdentifierType` เลือกว่าจะใช้ identifier แบบไหนเขียนลงคอลัมน์ `identifier` ของตาราง `users`
และใช้ค้นหาตัวละครทุกครั้งต่อจากนั้น `Core.GetIdentifier(source)` จะยึดค่านี้เมื่อไม่ได้ระบุชนิดมา

```lua
local Core = exports['hexa_core']:GetCoreObject()
-- ใช้ค่าจาก Config.IdentifierType
local license = Core.GetIdentifier(source)
-- หรือระบุชนิดเองก็ได้
local steam = Core.GetIdentifier(source, 'steam')
```

::: danger เปลี่ยน IdentifierType หลังเปิดเซิร์ฟ = ตัวละครเก่าหายทั้งหมด
ตัวละครผูกกับ identifier ตัวที่ใช้อยู่ ณ ตอนสร้าง ถ้าเซิร์ฟเปิดไปแล้วแล้วเปลี่ยนจาก `'steam'` เป็น `'license'`
ตัวละครเดิมทุกตัวจะหาไม่เจอ เลือกให้จบตั้งแต่ก่อนเปิดแล้วอย่าเปลี่ยนอีก

อีกเรื่องคือ `'steam'` แปลว่าใครไม่ได้เปิดเกมผ่าน Steam ที่ล็อกอินอยู่จะถูกเตะตั้งแต่ตอน `playerConnecting`
พร้อมข้อความบอกสาเหตุ ทางที่ปลอดภัยกว่าคือ `'license'` เพราะผู้เล่น RedM ทุกคนมี Rockstar license อยู่แล้ว
:::

`Config.MultiCharacter = true` จะโยนหน้าที่เลือกตัวละครให้ระบบหลายตัวละคร และปิดทาง auto-login
ที่อยู่ใน `client/spawn.lua` ถ้าตั้งเป็น `false` ระบบจะพาตัวละครที่เล่นล่าสุดเข้าเกมเลย ไม่มีหน้าเลือก

`Config.DefaultSpawn` เป็น `vector4` โดยช่อง `w` คือทิศที่หันหน้า ค่านี้ถูกใช้ทั้งใน `server/spawn.lua`
และใน `Config.Player.PlayerDefaults.position` ตัวละครที่ยังไม่มีตำแหน่งบันทึกไว้จึงไปโผล่ที่นี่

## ข้อความ debug

```lua
Config.Debug = false
```

สวิตช์ตัวเดียวนี้คุม `Core.PrintDebug` ทั้งสองฝั่ง จุดสำคัญคือมันเช็กสวิตช์ **ก่อน** ที่จะประกอบสตริง
ทิ้งบรรทัด debug ไว้ในโค้ดที่ปล่อยจริงจึงไม่เสียค่าอะไรเลยตอนปิดอยู่

```lua
local Core = exports['hexa_core']:GetCoreObject()
-- เงียบและไม่กินอะไรเลยตอน Config.Debug = false
Core.PrintDebug('player %s finished loading', source)
```

`Core.Log`, `Core.Warn` และ `Core.Error` ไม่สนใจสวิตช์นี้ พิมพ์เสมอ ส่วน `Config.Colormap.Debug`
เป็นคนละตัวและแคบกว่ามาก ดูหัวข้อ [Colormap](#colormap)

## การบันทึกข้อมูล

```lua
Config.Save = {}
Config.Save.Interval = 45
Config.Save.SpreadSeconds = 60
Config.Save.OnDrop = true
Config.Save.OnResourceStop = true
```

รอบเซฟเดินอยู่ฝั่ง server ล้วน ๆ ใน `server/save.lua` ทุก ๆ `Interval` นาที server จะรวบรวมเฉพาะคนที่ข้อมูล
เปลี่ยนจริงตั้งแต่รอบก่อนแล้วทยอยเขียน

- **`Interval`** — จำนวนนาทีต่อหนึ่งรอบกวาด ค่าต่ำกว่า `1` จะถูกดันขึ้นเป็น `1` ช่วง 30 ถึง 60 กำลังดี
  ตั้งถี่กว่านั้นได้ MySQL ทำงานหนักขึ้นแต่ไม่ได้อะไรเพิ่ม เพราะระบบข้ามคนที่ยืนเฉย ๆ อยู่แล้ว
- **`SpreadSeconds`** — เกลี่ยการเขียนของแต่ละคนให้กระจายภายในกี่วินาที แทนที่จะยิงพร้อมกันในติกเดียว
  ถ้ามี 48 คนและตั้งไว้ `60` ก็ประมาณหนึ่งคนต่อ 1.25 วินาที ตั้ง `0` = เขียนทุกคนทันที
- **`OnResourceStop`** — ตอน `hexa_core` หยุดหรือเซิร์ฟกำลังปิด ทุกคนที่ออนไลน์จะถูกเขียนรวดเดียวไม่มีเกลี่ยเวลา
  ตั้ง `false` ต่อเมื่อรู้ว่ากำลังทำอะไรอยู่เท่านั้น

มีสองฟังก์ชันที่ควรรู้จัก

```lua
local Core = exports['hexa_core']:GetCoreObject()

-- เขียนทุกคนที่ออนไลน์เดี๋ยวนี้ คืนจำนวนคนที่เขียนไป
local saved = Core.SaveAllPlayers()
Core.Log('saved %d player(s)', saved)
```

```lua
local Core = exports['hexa_core']:GetCoreObject()
local Player = Core.GetPlayer(source)
-- บังคับให้คนนี้ติดรอบกวาดรอบหน้า หลังไปแก้ข้อมูลที่ core มองไม่เห็น
Player.MarkDirty()
```

ทุกคำสั่งของ core ที่แก้ข้อมูลผู้เล่นจะติดธง dirty ให้เองผ่าน `Player.SyncPlayerData` อยู่แล้ว
`Player.MarkDirty()` มีไว้สำหรับกรณีที่ resource ของคุณไปแก้อะไรลับหลัง core

::: warning Config.Save.OnDrop ไม่ถูกอ่านใน 3.0.0
คีย์นี้มีอยู่ใน `config/save.lua` จริง แต่ไม่มีโค้ดตรงไหนอ่านมันเลย ตัวจับ `playerDropped` ใน `server/events.lua`
เรียก `Player.Save()` ทุกครั้งโดยไม่มีเงื่อนไข ตั้งเป็น `false` ก็หยุดการเขียนตอนหลุดไม่ได้
:::

## ระบบ log

```lua
Config.Log = {}
Config.Log.Enabled = true
Config.Log.Webhooks = {
    default   = '',
    joinleave = '',
    anticheat = '',
}
```

hexa_core รับ event `hexa_log:server:CreateLog` เอง resource ไหนก็ยิงเข้ามาได้

```lua
-- category, title, colour, message
TriggerEvent('hexa_log:server:CreateLog', 'joinleave', 'Dropped', 'red', 'Arthur left the server')
```

ทุกบรรทัดที่รับเข้ามาจะถูกพิมพ์ลงคอนโซลเสมอ และถ้าตั้ง webhook ไว้ก็จะถูกส่งต่อไป Discord เป็น embed ด้วย
ระบบจะหา category ใน `Config.Log.Webhooks` ก่อน ถ้าไม่เจอจะตกไปใช้ `default` และถ้า `default` ว่างอยู่ก็แค่ไม่ส่ง

`Config.Log.Enabled = false` ปิดทั้งบรรทัดในคอนโซลและการส่ง webhook แต่ไม่เกี่ยวกับ
`Core.Log` / `Core.Warn` / `Core.Error` ซึ่งพิมพ์เสมอ

::: tip เรื่องสีในคอนโซล
ช่องสีรู้จักแค่ `red`, `green`, `yellow`, `blue` และ `white` ค่าอื่นนอกเหนือจากนี้ รวมถึงค่าที่ core เองยิงมา
อย่าง `lightgreen` และ `orange` จะตกไปเป็นสีขาวธรรมดา และสีนี้มีผลกับคอนโซลเท่านั้น สีของ embed ใน Discord ตายตัว
:::

webhook ที่ยิงไม่ผ่านจะไม่เงียบ ถ้าได้ status ที่ไม่ใช่ 2xx ระบบจะเตือนหนึ่งครั้งต่อ category
URL ที่ใส่ผิดจึงโผล่ในคอนโซลให้เห็น ไม่ใช่กลืน log หายไปเงียบ ๆ เหมือนเดิม

ข้อความ log ของ hexa_core ทั้งหมดเป็นภาษาอังกฤษโดยตั้งใจ เพราะคอนโซลเซิร์ฟบางตัวแสดงตัวไทยเพี้ยน
และคนที่นั่งไล่ log สด ๆ ต้องกวาดตาอ่านเร็ว

## ระบบเงิน

```lua
Config.Money = {}
Config.Money.MoneyTypes = {
    cash = 50,
    bank = 0,
    gold = 0
}
Config.Money.DontAllowMinus = {'cash', 'gold', 'bank', 'bloodmoney'}
Config.Money.MinusLimit = 0
Config.Money.PayCheckTimeOut = 10
Config.Money.PayCheckSociety = false
Config.Money.SocietyExport = nil
Config.Money.EnableMoneyItems = false
```

### ประเภทเงิน

คีย์ใน `Config.Money.MoneyTypes` คือรายการช่องเงินทั้งหมดที่เซิร์ฟนี้มี ส่วนค่าคือยอดที่ตัวละครใหม่ได้ตั้งต้น
resource อื่นในสแตกอ่านรายการเดียวกันนี้ การเพิ่มช่องเงินตรงนี้จึงเป็นสิ่งที่ทำให้มันเลือกได้ในระบบอื่นด้วย

```lua
local Core = exports['hexa_core']:GetCoreObject()
local Player = Core.GetPlayer(source)
-- ชื่อประเภทเงินคือคีย์ใน Config.Money.MoneyTypes
Player.AddMoney('cash', 100, 'reward')
local balance = Player.GetMoney('bank')
```

::: tip บัญชีธนาคารมีช่องเดียว ไม่ได้แยกตามเมือง
เวอร์ชันเก่าแยกช่องเงินตามธนาคารแต่ละเมือง (`valbank`, `rhobank`, `blkbank`, `armbank`) ตอนนี้ไม่มีแล้ว
ตัวละครที่ยังมีเงินค้างอยู่ในช่องเก่าจะถูกรวมยอดเข้า `bank` ให้อัตโนมัติตอนโหลด พร้อมบันทึก log ไว้
อย่าเอาคีย์เก่ากลับมาใส่อีก
:::

### เงินติดลบ

`DontAllowMinus` คือรายชื่อประเภทเงินที่ห้ามต่ำกว่า 0 เด็ดขาด ส่วน `MinusLimit` คือเพดานล่างของประเภทที่ไม่ได้อยู่ในลิสต์

::: warning เพดานล่างถูกบีบไว้ที่ 0 ในโค้ดอยู่แล้ว
`Player.RemoveMoney` ใช้ `math.max(0, MinusLimit)` แบบไม่มีเงื่อนไข ตั้ง `MinusLimit` เป็นค่าติดลบก็เปิดช่องโหว่เดิม
ไม่ได้ — ช่องโหว่ที่ `RemoveMoney('bank', n)` คืน `true` ทั้งที่ยอดไม่พอ ทำให้สคริปต์ที่เขียนตามสัญญามาตรฐาน
`if Player.RemoveMoney(...) then giveGoods() end` แจกของฟรี แก้สองคีย์นี้ยังไงก็ทำให้เซิร์ฟไม่ปลอดภัยไม่ได้
ซึ่งก็เป็นเหตุผลว่าทำไมปล่อยไว้เฉย ๆ ได้เลย
:::

### เงินเดือน

`PayCheckTimeOut` คือรอบจ่ายเงินเดือนเป็นนาที ยอดเงินมาจาก grade ของอาชีพ
(`Shared.Jobs[job].grades[level].payment`) และจ่ายเฉพาะตอนเข้าเวร หรือเมื่ออาชีพนั้นตั้ง `offDutyPay` ไว้
เงินเข้าช่อง `bank` ถ้าตัวละครไม่มีช่องนั้นจะตกไปเข้า `cash` แทน

`PayCheckSociety = true` ทำให้เงินเดือนถูกหักจากบัญชีกลางของบริษัทแทนการเสกจากระบบ และต้องตั้ง
`SocietyExport` ให้ชี้ไป resource ที่มีระบบบัญชีจริง

```lua
Config.Money.SocietyExport = {
    resource   = 'your_banking_resource',
    getBalance = 'GetAccountBalance',
    removeMoney = 'RemoveMoney',
}
```

ถ้าไม่ใส่ `getBalance` กับ `removeMoney` ระบบจะใช้ชื่อ `GetAccountBalance` และ `RemoveMoney` เป็นค่าเริ่มต้น
และถ้า resource นั้นไม่ได้ start หรือเรียก export ไม่สำเร็จ core จะเตือนหนึ่งครั้งแล้วจ่ายจากระบบแทน
ไม่ใช่เงียบแล้วไม่จ่ายใครเลย สแตก Hexa ยังไม่มีระบบ society ของตัวเอง ปล่อย `SocietyExport = nil`
กับ `PayCheckSociety = false` ไว้ ยกเว้นจะต่อของภายนอกเข้ามาจริง ๆ

### เงินเป็นไอเทม

`EnableMoneyItems = true` ทำให้เงินสดและทองกลายเป็นไอเทมในกระเป๋าแทนที่จะเป็นตัวเลข ค่าเริ่มต้นคือ `false`
และนั่นคือรูปแบบที่สแตกนี้รองรับ

## ค่าเริ่มต้นของผู้เล่นและตัวละคร

```lua
Config.Player = {}
Config.Player.DefaultModel = 'mp_male'
Config.Player.CitizenIdPrefix = 'RB'
Config.Player.CitizenIdDigits = 4
Config.Player.RevealMap = true
```

`Config.Player.RevealMap = true` จะเรียก `SetMinimapHideFow(true)` ตอนล็อกอิน แผนที่จึงเปิดหมดตั้งแต่นาทีแรก
ตั้ง `false` ถ้าอยากให้ผู้เล่นต้องขี่ม้าไปเปิดแผนที่เอง

::: warning Config.Player.DefaultModel ไม่มีผลอะไร
ไม่มีโค้ดตรงไหนใน hexa_core 3.0.0 อ่านคีย์นี้ โมเดลตัวละครมาจากหน้าสร้างตัวละครและระบบเสื้อผ้า
ที่เขียนถึงตรงนี้เพื่อไม่ให้แปลกใจว่าแก้แล้วทำไมไม่เกิดอะไรขึ้น
:::

### citizen id

citizen id คือ `CitizenIdPrefix` ตามด้วยเลขสุ่ม `CitizenIdDigits` หลัก เติมศูนย์ข้างหน้าให้ครบเสมอ
ใช้ `'RB'` กับ `4` ก็จะได้ `RB0087` หรือ `RB1234` สี่หลักคือคลังขนาดหนึ่งหมื่นเลข

ตัวสร้างเช็กเลขที่แจกไปแล้วเพื่อกันซ้ำ และข้ามทุกเลขที่อยู่ใน `Config.Player.LockedIds` ซึ่งเป็นเลขสวย
(`1`, `99`, `7777`, `999999` และอื่น ๆ) ที่ปกติเจ้าของเซิร์ฟอยากเก็บไว้แจกเอง ไม่ใช่ให้การสุ่มเผาทิ้ง

::: tip เพิ่มจำนวนหลักก่อนคลังเลขเต็ม
ถ้าคลังเลขดูจะเต็ม ตัวสร้างจะออกเลขที่ยาวกว่าปกติให้ชั่วคราวและพิมพ์เตือนในคอนโซลให้ไปเพิ่ม
`Config.Player.CitizenIdDigits` ตัวละครไม่เคยถูกบล็อกไม่ให้สร้าง แต่จะได้ id ยาวไม่เท่ากันปนกัน
ควรเพิ่มหลักตั้งแต่จำนวนตัวละครเริ่มเข้าใกล้ขนาดคลัง
:::

id ทุกชนิดมาจากฟังก์ชันชุดนี้ ซึ่งเป็นเหตุผลว่าทำไม `PlayerDefaults` ถึงเรียกมันได้ตรง ๆ

```lua
local Core = exports['hexa_core']:GetCoreObject()
local citizenid = Core.CreateCitizenId()
local account = Core.CreateAccountNumber()
local fingerprint = Core.CreateFingerprint()
local walletid = Core.CreateWalletId()
```

### PlayerDefaults

`Config.Player.PlayerDefaults` คือหน้าตาเต็ม ๆ ของตัวละครใหม่หนึ่งตัว ได้แก่ `citizenid`, `cid`, `money`,
`optin`, `charinfo`, `job`, `metadata`, `position`, `items`, `weight` และ `slots`

ค่าเริ่มต้นถูกเติมแบบไล่ลงไปทุกชั้น และเติมเฉพาะช่องที่ยังไม่มีค่าเท่านั้น ของเดิมไม่เคยถูกทับ
ผลพลอยได้ที่มีประโยชน์มากคือ การเพิ่มช่องใหม่เข้าไปใน `metadata` ตรงนี้จะไปเติมให้ตัวละครเก่าทุกตัว
ที่ถูกเซฟไว้ก่อนที่ช่องนั้นจะมีอยู่ด้วย

ช่องไหนที่ค่าเป็น `function` จะถูกเรียกตอนสร้างตัวละครจริง นั่นคือวิธีที่ทำให้แต่ละตัวละครได้ citizen id
เลขบัญชี ลายนิ้วมือ และ wallet id เป็นของตัวเองไม่ซ้ำใคร

```lua
Config.Player.PlayerDefaults = {
    metadata = {
        -- เรียกใหม่ทุกครั้งที่สร้างตัวละคร ไม่ได้ใช้ค่าร่วมกัน
        fingerprint = function() return HexaCore.CreateFingerprint() end,
    }
}
```

::: tip weight กับ slots อยู่ที่นี่ ไม่ได้อยู่ในฐานข้อมูล
`weight = 100` และ `slots = 25` ถูกอ่านจากตารางนี้ทุกครั้งที่โหลดตัวละคร ระบบน้ำหนักคิดเป็นเปอร์เซ็นต์
โดยตั้งใจ คือน้ำหนักของไอเทมหนึ่งชิ้นคือกี่เปอร์เซ็นต์ของ 100 ที่แบกได้ ถ้าจะเปลี่ยนระหว่างเกมให้ใช้
`Core.SetMaxWeight` และ `Core.SetMaxSlots`
:::

ค่าสถานะร่างกายเริ่มต้น (`hunger`, `thirst`, `cleanliness`, `stress`) ก็เริ่มจาก
`PlayerDefaults.metadata` ส่วนหัวข้อถัดไปกำหนดว่า metadata คีย์ใดเข้าร่วมระบบสถานะ

## สถานะร่างกาย

```lua
Config.Status = {}
Config.Status.Enabled = true
Config.Status.Keys = { 'hunger', 'thirst', 'cleanliness', 'stress' }
Config.Status.TickInterval = 5
```

ทุกชื่อใน `Config.Status.Keys` จะเป็นค่า `0`-`100` ใน metadata และถูกรู้จักโดยลูปฝั่ง server,
exports, `/setstatus`, whitelist ที่ client เขียนได้, statebag และ cache สถานะฝั่ง client ชื่อจะถูก
แปลงเป็นตัวพิมพ์เล็กและตัดชื่อซ้ำตอนเริ่มระบบ สี่ชื่อที่แถมมาคือค่าเริ่มต้น โดยหิว กระหาย และสะอาด
ยิ่งใกล้ `100` ยิ่งดี ส่วนเครียด `0` คือดีที่สุด

การเพิ่มสถานะต้องเพิ่มชื่อใน `Config.Status.Keys`, ใส่ค่าเริ่มต้นใน
`Config.Player.PlayerDefaults.metadata` และใส่อัตราใน `Config.Status.Drain` ถ้าต้องการให้มันขยับเอง
ตัวละครเก่าที่ยังไม่มีคีย์จะใช้ค่าเริ่มต้นนั้น หรือใช้ `100` ถ้าไม่ได้กำหนด ส่วนคีย์ที่ไม่มีใน `Drain`
จะไม่ลดเอง

รอบลดค่าเดินอยู่ฝั่ง **server** ใน `server/status.lua` ไม่ใช่ตัวจับเวลาฝั่ง client ที่ผู้เล่นเลือกจะไม่รันก็ได้
หน้าที่เดียวของฝั่ง client คือหักเลือดที่ ped จริง ซึ่งเป็นสิ่งที่ทำจากฝั่ง server ไม่ได้

`Config.Status.Enabled = false` หยุดทั้งรอบลดค่าและการหักเลือด ค่าใน metadata จะค้างไว้เฉย ๆ

### อัตราการลด

```lua
Config.Status.Drain = {
    hunger      = 2.0,
    thirst      = 3.0,
    cleanliness = 1.0,
    stress      = -1.0,
}
```

แต่ละค่าถูกลบออกหนึ่งครั้งต่อ `TickInterval` นาที ด้วยค่าเริ่มต้นนี้ คนที่ไม่กินไม่ดื่มอะไรเลยจะหิวหมดใน
ประมาณสี่ชั่วโมงจริง (100 / 2.0 = 50 รอบ คูณ 5 นาที) และกระหายหมดในเกือบสามชั่วโมง

ค่าติดลบ = เพิ่มกลับให้เอง `stress = -1.0` จึงหมายความว่ายืนเฉย ๆ ความเครียดจะค่อย ๆ คลาย
ส่วนตัวเพิ่มความเครียดเป็นหน้าที่ของ resource อื่น ตั้งเป็น `0` ถ้าอยากให้ค่านั้นหยุดนิ่ง

คนที่นอนตายอยู่จะถูกข้าม ฟื้นขึ้นมาจะได้ไม่โดนหักเลือดจากความหิวซ้ำทันที

resource อื่นควรขยับค่าพวกนี้ผ่าน export ไม่ใช่ไปแก้ metadata ตรง ๆ

```lua
-- ฝั่ง server
exports['hexa_core']:AddStatus(source, 'hunger', 20)
exports['hexa_core']:RemoveStatus(source, 'thirst', 10)
exports['hexa_core']:SetStatus(source, 'cleanliness', 100)
local hunger = exports['hexa_core']:GetStatus(source, 'hunger')
```

```lua
-- ฝั่ง client อ่านได้อย่างเดียว
local status = exports['hexa_core']:GetStatus()
print(status.hunger, status.thirst, status.cleanliness, status.stress)
```

แอดมินตั้งค่าตรง ๆ ได้ด้วย `/setstatus [id] [key] [0-100]` โดย `[key]` สร้างจาก
`Config.Status.Keys`

### หักเลือดตอนหิวจัด

```lua
Config.Status.Damage = {
    enabled   = true,
    keys      = { 'hunger', 'thirst' },
    threshold = 0,
    interval  = 10000,
    amount    = 5,
    minHealth = 100,
}
```

- **`keys`** — สถานะใน `Config.Status.Keys` ที่จะทำให้เสียเลือดเมื่อแตะ threshold ชื่อที่ไม่รู้จักจะถูกข้าม
- **`threshold`** — ค่าที่ถือว่า "จัด" ตั้ง `0` แปลว่าต้องหมดเกลี้ยงก่อนถึงจะเริ่มหัก ตั้งสูงขึ้นถ้าอยากให้เจ็บเร็วกว่านั้น
- **`interval`** — มิลลิวินาทีต่อหนึ่งครั้งที่หัก ค่าต่ำกว่า `1000` จะถูกดันขึ้นเป็น `1000`
- **`amount`** — หักครั้งละกี่หน่วยเลือด
- **`minHealth`** — เพดานล่าง ระบบจะไม่หักลงต่ำกว่านี้ ความหิวล้วน ๆ จึงฆ่าคนไม่ได้ ตั้ง `0` ถ้าอยากให้ตายได้จริง

### แกนทองของ RDR2

```lua
Config.Status.Cores = {
    enabled = true,
    health  = 100,
    stamina = 100,
    deadeye = 100,
    staminaOnSpawn = 100,
    interval = 5000,
}
```

RDR2 แยกค่าของแต่ละ attribute เป็นสองชั้น คือ **แกนทอง** วงในที่ไหลลงเองตามเวลา กับ **หลอดนอก**
ซึ่งเป็นค่าจริงที่ใช้วิ่งและใช้ยิง พอแกนไหลลงเมื่อไหร่ หลอดนอกก็เติมกลับได้ไม่เต็มอีกต่อไป

เซิร์ฟนี้มีระบบหิวกระหายของตัวเองอยู่แล้ว แกนของเกมจึงถูกกดให้เต็มค้างไว้แทนที่จะปล่อยให้มาตีกันเอง
`health`, `stamina` และ `deadeye` แต่ละตัวคือค่าเป้าหมาย `0` ถึง `100` ตั้ง `nil` = ไม่ยุ่งกับแกนนั้น
ระบบเขียนเฉพาะแกนที่ยังไม่ถึงเป้าหมาย ไอคอนแกนจึงไม่กะพริบให้เห็นทุกไม่กี่วินาที

`staminaOnSpawn` คือการเติมหลอดสเตมินาด้านนอก และจะทำงานเฉพาะตอน ped เปลี่ยนตัวเท่านั้น
เช่น ตัวละครใหม่ เปลี่ยนชุด หรือถูกชุบ เพราะ ped ตัวใหม่ไม่ได้สืบค่าเดิมมา ถ้าไม่เติมให้ก็จะเพิ่งเข้าเกม
แล้วสเตมินาไม่เต็มทั้งที่ยังไม่ได้วิ่งเลย และตั้งใจให้ไม่ทำงานทุกรอบ ไม่งั้นวิ่งเท่าไหร่ก็ไม่มีวันเหนื่อย

`interval` คือมิลลิวินาทีต่อรอบตรวจ ต่ำสุด `1000`

สคริปต์ที่เปลี่ยนโมเดลหรือชุบคนสามารถสั่งเติมเดี๋ยวนั้นได้เลย

```lua
-- เติมแกนพร้อมหลอดสเตมินา
exports['hexa_core']:RefillCores()
-- เติมเฉพาะแกน ไม่ยุ่งกับหลอดสเตมินา
exports['hexa_core']:RefillCores(false)
```

::: tip เลือดฟื้นเองไม่ได้ตั้งผ่าน `config/`
ระบบเลือดฟื้นเองของ RDR2 ถูกปิดไว้ที่ `hexa_core/client/events.lua` ไม่ใช่ที่ไฟล์นี้ ถ้าอยากได้พฤติกรรม
แบบเกมเดิมกลับมา ให้แก้ตัวคูณสองตัวใน `DisableHealthRecharge` จาก `0.0` เป็น `1.0`
ส่วน `Config.Status.Cores.enabled = false` แค่คืนแกนทองให้เกมจัดการเองเท่านั้น
:::

## ความปลอดภัย

```lua
Config.Security = {}
Config.Security.CSRFFailurePolicy = 'log'
Config.Security.CSRFFailureThreshold = 5
```

หน้า NUI ในสแตก Hexa มี CSRF token ติดไปด้วย เมื่อ client รายงานว่า token ไม่ตรง ค่าสองตัวนี้ตัดสินว่า
server จะทำอะไรต่อ

- **`'log'`** (ค่าเริ่มต้น) — บันทึกลงคอนโซลและ log sink อย่างเดียว ไม่แตะผู้เล่น
- **`'kick'`** — เตะเมื่อรายงานครบ `CSRFFailureThreshold` ครั้งภายในหน้าต่างสิบวินาทีเดียวกัน
  ความยาวหน้าต่างถูกกำหนดตายตัวไว้ใน `server/events.lua` ปรับจาก config ไม่ได้

ระบบบันทึกเฉพาะรายงานครั้งแรกของแต่ละหน้าต่าง client จึงยิง event ถล่มคอนโซลไม่ได้

::: warning นี่คือไฟเตือน ไม่ใช่ระบบกันโกง
token ทั้งชุดถูกสร้าง ส่ง และตรวจอยู่ฝั่ง client ทั้งหมด server ไม่มีอะไรไว้ยืนยัน รายงานที่เข้ามาจึงเป็นได้แค่
"สัญญาณ" ตั้ง `'kick'` แล้วอาจไปเตะคนที่ NUI แค่โหลดช้าหรือสะดุด ซึ่งก็คือเหตุผลที่ค่าเริ่มต้นเป็น `'log'`
:::

## Colormap

```lua
Config.Colormap = {}
Config.Colormap.Enabled = true
Config.Colormap.Debug = false
```

Colormap ระบายสีอาณาเขตบนแผนที่ RDR2 โดยใช้ native ชุด wanted region ของเกม ซึ่งวาดทั้งเส้นขอบและ
สีพื้นให้เองทั้งบนมินิแมพและแผนที่ใหญ่ ทำงานฝั่ง client ล้วน ๆ ไม่มีการคุยกับ server เลย
ทาสีครั้งเดียวตอน resource start และล้างคืนตอน stop ไม่มี loop ไม่มี thread

### พาเลตต์และโซน

```lua
Config.Colormap.Colors = {
    red    = 'BLIP_STYLE_WANTED_REGION',
    green  = 'BLIP_STYLE_DEBUG_GREEN',
    blue   = 'BLIP_STYLE_DEBUG_BLUE',
}

Config.Colormap.Zones = {
    -- รัฐ AMBARINO
    { hash = 0x3B8DD21A, color = 'red' },
    -- เขต ROANOKE RIDGE
    { hash = 0x30FAE29B, color = 'blue' },
}
```

ชื่อสีทางซ้ายของ `Colors` เป็นชื่อที่คุณตั้งเอง เฉดจริงมาจาก `BLIP_STYLE_*` ที่จับคู่ไว้ทางขวา
และตารางนี้ไม่ได้จำกัดอยู่ที่หกสีที่แถมมา ช่อง `color` ของแต่ละโซนใส่ได้ทั้งชื่อสีในพาเลตต์
และชื่อ `BLIP_STYLE_*` ตรง ๆ เฉดที่ใช้ครั้งเดียวจึงไม่ต้องไปเพิ่มในพาเลตต์

hash ของโซนซ้อนกันเป็นชั้น เลข zone type ต่ำคือพื้นที่ย่อย (region, district) ส่วนเลขสูงคือกล่องใหญ่ (state)

### วิธีหา hash ของโซน

ตั้ง `Config.Colormap.Debug = true` แล้วระบบจะพิมพ์ทุกครั้งที่ทาสีหรือล้างสีลงคอนโซลฝั่ง client
พร้อมเปิดคำสั่งช่วยงานอีกสามตัว

- `/zonehash` — พ่น hash ของทุกโซนตรงจุดที่ยืนอยู่ ในรูปแบบที่ก๊อปไปวางใน `Zones` ได้เลย
- `/zonestyle <zone> <style>` — ทาสีสด ๆ ไม่ต้อง restart ใช้ลองเฉดก่อนตัดสินใจ
- `/zonereset [zone]` — ล้างโซนเดียว หรือไม่ใส่ zone = ทาใหม่ทั้งหมดตามคอนฟิก

resource อื่นสั่งงานระหว่างเกมได้ด้วย

```lua
exports['hexa_core']:SetZoneColor(0x30FAE29B, 'blue')
exports['hexa_core']:ResetZoneColor(0x30FAE29B)
exports['hexa_core']:RefreshZoneColors()
exports['hexa_core']:ClearZoneColors()
```

## ความหนาแน่นในโลก

```lua
Config.Density = {
    [1] = 1.0, -- สัตว์ ambient
    [2] = 1.0, -- สัตว์ scenario
    [3] = 0.0, -- NPC มนุษย์ ambient
    [9] = 0.0, -- ยานพาหนะ
}
```

ตัวคูณเก้าช่อง `0.0` = ปิดสนิท `1.0` = ค่าปกติของเกม ค่าเริ่มต้นเปิดสัตว์ไว้ให้ล่าได้
และปิด NPC มนุษย์ ped ทั่วไป กับรถม้าทิ้งไป

native ชุดนี้เป็นแบบต่อเฟรมโดยดีไซน์ของเอนจิน จึงต้องเรียกใหม่ทุกเฟรม `client/density.lua` แก้ด้วยการ
precompute เฉพาะช่องที่ไม่ใช่ `1.0` และถ้าทุกช่องเป็น `1.0` จะไม่สร้าง thread เลยแม้แต่ตัวเดียว
ปล่อยช่องไหนไว้ที่ `1.0` จึงไม่เสียอะไรจริง ๆ

## Eagle Eye

```lua
Config.EagleEye = {
    everyone = { enabled = true },
    vallaw   = { enabled = false },
    rholaw   = { enabled = false },
}
```

ถ้า `everyone.enabled` เป็น `true` ทุกคนใช้ Eagle Eye ได้และระบบจะไม่สนใจช่องที่เหลือในตารางเลย
ตั้งเป็น `false` เมื่อต้องการจำกัดเฉพาะบางอาชีพ แล้วเพิ่มคีย์ตามชื่อ job ที่มีอยู่ในตาราง `jobs`

```lua
Config.EagleEye = {
    everyone = { enabled = false },
    hunter   = { enabled = true },
}
```

สิทธิ์ถูกคำนวณใหม่ทุกครั้งที่ล็อกอินและทุกครั้งที่เปลี่ยนอาชีพ

## ระยะ prompt

```lua
Config.PromptDistance = 1.0
Config.PromptVisible  = 3.0
```

`PromptDistance` คือระยะเป็นเมตรที่กด prompt โต้ตอบได้ ส่วน `PromptVisible` คือระยะที่หมุดเริ่มโผล่ให้เห็น
สองค่านี้เป็นค่ากลางของทั้งสแตกสำหรับ prompt ทุกตัวที่ hexa_core ลงทะเบียนให้ ควรใช้ค่าเดียวกันทุก resource
เพื่อให้การโต้ตอบรู้สึกเหมือนกันหมดทั้งเซิร์ฟ

## ปล่อยไว้ได้เลย

| คีย์ | เหตุผล |
| --- | --- |
| `Config.MaxPlayers` | ดึงค่า `sv_maxclients` จาก `server.cfg` ให้เองอยู่แล้ว และ hexa_core 3.0.0 ก็ไม่ได้อ่านกลับไปใช้ที่ไหน ให้ไปตั้งที่ convar แทน |
| `Config.UpdateInterval` | เป็นแค่ร่างเงาของ `Config.Save.Interval` ที่คงไว้ให้คอนฟิกเก่าไม่พัง ให้แก้ที่ `Config.Save.Interval` |
| `Config.Player.LockedIds` | เลขสวยที่กันไว้ไม่ให้การสุ่มหยิบไป ค่าที่แถมมาใช้ได้เลย |
| `Config.Money.DontAllowMinus` / `MinusLimit` | ฝั่ง server บีบเพดานล่างไว้แล้ว เงินติดลบเกิดขึ้นไม่ได้อยู่ดี |
| `Config.Money.EnableMoneyItems` | `false` คือรูปแบบที่สแตกนี้รองรับ |
| `Config.Security.*` | `'log'` คือค่าที่ถูกต้องสำหรับ token ที่ตรวจอยู่ฝั่ง client |
| `Config.Density` | ปรับมาให้ล่าสัตว์ได้และเมืองไม่แน่นไปด้วย NPC |
| `Config.Status.Cores` | กดแกนทองให้เต็มค้างไว้เพื่อไม่ให้ตีกับระบบหิวกระหายของเซิร์ฟเอง |
| `Config.Colormap.Zones` | เจ็ดโซนที่แถมมาครอบคลุมทุกรัฐ บวกเขต Roanoke Ridge |
