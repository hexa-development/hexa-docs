# Commands

## การสร้างคำสั่งใหม่

ใช้ `HexaCore.Commands.Add` (ฝั่ง server) — รองรับ help text, arguments, และระดับ permission ในตัว:

```lua
HexaCore.Commands.Add(
    'heal',                                   -- ชื่อคำสั่ง
    'รักษาผู้เล่น',                             -- คำอธิบาย (แสดงใน chat suggestion)
    { { name = 'id', help = 'server id' } },  -- arguments
    false,                                    -- argsrequired: ต้องใส่ครบทุก arg ไหม
    function(source, args)
        local target = tonumber(args[1]) or source
        -- โค้ดรักษา
    end,
    'admin'                                   -- permission ขั้นต่ำ ('user' = ทุกคน)
)
```

refresh chat suggestions ให้ผู้เล่น:

```lua
HexaCore.Commands.Refresh(source)
```

## คำสั่งที่มากับ core

### เทเลพอร์ต

| คำสั่ง | คำอธิบาย | Permission |
| --- | --- | --- |
| `/tp [id/x] [y] [z]` | วาร์ปไปหาผู้เล่น หรือพิกัด | admin |
| `/tpm` | วาร์ปไปยัง marker บนแผนที่ | admin |
| `/noclip` | เปิด/ปิดโหมดบินทะลุ | admin |

### Permission

| คำสั่ง | คำอธิบาย | Permission |
| --- | --- | --- |
| `/addpermission [id] [permission]` | ให้สิทธิ์ผู้เล่น | god |
| `/removepermission [id] [permission]` | ถอนสิทธิ์ผู้เล่น | god |

### ยานพาหนะ

| คำสั่ง | คำอธิบาย | Permission |
| --- | --- | --- |
| `/vehicle [model]` | เสกม้า/รถม้า/ยานพาหนะ | admin |
| `/dv` | ลบยานพาหนะที่อยู่ใกล้/ที่นั่งอยู่ | admin |
| `/dvall` | ลบยานพาหนะทั้งหมด | admin |
| `/dvp` | ลบ ped ทั้งหมด | admin |
| `/dvo` | ลบ object ทั้งหมด | admin |

### เงิน / ไอเทม

| คำสั่ง | คำอธิบาย | Permission |
| --- | --- | --- |
| `/givemoney [id] [type] [amount]` | ให้เงินผู้เล่น | god |
| `/setmoney [id] [type] [amount]` | ตั้งยอดเงินผู้เล่น | god |
| `/giveitem [id] [item] [amount]` | ให้ไอเทมผู้เล่น | god |

### อาชีพ

| คำสั่ง | คำอธิบาย | Permission |
| --- | --- | --- |
| `/job` | ดูอาชีพปัจจุบันของตัวเอง | user |
| `/setjob [id] [job] [grade]` | ตั้งอาชีพให้ผู้เล่น | admin |

### ทั่วไป

| คำสั่ง | คำอธิบาย | Permission |
| --- | --- | --- |
| `/me [ข้อความ]` | แสดงข้อความ 3D เหนือหัว | user |
| `/id` | ดู server id ของตัวเอง | user |

## คำสั่ง debug โซนแผนที่ (client)

มีเฉพาะตอนเปิดโหมด debug ของ colormap:

| คำสั่ง | คำอธิบาย |
| --- | --- |
| `/zonehash` | ดู hash ของโซนที่ยืนอยู่ |
| `/zonestyle [style]` | ทดสอบสีโซน |
| `/zonereset` | รีเซ็ตสีโซน |
