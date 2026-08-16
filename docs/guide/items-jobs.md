# Items และ Jobs

## Items

ไอเทมทั้งหมดถูกนิยามฝั่ง server (`server/items.lua`) แต่ละไอเทมมีน้ำหนัก ช่องเก็บ และคุณสมบัติอื่น ๆ ระบบกระเป๋าคิดน้ำหนักรวมและจำนวน slot ของผู้เล่นให้อัตโนมัติ

### เพิ่ม/แก้ไอเทมจาก resource อื่น

ไม่ต้องแก้ไฟล์ core — ใช้ exports ได้เลย:

```lua
-- เพิ่มทีละชิ้น
exports['hexa_core']:AddItem('golden_ring', {
    name = 'golden_ring',
    label = 'แหวนทอง',
    weight = 100,
    type = 'item',
    image = 'golden_ring.png',
    unique = false,
    useable = false,
    shouldClose = false,
    description = 'แหวนทองคำเนื้อดี'
})

-- เพิ่มหลายชิ้นพร้อมกัน
exports['hexa_core']:AddItems(myItemsTable)

-- แก้ไข / ลบ
exports['hexa_core']:UpdateItem('golden_ring', newData)
exports['hexa_core']:RemoveItem('golden_ring')
```

### ให้ไอเทมกับผู้เล่น

```lua
local Player = HexaCore.Functions.GetPlayer(source)
Player.Functions.AddItem('golden_ring', 1)
Player.Functions.RemoveItem('golden_ring', 1)
```

### น้ำหนักและช่องเก็บ

```lua
HexaCore.Functions.ChangeWeight(source, 50000) -- เปลี่ยนน้ำหนักสูงสุด
HexaCore.Functions.ChangeSlots(source, 40)     -- เปลี่ยนจำนวนช่อง
```

## Jobs

อาชีพถูกนิยามฝั่ง server (`server/jobs.lua`) แต่ละอาชีพมีหลายเกรด (grade) พร้อมค่า `payment` สำหรับระบบเงินเดือน

### โครงสร้างอาชีพ

```lua
police = {
    label = 'ตำรวจ',
    type = 'leo',
    defaultDuty = true,
    grades = {
        ['0'] = { name = 'พลตำรวจ', payment = 50 },
        ['1'] = { name = 'สิบตำรวจ', payment = 75 },
        ['2'] = { name = 'ร้อยตำรวจ', payment = 100 },
    },
},
```

### จัดการอาชีพจาก resource อื่น

```lua
exports['hexa_core']:AddJob('miner', jobData)     -- เพิ่มอาชีพใหม่
exports['hexa_core']:AddJobs(jobsTable)           -- เพิ่มหลายอาชีพ
exports['hexa_core']:UpdateJob('miner', jobData)  -- แก้ไข
exports['hexa_core']:RemoveJob('miner')           -- ลบ
```

### ตั้งอาชีพให้ผู้เล่น

```lua
local Player = HexaCore.Functions.GetPlayer(source)
Player.Functions.SetJob('police', 1)   -- อาชีพ + เกรด
Player.Functions.SetJobDuty(true)      -- เข้าเวร
```

### เช็คคนเข้าเวร

```lua
local players, count = HexaCore.Functions.GetPlayersOnDuty('police')
local count = HexaCore.Functions.GetDutyCount('police')
```

## เงินเดือน (Paycheck)

ระบบจ่ายเงินเดือนอัตโนมัติตามค่า `payment` ของเกรดอาชีพ ทุก ๆ `Config.Money.PayCheckTimeOut` นาที — ถ้าเปิด `Config.Money.PayCheckSociety` เงินจะถูกหักจากบัญชีกลางของหน่วยงานผ่าน `Config.Money.SocietyExport` แทนการเสกให้ฟรี
