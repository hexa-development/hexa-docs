# ความเข้ากันได้กับ VORP Core

Bridge `vorp_core` สร้าง Core, User และ Character รูปแบบ VORP โดยมีข้อมูลจริงมาจาก `hexa_core`
รองรับทั้งสองวิธีที่พบบ่อยบน server และ client:

```lua
local Core = exports.vorp_core:GetCore()

-- event แบบเดิม
TriggerEvent('getCore', function(core)
    Core = core
end)
```

ต้องเริ่ม `vorp_core` หลัง `hexa_core` และก่อน resource ที่คาดว่า `getCore` จะตอบกลับระหว่าง startup

## User และ Character

ฝั่ง server:

```lua
local User = Core.getUser(source)       -- Core.GetUser ก็ใช้ได้
if not User then return end

local Character = User.getUsedCharacter -- เป็นค่า ไม่ใช่ฟังก์ชัน
Character.addCurrency(0, 100)
```

`Core.getUsers()` / `Core.GetUsers()` คืน map ที่ใช้ server id เป็นคีย์ User มี `source`,
`identifier`, `getUsedCharacter`, `getUserCharacters`, `getGroup` และ `numOfCharacters`
ส่วน `getNumOfCharacters()` คืน `1` เพราะ bridge เปิดเฉพาะตัวละคร Hexa ที่โหลดอยู่ ไม่ได้เปิดฐานข้อมูล
ของหน้าจอเลือกตัวละคร

ฟิลด์ Character แปลงข้อมูลประจำตัว ชื่อ อาชีพ เงิน สถานะ และตำแหน่งจาก `PlayerData` ค่า
`skinPlayer`, `compPlayer` และ `comps` ว่างเพราะข้อมูล skin ของ Hexa คนละรูปแบบ และ `inventory`
ว่างเพราะสแตกนี้เก็บของผ่าน `hexa_inventory`

Character เป็น snapshot ตอนเรียก `Core.getUser(src)` ถ้าจะอ่านยอดเงินหรืออาชีพที่อาจเปลี่ยนไปแล้ว
ให้เรียก `getUser` ใหม่ก่อนอ่าน

### เมธอดของ Character

การแก้ไขที่รองรับมีดังนี้:

| หมวด | เมธอด |
| --- | --- |
| เงิน | `addCurrency`, `removeCurrency`, `setCurrency`, `getCurrency` |
| อาชีพ | `setJob`, `setJobGrade`, `setJobDuty` |
| กลุ่มสิทธิ์ | `setGroup` |
| XP | `addXp`, `removeXp`, `setXp` |
| metadata สถานะ | `setHealth`, `setHealthOuter`, `setHealthInner`, `setStamina`, `setStaminaOuter`, `setStaminaInner`, `setDead`, `setHours` |
| วงจรข้อมูล | `updateCharUi`, `saveCharacter` |

`setJobLabel` เป็น no-op เพราะ Hexa เก็บ label ใน catalogue งาน ส่วน `setSkin` กับ `setComps` เป็น
no-op เพราะ `hexa_skin` ใช้คนละรูปแบบ สำหรับ User นั้น `setUsedCharacter`, `addCharacter` และ
`delCharacter` ก็เป็น no-op เพราะการจัดการช่องตัวละครเป็นหน้าที่ของ `hexa_multicharacter`

## Mapping สกุลเงิน

VORP อ้างสกุลเงินด้วยตัวเลข ค่าเริ่มต้นคือ:

```lua
BridgeConfig.Currency = {
    [0] = 'cash',
    [1] = 'gold',
    [2] = false, -- rol / rollcoins
}
```

mapping ที่เป็น `false` หรือไม่มีอยู่จะคืน failure (`0` สำหรับการอ่าน) และเตือนหนึ่งครั้ง ถ้า resource
ใช้ rollcoins ต้องตัดสินใจว่าจะเพิ่มประเภทเงินที่ตรงกันใน Hexa หรือ map ไปบัญชีที่มีอยู่ อย่า map เป็น
`bank` เพียงเพื่อปิด error ถ้าเศรษฐกิจของสองสกุลนี้ไม่ได้ตั้งใจให้รวมกัน

## Group และสิทธิ์ ACE

`Character.group` ถูกคำนวณจากสิทธิ์ Hexa ตามลำดับ ค่าเริ่มต้นแปลง Hexa `admin` เป็น VORP `admin`,
`staff` เป็น `moderator` และคนที่ไม่มี ACE ตรงกันเป็น `user`

`Character.setGroup(group)` แปลงย้อนผ่าน `BridgeConfig.PermissionFromGroup`:

- `admin` กับ `superadmin` ให้สิทธิ์ Hexa `admin`
- `moderator` กับ `mod` ให้สิทธิ์ Hexa `staff`
- `user = false` ถอดระดับสิทธิ์ Hexa ทั้งหมดจากผู้เล่นคนนั้น
- group ที่ไม่รู้จักจะไม่ถูกเดาและเตือนหนึ่งครั้ง

## Notification

ทั้ง server และ client มีชื่อที่ VORP ใช้บ่อย ได้แก่ `NotifyRightTip`, `NotifyTip`, `NotifyObjective`,
`NotifyCenter`, `NotifyBottomRight`, `NotifyTop`, `NotifySimpleTop`, `NotifyLeft`,
`NotifyLeftRotate`, `NotifyAvanced` / `NotifyAdvanced` และ `NotifyDeadPlayer`

ทุกตัวแสดงผ่าน toast แบบเดียวของ Hexa ตำแหน่ง texture dictionary, icon และสีแบบ VORP จึงทำซ้ำไม่ได้
และถูกละทิ้ง `BridgeConfig.NotifyTypes` กำหนดชนิด toast ของ Hexa ที่แต่ละชื่อจะใช้

## Callback

ลงทะเบียน callback ฝั่ง server แล้วเรียกจาก client:

```lua
-- server
Core.Callback.Register('example:get', function(src, cb, value)
    cb(value * 2)
end)

-- alias ฝั่ง server:
-- Core.addRpcCallback(...)
-- Core.RegisterCallback(...)
```

```lua
-- client แบบ async
Core.Callback.TriggerAsync('example:get', function(result)
    print(result)
end, 5)

-- client แบบรอผล ต้องเรียกใน Citizen thread
local result = Core.Callback.TriggerAwait('example:get', 5)
```

แต่ละคำขอมี id ของตัวเอง จึงเรียกชื่อเดียวกันซ้อนกันได้ คำขอฝั่ง client หมดเวลาใน 15 วินาทีแล้วตอบกลับ
โดยไม่มีค่า สำหรับทิศทางกลับกัน client ใช้ `Core.Callback.Register(name, fn)` และ server ใช้
`Core.Callback.TriggerClientAsync(name, source, cb, ...)` โดยมี timeout 15 วินาทีเหมือนกัน

## Webhook

ฝั่ง server มีรูปแบบที่เข้ากันได้กับ VORP:

```lua
Core.AddWebhook(title, webhookUrl, description, colour, username, logo, footerLogo, avatar)
```

ฟังก์ชันจะส่ง Discord embed ตรงไป URL ที่รับมา ให้เก็บ webhook URL ในไฟล์ฝั่ง server เท่านั้น
อย่าวางไว้ใน config ของ bridge ที่เป็น shared

## Event ที่ส่งต่อ

| Event ของ VORP | พฤติกรรมของ bridge |
| --- | --- |
| `vorp:SelectedCharacter` | ยิงฝั่ง server พร้อม `(source, Character)` และฝั่ง client พร้อม character id เมื่อ Hexa โหลดผู้เล่น |
| `vorp:playerSpawn` | ยิงทั้ง server และ client เมื่อ Hexa รับสัญญาณ player-loaded |
| `vorp:playerDropped` | ยิงฝั่ง server พร้อม source เมื่อ Hexa ถอดผู้เล่น |
| `vorp:setJob` | ยิงฝั่ง server พร้อม `(source, jobName, gradeLevel)` เมื่ออาชีพ Hexa เปลี่ยน |
| `vorp:updateCharUi` | ยิงฝั่ง client จาก `Character.updateCharUi()` |

## ขอบเขตที่ต้องรู้

- เปิดเฉพาะตัวละครที่โหลดอยู่ การสร้าง เลือก และลบตัวละครยังเป็นหน้าที่ของ `hexa_multicharacter`
- `BridgeConfig.MaxCharacters` เปลี่ยนเฉพาะค่าที่ `Core.maxCharacters` รายงาน ต้องตั้งให้ตรงกับ
  `hexa_multicharacter` แต่มันไม่ได้บังคับจำนวนช่องเอง
- ไม่แปลงข้อมูล skin/component และ inventory ที่ผูกกับตัวละครแบบ VORP
- ตำแหน่งและ artwork ของ notification แบบ VORP จะถูกยุบเป็น toast ปกติของ Hexa
- เซิร์ฟเวอร์ที่มีสกุลเงินหรือกลุ่มสิทธิ์ custom ต้องตั้ง mapping เองอย่างตั้งใจ

