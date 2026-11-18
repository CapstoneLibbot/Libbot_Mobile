# Hướng Dẫn Chi Tiết Build File APK Android Cho LiBot Mobile

Tài liệu này hướng dẫn cách đóng gói ứng dụng **LiBot Mobile** thành file cài đặt độc lập **APK (Android Application Package)** để cài đặt trực tiếp lên điện thoại hoặc máy tính bảng Android thực tế mà không cần chạy máy chủ dev (Expo Go / Metro Bundler).

---

## ⚡ 1. Tóm tắt nhanh (Quick Start)

Khi bạn đã code xong tính năng và muốn build ngay 1 file APK trên máy Mac:

```bash
# 1. Kiểm tra mã nguồn (Typecheck, Lint, Tests)
npm run validate

# 2. Chạy lệnh build APK trực tiếp trên máy Mac (đã cấu hình sẵn biến môi trường)
npm run build:apk:local
```

Sau khi build xong (~8 - 12 phút), file APK sẽ xuất hiện ngay tại thư mục gốc dự án:
👉 `build-<timestamp>.apk` (Dung lượng khoảng **~97 MB**).

---

## 📋 2. Các bước chuẩn bị trước khi build (Pre-flight Checklist)

Trước khi bấm build, hãy luôn kiểm tra 4 điểm cốt lõi sau để tránh build xong app bị lỗi:

### A. Cấu hình địa chỉ Backend (`.env`)
File APK chạy độc lập trên điện thoại, do đó **tuyệt đối không dùng `localhost` hay `127.0.0.1`** vì điện thoại sẽ hiểu là localhost của chính nó:
1. Mở Terminal trên máy tính, gõ `ifconfig | grep "inet "` để lấy địa chỉ IP LAN của máy Mac (ví dụ: `192.168.1.50`).
2. Mở file `.env` và cập nhật:
   ```env
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.50:5205/api
   EXPO_PUBLIC_SIGNALR_URL=http://192.168.1.50:5205/robotHub
   EXPO_PUBLIC_MAP_PROVIDER=google
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
   EXPO_PUBLIC_XIAOZHI_WS_URL=ws://192.168.1.50:8000/xiaozhi/v1/
   EXPO_PUBLIC_VOICE_KIOSK_ID=libot-kiosk-01
   ```
> ⚠️ **Lưu ý:** Điện thoại Android và máy Mac chạy backend phải kết nối **chung một mạng Wi-Fi**.

Với voice, Xiaozhi cũng phải đang chạy và URL WebSocket phải dùng IP LAN của
máy chạy Xiaozhi. Không dùng `localhost`. Hướng dẫn đầy đủ để dựng Backend,
SQL Server và Xiaozhi nằm tại [Team setup và voice](TEAM_SETUP_VOICE.md).

### B. Kiểm tra cấu hình Google Maps
Trong [app.config.ts](file:///Users/mac/Projects/captones/Libbot_Mobile/app.config.ts), mục `android.config.googleMaps.apiKey` phải có giá trị API Key hợp lệ (hoặc ít nhất một chuỗi placeholder không rỗng) để thư viện native `react-native-maps` không gây crash ứng dụng khi khởi động.

### C. Quy tắc cấu trúc thư mục Expo Router
- Tuyệt đối **không** tạo thư mục có tên `src/app/`.
- Mọi mã nguồn nền tảng (stores, providers, configs, query keys) phải nằm trong [`src/core/`](file:///Users/mac/Projects/captones/Libbot_Mobile/src/core/).
- Chỉ có thư mục [`app/`](file:///Users/mac/Projects/captones/Libbot_Mobile/app/) ở thư mục gốc được dùng làm route tree cho Expo Router.

### D. Kiểm tra chất lượng mã nguồn
Chạy lệnh kiểm tra toàn diện trước khi build:
```bash
npm run validate
```
Lệnh này sẽ tự động chạy:
- `npm run typecheck` (Kiểm tra kiểu dữ liệu TypeScript)
- `npm run lint` (Kiểm tra quy chuẩn code ESLint)
- `npm test` (Chạy 126 unit tests)
- `npx expo-doctor` (Chẩn đoán tương thích gói thư viện)

---

## 🛠️ 3. Phương pháp build

### Cách 1: Build Local trên máy Mac (Khuyên dùng - Nhanh & Miễn phí)
Máy Mac của bạn đã được cài đặt đầy đủ môi trường Android SDK và OpenJDK 21.

Chỉ cần chạy lệnh:
```bash
npx expo prebuild --platform android # chỉ cần nếu clone mới chưa có android/
npm run build:apk:local
```

*(Lệnh tự nạp `.env`, `ANDROID_HOME` và `JAVA_HOME`, sau đó build Gradle trực tiếp. Nhờ vậy các biến `EXPO_PUBLIC_*` được nhúng vào APK.)*

- **Ưu điểm:**
  - Hoàn toàn miễn phí, không giới hạn số lần build.
  - Tận dụng cache NDK và Gradle của máy Mac nên thời gian build chỉ mất khoảng ~8-12 phút.
  - Không phải xếp hàng chờ đợi như khi build trên server cloud của Expo.
- **Kết quả:** File APK xuất hiện ngay tại thư mục dự án với tên dạng: `build-1790960351994.apk`.

---

### Cách 2: Build qua EAS Cloud (Dành cho khi không muốn máy tính chạy nặng)
Nếu bạn đang làm việc khác và không muốn quạt máy Mac quay mạnh hoặc tốn pin:

```bash
# Đăng nhập tài khoản Expo (chỉ cần làm 1 lần)
npx eas-cli@latest login

# Gửi lệnh build lên cloud của Expo
npm run build:apk
# Hoặc:
npx eas-cli@latest build --platform android --profile preview
```

- **Ưu điểm:** Máy chủ của Expo sẽ thực hiện toàn bộ việc biên dịch; máy Mac của bạn hoàn toàn rảnh rỗi.
- **Kết quả:** Sau khi cloud build xong, Terminal sẽ hiển thị đường link tải trực tiếp file APK và mã QR để quét tải về điện thoại.

---

## 📱 4. Cách cài đặt file APK lên điện thoại / máy tính bảng Android

### Cách 1: Cài siêu tốc qua cáp USB (Dành cho Developer)
1. Trên điện thoại Android: Vào **Cài đặt** -> **Tùy chọn cho nhà phát triển (Developer Options)** -> Bật **Gỡ lỗi qua USB (USB Debugging)**.
2. Cắm cáp kết nối điện thoại với máy Mac.
3. Mở Terminal và kiểm tra thiết bị:
   ```bash
   adb devices
   # Nếu máy hiện danh sách thiết bị kèm chữ "device" là đã kết nối thành công.
   ```
4. Cài đặt file APK trực tiếp vào máy:
   ```bash
   adb install -r <tên-file-build>.apk
   # Ví dụ:
   adb install -r build-1790960351994.apk
   ```

---

### Cách 2: Cài thủ công trên điện thoại
1. Gửi file APK sang điện thoại qua một trong các cách:
   - Tải lên Google Drive rồi mở trên điện thoại tải về.
   - Gửi qua Zalo, Telegram (gửi dưới dạng File tài liệu).
   - Hoặc chép trực tiếp vào bộ nhớ máy qua cáp sạc.
2. Trên điện thoại, mở ứng dụng **Quản lý file (Files)** -> Tìm đến file APK vừa nhận -> Nhấn vào file để cài đặt.
3. Khi Android hiển thị cảnh báo bảo mật:
   - Chọn **Cài đặt (Install)**.
   - Nếu máy hỏi *“Cho phép cài đặt ứng dụng từ nguồn này”*, gạt nút **Cho phép (Allow)**.

---

## 🔍 5. Xử lý các lỗi thường gặp (Troubleshooting)

| Lỗi gặp phải | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| **App mở lên bị trắng xóa hoặc văng ngay (Crash)** | Tồn tại thư mục `src/app/` khiến Expo Router coi đó là route tree và nạp nhầm file config/store vào navigation. | Đảm bảo code nền tảng nằm trong `src/core/`, không bao giờ đặt tên là `src/app/`. |
| **Không tải được dữ liệu sách / bản đồ** | File `.env` đang để `localhost` hoặc điện thoại và máy tính không chung mạng Wi-Fi. | Đổi `localhost` thành IP LAN máy tính (ví dụ `192.168.1.x`) và kiểm tra backend đã bật cổng nhận kết nối LAN. |
| **Lỗi `ERESOLVE could not resolve` khi chạy `npm ci`** | Xung đột phiên bản peer giữa React 19 và React DOM. | Dự án đã có sẵn file `.npmrc` chứa `legacy-peer-deps=true`. Đảm bảo file `.npmrc` luôn tồn tại trong thư mục gốc. |
| **Lỗi `ANDROID_HOME not found` hoặc `Java not found`** | Chạy lệnh `eas build` rời rạc ở terminal mới mà chưa nạp đường dẫn SDK. | Dùng lệnh `npm run build:apk:local` (lệnh này đã tự nạp sẵn cả 2 biến môi trường). |
| **Bản đồ không hiển thị** | Thiếu Google Maps API Key hoặc API Key chưa được kích hoạt Android Maps SDK trên Google Cloud Console. | Cập nhật API Key vào `.env` (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`) và `app.config.ts`. |



adb -s emulator-5554 uninstall com.yourorg.libot
npm run android


xiaozhi 

cd Libbot_Mobile/docker/xiaozhi
./render-config.sh

docker compose --env-file .env -f docker-compose.yaml up -d --build