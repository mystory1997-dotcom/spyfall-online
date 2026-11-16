# Spyfall Online — ทำไฟล์ Android สำหรับ Google Play ผ่าน GitHub Actions

แพ็กเกจนี้มีเกม Node.js + Socket.IO เดิม + โปรเจกต์ Android (WebView) + workflow ที่สร้างไฟล์ให้อัตโนมัติ 3 ไฟล์:

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `app-debug.apk` | ลองติดตั้งบนมือถือ (ไม่ใช่ไฟล์สำหรับ Play) |
| `app-release.aab` | **ไฟล์ที่ Google Play ต้องใช้** — แอปใหม่อัปโหลดเป็น .apk ไม่ได้ ต้องเป็น .aab |
| `app-release.apk` | เวอร์ชันเซ็นแล้ว ไว้ทดสอบ/เก็บสำรอง |

## สถานะตอนส่งมอบ (อ่านก่อน)
- โค้ด Java ผ่านการคอมไพล์ทดสอบกับ API จำลองแล้ว แต่ **ยังไม่เคย build ด้วย Android SDK จริง** (เครื่องที่เตรียมชุดนี้ไม่มี SDK และต่อเน็ตไม่ได้) — การรัน workflow ครั้งแรกคือการทดสอบจริง ถ้าขึ้นสีแดง ให้เปิดขั้นตอนที่แดง คัดลอกข้อความ error ส่งกลับมาแก้ต่อ
- ยังไม่มีเซิร์ฟเวอร์ออนไลน์ → ต้องทำข้อ B ก่อน แอปจึงจะเล่นได้
- ปรับจากชุดเดิม: targetSdk/compileSdk 36 (Play บังคับสำหรับแอปใหม่ตั้งแต่ 31 ส.ค. 2026), AGP 8.13.2 + Gradle 8.13, เพิ่มไอคอนแอป, แก้การแสดงผลแบบ edge-to-edge ของ Android 15+, versionCode เพิ่มเองทุกครั้งที่ build, build AAB เซ็นด้วย upload key

## A. สร้าง GitHub repository
1. เปิด https://github.com แล้วสมัคร/เข้าสู่ระบบ
2. กด `+` > `New repository` ตั้งชื่อ `spyfall-online` แนะนำให้เลือก `Private` แล้วกด Create repository
3. ในหน้า repository เลือก `Add file` > `Create new file`
4. ตั้งชื่อไฟล์เป็น `.github/workflows/android-apk.yml` วางเนื้อหาจากไฟล์ `android-apk-workflow-phone.txt` แล้วกด Commit changes
5. `Add file` > `Upload files` อัปโหลด `spyfall-online-source.zip` (ไม่ต้องแตกไฟล์) แล้ว Commit changes

> ถ้าเคยสร้างไว้จากชุดเดิมแล้ว: เปิดไฟล์ `android-apk.yml` เดิม กดไอคอนดินสอ ลบเนื้อหาเก่าทั้งหมดแล้ววางเนื้อหาใหม่ และอัปโหลด `spyfall-online-source.zip` ใหม่ทับไฟล์เดิม

## B. เปิดเซิร์ฟเวอร์ออนไลน์ (Render)
1. สมัคร/เข้าสู่ระบบที่ https://render.com ด้วยบัญชี GitHub
2. `New` > `Web Service` เชื่อม repository `spyfall-online`
3. Build Command: `mkdir -p app && unzip -oq spyfall-online-source.zip -d app && cd app && npm install`
4. Start Command: `cd app && npm start`
5. เลือกแพ็กเกจ แล้ว Deploy จะได้ URL เช่น `https://ชื่อบริการ.onrender.com`
6. เปิด URL ต่อท้าย `/health` ต้องเห็น JSON ที่มี `"ok":true`

> Free plan จะหลับเมื่อไม่มีคนใช้ การเปิดครั้งแรกช้าประมาณ 30–60 วินาที และอาจตัดการเชื่อมต่อระหว่างเกม ก่อนส่งให้ Google ตรวจ ควรใช้แพ็กเกจที่ไม่หลับ ไม่เช่นนั้นผู้ตรวจอาจเห็นแอปโหลดนานแล้วปฏิเสธ

## C. สร้าง debug APK (ลองบนมือถือ)
1. repository > `Settings` > `Secrets and variables` > `Actions` > แท็บ `Variables` > `New repository variable`
2. Name: `SPYFALL_SERVER_URL`  Value: URL จาก Render (ขึ้นต้น `https://` ไม่ต้องมี `/` ท้าย) > Save
3. แท็บ `Actions` > `Build Spyfall Online APK` > `Run workflow`
4. รอจนเป็นสีเขียว เปิดการรันล่าสุด เลื่อนลงล่างสุดที่หัวข้อ `Artifacts` กดดาวน์โหลด `spyfall-online-debug-apk` (ได้เป็น ZIP) แตกไฟล์ด้วยแอป Files จะได้ `app-debug.apk`

## D. สร้างไฟล์สำหรับ Google Play (.aab เซ็นแล้ว)
1. เปิดไฟล์ `signing-secrets-PRIVATE.txt` (ส่งมาแยกต่างหาก)
2. repository > `Settings` > `Secrets and variables` > `Actions` > แท็บ **`Secrets`** > `New repository secret` สร้าง 2 รายการ:
   - `KEYSTORE_PASSWORD`
   - `KEYSTORE_BASE64`
3. รัน workflow อีกครั้ง (`Run workflow`)
4. ดาวน์โหลด Artifact `spyfall-online-play-release` แตก ZIP จะได้ `bundle/release/app-release.aab` และ `apk/release/app-release.apk`

ทุกครั้งที่รัน versionCode จะเพิ่มเองโดยอัตโนมัติ ไม่ต้องแก้ไฟล์ ถ้าจะเปลี่ยนเลขเวอร์ชันที่ผู้ใช้เห็น ให้แก้ `versionName` ใน `android/app/build.gradle`

## E. ขั้นตอนบน Google Play Console
1. สมัคร Play Console (ค่าสมัครครั้งเดียว 25 ดอลลาร์ + ยืนยันตัวตน; บัญชีส่วนตัวใหม่ต้องยืนยันว่ามีอุปกรณ์ Android ผ่านแอป Play Console บนมือถือ)
2. `Create app` แล้วอัปโหลด `app-release.aab` ที่ `Testing` > `Internal testing` (ใช้ลองติดตั้งผ่าน Play ได้เลย ไม่ต้องลงไฟล์ APK เอง) — การอัปโหลดไฟล์ทำผ่านเบราว์เซอร์ (เปิดโหมด Desktop site บนมือถือได้)
3. กรอกหัวข้อ `App content`: Privacy policy (ต้องมีลิงก์), Data safety (แอปส่งชื่อเล่นผู้เล่นไปเซิร์ฟเวอร์), Content rating, Target audience, Ads
4. Store listing: ชื่อ คำอธิบาย ไอคอน 512×512 และ Feature graphic 1024×500 (มีให้ในโฟลเดอร์ `play-store-assets/`) และภาพหน้าจอมือถือ 2–8 ภาพ (ต้องแคปเอง)
5. บัญชีส่วนตัวที่สร้างหลัง 13 พ.ย. 2023: ต้องทำ `Closed testing` ให้มีผู้ทดสอบอย่างน้อย 12 คนที่เข้าร่วมต่อเนื่อง 14 วัน จึงกด Apply for production ได้
6. อัปเดตครั้งต่อไป: รัน workflow ใหม่ แล้วอัปโหลด `.aab` ตัวใหม่

## ข้อควรทราบ
- **ติดตั้ง APK นอก Play ในไทย:** ตั้งแต่ 30 ก.ย. 2026 Android เริ่มบังคับการยืนยันตัวตนนักพัฒนาในไทย (และบราซิล อินโดนีเซีย สิงคโปร์) APK ที่ยังไม่ได้ลงทะเบียนอาจติดตั้งได้เฉพาะผ่าน adb หรือ "advanced flow" ของ Android ทางที่ง่ายที่สุดคือทดสอบผ่าน Internal testing บน Play
- **ชื่อ "Spyfall":** เป็นชื่อเกมกระดานที่วางขายเชิงพาณิชย์อยู่แล้ว ก่อนเผยแพร่ควรตรวจสอบสิทธิ์ หรือพิจารณาตั้งชื่อแอปและชุดสถานที่ในเกมเป็นของตัวเอง (ถ้าเปลี่ยนชื่อ แก้ `android:label` ใน `AndroidManifest.xml` และภาพหน้าแรก)
- **package name** `com.temgraph.spyfallonline` เปลี่ยนไม่ได้หลังเผยแพร่ ถ้าอยากใช้ชื่ออื่น ให้แก้ก่อนอัปโหลดครั้งแรก (`namespace` และ `applicationId` ใน `android/app/build.gradle` และโฟลเดอร์ใน `java/`)
- แอปนี้เป็นเปลือก WebView ที่เปิดเซิร์ฟเวอร์เกมของคุณเอง ต้องมีเซิร์ฟเวอร์ออนไลน์ตลอดเวลาจึงจะเล่นได้
- เกมยังไม่มี voice chat ผู้เล่นต้องคุยผ่านช่องทางอื่นระหว่างเล่น
- ห้องและคะแนนเก็บในหน่วยความจำเซิร์ฟเวอร์ เมื่อ restart/deploy ข้อมูลห้องจะหาย
- ก่อนเปิดให้คนทั่วไปใช้จริง ควรเพิ่มฐานข้อมูล rate limiting การป้องกัน abuse และทดสอบหลายเครื่อง
- เก็บ `signing-secrets-PRIVATE.txt` ให้ปลอดภัย และห้ามอัปขึ้น GitHub
