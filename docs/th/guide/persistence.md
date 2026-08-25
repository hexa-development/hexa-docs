# การบันทึกข้อมูล

ทุกอย่างที่เป็นของตัวละคร ทั้งเงิน อาชีพ ของในกระเป๋า loadout metadata ตำแหน่ง และสถานะตาย อยู่ในแถว
เดียวของตาราง `users` หน้านี้อธิบายว่าแถวนั้นถูกเขียนตอนไหน อะไรเป็นตัวตัดสินว่าผู้เล่นคนหนึ่งจะถูกเขียน
หรือไม่ และถ้าเซิร์ฟดับกะทันหันจะเสียอะไรไปบ้าง

โค้ดอยู่ที่ `server/save.lua` (รอบเวลา) กับ `server/player.lua` (ตัวเขียนจริง)

## รอบเวลาเป็นของ server แล้ว

เวอร์ชันก่อนหน้า นาฬิกาของการเซฟเดินอยู่ฝั่ง client โดย `client/loops.lua` นับเวลาแล้วยิง
`HexaCore:UpdatePlayer` เข้ามาให้ server เขียนคนนั้นทีละคน ผลคือ client ที่หยุดยิง event นี้ ไม่ว่าจะ
เพราะค้าง เพราะ resource ฝั่ง client error หรือเพราะโดนแก้ ก็จะ **ไม่ถูกเซฟเลย** และฝั่ง server ไม่รู้
ด้วยซ้ำว่ามีคนหายไปจากรอบ

ใน 3.0 ลูปย้ายมาอยู่ฝั่ง server ทั้งหมด และ client สั่งเขียนไม่ได้อีกแล้ว

```lua
-- server/save.lua ตัดให้สั้น
CreateThread(function()
    while true do
        Wait(Config.Save.Interval * 60000)
        sweep()
    end
end)
```

handler ของ `HexaCore:UpdatePlayer` ยังอยู่ฝั่ง server แต่ลงทะเบียนด้วย `AddEventHandler` ไม่ใช่
`RegisterNetEvent` แปลว่า client ยิงมาไม่ถึง เหลือแค่ resource ฝั่ง server ที่เรียกได้ และยังติดคูลดาวน์
หนึ่งครั้งต่อคนต่อ 30 วินาทีอยู่ดี

::: tip
`Config.UpdateInterval` ยังอ่านค่าได้ แต่ตอนนี้เป็นแค่สำเนาของ `Config.Save.Interval` ให้ตั้งค่าที่
`Config.Save.Interval` เท่านั้น ไม่มีโค้ดจุดไหนอ่าน `Config.UpdateInterval` อีกแล้ว
:::

## ค่าที่ตั้งได้

```lua
Config.Save = {}

Config.Save.Interval = 45        -- กี่นาทีต่อการกวาดเซฟหนึ่งรอบ ต่ำสุด 1
Config.Save.SpreadSeconds = 60   -- เกลี่ยการเขียนของรอบนั้นให้กระจายภายในกี่วินาที
Config.Save.OnDrop = true        -- เซฟทันทีตอนผู้เล่นหลุด
Config.Save.OnResourceStop = true -- เซฟทุกคนก่อน hexa_core หยุด
```

`Config.Save.Interval` ถูกอ่านใหม่ทุกครั้งที่ขึ้นรอบ ปรับขึ้นลงแล้วมีผลตั้งแต่รอบถัดไปโดยไม่ต้อง
restart เธรด ค่าที่ต่ำกว่า 1 จะถูกดันขึ้นเป็น 1 นาที

## ธง Dirty

รอบกวาดไม่ได้เขียนผู้เล่นทุกคนที่ออนไลน์ มันเขียนเฉพาะคนที่ข้อมูลเปลี่ยนจริงตั้งแต่เขียนครั้งล่าสุด
player object แต่ละตัวถือธงตัวนี้ไว้

```lua
local Player = Core.GetPlayer(source)
print(Player.Dirty)
```

ค่าเริ่มต้นเป็น `true` ตั้งแต่ตอนสร้าง player object เพราะตัวละครที่เพิ่งโหลดเข้ามายังไม่เคยถูกเขียนใน
รอบนี้เลย และธงถูกปิดใน `Core.SavePlayer` **ก่อน** ที่จะยิง insert ไม่ใช่หลัง เพราะการเขียนเป็นแบบไม่รอผล
ถ้าปิดทีหลังจะไปลบธงที่ resource อื่นเพิ่งปักใหม่ระหว่างที่ query ยังวิ่งอยู่ ถ้า insert กลับมาโดยไม่มี id
ธงจะถูกปักคืนและคนนั้นจะถูกหยิบไปเขียนใหม่ในรอบถัดไป

### อะไรที่ทำให้ผู้เล่น dirty

- `Player.SyncPlayerData()` ซึ่งถูกเรียกให้อัตโนมัติจาก `Player.SetPlayerData`, `Player.SetMetaData`,
  `Player.SetJob`, `Player.SetJobDuty`, `Player.AddMoney`, `Player.RemoveMoney`, `Player.SetMoney`,
  `Player.AddRep` และ `Player.RemoveRep`
- `Player.AddItem` กับ `Player.RemoveItem` บน player object ซึ่งปักธงเอง เพราะเส้นทางนี้ไม่ได้ผ่าน
  `SyncPlayerData`
- `Player.MarkDirty()` ที่เรียกด้วยมือ

### อะไรที่ไม่ทำ

การเข้าไปแก้ตารางใน `Player.PlayerData` ตรง ๆ ไม่มีอะไรบอกรอบกวาดเลย และการเขียน statebag ตรง ๆ
ก็ไม่ทำให้ dirty เช่นกัน ค่าใน statebag จะถูกดึงกลับเข้า metadata ตอนเซฟก็จริง แต่ตัวมันเองไม่ได้
ทำให้เกิดการเซฟ

```lua
-- แบบนี้รอบกวาดมองไม่เห็น
Player.PlayerData.metadata.criminalrecord = true

-- แบบนี้เห็น
Player.PlayerData.metadata.criminalrecord = true
Player.MarkDirty()
```

::: warning
ถ้า resource ของคุณเขียนลง `PlayerData` ตรง ๆ แทนที่จะเรียกผ่านเมธอดของผู้เล่น ต้องเรียก
`Player.MarkDirty()` เองเสมอ ไม่งั้นสิ่งที่แก้จะอยู่แค่จนกว่าจะ restart
:::

## ทำไมต้องเกลี่ยเวลาเขียน

เซิร์ฟที่คนเต็มแล้วเขียนทุกคนใน tick เดียวกัน หมายถึง upsert ลงตาราง `users` หลายสิบครั้งพร้อมกัน บวก
`SaveInventory` อีกคนละครั้ง ลงพร้อมกันหมด `Config.Save.SpreadSeconds` เปลี่ยนหัวพุ่งนั้นให้เป็นคิว
รอบกวาดจะเอาช่วงเวลาที่ตั้งไว้หารด้วยจำนวนคนที่ค้าง แล้วทยอยยิงด้วย `SetTimeout`

ด้วยค่าเริ่มต้น รอบที่มีคน dirty 40 คนจะกลายเป็นเขียนประมาณทุก 1.5 วินาที แทนที่จะเป็น 40 ครั้งในเฟรมเดียว

และเพราะคิวหนึ่งตัวอาจทำงานช้ากว่าจุดเริ่มรอบได้ถึง `SpreadSeconds` โค้ดจึงหยิบผู้เล่นจาก `Core.Players`
ใหม่ตอนถึงคิว ไม่ได้ปิดทับตัวเดิมไว้ใน closure คนที่หลุดไปแล้วระหว่างรอคิวจะถูกข้าม เพราะถูกเขียนไป
ตั้งแต่ตอนหลุดแล้ว

## เซฟตอนผู้เล่นหลุด

`Config.Save.OnDrop` ถูกตั้งใจให้คุมจุดนี้ และ handler `playerDropped` ใน `server/events.lua` ก็เซฟจริง

```lua
-- server/events.lua
AddEventHandler('playerDropped', function(reason)
    local src = source
    if not HexaCore.Players[src] then return end
    local Player = HexaCore.Players[src]
    TriggerEvent('HexaCore:Server:PlayerDropped', Player)
    Player.Save()
    HexaCore.Players[src] = nil
end)
```

::: danger หมายเหตุจากซอร์ส
ใน 3.0.0 handler ตัวนี้ไม่ได้อ่าน `Config.Save.OnDrop` จริง มันเซฟทุกกรณีโดยไม่เช็ค ตั้งค่าเป็น `false`
ตอนนี้จึงไม่มีผลอะไร ในเมื่อการเซฟตอนหลุดคือสิ่งที่เราต้องการอยู่แล้ว คำแนะนำคือปล่อยไว้ `true` และ
คิดเสียว่าการเซฟตอนหลุดเปิดอยู่ตลอด
:::

การเซฟตอนหลุดคือสิ่งที่ทำให้ interval ยาว ๆ ยังอยู่ได้ในสถานการณ์ปกติ ผู้เล่นที่เล่นสองชั่วโมงแล้วออกเกม
ตามปกติจะไม่เสียอะไรเลย ไม่ว่า interval จะยาวแค่ไหน เพราะการออกคือการเขียนอยู่ในตัว

::: warning
การ logout กลับไปหน้าเลือกตัวละครไม่นับเป็นการหลุด `Core.LogoutPlayer` (และ `Player.Logout` ที่เรียก
มันต่อ) จะถอดตัวละครออกจาก `Core.Players` โดยไม่เขียนลง DB ถ้าคุณกำลังทำระบบที่ถอดตัวละครออกเอง
ให้เซฟก่อน

```lua
local Player = Core.GetPlayer(source)
Player.Save()
Player.Logout()
```
:::

## เซฟตอน resource หยุด

```lua
AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    if Config.Save.OnResourceStop == false then return end
    Hexa.Log('resource stopping - saving %d player(s)', Core.SaveAllPlayers())
end)
```

เส้นทางนี้อ่าน `Config.Save.OnResourceStop` จริง และมันข้ามธง Dirty โดยตั้งใจ `Core.SaveAllPlayers()`
จะวนทุกตัวใน `Core.Players` แล้วเขียนทั้งหมด ไม่ว่าจะ dirty หรือไม่ ตอนกำลังจะ restart ไม่ใช่จังหวะที่จะ
มาประหยัดการเขียน และจุดนี้ไม่มีการเกลี่ยเวลาด้วย เพราะไม่เหลือเวลาให้รอคิวแล้ว

### ทำไมต้องผ่าน Player.Save()

`Core.SavePlayer(source)` ประกอบแถวจาก `PlayerData` เท่าที่มีอยู่ ณ ตอนนั้น แต่ค่าสถานะที่เดินอยู่จริง
คือทุกคีย์ใน `Config.Status.Keys` บวก `health` ไม่ได้อยู่ใน `PlayerData` ระหว่างที่ผู้เล่น
ออนไลน์ มันอยู่ใน statebag ของคนนั้น และถูกคัดลอกกลับมาด้วย `Player.PullStateBags()` เท่านั้น

```lua
function self.Save()
    if self.Offline then
        HexaCore.SaveOfflinePlayer(self.PlayerData)
    else
        self.PullStateBags()
        HexaCore.SavePlayer(self.PlayerData.source)
    end
end
```

โค้ดเดิมเรียก `Core.SavePlayer(src)` ตรง ๆ ตอน resource หยุด ซึ่งข้าม `PullStateBags` ไป จึงเขียน
metadata เก่าค้างจากตอนที่ sync ครั้งล่าสุด ผลคือทุกครั้งที่ restart ค่าสถานะที่ตั้งไว้จะเด้ง
กลับหมด ตอนนี้ `Core.SaveAllPlayers()` เรียกผ่าน `Player.Save()` ค่าใน statebag จึงถูกเทกลับเข้า
metadata ก่อนประกอบแถวเสมอ

ฝั่งตรงข้ามของมันทำงานตอนโหลด `Player.PushStateBags()` คัดลอกคีย์ชุดเดียวกันจาก metadata กลับลง
statebag ตอนสร้างตัวละคร

::: warning
อย่าเรียก `Core.SavePlayer(source)` จาก resource ของคุณเองกับผู้เล่นที่ออนไลน์ ให้เรียก `Player.Save()`
แล้วปล่อยให้มันเทค่า statebag ก่อน `Core.SavePlayer` เป็นครึ่งล่างของกระบวนการ และการข้ามขั้นตอนเทค่า
คือบั๊กเดียวกับที่อธิบายไว้ข้างบน
:::

## เซิร์ฟดับกะทันหันแล้วเสียอะไร

ทุกอย่างข้างบนต้องมีอะไรสักอย่าง "ทำงาน" ก่อน ไม่รอบกวาด ก็ตอนหลุด ก็ตอน resource หยุด แต่การดับ
กะทันหัน ทั้งโปรเซสถูกฆ่า ไฟดับ หรือ oxmysql ตาย ไม่มีอันไหนได้ทำงานเลย

ที่ค่าเริ่มต้น `Config.Save.Interval = 45` กรณีแย่ที่สุดของผู้เล่นคนหนึ่งคือเสียความคืบหน้า 45 นาที บวก
อีกไม่เกิน `SpreadSeconds` ถ้าเขายังค้างอยู่ในคิวของรอบล่าสุด ในทางปฏิบัติคือเงิน การเปลี่ยนอาชีพ
metadata และตำแหน่งย้อนกลับไป 45 นาที สำหรับคนที่ออนไลน์ต่อเนื่องและไม่ได้ไปกระตุ้นการเขียนทางอื่น

นี่คือการแลกจริง ๆ ไม่ใช่เศษที่มองข้ามได้ interval ยาวคือถูกกับฐานข้อมูลแต่แพงตอนเซิร์ฟดับ interval สั้น
คือกลับกัน

| Interval | เสียมากสุด | จำนวนการเขียนต่อชั่วโมง ที่คน dirty 40 คน |
| --- | --- | --- |
| 5 | ราว 6 นาที | 480 |
| 15 | ราว 16 นาที | 160 |
| 45 (ค่าเริ่มต้น) | ราว 46 นาที | ประมาณ 53 |

ค่าเริ่มต้นตั้งอยู่บนสมมติฐานว่าคนส่วนใหญ่ออกเกมตามปกติ และเซิร์ฟดับไม่บ่อย ถ้าเซิร์ฟของคุณดับบ่อยจน
ผู้เล่นบ่นว่าของหาย ให้ลด interval เป็นอย่างแรก และเพิ่ม `SpreadSeconds` ตามไปด้วย เพื่อให้รอบที่ถี่ขึ้น
ยังกระจายการเขียนได้อยู่

## สั่งเซฟจาก resource อื่น

มีสามระดับ เรียงจากเบาไปหนัก

ปักธงไว้ให้รอบหน้าหยิบไปเขียน ใช้หลังจากแก้ `PlayerData` ตรง ๆ

```lua
local Core = exports['hexa_core']:GetCoreObject()
local Player = Core.GetPlayer(source)

Player.MarkDirty()
```

เขียนคนเดียวเดี๋ยวนี้ ใช้หลังเหตุการณ์ที่หายไม่ได้ เช่นจ่ายเงินก้อนใหญ่ หรือเปลี่ยนอะไรที่สำคัญกับตัวละคร

```lua
local Player = Core.GetPlayer(source)

Player.Save()
```

เขียนทุกคนเดี๋ยวนี้ ใช้ก่อน restart ที่วางแผนไว้ หรือในคำสั่งแอดมิน

```lua
local saved = Core.SaveAllPlayers()

Core.Log('saved %d player(s) before restart', saved)
```

ถ้าตัวละครไม่ได้ออนไลน์ ให้โหลดขึ้นมาแล้วเซฟผ่านเมธอดเดียวกัน

```lua
local Player = Core.GetOfflinePlayerByCitizenId('RB1234')

if Player then
    Player.AddMoney('bank', 500, 'offline payout')
    Player.Save()
end
```

`Player.Save()` ของตัวละครออฟไลน์จะวิ่งไปที่ `Core.SaveOfflinePlayer(PlayerData)` แทน ซึ่งข้ามขั้นตอน
เทค่า statebag เพราะตัวละครที่ไม่ได้ออนไลน์ไม่มี statebag ให้อ่าน

## สรุปรายชื่อ

| ชื่อ | ฝั่ง | หน้าที่ |
| --- | --- | --- |
| `Config.Save.Interval` | server | กี่นาทีต่อรอบกวาด ต่ำสุด 1 |
| `Config.Save.SpreadSeconds` | server | ช่วงเวลาที่รอบกวาดใช้เกลี่ยการเขียน |
| `Config.Save.OnDrop` | server | ตั้งใจให้คุมการเซฟตอนหลุด แต่ 3.0.0 ยังไม่ได้อ่านค่านี้ |
| `Config.Save.OnResourceStop` | server | ตั้ง `false` เพื่อข้ามการเซฟตอน resource หยุด |
| `Core.SaveAllPlayers()` | server | เขียนทุกคนที่โหลดอยู่ คืนจำนวนที่เขียน |
| `Core.SavePlayer(source)` | server | ตัวเขียนระดับล่าง ไม่เทค่า statebag |
| `Core.SaveOfflinePlayer(PlayerData)` | server | เขียนตัวละครที่ไม่มี session |
| `Player.Save()` | server | เทค่า statebag แล้วค่อยเขียน ตัวที่ควรเรียก |
| `Player.MarkDirty()` | server | ดันผู้เล่นเข้ารอบกวาดถัดไป |
| `Player.Dirty` | server | boolean เป็น true เมื่อมีอะไรค้างรอเขียน |
| `Player.SyncPlayerData()` | server | กระจาย PlayerData ออกไป และปักธง dirty |
| `Player.PullStateBags()` | server | ดึงค่าสถานะที่เดินอยู่กลับเข้า metadata |
| `Player.PushStateBags()` | server | ส่ง metadata กลับออกไปลง statebag |
