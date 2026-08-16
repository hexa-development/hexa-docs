# การติดตั้ง

## สิ่งที่ต้องมีก่อน

| รายการ | หมายเหตุ |
| --- | --- |
| RedM Server (FXServer) | artifact รุ่นล่าสุดที่รองรับ `rdr3` |
| MariaDB / MySQL | สำหรับเก็บข้อมูลผู้เล่น |
| [oxmysql](https://github.com/CommunityOx/oxmysql) | dependency บังคับ — ต้องสตาร์ทก่อน hexa_core |

## ขั้นตอนติดตั้ง

### 1. ดาวน์โหลด hexa_core

```bash
git clone https://github.com/hexa-development/hexa_core.git
```

วางไว้ในโฟลเดอร์ resources ของเซิร์ฟเวอร์ เช่น

```
resources/[scripts-hexa]/hexa_core
```

### 2. ตั้งค่าฐานข้อมูล

hexa_core มี **ตัวติดตั้ง schema อัตโนมัติ** (`server/installer.lua`) ที่จะรัน `install.sql` สร้างตารางพื้นฐานให้เองตอนสตาร์ทครั้งแรก — ขอแค่ตั้ง connection string ของ oxmysql ให้ถูกต้องใน `server.cfg`:

```ini
set mysql_connection_string "mysql://user:password@localhost/hexa?charset=utf8mb4"
```

::: tip
ตาราง `users` ใช้โครงสร้างสไตล์ ESX — คีย์ด้วยคอลัมน์ `identifier` โดยผู้เล่น 1 คนมีได้หลายตัวละคร
:::

### 3. เพิ่มใน server.cfg

ลำดับการ start สำคัญ — oxmysql ต้องมาก่อน:

```ini
ensure oxmysql
ensure hexa_core
```

### 4. เลือกประเภท identifier

ใน `config.lua` ตั้งค่า `Config.IdentifierType` ให้ตรงกับเซิร์ฟเวอร์ของคุณ:

```lua
Config.IdentifierType = 'license' -- 'steam' หรือ 'license'
```

::: warning ระวัง
ถ้าตั้งเป็น `'steam'` ผู้เล่นที่ไม่ได้เปิดเกมผ่าน Steam จะถูกเตะตอน connect — ค่าที่ปลอดภัยที่สุดคือ `'license'` (Rockstar license) ซึ่งผู้เล่น RedM ทุกคนมี
:::

### 5. สตาร์ทเซิร์ฟเวอร์

เมื่อสตาร์ทครั้งแรก installer จะสร้างตารางให้อัตโนมัติ ดู log ใน console ว่า schema ถูกสร้างเรียบร้อย จากนั้นเข้าเกมได้เลย

## ตรวจสอบว่าใช้งานได้

จาก resource อื่น ลองดึง core object:

```lua
local HexaCore = exports['hexa_core']:GetCoreObject()
print(HexaCore ~= nil) -- ควรได้ true
```
