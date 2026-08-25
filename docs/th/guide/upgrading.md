# อัปเกรดจาก 2.x ไป 3.0

เวอร์ชัน 3.0 แบน API ให้เหลือชั้นเดียว `Core.Functions.GetPlayer(source)` กลายเป็น `Core.GetPlayer(source)`
`Player.Functions.AddMoney(...)` กลายเป็น `Player.AddMoney(...)` และมีฟังก์ชันอีกชุดใหญ่ถูกเปลี่ยนชื่อ
ให้ตรงกับสิ่งที่มันทำจริง

**อัปเดตวันนี้เซิร์ฟไม่พัง** ชื่อเก่าทุกตัวที่อยู่ในหน้านี้ยังเรียกได้ ยังส่งต่อไปฟังก์ชันจริง และคืนค่าเหมือนเดิมทุกอย่าง
สิ่งเดียวที่เปลี่ยนในวันแรกคือมีข้อความเตือนขึ้นในคอนโซล

## วันแรกไม่มีอะไรพัง

`hexa_core` โหลด `server/compat.lua` กับ `client/compat.lua` เป็นไฟล์สุดท้าย หลังฟังก์ชันจริงมีครบแล้ว
แล้วผูก alias ให้ชื่อเก่าทุกตัว เรียกชื่อเก่าก็ส่งต่อให้ปกติ พร้อมพิมพ์เตือนหนึ่งบรรทัด

```
[hexa_core] [WARN] my_resource calls Core.GetSource which was renamed to Core.GetSourceByIdentifier - update the call, the old name goes away next release
```

สามเรื่องที่ต้องรู้เกี่ยวกับข้อความเตือนนี้

- มันบอกชื่อ resource ที่เป็นคนเรียก (อ่านจาก `GetInvokingResource()`) จึงรู้ทันทีว่าต้องไปเปิดไฟล์ของ resource ไหน
  ถ้าการเรียกไม่ได้ข้าม resource จะขึ้นว่า `unknown resource`
- มันพิมพ์ **ครั้งเดียวต่อหนึ่งชื่อ** ตลอดอายุ resource ต่อให้เรียกวันละล้านครั้งก็ได้บรรทัดเดียว
  ตัวที่ทำงานนี้คือ `Hexa.WarnOnce` ใน `shared/log.lua`
- มันเป็นแค่ warning ไม่ใช่ error ค่าที่คืนกลับมาคือค่าจริงจากฟังก์ชันใหม่

::: warning
ชั้น alias นี้มีอายุแค่หนึ่งรุ่น ให้ถือว่าทุกบรรทัดเตือนในคอนโซลคือรายการงานที่ต้องเคลียร์
รุ่นถัดไปของ `hexa_core` จะลบ `compat.lua` ทิ้ง แล้วจุดเรียกเหล่านั้นจะกลายเป็น `attempt to call a nil value`
:::

### ชั้น `.Functions` ยังเป็นตารางจริง

`Core.Functions` และ `Player.Functions` ไม่ได้ถูกแทนด้วย proxy ที่มีแค่ `__index` มันยังเป็นตารางจริงที่มีสมาชิกอยู่จริง
และฟังก์ชันทุกตัวที่แขวนบน `Core` หรือบนอ็อบเจกต์ผู้เล่นจะถูกมิเรอร์ลงไปให้อัตโนมัติ

```lua
local Core = exports['hexa_core']:GetCoreObject()

-- สองบรรทัดนี้ชี้ฟังก์ชันตัวเดียวกัน
local a = Core.GetPlayer
local b = Core.Functions.GetPlayer
```

เรื่องนี้สำคัญเพราะ bridge ยกฟังก์ชันไปด้วย `pairs()` ไม่ได้ index ทีละตัว
ถ้าเป็น proxy เปล่ามันจะยกได้ศูนย์ตัว แล้วสคริปต์ที่พอร์ตมาทั้งเซิร์ฟจะตายเงียบ

## หน้าตาแบบใหม่

```lua
-- 2.x
local Core = exports['hexa_core']:GetCoreObject()
local Player = Core.Functions.GetPlayer(source)
Player.Functions.AddMoney('cash', 100, 'reward')
```

```lua
-- 3.0
local Core = exports['hexa_core']:GetCoreObject()
local Player = Core.GetPlayer(source)
Player.AddMoney('cash', 100, 'reward')
```

`HexaCore` กับ `Core` คือตารางเดียวกันทั้งสองฝั่ง โค้ดที่เขียน `HexaCore.GetPlayer(source)` อยู่แล้วไม่ต้องแก้เลย

## ตารางเปลี่ยนชื่อ: Core ฝั่ง server

ทุกแถวข้างล่างมี alias ใช้งานได้จริงอยู่ใน `server/compat.lua`

| ชื่อเดิม | ชื่อใหม่ |
| --- | --- |
| `Core.GetSource` | `Core.GetSourceByIdentifier` |
| `Core.GetHexaPlayers` | `Core.GetPlayerObjects` |
| `Core.CanUseItem` | `Core.GetUsableItem` |
| `Core.GetPermission` | `Core.GetPermissions` |
| `Core.IsOptin` | `Core.IsAdminAlertsEnabled` |
| `Core.ToggleOptin` | `Core.ToggleAdminAlerts` |
| `Core.ChangeWeight` | `Core.SetMaxWeight` |
| `Core.ChangeSlots` | `Core.SetMaxSlots` |
| `Core.AddPlayerMethod` | `Core.SetPlayerField` |
| `Core.AddPlayerField` | `Core.SetPlayerField` |
| `Core.SetMethod` | `Core.SetField` |
| `Core.CreateFingerId` | `Core.CreateFingerprint` |
| `Core.CreateSerialNumber` | `Core.CreatePhoneSerial` |

`AddPlayerMethod` กับ `AddPlayerField` ยุบเหลือตัวเดียว เพราะหลังจากแบนชั้น `.Functions` ทิ้ง ทั้งสองตัวเขียนลงช่องเดียวกันแล้ว
`SetMethod` กับ `SetField` ก็ด้วยเหตุผลเดียวกัน

## ตารางเปลี่ยนชื่อ: เนมสเปซ `Core.Player` ที่ถูกยุบ

เนมสเปซ `HexaCore.Player.*` ฝั่ง server หายไปแล้ว ฟังก์ชันในนั้นย้ายขึ้นมาอยู่บน `Core` โดยตรง
และหกตัวที่ชื่อจะไปชนกับเมธอดของอ็อบเจกต์ผู้เล่นถูกเติมนามให้แยกออกจากกัน

| ชื่อเดิม | ชื่อใหม่ |
| --- | --- |
| `Core.Player.Login` | `Core.LoginPlayer` |
| `Core.Player.Logout` | `Core.LogoutPlayer` |
| `Core.Player.Save` | `Core.SavePlayer` |
| `Core.Player.SaveOffline` | `Core.SaveOfflinePlayer` |
| `Core.Player.CheckPlayerData` | `Core.LoadPlayer` |
| `Core.Player.GetOfflinePlayer` | `Core.GetOfflinePlayerByCitizenId` |

ที่เหลือใช้ชื่อเดิมทุกตัว แค่เลื่อนขึ้นมาอีกชั้น

| ชื่อเดิม | ชื่อใหม่ |
| --- | --- |
| `Core.Player.CreatePlayer` | `Core.CreatePlayer` |
| `Core.Player.DeleteCharacter` | `Core.DeleteCharacter` |
| `Core.Player.ForceDeleteCharacter` | `Core.ForceDeleteCharacter` |
| `Core.Player.CreateCitizenId` | `Core.CreateCitizenId` |
| `Core.Player.CreateWalletId` | `Core.CreateWalletId` |
| `Core.Player.CreateAccountNumber` | `Core.CreateAccountNumber` |
| `Core.Player.SaveInventory` | `Core.SaveInventory` |
| `Core.Player.SaveOfflineInventory` | `Core.SaveOfflineInventory` |

ตาราง compatibility จะเติมฟังก์ชันทุกตัวที่มีบน `Core` ตอนบูตเป็นสมาชิกจริง แล้วผูกหกชื่อ lifecycle
เดิมทับลงไป ทำให้ `pairs(Core.Player)` มองเห็นสมาชิกและ bridge mirror namespace ได้ ส่วน `__index`
ยังเป็น fallback สำหรับฟังก์ชันที่เพิ่มบน `Core` ภายหลัง ถ้าตรงกับหกชื่อข้างบนก็แมปให้ ไม่ตรงก็หา
ชื่อเดียวกันบน `Core` ดังนั้น `Core.Player.CreateCitizenId()` ยังทำงานได้ แม้โค้ดใหม่ควรเรียกชื่อแบบแบน

```lua
-- 2.x
Core.Player.Save(source)
Core.Player.CheckPlayerData(source, data)

-- 3.0
Core.SavePlayer(source)
Core.LoadPlayer(source, data)
```

## ตารางเปลี่ยนชื่อ: Core ฝั่ง client

ชุดนี้ถูกเปลี่ยนชื่อเพราะชื่อเดิมทำให้เข้าใจผิดว่าเป็นของฝั่ง server
`GetPlayers` ฝั่ง client คืน **client player index** ไม่ใช่ server id
สคริปต์ที่เอาสองอย่างนี้มาปนกันคือส่งเลขมั่วข้ามไปฝั่ง server ชื่อใหม่มีคำว่า Local เพื่อให้เห็นความต่างตั้งแต่ตรงจุดที่เรียก

| ชื่อเดิม | ชื่อใหม่ |
| --- | --- |
| `Core.GetPlayers` | `Core.GetLocalPlayers` |
| `Core.GetPlayersFromCoords` | `Core.GetLocalPlayersInRadius` |
| `Core.GetClosestPlayer` | `Core.GetClosestLocalPlayer` |
| `Core.CreateClientCallback` | `Core.CreateCallback` |
| `Core.LookAtEntity` | `Core.TurnPedToFaceEntity` |
| `Core.RequestAnimDict` | `Core.LoadAnimDict` |
| `Core.LoadParticleDictionary` | `Core.LoadPtfxAsset` |
| `Core.AttachProp` | `Core.CreateAttachedProp` |
| `Core.SpawnClear` | `Core.IsAreaClearOfVehicles` |
| `Core.GetStreetNametAtCoords` | `Core.GetStreetNamesAtCoords` |
| `Core.GetCurrentTime` | `Core.GetInGameTime` |
| `Core.GetGroundZCoord` | `Core.GetGroundCoords` |
| `Core.GetGroundHash` | `Core.GetGroundMaterial` |

::: danger มี GetPlayers ทั้งสองฝั่ง
`Core.GetPlayers()` ฝั่ง **server** ไม่ได้เปลี่ยนชื่อ และยังคืน server id เหมือนเดิม ตัวที่ย้ายคือฝั่ง client เท่านั้น
ถ้าไฟล์ไหนใช้ร่วมกันสองฝั่ง ให้เช็คก่อนว่ากำลังอยู่ฝั่งไหน
:::

`GetStreetNametAtCoords` คือชื่อที่พิมพ์ตกมาตั้งแต่แรกและอยู่มาหลายปี ชื่อที่ถูกคือ `GetStreetNamesAtCoords`

## ตารางเปลี่ยนชื่อ: อ็อบเจกต์ผู้เล่น

| ชื่อเดิม | ชื่อใหม่ |
| --- | --- |
| `Player.UpdatePlayerData` | `Player.SyncPlayerData` |
| `Player.PersistStateBags` | `Player.PullStateBags` |
| `Player.InitializeStateBags` | `Player.PushStateBags` |
| `Player.AddMethod` | `Player.SetField` |
| `Player.AddField` | `Player.SetField` |

`UpdatePlayerData` ไม่เคยแก้ข้อมูลอะไรเลย มันแค่กระจาย `PlayerData` ปัจจุบันไปให้ client เจ้าของตัวละครและตัวรับฝั่ง server
ซึ่งตรงกับชื่อ `SyncPlayerData` มากกว่า

คู่ state bag เปลี่ยนชื่อตามทิศทางการไหลของข้อมูล `PullStateBags` ดึงค่า `hunger` `thirst` `cleanliness` `stress`
และ `health` จาก state bag เข้ามาเก็บใน metadata (ทำงานก่อนเซฟ) ส่วน `PushStateBags` เขียน metadata กลับลง state bag
(ทำงานตอนสร้างตัวละคร)

::: warning สามตัวนี้ไม่มี alias ให้
`AddMethod` กับ `AddField` เป็น alias ตรง ๆ ของ `SetField` บนอ็อบเจกต์ผู้เล่น และไม่เตือนอะไรเลย
แต่อีกสามตัวคือ `UpdatePlayerData` `PersistStateBags` `InitializeStateBags` **ไม่มี** อยู่ในชั้น compat
มันหายไปแล้ววันนี้ ไม่ใช่รุ่นหน้า ให้ grep หาก่อนอัปเดต
:::

## ตารางเปลี่ยนชื่อ: ระบบ log

| ชื่อเดิม | ชื่อใหม่ |
| --- | --- |
| `Core.Debug` (พิมพ์หนึ่งบรรทัด) | `Core.PrintDebug` |
| `Core.Debug` (พิมพ์ตาราง) | `Core.DumpTable` |

`Core.Debug` เดิมทำคนละหน้าที่กันสองฝั่ง ฝั่ง client รับ `(resource, obj, depth)` แล้วพิมพ์ตาราง
ฝั่ง server รับ `(tbl, indent)` ตอนนี้แยกเป็นสองฟังก์ชันที่ทำงานอย่างเดียวชัดเจน และเหมือนกันเป๊ะทั้งสองฝั่ง

```lua
Core.Log('vehicle %s spawned for %s', plate, GetPlayerName(source))
Core.Warn('shop %s has no stock table', shopId)
Core.Error('save failed for citizenid %s', citizenid)
Core.PrintDebug('tick %d, %d peds tracked', tick, count)
Core.DumpTable(Player.PlayerData)
```

ทั้งห้าตัวเป็นแบบ printf และรับอาร์กิวเมนต์เหมือนกันทั้ง client และ server
`Core.PrintDebug` ผูกกับ `Config.Debug` และเช็คสวิตช์ **ก่อน** จะฟอร์แมตสตริง
ทิ้งบรรทัด debug ไว้ในโค้ดที่ขึ้นเซิร์ฟจริงจึงไม่เสียค่าอะไรเลยตราบใดที่สวิตช์ปิดอยู่

::: tip ข้อความ log เป็นอังกฤษโดยตั้งใจ
ข้อความ log ทุกบรรทัดใน `hexa_core` เป็นภาษาอังกฤษล้วน เพราะคอนโซลของเซิร์ฟบางตัวแสดงตัวไทยเพี้ยน
และคนไล่ log ต้องกวาดตาเร็ว ส่วนคอมเมนต์ในโค้ดกับข้อความที่ผู้เล่นเห็นยังเป็นไทยเหมือนเดิม
:::

ฝั่ง client ยังเหลือ alias ชื่อ `Core.Debug` ที่ดูชนิดของอาร์กิวเมนต์แล้วเดาให้ว่าจะเรียก `PrintDebug` หรือ `DumpTable`
แต่ฝั่ง server ไม่มี `Core.Debug` ฝั่ง server หายไปแล้ว

## แยกให้ขาด: คำกริยาของแคตตาล็อก กับ คำกริยาของผู้เล่น

นี่คือเรื่องสำคัญที่สุดของ 3.0 ใน 2.x คำว่า `AddItem` แปลได้สองความหมายที่ตรงข้ามกัน ขึ้นกับว่าเรียกบนอะไร

- `Core.AddItem('golden_ring', {...})` คือลงทะเบียน **ชนิดของไอเทม** เข้าแคตตาล็อกกลางของเซิร์ฟ
- `Player.AddItem('golden_ring', 1)` คือใส่ไอเทมลงกระเป๋าของ **ผู้เล่นคนหนึ่ง**

คำกริยาเดียวกันแต่คนละงานกันคนละเรื่อง แถมรูปแบบอาร์กิวเมนต์ใกล้กันพอที่เรียกผิดแล้วจะเงียบไม่ฟ้อง
3.0 แยกสองอย่างนี้ออกจากกัน งานแคตตาล็อกใช้ `Register` / `Unregister` / `Update...Definition`
ส่วนงานของผู้เล่นยังเป็น `Add` / `Remove` เหมือนเดิม

| งาน | 2.x | 3.0 |
| --- | --- | --- |
| ลงทะเบียนชนิดไอเทม | `Core.AddItem` | `Core.RegisterItem` |
| ลงทะเบียนไอเทมหลายชนิด | `Core.AddItems` | `Core.RegisterItems` |
| แก้ข้อมูลชนิดไอเทม | `Core.UpdateItem` | `Core.UpdateItemDefinition` |
| ลบชนิดไอเทม | `Core.RemoveItem` | `Core.UnregisterItem` |
| ลงทะเบียนอาชีพ | `Core.AddJob` | `Core.RegisterJob` |
| ลงทะเบียนอาชีพหลายตัว | `Core.AddJobs` | `Core.RegisterJobs` |
| แก้ข้อมูลอาชีพ | `Core.UpdateJob` | `Core.UpdateJobDefinition` |
| ลบอาชีพ | `Core.RemoveJob` | `Core.UnregisterJob` |
| ให้ไอเทมกับผู้เล่น | `Player.Functions.AddItem` | `Player.AddItem` |
| เอาไอเทมออกจากผู้เล่น | `Player.Functions.RemoveItem` | `Player.RemoveItem` |

ก่อน

```lua
-- 2.x: สองบรรทัดนี้ชื่อ AddItem เหมือนกัน
Core.AddItem('golden_ring', { name = 'golden_ring', label = 'Golden Ring', weight = 100 })
local Player = Core.Functions.GetPlayer(source)
Player.Functions.AddItem('golden_ring', 1)
```

หลัง

```lua
-- 3.0: คำกริยาของแคตตาล็อกกับของผู้เล่นไม่หน้าตาเหมือนกันอีกแล้ว
Core.RegisterItem('golden_ring', { name = 'golden_ring', label = 'Golden Ring', weight = 100 })
local Player = Core.GetPlayer(source)
Player.AddItem('golden_ring', 1)
```

::: danger ดูที่ตัวรับ ไม่ใช่ดูที่คำกริยา
`Core.RegisterItem` เปลี่ยนว่าไอเทมนั้น *คืออะไร* สำหรับทุกคนบนเซิร์ฟ
ส่วน `Player.AddItem` เปลี่ยนว่าตัวละครหนึ่งตัว *ถืออะไรอยู่*
ถ้าระหว่างย้ายโค้ดแล้วไม่แน่ใจว่าบรรทัดไหนหมายถึงอันไหน ให้ดูว่ามันถูกเรียกบนอะไร
:::

`Core.RegisterItem` คืน `true, 'success'` หรือคืน `false` พร้อมเหตุผลเป็นสตริง เช่น `'item_exists'`
หรือ `'invalid_item_name'` ส่วน `Core.RegisterItems` คืนค่าที่สามเป็นรายการที่มีปัญหาด้วย

## export ที่เก็บไว้ถาวร

ชั้น export คือที่เดียวที่คำกริยาเดิมอยู่ต่อไปแบบถาวร เพราะสคริปต์ที่พอร์ตมาเรียก
`exports['hexa_core']:AddItem(...)` กับแคตตาล็อกกันหมด และการไล่แก้ทุกตัวไม่คุ้ม

```lua
-- สองบรรทัดนี้ใช้ได้ตลอดไป ไม่มีเตือน
exports['hexa_core']:AddItem('golden_ring', itemData)
exports['hexa_core']:RemoveItem('golden_ring')
```

รายการ export ถาวรฝั่ง server ทั้งหมด

| Export | ทำอะไร |
| --- | --- |
| `GetCoreObject` | คืนตาราง `Core` |
| `AddItem` / `AddItems` | ลงทะเบียนชนิดไอเทม |
| `UpdateItem` / `RemoveItem` | แก้หรือลบชนิดไอเทม |
| `AddJob` / `AddJobs` | ลงทะเบียนอาชีพ |
| `UpdateJob` / `RemoveJob` | แก้หรือลบอาชีพ |
| `SetField` / `SetMethod` | แขวนฟิลด์หรือฟังก์ชันเพิ่มบน `Core` |
| `GetCoreVersion` | อ่านค่า `version` จาก metadata ของ `hexa_core` |
| `ExploitBan` | เตะผู้เล่นออกและบันทึก log หมวด anticheat |

::: warning export กับเมธอดบน Core คนละชั้นกัน
`exports['hexa_core']:AddItem` อยู่ถาวร แต่ `Core.AddItem` เป็น alias ที่จะหายไปในรุ่นหน้า
ถ้าโค้ดของคุณถือ core object อยู่แล้ว ให้ใช้ `Core.RegisterItem`
:::

## ชื่อที่ไม่ได้เปลี่ยน

อย่าไปไล่ "ย้าย" ชุดนี้ มันเหมือนเดิมทุกตัวใน 3.0 แค่ตื้นขึ้นมาหนึ่งชั้น

**Core ฝั่ง server:** `GetPlayer`, `GetPlayers`, `GetPlayerByCitizenId`, `GetPlayerByLicense`,
`GetPlayerByAccount`, `GetPlayerByCharInfo`, `GetPlayersOnDuty`, `GetDutyCount`, `GetIdentifier`,
`Notify`, `HasPermission`, `AddPermission`, `RemovePermission`, `CreateCallback`, `TriggerCallback`,
`CreateUseableItem`, `UseItem`, `HasItem`, `CanCarryItem`, `Kick`, `GetCoords`, `SpawnVehicle`,
`CreateVehicle`, `GetClosestPlayer`, `GetClosestPed`, `GetClosestVehicle`, `GetClosestObject`,
`SetPlayerBucket`, `SetEntityBucket`, `GetPlayersInBucket`, `GetEntitiesInBucket`, `GetBucketObjects`,
`Commands.Add`, `Commands.Refresh`

**Core ฝั่ง client:** `GetPlayerData`, `GetCoords`, `HasItem`, `TriggerCallback`,
`PlayAnim`, `DrawText`, `DrawText3D`, `SpawnVehicle`, `DeleteVehicle`, `GetPlate`, `GetVehicleLabel`,
`GetVehicleProperties`, `SetVehicleProperties`, `GetPeds`, `GetVehicles`, `GetObjects`,
`GetClosestPed`, `GetClosestVehicle`, `GetClosestObject`, `GetZoneAtCoords`, `GetCardinalDirection`

**อ็อบเจกต์ผู้เล่น:** `AddMoney`, `RemoveMoney`, `SetMoney`, `GetMoney`, `SetJob`, `SetJobDuty`,
`SetMetaData`, `GetMetaData`, `SetPlayerData`, `AddItem`, `RemoveItem`, `GetItemBySlot`, `GetItemByName`,
`GetItemsByName`, `GetTotalWeight`, `HasItem`, `Save`, `Logout`

ชื่อ event ก็ไม่เปลี่ยนเช่นกัน `HexaCore:Server:PlayerLoaded`, `HexaCore:Client:OnPlayerUnload`,
`HexaCore:Player:SetPlayerData`, `HexaCore:Server:OnJobUpdate` และตัวอื่น ๆ ยังเหมือนเดิมทั้งหมด

## สิ่งที่หายไปจริง ๆ

### client ไม่ได้เป็นเจ้าของรอบเซฟอีกแล้ว

ใน 2.x `client/loops.lua` เป็นคนนับเวลาแล้วยิง `HexaCore:UpdatePlayer` เข้ามาที่ server
แปลว่า client ที่ไม่ยิงก็ไม่มีวันถูกเซฟ ส่วน client ที่ยิงรัว ๆ ก็ถล่ม MySQL ได้

ตอนนี้รอบเวลาอยู่ที่ `server/save.lua` และ client ไม่มีสิทธิ์สั่งอะไรเลย `HexaCore:UpdatePlayer` ถูกลงทะเบียนด้วย
`AddEventHandler` **ไม่ใช่** `RegisterNetEvent` client จึงยิงถึงไม่ได้แล้ว ที่ยังเก็บไว้ก็เพื่อให้
bridge ส่งคำขอเซฟจากฝั่ง server ต่อเข้ามาได้ และเส้นทางนั้นก็ยังติดคูลดาวน์ 30 วินาทีต่อผู้เล่นหนึ่งคน

```lua
-- 2.x เรียกจากสคริปต์ฝั่ง client แบบนี้ ทำไม่ได้อีกแล้ว
TriggerServerEvent('HexaCore:UpdatePlayer')

-- 3.0 เรียกจากโค้ดฝั่ง server
local Player = Core.GetPlayer(source)
Player.Save()
```

### เมธอดระบบชื่อเสียง

`Player.AddRep` `Player.RemoveRep` และ `Player.GetRep` กำลังจะถูกถอด `server/compat.lua` ระบุไว้ว่าทั้งสามตัวถูกถอดแล้ว
และเตรียมตัวแทนที่คืนค่าว่างที่ปลอดภัย (`false`, `false`, `0`) ไว้ให้ แทนที่จะแกล้งทำเป็นว่ามีระบบชื่อเสียงอยู่จริง
อย่าเขียนของใหม่บนสามตัวนี้ และอย่าอ่าน `metadata.rep` จาก resource ใหม่

### `Core.Debug` ฝั่ง server

ถูกแยกเป็น `Core.PrintDebug` กับ `Core.DumpTable` และไม่มี alias ฝั่ง server ให้
ดูรายละเอียดที่หัวข้อ "ตารางเปลี่ยนชื่อ: ระบบ log" ด้านบน

## ของใหม่ใน 3.0 ที่ควรเอาไปใช้

### การเซฟเป็นรอบกวาดฝั่ง server พร้อมธง dirty

```lua
Config.Save.Interval = 45         -- กี่นาทีต่อการกวาดหนึ่งรอบ ต่ำสุด 1
Config.Save.SpreadSeconds = 60    -- เกลี่ยการเขียนของแต่ละคนให้กระจายภายในกี่วินาที
Config.Save.OnDrop = true         -- ผู้เล่นที่หลุดจะถูกเขียนลงทันที
Config.Save.OnResourceStop = true -- เขียนทุกคนลงให้ครบก่อน resource หยุด
```

การกวาดแต่ละรอบเก็บเฉพาะคนที่ธง `Dirty` ถูกตั้งไว้ แล้วทยอยเขียนกระจายภายใน `SpreadSeconds`
เพื่อไม่ให้เซิร์ฟเต็ม ๆ ยิง MySQL 48 ครั้งในติกเดียว เมธอดที่แก้ข้อมูลผู้เล่นทุกตัวตั้งธงนี้ให้เองอยู่แล้ว

ถ้า resource ของคุณแก้ข้อมูลผู้เล่นผ่านทางที่ core มองไม่เห็น ให้บังคับดันคนนั้นเข้ารอบกวาดถัดไปเอง

```lua
local Player = Core.GetPlayer(source)
Player.MarkDirty()
```

`Core.SaveAllPlayers()` เขียนทุกคนลงเดี๋ยวนี้แบบไม่เกลี่ยเวลา และคืนจำนวนคนที่เซฟไป
มันคือตัวที่ตัวรับ `onResourceStop` เรียกใช้ ให้เรียกเองเฉพาะตอนที่รอรอบกวาดไม่ได้จริง ๆ

ชื่อเดิม `Config.UpdateInterval` ยังอ่านค่าได้อยู่ เพราะ `config/save.lua` เซ็ตค่าให้จาก `Config.Save.Interval`

### log มีปลายทางแล้ว

`hexa_log:server:CreateLog` ถูกยิงจาก 23 จุดใน 4 resource แต่ไม่เคยมีใครลงทะเบียนรับ log ทั้งหมดจึงหายเงียบ
ทั้งคนเข้าออก การลบตัวละคร และการแจ้งเตือน anticheat

ตอนนี้ `hexa_core` รับ event นี้เอง พิมพ์ลงคอนโซล และส่งต่อ Discord ให้ถ้าตั้ง webhook ไว้

```lua
Config.Log.Enabled = true

Config.Log.Webhooks = {
    default   = '',
    joinleave = '',
    anticheat = '',
}
```

webhook ถูกเลือกจากหมวดของ log ถ้าไม่มีหมวดตรงก็ตกไปที่ `default` ปล่อยเป็นสตริงว่าง = ไม่ส่ง
จุดเรียกเดิมไม่ต้องแก้อะไรเลย

```lua
TriggerEvent('hexa_log:server:CreateLog', 'anticheat', 'Anti-Cheat', 'red', message)
```

### `Player.SetGang(gang, grade)`

เป็น no-op ที่ตั้งใจให้เป็นแบบนั้น คืน `false` เสมอ เซิร์ฟนี้ไม่มีระบบแก๊ง แต่ bridge เรียกเมธอดนี้แบบไม่มีเงื่อนไข
คืน `false` ย่อมดีกว่าปล่อยให้เป็น `nil` ซึ่งเดิมทำให้ bridge พัง

### `Player.CanCarryItem(item, amount)`

เพิ่มเข้ามาเพราะคนเรียกเดาชื่อนี้กันเองแล้วหาไม่เจอ มันต่อสายไปที่ `Core.CanCarryItem(source, item, amount)`

## ขั้นตอนย้าย resource ของคุณเอง

1. **อัปเดต `hexa_core` ก่อน แล้วนั่งอ่านคอนโซล** เปิดเซิร์ฟ เล่นสักพัก ไล่ใช้ฟีเจอร์ที่ resource ของคุณเกี่ยวข้อง
   ทุกจุดเรียกชื่อเก่าที่เป็นของคุณจะพิมพ์ออกมาบรรทัดเดียวพร้อมชื่อ resource

2. **แก้ตรงที่ดึงก่อน แล้วค่อยแก้เมธอด** ส่วนใหญ่แต่ละไฟล์เปลี่ยนแค่สองบรรทัด

   ```lua
   -- ก่อน
   local Player = Core.Functions.GetPlayer(source)
   Player.Functions.AddMoney('cash', 100, 'reward')

   -- หลัง
   local Player = Core.GetPlayer(source)
   Player.AddMoney('cash', 100, 'reward')
   ```

3. **grep หา `.Functions.`** ทั้ง resource แล้วลบท่อนนั้นทิ้ง ใช้ได้กับทุกฟังก์ชันทั้งบน core object และบนอ็อบเจกต์ผู้เล่น

4. **grep หาสามตัวที่ไม่มี alias:** `UpdatePlayerData`, `PersistStateBags`, `InitializeStateBags`
   สามตัวนี้พังทันทีและไม่มีข้อความเตือนบอกให้

5. **grep หา `AddItem` กับ `RemoveItem` แล้วดูตัวรับทีละจุด** ถ้าเรียกบน `Core` คืองานแคตตาล็อก ต้องเปลี่ยนเป็น
   `RegisterItem` / `UnregisterItem` ถ้าเรียกบนอ็อบเจกต์ผู้เล่นให้คงไว้เหมือนเดิม
   ถ้าเรียกผ่าน `exports['hexa_core']` ไม่ต้องแก้ตลอดไป

6. **grep หา `GetPlayers` `GetPlayersFromCoords` `GetClosestPlayer` ฝั่ง client** เปลี่ยนชื่อให้ถูก
   แล้วถือโอกาสเช็คด้วยว่าไม่ได้เผลอส่ง client player index ข้ามไปฝั่ง server

7. **เปลี่ยน `Core.Debug`** เป็น `Core.PrintDebug` ถ้าพิมพ์บรรทัดเดียว หรือ `Core.DumpTable` ถ้าพิมพ์ตาราง

8. **เปิด `Config.Debug = true` แล้วรันอีกรอบ** ให้แน่ใจว่าไม่มีบรรทัด `[WARN]` ที่มาจาก resource ของคุณเหลืออยู่
   คอนโซลที่เงียบคือเส้นชัย

::: tip ไล่แก้ให้จบทีละ resource
ข้อความเตือนพิมพ์ครั้งเดียวต่อหนึ่งชื่อ ไม่ใช่ครั้งเดียวต่อหนึ่งจุดเรียก
resource ที่เรียก `Core.GetSource` อยู่ในหกไฟล์จะพิมพ์บรรทัดเดียว และจะพิมพ์บรรทัดนั้นต่อไปจนกว่าจะแก้ครบทั้งหก
ให้ใช้ grep นับเอง อย่าไปหวังพึ่งคอนโซล
:::
