---
layout: home

hero:
  name: "Hexa Framework"
  text: "เฟรมเวิร์กหลักสำหรับเซิร์ฟเวอร์ RedM"
  tagline: hexa_core — ระบบผู้เล่น อาชีพ ไอเทม เงิน และสถานะ ครบในตัวเดียว โครงสร้างสไตล์ ESX ที่คุ้นเคย
  actions:
    - theme: brand
      text: เริ่มต้นใช้งาน
      link: /guide/introduction
    - theme: alt
      text: API Reference
      link: /api/server-functions
    - theme: alt
      text: GitHub
      link: https://github.com/hexa-development/hexa_core

features:
  - icon: 🤠
    title: สร้างมาเพื่อ RedM โดยเฉพาะ
    details: รองรับระบบของ RDR2 เต็มรูปแบบ ทั้ง prompts, eagle eye, IPL/interiors, density และ minimap ที่ปรับแต่งแล้ว
  - icon: 🗄️
    title: ฐานข้อมูลสไตล์ ESX
    details: ตาราง users คีย์ด้วย identifier พร้อมตัวติดตั้ง schema อัตโนมัติ (install.sql) ย้ายมาจาก ESX ได้ง่าย
  - icon: 🧩
    title: Player Object ครบเครื่อง
    details: เงินหลายกระเป๋า ไอเทมพร้อมน้ำหนัก/ช่องเก็บ อาชีพและเวร metadata และ status (หิว/กระหาย) ในอ็อบเจกต์เดียว
  - icon: 📡
    title: Callbacks สองทาง
    details: TriggerCallback ระหว่าง client ↔ server พร้อมระบบ useable items และ exports ให้ resource อื่นเรียกใช้
  - icon: 🌏
    title: รองรับหลายภาษา
    details: ระบบ locale ในตัว มาพร้อมภาษาไทยและอังกฤษ เพิ่มภาษาอื่นได้ด้วยไฟล์เดียว
  - icon: 🛡️
    title: ใส่ใจความปลอดภัย
    details: ตรวจ SQL exploit, ระบบ permission หลายระดับ, routing bucket helpers และ log เหตุการณ์สำคัญอัตโนมัติ
---
