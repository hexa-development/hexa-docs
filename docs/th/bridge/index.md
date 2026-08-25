# Compatibility bridge

`hexa-bridge` ช่วยให้ resource บางตัวที่เขียนมาสำหรับ RSG Core หรือ VORP Core ทำงานบน
`hexa_core` ได้ โดยมี resource ชื่อ `rsg-core` และ `vorp_core` คอยแปล API ส่วนข้อมูลผู้เล่นจริง
ยังมี Hexa เป็นเจ้าของเพียง framework เดียว

Bridge เป็นเครื่องมือช่วยย้ายระบบ ไม่ใช่สำเนาของ framework ต้นฉบับ การเรียก API ได้จึงไม่ได้แปลว่า
ระบบเบื้องหลังของต้นฉบับมีครบทั้งหมด ก่อนนำ resource เดิมขึ้นเซิร์ฟเวอร์จริงให้อ่านหน้าความเข้ากันได้:

- [ความเข้ากันได้กับ RSG Core](/th/bridge/rsg-core)
- [ความเข้ากันได้กับ VORP Core](/th/bridge/vorp-core)

resource ใหม่ควรใช้ [Hexa API โดยตรง](/th/api/server-functions) ส่วน bridge เหมาะกับการทยอยย้าย
resource เดิมทีละตัว

## การติดตั้ง

โคลนรีโป bridge มาไว้ข้าง `hexa_core`:

```bash
git clone https://github.com/hexa-development/hexa-bridge.git
```

ภายในรีโปมี FiveM resource สองตัวแยกจากกัน ให้คัดลอกเฉพาะโฟลเดอร์ที่ต้องใช้ลง resources
และคงชื่อเดิมไว้ทุกตัวอักษร:

```text
resources/
├── [hexa]/
│   └── hexa_core/
└── [bridge]/
    ├── rsg-core/
    └── vorp_core/
```

เริ่ม core ก่อน bridge และเริ่ม bridge ก่อน resource ที่เรียกมัน:

```ini
ensure oxmysql
ensure hexa_core

ensure rsg-core
ensure vorp_core

# วาง ensure ของ resource RSG/VORP ไว้หลัง bridge ที่มันใช้
```

manifest ของ bridge ทั้งสองประกาศ `hexa_core` เป็น dependency อยู่แล้ว แต่การเรียงลำดับให้ชัดใน
`server.cfg` ทำให้ตามหาสาเหตุเวลาเริ่มระบบไม่สำเร็จได้ง่ายกว่า

::: danger ห้ามเปิด core ต้นฉบับคู่กับ bridge
resource compatibility ตั้งใจใช้ชื่อเดียวกับต้นฉบับ ห้ามเปิด `rsg-core` ตัวจริงพร้อม bridge
`rsg-core` นี้ หรือเปิด `vorp_core` ตัวจริงพร้อม bridge `vorp_core` เพราะ export และ event จาก
resource ชื่อเดียวกันสองตัวไม่สามารถแข่งขันกันอย่างปลอดภัยได้
:::

## การตั้งค่า

แต่ละ bridge มี `config.lua` ของตัวเอง:

| ไฟล์ | สิ่งที่ควบคุม |
| --- | --- |
| `rsg-core/config.lua` | alias ประเภทเงิน, alias สิทธิ์, โครง gang เริ่มต้นสำหรับกัน nil และข้อความ debug |
| `vorp_core/config.lua` | mapping หมายเลขสกุลเงิน, VORP group กับ ACE, จำนวนตัวละครที่รายงาน, ชนิด notification และข้อความ debug |

ค่าที่ไม่รู้จักจะไม่ถูกเดา ถ้าตั้งประเภทเงิน หมายเลขสกุลเงิน หรือกลุ่มสิทธิ์เป็น `false` การทำงานจะล้มเหลว
อย่างปลอดภัยและเตือนหนึ่งครั้ง แทนการไปใช้บัญชีเงินหรือสิทธิ์ผิดชนิดโดยเงียบ ๆ

## รูปแบบการทำงาน

Bridge ดึง Hexa object ใหม่เมื่อ Hexa แจ้งว่า object หรือ shared catalogue เปลี่ยน เพราะ export ที่ข้าม
resource boundary เป็น snapshot ถ้าเก็บ object แรกจากตอน cold boot ไว้ตลอด ตาราง item และ job อาจว่าง
ทั้ง session

ฝั่ง RSG ฟังก์ชันที่ตรงกับ Hexa จะถูกแขวนผ่าน wrapper แบบ late-bind ส่วน VORP จะได้ User และ Character
ที่ประกอบขึ้นตามรูปแบบของมัน signature ที่ต่างกันจะถูกแปลเป็นรายตัว และ subsystem ที่ไม่มีจะคืนค่าว่าง
หรือ `false` พร้อมเตือนหนึ่งครั้ง

## เช็กลิสต์ก่อนใช้งานจริง

1. อ่าน manifest และหา framework export, event และ shared file ทุกตัวที่ resource นั้นใช้
2. เทียบรายการกับหน้าความเข้ากันได้ของ bridge ที่เลือก
3. เปิด `BridgeConfig.Debug` ระหว่างทดสอบเพื่อให้ call ที่ยังไม่รองรับปรากฏใน console
4. ทดสอบการหักเงิน ความจุไอเทม callback login/logout และการเปลี่ยนอาชีพด้วย client อย่างน้อยสองเครื่อง
5. ให้ถือว่า no-op คือ “ไม่รองรับ” แม้มันจะกัน Lua error ได้ สคริปต์เสื้อผ้า แก๊ง หรือช่องตัวละครที่โหลดผ่าน
   แต่ไม่มีที่เก็บ state ยังถือว่าใช้งานไม่ได้

Bridge รองรับ interface ที่พบบ่อย ไม่ได้รับประกันทุกเวอร์ชันและทุก resource ของทั้งสอง ecosystem

