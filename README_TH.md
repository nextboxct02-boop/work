# เว็บ “อัพเดตลูกค้า” สำหรับใช้งานส่วนตัวกับ Google Sheet กลาง

โปรเจกต์นี้เป็นเว็บ Static (HTML/CSS/JS) วางบน **GitHub Pages** ได้โดยไม่ต้องมี Server และไม่ต้องเก็บ Client Secret

## หลักการที่ออกแบบมาเพื่อชีตที่มีหลายคนใช้

1. หน้าเว็บ **ไม่ sort / ไม่ย้าย / ไม่เพิ่ม / ไม่ลบแถว** ใน Google Sheet
2. ตอนเข้าเว็บจะขอสิทธิ์ **อ่านอย่างเดียว** ก่อน
3. ต้องกด “เปิดโหมดแก้ไข” จึงขอสิทธิ์เขียนเพิ่ม
4. ก่อนบันทึก เว็บจะอ่านข้อมูลล่าสุดใหม่เพื่อหาแถวลูกค้าเดิม
5. เว็บตรวจว่าช่องที่กำลังจะแก้ยังไม่ถูกคนอื่นเปลี่ยนหลังจากเราเปิดรายการ
6. ถ้าพบการชน ระบบ **หยุดบันทึก** แทนการเขียนทับ
7. ตอนเขียนจะส่งเฉพาะเซลล์ที่เปลี่ยน เช่น `S44`, `W44`, `AE44` ไม่เขียนทับทั้งแถว
8. ชื่อ/เบอร์/สินค้า/ชื่อเพจถูกล็อกบนเว็บ เพื่อใช้เป็น fingerprint หาแถวหลังมีการแทรกแถว

> หมายเหตุ: Google Sheets API ไม่มี compare-and-swap แบบฐานข้อมูล จึงไม่มีวิธี client-side ที่รับประกัน atomic 100% หากอีกคน “แทรกแถว” ในเสี้ยววินาทีระหว่างการตรวจและเขียน แต่โครงสร้างนี้ลดความเสี่ยงมาก และเมื่อหาแถวไม่ชัดเจนจะไม่บันทึก

## ตั้งค่า Google OAuth (ทำครั้งเดียว)

1. เข้า Google Cloud Console
2. สร้าง Project ใหม่ เช่น `personal-sheet-view`
3. Enable **Google Sheets API**
4. ตั้งค่า **OAuth consent screen**
   - ถ้าใช้คนเดียว สามารถตั้งเป็น Testing และเพิ่ม Gmail ของคุณเป็น Test user
5. สร้าง Credentials → **OAuth client ID** → Web application
6. ใส่ Authorized JavaScript origins:
   - ตอนทดสอบ: `http://localhost:8000`
   - GitHub Pages: `https://YOUR_GITHUB_USERNAME.github.io`
7. คัดลอก Client ID มาใส่ `config.js`

ตัวอย่าง:

```js
window.APP_CONFIG = {
  GOOGLE_CLIENT_ID: "123456789-xxxx.apps.googleusercontent.com",
  SPREADSHEET_ID: "16xvGG79nem8PeHA2ED2G_-8ENEP7KMzq0Mp4zKelGT8",
  SHEET_NAME: "อัพเดตลูกค้า",
  SHEET_GID: "91690945",
  DATA_START_ROW: 6,
  ALLOWED_EMAILS: ["yourname@gmail.com"],
};
```

**ห้ามใส่ OAuth Client Secret ใน GitHub หรือ JavaScript เด็ดขาด**

## ทดลองบนเครื่อง

ในโฟลเดอร์โปรเจกต์:

```bash
python -m http.server 8000
```

จากนั้นเปิด `http://localhost:8000`

ห้ามเปิด `index.html` ด้วย `file://` เพราะ Google OAuth ต้องใช้ web origin

## Deploy GitHub Pages

1. สร้าง Repository ใหม่
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้
3. Repository → Settings → Pages
4. Deploy from branch → `main` / root
5. เปิด URL ที่ GitHub ให้มา
6. กลับไป Google Cloud OAuth แล้วเพิ่ม origin `https://YOUR_GITHUB_USERNAME.github.io`

## สิทธิ์ Google Sheet

เว็บไม่ได้แชร์ชีตเพิ่มให้ใคร และไม่ได้ใช้ Service Account

คนที่ล็อกอินจะทำได้ตามสิทธิ์ของ Google Account นั้นต่อ Spreadsheet เดิมอยู่แล้ว ดังนั้นถ้าบัญชีไม่มีสิทธิ์แก้ Sheet ถึงเว็บขอ scope เขียน API ก็ยังเขียนไม่ได้

## ข้อมูลจริงไม่ถูกฝังใน Repository

โปรเจกต์นี้มีแค่ข้อมูล Demo ปลอมเพื่อดูหน้าตา ข้อมูลลูกค้าจริงจะโหลดจาก Google Sheets API หลัง Login เท่านั้น
