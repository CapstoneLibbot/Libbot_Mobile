# Xiaozhi server cho LiBot

Đây là cấu hình duy nhất cho LiBot voice v1. Nó chạy Xiaozhi trong LAN, dùng
DeepSeek để điều phối và gọi đúng hai MCP tool của `Libbot_BE`:
`search_books` và `search_areas`.

Android tự nhận giọng nói bằng `SpeechRecognizer vi-VN` và tự đọc câu trả lời
bằng Android Text-to-Speech `vi-VN`. Vì vậy container không cần model ASR hay
bất kỳ API key STT/TTS nào.

## Cần có

- Docker Desktop đang chạy.
- Địa chỉ IPv4 LAN cố định của máy chạy compose.
- DeepSeek API key.
- `Libbot_BE` đang chạy và endpoint MCP `/mcp/voice-tools` truy cập được từ
  container. Khi backend chạy trên chính Mac, dùng `host.docker.internal`;
  khi chạy ở máy khác, dùng IP LAN của máy backend.
- `LIBBOT_VOICE_TOOLS_TOKEN` trùng với `VoiceTools:ApiToken` của backend.

## Khởi chạy từ template

```sh
cd docker/xiaozhi
cp .env.example .env
```

Điền các giá trị trong `.env`, rồi render và chạy:

```sh
./render-config.sh
docker compose --env-file .env -f docker-compose.yaml config
docker compose --env-file .env -f docker-compose.yaml up --build -d
docker compose --env-file .env -f docker-compose.yaml logs -f xiaozhi-server
```

WebSocket dùng trong app là:

```text
ws://<XIAOZHI_LAN_IP>:<XIAOZHI_WS_PORT>/xiaozhi/v1/
```

Ghi chính URL đó vào `EXPO_PUBLIC_XIAOZHI_WS_URL` của mobile. Không dùng
`localhost` trên điện thoại Android.

## Kiểm tra tối thiểu

1. Chạy `Libbot_BE` và xác nhận MCP `tools/list` chỉ có `search_books` và
   `search_areas`.
2. `docker compose ... ps` phải cho thấy `xiaozhi-server` đang chạy.
3. Mở app Android, nói một câu tìm sách. Log server phải thể hiện lượt text,
   tool LiBot và câu trả lời; audio được Android phát cục bộ.

`.env`, `data/.config.yaml` và `data/.mcp_server_settings.json` chứa secrets
và đã được gitignore. Không đưa chúng vào repository hay biến
`EXPO_PUBLIC_*`.
