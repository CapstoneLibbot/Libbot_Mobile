# Xiaozhi voice v1 cho LiBot

## Kiến trúc đã chốt

```text
Android kiosk
  SpeechRecognizer vi-VN ── final text ──┐
  Android Text-to-Speech vi-VN ◀─ text ──┤ WebSocket
                                          ▼
                                  Xiaozhi trong LAN
                                  DeepSeek + MCP client
                                          ▼
                                Libbot_BE /mcp/voice-tools
                                          ▼
                                      SQL Server
```

Mobile không gửi audio thô lên server và không nhận audio thô về. Android
`SpeechRecognizer` hiển thị partial transcript khi người dùng nói; chỉ kết quả
final mới gửi vào message `listen/detect` của Xiaozhi. Khi Xiaozhi trả text
TTS, Android Text-to-Speech đọc tuần tự bằng `vi-VN`.

Đây là half-duplex: `listening → thinking → speaking → listening`. Mic chỉ mở
lại sau khi câu trả lời đã đọc xong. Nếu không có final transcript, kết nối
hoặc TTS, UI phải hiện lỗi có thể thử lại thay vì chờ vô hạn.

Khi modal vừa kết nối thành công, Android đọc một lần câu chào local “Xin
chào, tôi là LiBot. Tôi có thể giúp bạn tìm sách hoặc khu vực trong thư viện.”
Mic chỉ mở sau khi câu chào hoàn tất. Xiaozhi không tạo greeting riêng; reconnect
trong cùng modal không đọc lại câu chào.

## Wake word và ranh giới session

Wake word hoạt động hoàn toàn offline on-device bằng thư viện `react-native-vosk`
kết hợp mô hình âm học tiếng Việt (`vosk-model-small-vn-0.4`).
- Ở màn hình Idle Attract, Vosk lắng nghe ngầm với grammar giới hạn các từ khóa
  kích hoạt ("hey li bot", "li bot ơi", "xin chào li bot", "robot", "[unk]").
  Nhiễu nền và câu nói thông thường rơi vào `[unk]` và bị bỏ qua.
- Khi nhận diện đúng từ khóa, app mở `VoiceListeningModal` với chế độ `activation="wake"`.
  Robot chào ngay "Tôi nghe đây" và mở micro tiếp nhận yêu cầu.
- Khi modal hội thoại mở, Vosk tự động dừng (`stop()`) để giải phóng micro cho
  phiên hội thoại chính của Xiaozhi.

WebSocket Xiaozhi được pre-warm khi app kiosk mở nhưng chưa mở microphone. Khi
độc giả đóng modal hoặc im lặng 10 giây, app abort, đóng socket của độc giả đó
và xóa transcript/card kết quả cục bộ. App sau đó mở một socket warm mới. Vì
Reader B không dùng socket của Reader A, context theo connection không được
mang sang phiên tiếp theo.

## Phạm vi v1

Xiaozhi chỉ được phép gọi các MCP tool sau:

| Tool | Input | Kết quả |
| --- | --- | --- |
| `search_books` | `query` | Tối đa 3 sách: bookId, title, author, canGuide, totalMatches |
| `start_book_guidance` | `bookId`, `query?` | Bắt đầu job dẫn đường cho sách người dùng đã chọn và xác nhận |
| `search_locations` | `query` | Tối đa 3 Endpoint: endpointId, name, canGuide, totalMatches |
| `start_location_guidance` | `endpointId`, `query?` | Bắt đầu job dẫn đường tới Endpoint người dùng đã chọn và xác nhận |

`search_books` dùng `IBookGuidanceService.SearchTitlesAsync`, chỉ tìm theo tên sách. Để Mobile mở trang chi
tiết sau khi người dùng chạm thẻ kết quả, tool trả `bookId`. Không trả ảnh,
copy data, tọa độ hay chi tiết dẫn đường.

Sau mỗi lần gọi `search_books` hoặc `search_locations` thành công, Xiaozhi gửi thêm một WebSocket message
`tool_result` tới kiosk gồm `tool`, `query`, `totalMatches` và tối đa ba bản ghi
presentation-safe. Message này không chứa secret, tọa độ, robot state hay quyền
điều khiển robot; Mobile dùng nó để hiển thị thẻ trong nhật ký hội thoại trước
khi Android TTS đọc phản hồi.

Ngoài `start_book_guidance` và `start_location_guidance` đã được xác nhận, không có tool robot, job,
navigation, status robot, web search, weather, news, music hoặc bất kỳ tool mặc
định nào khác. Prompt chỉ được khẳng định dữ liệu do tool trả về, đọc tối đa ba
kết quả và nói “không tìm thấy” khi không có kết quả.

## Cấu hình và bảo mật

- Xiaozhi chạy qua Docker tại `docker/xiaozhi`; hướng dẫn template nằm trong
  [README của Docker](../docker/xiaozhi/README.md).
- `.env` của compose chỉ cần LAN IP, port, DeepSeek key, MCP URL và token MCP.
  Script `render-config.sh` sinh config local, quyền `0600`.
- Route backend bắt buộc `Authorization: Bearer <voice-tools-token>` và phải
  so sánh token constant-time. Không log token/header.
- Không có secret backend trong APK, repository, `EXPO_PUBLIC_*` hay log mobile.
- `LIBBOT_BE_MCP_URL` phải truy cập được **từ container**. Trên Docker Desktop
  for Mac, `host.docker.internal` dùng được khi backend ở máy host.

## Yêu cầu Android

App cần development build hoặc EAS APK vì module `xiaozhi-audio` là native;
Expo Go không tải module này. Thiết bị cần Google Speech Services hỗ trợ
`vi-VN`, quyền microphone và mạng. Ghi URL LAN vào:

```dotenv
EXPO_PUBLIC_XIAOZHI_WS_URL=ws://192.168.1.20:8000/xiaozhi/v1/
EXPO_PUBLIC_VOICE_KIOSK_ID=libot-kiosk-01
```

Không dùng `localhost` trên thiết bị thật.

## Kiểm thử nghiệm thu

- Backend: thiếu token MCP trả `401`; `tools/list` chỉ có hai tool; cả hai
  `tools/call` trả schema đã định; không có endpoint nào tạo job hay gọi
  robot.
- Mobile: partial transcript cập nhật khi nói; final transcript khóa mic;
  trạng thái chuyển thinking rồi speaking; TTS đọc được câu trả lời; xong tự
  mở lại mic cho lượt sau.
- E2E: nói “Tìm sách kỹ năng lập trình”, nghe tối đa ba tựa/tác giả/số bản;
  sau đó hỏi khu vực mà không đóng modal.
- Vận hành: server khởi động từ clone mới với `.env` riêng; secrets không xuất
  hiện trong Git; đo latency từ final transcript đến text trả lời.


vài tool gợi ý như:

Tool gợi ý	User sẽ hỏi	Trả lời
get_book_info	“Sách này nói về gì?”, “Ai xuất bản?”, “Xuất bản năm nào?”	Tựa, tác giả, ISBN, danh mục, nhà xuất bản, năm XB, tổng số bản và số bản sẵn có
find_book_location	“Cuốn này ở đâu?”	Tầng, dãy/khu, kệ và ngăn sách có bản đang sẵn
suggest_books	“Gợi ý sách lập trình cho tôi”, “Có sách nào về AI không?”	Tối đa 3 sách theo danh mục/chủ đề, ưu tiên còn bản
