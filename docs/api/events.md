# Events

รายการ event สำคัญของ hexa_core — ใช้ฟัง (listen) จาก resource อื่นเพื่อทำงานตามจังหวะของ core

## Client Events

### HexaCore:Client:OnPlayerLoaded

ยิงเมื่อผู้เล่นโหลดตัวละครเสร็จ — จุดเริ่มต้นมาตรฐานของสคริปต์ฝั่ง client แทบทุกตัว

```lua
RegisterNetEvent('HexaCore:Client:OnPlayerLoaded', function()
    -- เริ่มทำงานของ resource ได้ที่นี่
end)
```

### HexaCore:Client:OnPlayerUnload

ยิงเมื่อผู้เล่นออกจากตัวละคร (logout / เปลี่ยนตัวละคร) — ใช้เคลียร์สถานะของ resource

```lua
RegisterNetEvent('HexaCore:Client:OnPlayerUnload', function()
    -- เคลียร์ thread / blip / state
end)
```

### HexaCore:Player:SetPlayerData

ยิงทุกครั้งที่ PlayerData ฝั่ง client ถูกอัปเดต

```lua
RegisterNetEvent('HexaCore:Player:SetPlayerData', function(PlayerData)
    myJob = PlayerData.job.name
end)
```

### HexaCore:Client:OnJobUpdate

ยิงเมื่ออาชีพของผู้เล่นเปลี่ยน

### HexaCore:Notify

แสดงการแจ้งเตือนที่ผู้เล่น

```lua
TriggerEvent('HexaCore:Notify', { text = 'สวัสดี', type = 'success' })
```

::: warning
ห้าม resource อื่น `RegisterNetEvent('HexaCore:Notify')` ทับเอง — core เป็นเจ้าของ event นี้และจะส่งต่อไประบบ notify ให้เอง
:::

### HexaCore:Client:UseItem

ยิงเมื่อผู้เล่นใช้ไอเทมที่มี client-side handler

### HexaCore:Client:UpdateNeeds

ยิงเมื่อค่าหิว/กระหายเปลี่ยน

### HexaCore:Client:SpawnPlayer

สั่ง spawn ตัวละครที่ตำแหน่ง พร้อมเลือด/เพศ (ใช้ภายในระบบ spawn)

## Server Events

::: danger ห้าม trigger event ฝั่ง server ของ core จากสคริปต์ของคุณเอง
event ภายใน เช่น การโหลด/เซฟผู้เล่น ถูกออกแบบให้ core เรียกเองเท่านั้น — การยิงจากภายนอกอาจทำให้ข้อมูลผู้เล่นเสียหาย ใช้ [Server Functions](/api/server-functions) แทนเสมอ
:::

event ที่ core ยิงให้ resource อื่นฟังได้:

| Event | จังหวะที่ยิง |
| --- | --- |
| `HexaCore:Server:OnPlayerLoaded` | ผู้เล่นโหลดตัวละครเสร็จ (ฝั่ง server) |
| `HexaCore:Server:OnPlayerUnload` | ผู้เล่นออกจากตัวละคร |
| `hexa_log:server:CreateLog` | ระบบ log กลาง — resource อื่นยิงเพื่อส่ง log เข้าช่องทางที่ตั้งไว้ |

ตัวอย่างการส่ง log:

```lua
TriggerEvent('hexa_log:server:CreateLog',
    'shop',                 -- webhook/channel
    'Item Purchased',       -- หัวข้อ
    'green',                -- สี
    ('%s ซื้อ %s'):format(GetPlayerName(src), itemName)
)
```

## DrawText Events (client)

```lua
TriggerEvent('hexa_core:client:DrawText', 'กด [E] เพื่อเปิดร้าน', 'left')
TriggerEvent('hexa_core:client:ChangeText', 'ข้อความใหม่', 'left')
TriggerEvent('hexa_core:client:HideText')
TriggerEvent('hexa_core:client:KeyPressed')
```
