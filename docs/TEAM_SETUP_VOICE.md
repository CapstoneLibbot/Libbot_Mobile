# Thiết lập LiBot cho team: Mobile, Backend và Voice Xiaozhi

Tài liệu này dành cho thành viên mới clone hai repository `Libbot_Mobile` và
`Libbot_BE`, sau đó chạy đầy đủ luồng kiosk: xem sách, tìm sách bằng giọng nói,
nhận phản hồi LiBot và mở trang chi tiết sách.

## 1. Mô hình chạy cục bộ

```text
Điện thoại / APK
  ├─ HTTP + SignalR ───────────────> LiBot_BE :5205
  └─ WebSocket voice ──────────────> Xiaozhi :8000
                                          └─ MCP có bearer token ─> LiBot_BE /mcp/voice-tools
LiBot_BE ────────────────────────────────> SQL Server :1433
```

Trong cấu hình đơn giản nhất, BE và Xiaozhi cùng chạy trên một máy Mac. Điện
thoại Android phải ở cùng Wi-Fi/LAN với máy đó. Không dùng `localhost` hoặc
`127.0.0.1` trong `.env` Mobile: các địa chỉ này trên điện thoại sẽ trỏ về điện
thoại, không phải máy Mac.

## 2. Điều kiện cần có

- Git, Docker Desktop và Docker Compose.
- .NET SDK theo `Libbot_BE`.
- Node.js/npm theo phiên bản đã khóa trong `Libbot_Mobile/package-lock.json`.
- Android SDK, Java và `adb` nếu muốn build/cài APK local.
- Một DeepSeek API key cho Xiaozhi.
- Điện thoại Android cùng LAN với máy chạy dịch vụ; bật USB debugging nếu cài
  APK qua cáp.

Không đưa API key, bearer token, `.env`, hoặc thư mục
`docker/xiaozhi/data/` lên Git.

## 3. Chọn địa chỉ LAN trước khi cấu hình

Trên máy sẽ chạy BE/Xiaozhi, lấy IPv4 LAN:

```bash
ifconfig | awk '/inet 192\\.168\\./ { print $2 }'
```

Ví dụ phần dưới dùng `192.168.100.43`. Thay toàn bộ bằng IP LAN thực tế của
máy chạy dịch vụ. Nên dùng IP cố định/DHCP reservation để APK không mất kết nối
khi mạng cấp IP mới.

Nếu BE và Xiaozhi chạy ở hai máy khác nhau:

- `BE_IP` là IP máy chạy LiBot_BE.
- `XIAOZHI_IP` là IP máy chạy Docker Xiaozhi.
- Mobile dùng `BE_IP` cho API/SignalR và `XIAOZHI_IP` cho WebSocket voice.

## 4. Khởi động Backend và SQL Server

Thực hiện trong repository `Libbot_BE`.

```bash
cp .env.example .env
docker compose up -d
dotnet restore LiBot.sln
dotnet run --project src/LiBot.Api
```

`docker compose up -d` tại repository Backend **chỉ chạy SQL Server**. Lệnh
`dotnet run` mới khởi động API ở cổng `5205`. Khi API khởi động, nó tự áp dụng
migration và seed dữ liệu thư viện mẫu.

### Các giá trị bắt buộc trong `Libbot_BE/.env`

Giữ hoặc thay `ConnectionStrings__LiBot` để trỏ đúng SQL Server. Với SQL Server
do compose trong repository này tạo ra, giá trị mẫu có thể dùng được nếu mật
khẩu trong connection string khớp `MSSQL_SA_PASSWORD` ở `docker-compose.yml`.

Đặt một token mạnh và giữ riêng tư:

```dotenv
ASPNETCORE_URLS=http://0.0.0.0:5205
VoiceTools__ApiToken=<tao-mot-token-ngau-nhien-dai>
```

`VoiceTools__ApiToken` phải được sao chép nguyên vẹn sang
`LIBBOT_VOICE_TOOLS_TOKEN` của Xiaozhi ở bước sau. Đây là token nội bộ cho MCP,
không được đặt vào biến `EXPO_PUBLIC_*` của Mobile.

Kiểm tra API đang lắng nghe:

```bash
lsof -nP -iTCP:5205 -sTCP:LISTEN
```

## 5. Khởi động Xiaozhi

Xiaozhi nằm trong Mobile repository ở `docker/xiaozhi`. Nó gọi chính xác hai
MCP tool read-only của BE: `search_books` và `search_areas`.

```bash
cd Libbot_Mobile/docker/xiaozhi
cp .env.example .env
```

Điền tối thiểu các biến sau vào `.env`:

```dotenv
# IP LAN của máy chạy container Xiaozhi, để điện thoại kết nối
XIAOZHI_LAN_IP=192.168.100.43
XIAOZHI_WS_PORT=8000

# Secret chỉ tồn tại trên máy chủ
DEEPSEEK_API_KEY=<deepseek-api-key>
DEEPSEEK_MODEL=deepseek-flash

# Khi BE chạy trên cùng Mac với Docker Desktop
LIBBOT_BE_MCP_URL=http://host.docker.internal:5205/mcp/voice-tools
LIBBOT_VOICE_TOOLS_TOKEN=<giong-VoiceTools__ApiToken-cua-BE>
```

Nếu BE chạy ở máy khác, thay `host.docker.internal` bằng IP LAN của BE:

```dotenv
LIBBOT_BE_MCP_URL=http://<BE_IP>:5205/mcp/voice-tools
```

Sau mỗi lần thay `.env` Xiaozhi, render lại file cấu hình rồi recreate
container:

```bash
./render-config.sh
docker compose --env-file .env -f docker-compose.yaml up --build -d
docker compose --env-file .env -f docker-compose.yaml ps
docker compose --env-file .env -f docker-compose.yaml logs -f xiaozhi-server
```

`XIAOZHI_HTTP_PORT` mặc định chỉ bind `127.0.0.1` để kiểm tra nội bộ. Mobile
không dùng cổng này; Mobile chỉ kết nối WebSocket cổng `8000`.

## 6. Cấu hình Mobile

Trong `Libbot_Mobile`:

```bash
npm ci
cp .env.example .env
```

Điền các biến public theo địa chỉ LAN đã chọn:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://192.168.100.43:5205/api
EXPO_PUBLIC_SIGNALR_URL=http://192.168.100.43:5205/robotHub
EXPO_PUBLIC_XIAOZHI_WS_URL=ws://192.168.100.43:8000/xiaozhi/v1/
EXPO_PUBLIC_VOICE_KIOSK_ID=libot-kiosk-01

# Cần cho bản đồ nếu tính năng bản đồ được sử dụng
EXPO_PUBLIC_MAP_PROVIDER=google
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=<google-maps-android-key>
```

Các biến `EXPO_PUBLIC_*` được nhúng vào JavaScript bundle và có thể đọc từ APK.
Chỉ đặt URL, kiosk ID và Google Maps key có thể công khai theo chính sách dự án;
không đặt DeepSeek key, connection string hoặc MCP token ở đây.

Sau khi thay bất kỳ `EXPO_PUBLIC_*` nào, hãy build lại development build/APK.
Reload Metro không thay đổi giá trị đã được nhúng trong APK release.

## 7. Chạy và build Android

### Phát triển trên thiết bị Android

Xiaozhi dùng native module (`SpeechRecognizer` và Android TTS), vì vậy Expo Go
không hỗ trợ voice. Tạo native development build:

```bash
cd Libbot_Mobile
npx expo prebuild --platform android
npx expo run:android
npm run dev
```

Chỉ cần chạy `npx expo prebuild --platform android` khi repository chưa có thư
mục `android/`, hoặc sau khi thay đổi native config/plugin. Thư mục này là build
artifact local và không được commit.

### Build APK để cài độc lập

```bash
cd Libbot_Mobile
npm run typecheck
npm run lint
npm test
npx expo prebuild --platform android  # cần nếu android/ chưa tồn tại
npm run build:apk:local
adb devices
adb install -r "$(ls -t build-*.apk | head -n 1)"
```

Điện thoại phải hiện trạng thái `device` trong `adb devices`. Lần đầu Android
sẽ hỏi quyền microphone; cần cấp quyền để voice hoạt động.

### Build EAS Cloud

`.env` bị git-ignore, vì vậy EAS Cloud không nên dựa vào file `.env` local.
Tạo các biến môi trường EAS cho profile build tương ứng:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SIGNALR_URL`
- `EXPO_PUBLIC_XIAOZHI_WS_URL`
- `EXPO_PUBLIC_VOICE_KIOSK_ID`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` nếu dùng bản đồ

Sau đó chạy:

```bash
npx eas-cli@latest build --platform android --profile preview
```

## 8. Checklist xác nhận toàn bộ luồng

1. SQL Server: `docker compose ps` trong `Libbot_BE` hiển thị `sqlserver` là
   `Up`.
2. API: `dotnet run` của BE không báo lỗi migration; cổng `5205` lắng nghe.
3. Xiaozhi: `xiaozhi-server` là `Up`; log không có lỗi kết nối MCP/token.
4. Điện thoại cùng LAN; firewall cho phép inbound TCP `5205` và `8000` trên máy
   chạy dịch vụ.
5. Mở APK, cấp microphone, mở modal voice, nói tên một sách có trong dữ liệu.
6. Nhật ký hội thoại hiển thị transcript, phản hồi LiBot và card sách. Chạm
   `Chi tiết` để mở đúng trang chi tiết sách.

## 9. Xử lý lỗi thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| App không tải catalog | Sai `EXPO_PUBLIC_API_BASE_URL`, BE chưa chạy hoặc điện thoại không cùng LAN | Kiểm tra BE cổng `5205`, IP LAN và firewall; build lại APK sau khi đổi env. |
| Mở modal voice báo chưa cấu hình | Thiếu WebSocket URL hoặc kiosk ID lúc build | Điền đủ `EXPO_PUBLIC_XIAOZHI_WS_URL` và `EXPO_PUBLIC_VOICE_KIOSK_ID`, sau đó build lại. |
| Voice kết nối nhưng không tìm được sách/card | Xiaozhi không gọi được MCP hoặc token hai bên không trùng | Kiểm tra `LIBBOT_BE_MCP_URL`, `LIBBOT_VOICE_TOOLS_TOKEN`, log Xiaozhi và `VoiceTools__ApiToken` của BE. |
| Điện thoại không kết nối được Xiaozhi | Dùng `localhost`, sai IP hoặc cổng `8000` bị firewall chặn | Dùng `ws://<XIAOZHI_IP>:8000/xiaozhi/v1/`, kiểm tra Wi-Fi/firewall. |
| Không nghe hoặc không nhận giọng nói | Chưa cấp quyền microphone, dùng Expo Go, hoặc thiết bị thiếu giọng `vi-VN` | Cấp RECORD_AUDIO, dùng development build/APK và cài/đặt Android TTS tiếng Việt. |
| `npm run build:apk:local` báo không có `android/` | Clone mới chưa generate native project | Chạy `npx expo prebuild --platform android` trước. |
| `adb` hiện `unauthorized` | Chưa chấp nhận USB debugging trên điện thoại | Mở khóa điện thoại, chấp nhận RSA fingerprint, rồi chạy lại `adb devices`. |

## 10. Những gì phải commit và những gì không commit

Commit/push để teammate pull được tính năng:

- Mã Mobile, Backend và `Libbot_Mobile/docker/xiaozhi`, gồm Dockerfile,
  compose file, template/config script và provider MCP.
- `.env.example` đã cập nhật (chỉ placeholder, không có secret).
- Tài liệu này.

Không commit:

- `.env` trong cả Mobile, BE và Xiaozhi.
- `docker/xiaozhi/data/.config.yaml` và
  `docker/xiaozhi/data/.mcp_server_settings.json` đã render.
- APK, database volume, Android build artifacts hoặc API keys/token.
