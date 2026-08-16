# Player Methods

เมธอดทั้งหมดของ [Player object](/guide/player-object) เรียกผ่าน `Player.Functions.*` (ฝั่ง server)

```lua
local Player = HexaCore.Functions.GetPlayer(source)
if not Player then return end
```

## เงิน

### AddMoney

```lua
Player.Functions.AddMoney(moneytype, amount, reason)
-- Player.Functions.AddMoney('cash', 100, 'รางวัลภารกิจ')
```

### RemoveMoney

```lua
local ok = Player.Functions.RemoveMoney(moneytype, amount, reason)
```

คืน `false` เมื่อยอดไม่พอ (เงินประเภทห้ามติดลบ) — เช็คผลลัพธ์ก่อนแจกของเสมอ

### SetMoney / GetMoney

```lua
Player.Functions.SetMoney('bank', 1000)
local bank = Player.Functions.GetMoney('bank')
```

## ไอเทม

### AddItem / RemoveItem

```lua
Player.Functions.AddItem(itemName, amount, slot, info)
Player.Functions.RemoveItem(itemName, amount, slot)
```

### GetItemByName / GetItemsByName / GetItemBySlot

```lua
local item  = Player.Functions.GetItemByName('bread')   -- ชิ้นแรกที่เจอ
local items = Player.Functions.GetItemsByName('bread')  -- ทุกชิ้น
local item  = Player.Functions.GetItemBySlot(5)
```

### HasItem

```lua
local has = Player.Functions.HasItem('bread', 2)
```

### GetTotalWeight

```lua
local weight = Player.Functions.GetTotalWeight()
```

## อาชีพ

### SetJob

```lua
Player.Functions.SetJob('police', 2) -- อาชีพ + เกรด
```

### SetJobDuty

```lua
Player.Functions.SetJobDuty(true)
```

## ข้อมูล / Metadata

### SetPlayerData / UpdatePlayerData

```lua
Player.Functions.SetPlayerData('charinfo', newCharinfo)
Player.Functions.UpdatePlayerData() -- sync ไป client
```

### SetMetaData / GetMetaData

```lua
Player.Functions.SetMetaData('hunger', 80)
local hunger = Player.Functions.GetMetaData('hunger')
```

## ชื่อเสียง (Reputation)

```lua
Player.Functions.AddRep('hunting', 5)
Player.Functions.RemoveRep('hunting', 2)
local rep = Player.Functions.GetRep('hunting')
```

## จัดการตัวละคร

```lua
Player.Functions.Save()    -- เซฟลงฐานข้อมูลทันที
Player.Functions.Logout()  -- ออกจากตัวละคร (กลับหน้าเลือกตัวละคร)
```

## ขยาย object

```lua
Player.Functions.AddMethod(methodName, handler)
Player.Functions.AddField(fieldName, data)
```

## State Bags

```lua
Player.Functions.InitializeStateBags()
Player.Functions.PersistStateBags()
```

ใช้ sync ข้อมูลผู้เล่นผ่าน state bag ของ FXServer ให้ resource อื่นอ่านได้โดยไม่ต้องยิง event
