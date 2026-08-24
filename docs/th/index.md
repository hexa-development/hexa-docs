---
layout: home

hero:
  name: "Hexa Framework"
  text: "เฟรมเวิร์กหลักสำหรับเซิร์ฟเวอร์ RedM"
  tagline: hexa_core รวมระบบผู้เล่น อาชีพ ไอเทม เงิน และสถานะไว้ใน API ชั้นเดียว บนฐานข้อมูลที่ติดตั้งตัวเองตอนบูต
  actions:
    - theme: brand
      text: เริ่มต้นใช้งาน
      link: /th/guide/introduction
    - theme: alt
      text: API Reference
      link: /th/api/server-functions
    - theme: alt
      text: GitHub
      link: https://github.com/hexa-development/hexa_core

features:
  - title: เขียนเพื่อ RedM ตั้งแต่แรก ไม่ใช่ของพอร์ตมา
    details: ใช้ native ของ RDR2 ตรง ๆ ทั้ง prompt โต้ตอบ, eagle eye, การโหลด IPL และ interior, ความหนาแน่นของโลก, การระบายสีโซนบนแผนที่ และลูปสถานะ hunger / thirst / cleanliness / stress อยู่ในตัว core เอง
  - title: ฐานข้อมูลติดตั้งให้เองตอนบูต
    details: ตาราง users คีย์ด้วย identifier แยกคอลัมน์ตามเรื่องชัดเจน และ install.sql รันตัวเองทุกครั้งที่เปิดเซิร์ฟ เป็น DDL ที่รันซ้ำได้ ฐานใหม่หรือฐานเก่าก็จบเหมือนกันโดยไม่ต้อง import มือ
  - title: Player object ครบในตารางเดียว
    details: Core.GetPlayer(source) คืนทุกอย่างของตัวละครมาในตารางแบนตัวเดียว ทั้ง cash / bank / gold, ไอเทม, อาชีพและเวร, metadata, state bag และ Save ของตัวเอง ไม่ต้องแวะผ่านชั้น .Functions อีก
  - title: Callback วิ่งได้สองทาง
    details: ฝั่ง server ลงทะเบียนด้วย Core.CreateCallback แล้วฝั่ง client ถามด้วย Core.TriggerCallback หรือกลับทางด้วย Core.TriggerClientCallback ส่วน useable item ก็ลงทะเบียนผ่าน core object ตัวเดียวกัน
  - title: ไทยและอังกฤษมาให้ตั้งแต่ต้น
    details: ระบบ locale ใช้อังกฤษเป็น fallback และโหลดไทยทีหลังเพื่อให้ไทยชนะ ข้อความที่ผู้เล่นเห็นจึงเป็นไทย ส่วนบรรทัด log ในคอนโซลจงใจให้เป็นอังกฤษ เพราะคอนโซลบางตัวแสดงไทยเพี้ยนและคนไล่ log ต้องกวาดตาเร็ว
  - title: รอบเซฟเป็นของ server
    details: เธรดฝั่ง server กวาดเซฟทุก Config.Save.Interval นาที เขียนเฉพาะคนที่ข้อมูลเปลี่ยนจริง และเกลี่ยการเขียนภายใน Config.Save.SpreadSeconds เพื่อไม่ให้ทั้งเซิร์ฟยิง MySQL พร้อมกันในติกเดียว
---

# Hexa Framework

`hexa_core` เวอร์ชัน 3.0.0 คือฐานที่ resource อื่นของ Hexa ทั้งหมดวางอยู่บน
ต้องการแค่ `oxmysql` ตัวเดียวเป็น dependency

เวอร์ชัน 3.0.0 แบน API สาธารณะทั้งชุด ถ้าเคยเขียนกับเฟรมเวิร์กนี้มาก่อน
สรุปสั้นที่สุดคือ ลบ `.Functions` ออกจากทุกจุดที่เรียก

## core object เป็นชั้นเดียว

```lua
local Core = exports['hexa_core']:GetCoreObject()

RegisterCommand('bonus', function(source)
    local Player = Core.GetPlayer(source)
    if not Player then return end
    Player.AddMoney('cash', 100, 'daily bonus')
end, false)
```

ชื่อเดิมอย่าง `Core.Functions.GetPlayer(source)` และ
`Player.Functions.AddMoney(...)` ยังเรียกได้อีกหนึ่งรุ่น เวลาถูกเรียกจะเตือน
หนึ่งครั้งต่อชื่อ พร้อมบอกว่า resource ไหนเป็นคนเรียก แล้วส่งต่อไปชื่อใหม่ให้

::: warning
ชั้น `.Functions` มีไว้ให้ช่วงเปลี่ยนผ่านเท่านั้น ไม่ใช่สไตล์ทางเลือก
รุ่นหน้าจะถูกถอดออก โค้ดใหม่ไม่ควรเขียนอิงมันเลย
:::

## ลงทะเบียนไอเทม กับ ให้ไอเทม เป็นคนละเรื่อง

เมื่อก่อนสองคำกริยานี้ใช้ชื่อเดียวกันทั้งที่ความหมายตรงข้ามกัน ตอนนี้แยกขาดแล้ว
และนี่คือเรื่องที่ต้องเข้าใจก่อนเรื่องอื่นทั้งหมด

```lua
-- นิยามไอเทม "ชนิดใหม่" ให้ทั้งเซิร์ฟรู้จัก
Core.RegisterItem('canteen', {
    name = 'canteen',
    label = 'Canteen',
    weight = 2,
    type = 'item',
    image = 'canteen.png',
    unique = false,
    useable = true,
    shouldClose = true,
})

-- ใส่ของลงกระเป๋าผู้เล่น "คนเดียว"
local Player = Core.GetPlayer(source)
Player.AddItem('canteen', 1, false, false, 'shop purchase')
```

ฝั่งแคตตาล็อกคือ `Core.RegisterItem`, `Core.UnregisterItem`,
`Core.RegisterItems` และ `Core.UpdateItemDefinition` อาชีพก็ใช้รูปเดียวกันคือ
`Core.RegisterJob`, `Core.UnregisterJob`, `Core.RegisterJobs` และ
`Core.UpdateJobDefinition` ส่วนฝั่งผู้เล่นคือ `Player.AddItem` กับ
`Player.RemoveItem` เท่านั้น

::: tip
เฉพาะบนชั้น export เท่านั้นที่ `exports['hexa_core']:AddItem` และ `:RemoveItem`
ถูกเก็บไว้ถาวร ทั้งสองตัวเป็นคำสั่งฝั่งแคตตาล็อก ซึ่งตรงกับที่สคริปต์ที่พอร์ตมา
คาดหวังจากชื่อ export พวกนี้อยู่แล้ว เอามาวางได้เลยโดยไม่ต้องแก้
:::

## Callback สองทาง

```lua
-- server
Core.CreateCallback('bank:getBalance', function(source, cb)
    local Player = Core.GetPlayer(source)
    cb(Player and Player.GetMoney('bank') or 0)
end)
```

```lua
-- client
Core.TriggerCallback('bank:getBalance', function(balance)
    print(('balance: %s'):format(balance))
end)
```

## การเซฟเป็นหน้าที่ของ server

เดิมรอบเซฟเดินอยู่ฝั่ง client ซึ่งแปลว่า client ไม่ยิงเข้ามาก็ไม่มีใครถูกเซฟ
ตอนนี้ server เป็นเจ้าของรอบเวลาทั้งหมด

```lua
-- ถ้าไปแก้ข้อมูลผู้เล่นเองนอกเส้นทางปกติ ให้บังคับเข้าคิวรอบถัดไปแบบนี้
local Player = Core.GetPlayer(source)
Player.MarkDirty()
```

`Core.SaveAllPlayers()` เขียนทุกคนทันทีและคืนจำนวนคนที่เขียนไป เป็นตัวเดียวกับที่
`onResourceStop` เรียกตอน `Config.Save.OnResourceStop` เปิดอยู่ ส่วนคนที่หลุด
ระหว่างสองรอบกวาดมี `Config.Save.OnDrop` รับไว้ให้

## ระบบ log

ตัวพิมพ์ชุดเดียว signature เหมือนกันเป๊ะทั้งสองฝั่ง ใช้รูปแบบ printf

```lua
Core.Log('spawned %d wagons', 4)
Core.Warn('no grade %s on job %s', grade, job)
Core.Error('save failed for %s', citizenid)
Core.PrintDebug('bucket now %d', bucket)
Core.DumpTable(Player.PlayerData)
```

`Core.PrintDebug` ผูกกับ `Config.Debug` และเช็กสวิตช์ก่อนจะฟอร์แมตสตริง
ทิ้งโค้ด debug ไว้ในของจริงจึงไม่เสียค่าอะไรเลยตอนปิดอยู่ นอกจากนี้ `hexa_core`
รับ event `hexa_log:server:CreateLog` เองแล้ว และส่งต่อเข้า Discord ให้ถ้าตั้ง URL
ไว้ใน `Config.Log.Webhooks`

## อ่านต่อที่ไหน

- [เริ่มต้นใช้งาน](/th/guide/introduction) สำหรับการติดตั้งและ resource แรก
- [การตั้งค่า](/th/guide/configuration) สำหรับคีย์คอนฟิกทุกตัว
- [Player object](/th/guide/player-object) สำหรับรายชื่อเมธอดทั้งหมด
- [Server functions](/th/api/server-functions) และ [client functions](/th/api/client-functions) สำหรับ API reference
