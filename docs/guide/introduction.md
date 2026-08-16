# แนะนำ Hexa Framework

**hexa_core** คือ resource หลัก (framework core) สำหรับเซิร์ฟเวอร์ **RedM** ทำหน้าที่จัดการทุกอย่างที่เป็นหัวใจของเซิร์ฟเวอร์ roleplay:

- ระบบผู้เล่นและตัวละคร (สร้าง / โหลด / เซฟ / ลบตัวละคร)
- เงินหลายประเภท (cash, bank ฯลฯ) และ money items
- ไอเทม พร้อมน้ำหนักและช่องเก็บของ (slots)
- อาชีพ (jobs) เกรด และสถานะเข้าเวร (duty)
- สถานะร่างกาย เช่น ความหิว ความกระหาย
- ระบบ permission สำหรับแอดมิน
- Callbacks ระหว่าง client และ server
- ระบบ locale หลายภาษา (มาพร้อมไทย/อังกฤษ)

## ทำไมโครงสร้างถึงคล้าย ESX?

hexa_core ใช้โครงสร้างฐานข้อมูลสไตล์ [ESX](https://docs.esx-framework.org/) — ตาราง `users` คีย์ด้วย `identifier` — เพื่อให้คนที่เคยใช้ ESX/QBCore ย้ายมาได้ง่าย แนวคิดหลายอย่างจึงคุ้นเคย เช่น

| แนวคิด | ใน hexa_core |
| --- | --- |
| Core object | `exports['hexa_core']:GetCoreObject()` |
| Player object | `HexaCore.Functions.GetPlayer(source)` |
| Callback | `HexaCore.Functions.CreateCallback` / `TriggerCallback` |
| Useable item | `HexaCore.Functions.CreateUseableItem` |
| งาน/อาชีพ | `Player.Functions.SetJob(job, grade)` |

## โครงสร้างไฟล์

```
hexa_core/
├── client/        # ฝั่ง client: events, functions, spawn, prompts, status ฯลฯ
├── server/        # ฝั่ง server: player, functions, commands, jobs, items ฯลฯ
├── shared/        # ใช้ร่วมกันสองฝั่ง: locale, weapons, keybinds
├── locale/        # ไฟล์ภาษา (th, en)
├── stream/        # ไฟล์ asset ที่ stream เข้าเกม (minimap, HUD)
├── config.lua     # การตั้งค่าทั้งหมด
├── install.sql    # โครงสร้างฐานข้อมูล
└── fxmanifest.lua
```

## การเรียกใช้ Core Object

ทุก resource ที่ต้องการใช้งาน hexa_core ให้ดึง core object ผ่าน export:

```lua
local HexaCore = exports['hexa_core']:GetCoreObject()

-- จากนั้นใช้งานได้ทันที เช่น (ฝั่ง server)
local Player = HexaCore.Functions.GetPlayer(source)
if Player then
    Player.Functions.AddMoney('cash', 100, 'ตัวอย่างการเพิ่มเงิน')
end
```

## ไปต่อ

- [การติดตั้ง](/guide/installation) — ติดตั้งลงเซิร์ฟเวอร์และฐานข้อมูล
- [การตั้งค่า](/guide/configuration) — ปรับ `config.lua` ให้เข้ากับเซิร์ฟเวอร์ของคุณ
- [API Reference](/api/server-functions) — รายการฟังก์ชันทั้งหมด
