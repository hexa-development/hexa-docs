# การตั้งค่า (config.lua)

การตั้งค่าทั้งหมดอยู่ในไฟล์ `config.lua` ที่รากของ resource — หน้านี้สรุปหมวดสำคัญ

## ทั่วไป

```lua
Config.MaxPlayers = GetConvarInt('sv_maxclients', 48)
Config.IdentifierType = 'license'   -- 'steam' หรือ 'license'
Config.MultiCharacter = true        -- ใช้หน้าเลือกตัวละคร hexa_multicharacter
Config.DefaultSpawn = vector4(-2784.25, -3058.26, -12.34, 333.59)
Config.UpdateInterval = 5           -- รอบเซฟข้อมูลผู้เล่นอัตโนมัติ (นาที)
```

| ค่า | ความหมาย |
| --- | --- |
| `IdentifierType` | ตัวระบุตัวตนที่ผูกกับตัวละคร (`steam` = steam hex, `license` = Rockstar license) |
| `MultiCharacter` | `true` = เปิดหน้าเลือกตัวละคร / `false` = auto-login ตัวละครล่าสุด |
| `DefaultSpawn` | จุดเกิดของตัวละครใหม่ (x, y, z, heading) |
| `UpdateInterval` | ความถี่บันทึกข้อมูลผู้เล่นลงฐานข้อมูล (นาที) |

## ระบบเงิน

```lua
Config.Money.MoneyTypes = {
    cash = 50,   -- เงินสด เริ่มต้น 50
    bank = 0,    -- ธนาคาร (บัญชีเดียว ใช้ได้ทุกเมือง)
    gold = 0     -- ทองคำ
}
Config.Money.DontAllowMinus = { 'cash', 'gold', 'bank', 'bloodmoney' }
Config.Money.PayCheckTimeOut = 10      -- รอบจ่ายเงินเดือน (นาที)
Config.Money.PayCheckSociety = false   -- หักเงินเดือนจากบัญชี society
Config.Money.SocietyExport = nil       -- ต่อระบบบัญชีบริษัทภายนอก
```

::: tip บัญชีธนาคารรวมศูนย์
เดิมธนาคารแต่ละเมืองแยกช่องกัน (`valbank`, `rhobank`, ...) ปัจจุบันยุบเหลือ `bank` ช่องเดียว — ตัวละครเก่าที่มีเงินค้างช่องเดิมจะถูกรวมยอดเข้า `bank` อัตโนมัติตอนโหลด
:::

::: warning กันช่องโหว่แจกของฟรี
`RemoveMoney` ถูกบีบเพดานล่างไว้ที่ 0 เสมอในฝั่ง server — ต่อให้แก้ `DontAllowMinus`/`MinusLimit` ก็ไม่สามารถทำให้ `RemoveMoney('bank', n)` คืน `true` ทั้งที่ยอดไม่พอได้
:::

## ผู้เล่น / ตัวละคร

```lua
Config.Player.DefaultModel = 'mp_male'
Config.Player.CitizenIdPrefix = 'RB'  -- RB1234
Config.Player.CitizenIdDigits = 4     -- จำนวนหลักเลขสุ่ม
```

- `PlayerDefaults` กำหนดค่าเริ่มต้นทั้งหมดของตัวละครใหม่ (เงิน, charinfo, metadata ฯลฯ) — ช่องที่เป็น `function()` จะถูกเรียกใหม่ทุกครั้งที่สร้างตัวละคร เช่น สุ่ม citizenid / เลขบัญชี
- `LockedIds` คือรายการเลขสวย (1111, 9999, ...) ที่ระบบจะข้ามไม่แจกให้ผู้เล่น

## สถานะร่างกาย (หิว/กระหาย)

ค่าเริ่มต้น ความเร็วที่ลด และผลของสถานะเมื่อถึงศูนย์ ตั้งได้ในหมวด status ของ `config.lua` และมี exports `GetStatus` / `SetStatus` / `AddStatus` / `RemoveStatus` ให้ resource อื่นเรียก (ดู [Exports](/api/exports))

## ความปลอดภัย

- ระบบตรวจ SQL exploit ใน `PrepForSQL` — ผู้เล่นที่พยายามยัด SQL จะถูก log และแบนได้ผ่าน export `ExploitBan`
- นโยบายจัดการ NUI CSRF token mismatch ปรับได้ (แจ้งเตือน / เตะ) — token ชุดนี้สร้างและตรวจฝั่ง client ทั้งหมด server ยืนยันเองไม่ได้ จึงเป็นสัญญาณช่วยตรวจจับ ไม่ใช่เกราะป้องกันสมบูรณ์
