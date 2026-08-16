# Exports

exports ทั้งหมดของ `hexa_core` ที่ resource อื่นเรียกได้โดยตรง (ฝั่ง server เว้นแต่ระบุไว้)

## Core

### GetCoreObject

```lua
local HexaCore = exports['hexa_core']:GetCoreObject()
```

export หลักที่ทุก resource ต้องใช้ — คืน core object ทั้งก้อน (`Functions`, `Player`, `Commands`, `Config`, ...)

### GetCoreVersion

```lua
local version = exports['hexa_core']:GetCoreVersion()
```

### AwaitSchemaReady

```lua
exports['hexa_core']:AwaitSchemaReady()
```

บล็อกรอจน installer สร้าง/ตรวจ schema ฐานข้อมูลเสร็จ — ใช้ใน resource ที่ต้อง query ตารางของ core ตอนสตาร์ท

## Player Object Extension

### SetMethod / SetField

```lua
exports['hexa_core']:SetMethod(methodName, handler)
exports['hexa_core']:SetField(fieldName, data)
```

เพิ่มเมธอด/ฟิลด์ให้ player object ของผู้เล่นทุกคน — ดูตัวอย่างที่ [Player Object](/guide/player-object#การขยาย-player-object)

## Jobs

```lua
exports['hexa_core']:AddJob(name, jobData)
exports['hexa_core']:AddJobs(jobsTable)
exports['hexa_core']:UpdateJob(name, jobData)
exports['hexa_core']:RemoveJob(name)
```

## Items

```lua
exports['hexa_core']:AddItem(name, itemData)
exports['hexa_core']:AddItems(itemsTable)
exports['hexa_core']:UpdateItem(name, itemData)
exports['hexa_core']:RemoveItem(name)
```

## Status (หิว / กระหาย / สถานะอื่น)

```lua
local value = exports['hexa_core']:GetStatus(src, key)       -- เช่น ('hunger')
exports['hexa_core']:SetStatus(src, key, value)
exports['hexa_core']:AddStatus(src, key, amount)
exports['hexa_core']:RemoveStatus(src, key, amount)
```

## Storage (inventory codec)

ชุดเข้ารหัส/ถอดรหัสข้อมูลกระเป๋าและอาวุธที่ core ใช้อ่าน-เขียนแถว `users` — เปิดเป็น export ให้ resource ที่ต้องอ่านข้อมูลจากฐานข้อมูลตรง ๆ ใช้ตามได้:

```lua
local encoded = exports['hexa_core']:EncodeInventory(items)
local items   = exports['hexa_core']:DecodeInventory(encoded)
local encoded = exports['hexa_core']:EncodeLoadout(loadout)
local loadout = exports['hexa_core']:DecodeLoadout(encoded)
local slots   = exports['hexa_core']:BuildSlots(items)
local isWeap  = exports['hexa_core']:IsWeapon(itemName)
```

## ความปลอดภัย

### ExploitBan

```lua
exports['hexa_core']:ExploitBan(source, reason)
```

แบนผู้เล่นที่ตรวจพบพฤติกรรม exploit (ใช้คู่กับ `PrepForSQL`)

## ฝั่ง client

### GenerateCSRFToken

```lua
local token = exports['hexa_core']:GenerateCSRFToken()
```

สร้าง token สำหรับตรวจ NUI message ฝั่ง client — token สร้างและตรวจฝั่ง client ทั้งหมด ใช้เป็นสัญญาณตรวจจับความผิดปกติ
