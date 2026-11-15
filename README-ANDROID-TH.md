# Spyfall Online — ทำ APK ด้วยมือถือ Android อย่างเดียว

แพ็กเกจนี้มีเกม Node.js + Socket.IO เดิม และโปรเจกต์ Android WebView สำหรับสร้าง APK ผ่าน GitHub Actions โดยไม่ต้องติดตั้ง Android Studio บนมือถือ

## สถานะตอนส่งมอบ
- ตรวจไวยากรณ์ JavaScript ด้วย `node --check` แล้ว
- เพิ่ม Android WebView project และ workflow สำหรับสร้าง APK บน GitHub Actions แล้ว
- **ยังไม่มีไฟล์ APK ที่คอมไพล์สำเร็จ** และยังไม่ได้เปิดเซิร์ฟเวอร์ออนไลน์
- การติดตั้ง APK จะยังเล่นออนไลน์ไม่ได้จนกว่าจะตั้ง URL เซิร์ฟเวอร์จริงและ build APK ใหม่
- การติดตั้ง dependency ในสภาพแวดล้อมนี้หมดเวลา จึงยังไม่ได้ทดสอบเกม end-to-end

## วิธีทำจากมือถือ

### A. สร้าง GitHub repository
1. เปิด https://github.com แล้วสมัคร/เข้าสู่ระบบ
2. กด `+` > `New repository`
3. ตั้งชื่อ `spyfall-online` เลือก `Public` หรือ `Private` แล้วกด Create repository
4. ในหน้า repository เลือก `Add file` > `Create new file`
5. ตั้งชื่อไฟล์เป็น `.github/workflows/android-apk.yml`
6. วางเนื้อหาจากไฟล์ `android-apk-workflow-phone.txt` ที่แนบในแพ็กนี้ แล้วกด Commit changes
7. กลับหน้า repository > `Add file` > `Upload files` แล้วอัปโหลดไฟล์ `spyfall-online-source.zip` จากแพ็กนี้ จากนั้น Commit changes

### B. เปิดเซิร์ฟเวอร์ออนไลน์ (Render)
1. สมัคร/เข้าสู่ระบบที่ https://render.com โดยใช้บัญชี GitHub
2. สร้าง `New` > `Web Service` และเชื่อม repository `spyfall-online`
3. ตั้งค่า Build Command เป็น:
   `mkdir -p app && unzip -oq spyfall-online-source.zip -d app && cd app && npm install`
4. ตั้งค่า Start Command เป็น:
   `cd app && npm start`
5. เลือก Free plan แล้ว Deploy
6. เมื่อ Deploy สำเร็จ จะได้ URL ลักษณะ `https://ชื่อบริการ.onrender.com` เปิด URL ต่อท้าย `/health` ต้องเห็น JSON ที่มี `"ok":true`

หมายเหตุ: Free service อาจพักเมื่อไม่มีคนใช้งาน ทำให้การเชื่อมต่อครั้งแรกช้า และอาจตัดการเชื่อมต่อระหว่างเกมได้

### C. ตั้ง URL แล้วสร้าง APK
1. ใน GitHub repository เปิด `Settings` > `Secrets and variables` > `Actions` > `Variables` > `New repository variable`
2. ตั้ง Name เป็น `SPYFALL_SERVER_URL`
3. ตั้ง Value เป็น URL จาก Render เช่น `https://ชื่อบริการ.onrender.com` (ไม่ต้องเติม `/` ท้าย)
4. กด Save
5. เปิดแท็บ `Actions` > `Build Spyfall Online APK` > `Run workflow`
6. รอให้ workflow เป็นสีเขียว แล้วเปิดผลการทำงานล่าสุด
7. ดาวน์โหลด Artifact ชื่อ `spyfall-online-debug-apk` แล้วแตก ZIP จะได้ `app-debug.apk`
8. เปิด APK บน Android เพื่อ install (อาจต้องอนุญาตติดตั้งจากแหล่งนี้)

## ข้อควรทราบ
- ห้ามแชร์ APK ที่ build ด้วย URL `YOUR-SERVER` เพราะเป็นเพียง placeholder และจะยังไม่เชื่อมเกม
- APK ที่สร้างจาก workflow เป็น debug APK สำหรับทดสอบ ไม่ใช่ release APK สำหรับเผยแพร่ Play Store
- เกมยังไม่มี voice chat ในตัว ผู้เล่นต้องพูดคุยผ่านช่องทางอื่นระหว่างเล่น
- ห้องและคะแนนเก็บในหน่วยความจำเซิร์ฟเวอร์ เมื่อ Render restart/deploy ข้อมูลห้องจะหาย
- ก่อนเปิดให้คนทั่วไปใช้จริง ควรเพิ่มฐานข้อมูล, rate limiting, การป้องกัน abuse และทดสอบหลายเครื่อง
