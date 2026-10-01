# Blueprint Mobile LiBot

## 1. Mục tiêu và ranh giới sản phẩm

LiBot Mobile là ứng dụng giao diện công cộng chạy trên tablet Android gắn trên robot LiBot trong thư viện. Ứng dụng giúp độc giả tự tìm sách, xem vị trí kệ hoặc khu vực thư viện, yêu cầu robot hướng dẫn và theo dõi tiến trình hỗ trợ ngay trên màn hình robot.

Android kiosk là môi trường triển khai ưu tiên. Ứng dụng vẫn duy trì khả năng build và kiểm thử iOS/iPad để tránh khóa công nghệ theo một nền tảng, nhưng không tối ưu iPhone như sản phẩm chính.

Ứng dụng mobile **không** điều khiển ROS2, cảm biến, động cơ, điều hướng tự hành hoặc quy trình sạc. Mobile chỉ gọi backend ASP.NET Core qua REST và nhận trạng thái qua SignalR. Backend là ranh giới bảo mật và điều phối giữa mobile, cơ sở dữ liệu và robot stack.

| Trong phạm vi kiosk                                 | Ngoài phạm vi kiosk                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Luồng 01: tìm sách và dẫn đến kệ                    | Điều khiển robot trực tiếp hoặc kết nối ROS2                                       |
| Luồng 02: tìm tiện ích/khu vực và dẫn đường         | Kiểm kê, tuần tra, phát hiện sách thất lạc, sạc và phục hồi điều hướng             |
| Hiển thị, nhận chạm, theo dõi và đánh giá hai luồng | Phân công/kiểm kê/xác nhận của thủ thư; quản trị tài khoản, robot, bản đồ, báo cáo |
| Đánh giá hỗ trợ và tự trở về màn hình chờ           | Logic nghiệp vụ, quyền truy cập và lưu log phía server                             |

Các màn hình và feature thủ thư hiện có là mã tham khảo/deferred. Chúng không được đưa vào `app/(kiosk)/` và không là một phần của bản phát hành tablet trên robot.

## 2. Luồng trải nghiệm kiosk

Mobile chỉ triển khai hai workflow được chuẩn hóa trong tài liệu “Step type”: **Luồng 01 Search & Guide to Book** và **Luồng 02 Search & Guide to Facility/Area**. Mỗi workflow có cùng khung giao diện: tìm kiếm, chọn kết quả, xem thông tin, xem vị trí, bắt đầu hướng dẫn, thông báo đã đến, đánh giá và về Home.

### Phân chia trách nhiệm workflow

| Step-Type      | Chủ sở hữu             | Trách nhiệm của mobile                                                                          |
| -------------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| `DISPLAY`      | Mobile                 | Render đúng màn hình và dữ liệu workflow hiện hành.                                             |
| `WAIT`         | Mobile + backend       | Nhận touch/timeout; gửi event kết quả hoặc timeout về backend.                                  |
| `PROCESS_DATA` | Backend                | Thực thi tìm kiếm, lấy chi tiết, lưu rating; mobile gọi API và hiển thị kết quả.                |
| `EVALUATE`     | Backend                | Đánh giá nhánh `RATE` hoặc `START_GUIDANCE`; mobile không tự quyết định workflow state machine. |
| `MOVE`         | Robot workflow/backend | Gửi robot tới endpoint, phát trạng thái để mobile theo dõi; mobile không gọi ROS2.              |
| `NOTIFY`       | Robot workflow/backend | Phát TTS trên robot; mobile hiển thị trạng thái tương ứng nếu backend phát event.               |

### Luồng 01 - Tìm sách và dẫn đến kệ

1. **Home/Book search:** người dùng tra cứu theo title, ISBN, author hoặc category. Mobile gửi `SEARCH_BOOK` với `match_mode: FUZZY`, rồi hiển thị `BOOK_SEARCH_RESULTS`.
2. **Chọn và xem sách:** touch `BOOK_SELECTED` trả `selected_book_id`; mobile yêu cầu `GET_BOOK_DETAIL` và hiển thị `BOOK_INFO` gồm title, author, description, classification, availability và action.
3. **Xem vị trí hoặc đánh giá:** tại `BOOK_INFO`, action `RATE` chuyển thẳng sang `RATING`; action `VIEW_LOCATION` hiển thị `MAP_LOCATION` với floor, aisle, shelf, shelf level và điểm nhấn của sách.
4. **Bắt đầu hướng dẫn hoặc đánh giá:** tại map, action `RATE` chuyển sang rating; `START_GUIDANCE` yêu cầu backend chạy workflow, sau đó render `NAV_GUIDE` với route/destination.
5. **Robot di chuyển:** backend thực thi `MOVE` tới shelf endpoint với `SLOW_GUIDE` và `WAIT_RESUME`; mobile theo dõi mission/robot realtime cho tới `ARRIVED`.
6. **Đến nơi và kết thúc:** backend hiển thị/đẩy trạng thái arrived, phát TTS “Đã đến vị trí sách...”, chờ 15 giây rồi đưa app tới `RATING`. Người dùng submit rating hoặc hết 10 giây; backend nhận `SAVE_RATING` nếu có rating và workflow trở về `HOME`.

### Luồng 02 - Tìm tiện ích/khu vực và dẫn đường

1. **Facility search:** người dùng tra cứu tiện ích/khu vực; mobile gửi `SEARCH_FACILITY` với `match_mode: FUZZY`, rồi hiển thị `FACILITY_SEARCH_RESULTS`.
2. **Chọn và xem khu vực:** touch `FACILITY_SELECTED` trả `selected_facility_id`; mobile yêu cầu `GET_FACILITY_DETAIL` và hiển thị `FACILITY_INFO` gồm name, type, description, location và action.
3. **Xem vị trí hoặc đánh giá:** `RATE` đưa thẳng tới `RATING`; `VIEW_LOCATION` hiển thị `MAP_LOCATION` với floor và facility được highlight.
4. **Bắt đầu hướng dẫn:** `START_GUIDANCE` yêu cầu backend chạy workflow và hiển thị `NAV_GUIDE`; backend `MOVE` tới `selected_facility_id` với `SLOW_GUIDE` và `WAIT_RESUME`.
5. **Đến nơi và kết thúc:** mobile nhận arrived realtime, hiển thị `ARRIVED`; backend phát TTS “Đã đến khu vực cần tìm...”, chờ 15 giây và sử dụng cùng flow `RATING` -> `SAVE_RATING` -> `HOME` như luồng 01.

### Timeout, lỗi và mất mạng

- Touch chờ ở `BOOK_INFO`, `FACILITY_INFO`, `MAP_LOCATION` hoặc `RATING` hết 10 giây phải đi theo nhánh Home/flow được backend trả về; không tự tạo mission.
- Mất mạng khi tìm kiếm hiển thị offline/retry. Trong guidance đang chạy, app giữ snapshot cuối, thử kết nối lại SignalR và refetch workflow state khi mạng trở lại.
- Sách không available không được hiện `START_GUIDANCE`; dữ liệu lỗi hoặc event sai schema chỉ hiển thị trạng thái lỗi an toàn, không làm hỏng kiosk.
- Flow 03 Bookshelf Inventory, Flow 04 Library Patrol, Flow 05 Misplaced Book Detection, Flow 06 Robot Return & Charging và Flow 07 Obstacle & Navigation Recovery chỉ chạy ở robot/backend/admin; mobile kiosk không có route hay control cho các flow này.

## 3. Kiến trúc và cấu trúc đề xuất

`app/` chỉ là navigation Expo Router. Route không chứa gọi API, subscription SignalR hay business logic.

```
app/
  _layout.tsx
  index.tsx
  (kiosk)/
    _layout.tsx
    idle.tsx
    search.tsx
    catalog/[bookId].tsx
    facilities/[facilityId].tsx
    guidance/[missionId].tsx
    feedback/[missionId].tsx
src/
  core/                 # config, providers, kiosk session/store, query keys
  features/
    catalog/            # search, detail, availability, UI feature
    guidance/           # workflow 01/02, create/read mission, realtime projection
    facilities/         # area lookup and map view-model
    feedback/           # submit rating
  infrastructure/
    api/                # Axios client, endpoint DTOs, DTO-to-domain mappers
    realtime/           # one SignalR connection and typed subscriptions
    storage/            # secure/local persistence
    network/            # NetInfo and connectivity policy
  shared/
    components/         # controls, states, map presentation
    theme/
    utils/
    types/
```

Đây là cấu trúc đích của refactor: toàn bộ mã dùng chung nằm trong `src/shared`, giao tiếp ngoại vi và mock repository nằm trong `src/infrastructure`, và các luồng chức năng độc lập nằm trong `src/features`. Cây điều hướng `app/(kiosk)` là cây route duy nhất phục vụ trải nghiệm tablet robot.

### Quản lý trạng thái

- **TanStack Query:** dữ liệu server: kết quả tìm kiếm, chi tiết sách, khu vực, mission và rating request; định nghĩa query key tập trung trong `src/core/queryKeys`.
- **Zustand:** chỉ trạng thái UI cục bộ: kiosk session, active mission id, idle timeout, lựa chọn map và trạng thái presentation. Không duplicate dữ liệu server.
- **SignalR:** một connection lifecycle ở infrastructure; hook feature đăng ký/hủy event theo mission/robot hiện hành. Khi event nhận được, cập nhật cache Query có kiểm soát hoặc invalidate query liên quan.
- **Secure Store:** chỉ dành cho secret/token nếu backend sau này cần kiosk credential. Không dùng để lưu token người dùng công cộng hay thông tin độc giả không cần thiết.

### Hợp đồng backend

Các đường dẫn là hợp đồng mục tiêu để backend và app chốt cùng nhau; tên chính xác có thể đổi, còn semantic phải giữ.

| Mục tiêu               | REST đề xuất                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `SEARCH_BOOK`          | `GET /books?query=&field=&page=`; hỗ trợ title, ISBN, author, category và fuzzy match                                                |
| `GET_BOOK_DETAIL`      | `GET /books/{bookId}`; gồm availability và location/shelf metadata                                                                   |
| `SEARCH_FACILITY`      | `GET /facilities?query=`; trả facility/area phù hợp                                                                                  |
| `GET_FACILITY_DETAIL`  | `GET /facilities/{facilityId}`; gồm type, description và location                                                                    |
| Bắt đầu guidance       | `POST /guidance-missions` với `bookId` hoặc `facilityId`, kiosk session id và workflow type `BOOK_GUIDANCE` hoặc `FACILITY_GUIDANCE` |
| Đọc/khôi phục workflow | `GET /guidance-missions/{missionId}`; trả current step, display data và status                                                       |
| `SAVE_RATING`          | `POST /guidance-missions/{missionId}/feedback`; chỉ gọi sau `RATING_SUBMIT`, không gọi khi timeout/skip                              |

Hub SignalR phải cung cấp payload có version/type rõ ràng cho `MissionStatusChanged`, `MissionStepChanged`, `RobotStatusChanged`, `RobotPositionUpdated`, `RobotBatteryUpdated`, `RobotConnectionChanged` và `NotificationCreated`. `MissionStepChanged` phải đủ dữ liệu để mobile render các state `NAV_GUIDE`, `ARRIVED`, `RATING` hoặc `HOME` của flow 01/02. App chỉ render dữ liệu đã validate/mapped; event sai schema phải bị bỏ qua, log chẩn đoán và không làm hỏng màn hình kiosk.

Backend chịu trách nhiệm xác thực kiosk, rate limit, authorization, idempotency khi tạo mission, ghép robot phù hợp, chuyển lệnh sang ROS2, persistence, kiểm kê và audit log.

## 4. Dependencies và native configuration

### Hệ thống giao diện

Mobile dùng light theme đồng bộ với web: primary `#0056D2`, secondary/background `#F8F9FA`, tertiary/warning `#A93802`, foreground `#17181C`, muted `#757780`, border `#D9DCE5`, accent `#EAF1FF`, success `#16A34A`, error `#C62828` và disabled `#9CA3AF`. Surface là `#FFFFFF`.

Typography dùng Inter với các weight Regular, Medium, SemiBold, Bold và ExtraBold được load tại app root. Các token radius dùng 8, 12 và 16 px; card dùng shadow nhẹ. Icon UI dùng Lucide thay vì emoji hoặc Unicode symbols; emoji cảm xúc trong feedback có thể được giữ lại vì là nội dung đánh giá của người dùng, không phải icon hệ thống.

### Responsive contract: phone và tablet

Kiosk Android landscape vẫn là deployment ưu tiên, nhưng **mọi UI mới phải adaptive ngay lần triển khai đầu tiên** cho phone, tablet portrait và tablet landscape. Không chấp nhận kế hoạch “làm tablet sau” hoặc sửa riêng từng screen sau khi feature đã hoàn thành. iOS/iPad và Android dùng cùng một route và cùng feature composition; chỉ layout thay đổi theo không gian hiển thị.

| Width class (logical dp) | Khoảng rộng | Hành vi layout mặc định                                                                 |
| ------------------------ | ----------- | --------------------------------------------------------------------------------------- |
| Compact                  | `< 600`     | Một cột, action xếp dọc hoặc bottom action bar, list ưu tiên hơn grid.                  |
| Medium                   | `600–839`   | Nội dung vẫn ưu tiên một luồng chính; có thể dùng hai cột khi card/field còn dễ đọc.    |
| Expanded                 | `≥ 840`     | Container có `maxWidth`, grid hoặc detail/map hai pane, action quan trọng luôn dễ chạm. |

- Đo theo window width bằng logical dp và safe-area inset; không dùng tên model máy, pixel vật lý, hay một độ phân giải cố định để quyết định layout.
- Đặt hook/layout primitives dùng chung và responsive spacing/type tokens ở `src/shared` (ví dụ `useWindowDimensions`, safe-area-aware page/container, responsive grid). Screen chỉ chọn composition từ những primitive đó; không tự sao chép breakpoint hoặc tạo route/screen riêng cho phone và tablet.
- Dùng `flex`, `minWidth`/`maxWidth`, `gap`, `flexWrap`, scroll container và giới hạn độ rộng đọc được thay cho `width`/`height` cố định. Map, danh sách kết quả, detail và CTA phải co giãn hợp lý khi đổi orientation hoặc split-screen/resized window.
- Khi orientation/size class đổi, không được làm mất search input, selection, scroll context hay mission/workflow đang theo dõi. Keyboard, notch/safe area và text scaling phải không che CTA hay nội dung quan trọng.
- Touch target tối thiểu 44 × 44dp. Không phụ thuộc hover, chuột, hoặc landscape để người dùng hoàn tất tác vụ.
- Acceptance UI của mỗi feature bắt buộc kiểm tra compact phone portrait (~360dp), tablet portrait (~768dp) và expanded tablet landscape (~1024dp), gồm loading/empty/error, chuỗi tiếng Việt dài, form khi keyboard mở và guidance đang hoạt động.

Giữ các dependency domain-neutral hiện có:

- Expo Router, React Native, TypeScript và React Native Maps.
- TanStack Query, Zustand, Axios, `@microsoft/signalr`, NetInfo.
- React Hook Form, Zod, Secure Store.

Các dependency kiosk/build đã thêm theo Expo SDK 57 bằng `npx expo install`:

- `expo-dev-client`: development build nội bộ, thay vì dựa vào Expo Go cho native feature.
- `expo-screen-orientation`: khóa landscape cho màn hình tablet robot.
- `expo-keep-awake`: dùng trong root kiosk layout khi màn hình cần luôn sáng.
- `expo-system-ui`: màu system bar đồng nhất với kiosk.
- `expo-splash-screen`: splash được cấu hình qua config plugin.

Không thêm dependency của Jjoy chỉ vì là app tham chiếu: Supabase, SQLite, YouTube/WebView, FlashList, bottom sheet và thư viện học tiếng Nhật không có giá trị cho LiBot. Chỉ cân nhắc thêm một dependency mới khi có use case và giới hạn native/platform rõ ràng.

`app.config.ts` thay `app.json` để config có type. Giá trị `com.yourorg.libot` là placeholder bắt buộc phải đổi thành reverse-domain identifier thuộc tổ chức trước EAS build đầu tiên; sau khi phát hành lên store không được đổi tùy tiện. Cấu hình chạy landscape, iPad full screen và adaptive icon ở config/plugin. Không tạo hoặc sửa tay `ios/` và `android/`; Expo Continuous Native Generation tạo chúng khi cần.

## 5. Environment, phát triển và build

### Biến môi trường

`.env.example` là template công khai; không commit `.env`.

```dotenv
EXPO_PUBLIC_API_URL=https://api.example.com/api
EXPO_PUBLIC_SIGNALR_URL=https://api.example.com/hubs
EXPO_PUBLIC_MAP_PROVIDER=google
```

`EXPO_PUBLIC_*` được nhúng vào app client, vì vậy không để secret trong các biến này. Secret ký build, key private hoặc token server-side phải được quản lý qua EAS Environment/Secrets hoặc backend, không nằm trong repository hay app config.

### Vòng lặp dev

1. Cài đúng lockfile: `npm ci`.
2. Dùng `npm run start`/Expo Go cho kiểm tra UI/TypeScript nhanh, chỉ khi các native module đang dùng có trong Expo Go tương ứng.
3. Dùng development build làm đường phát triển chính: `npm run dev`, sau khi đã cài app development client trên thiết bị/emulator.
4. Khi thay native dependency hoặc `app.config.ts`, chạy `npx expo prebuild --clean` nếu build local cần native folders, sau đó `npm run android` hoặc `npm run ios`. Không commit native folders sinh ra.

Development build có thể tạo cloud qua `npx eas-cli@latest build --platform android --profile development`, không đòi hỏi Android Studio/Xcode local. Chỉ cần rebuild native binary khi native dependency, app config hoặc Expo SDK đổi; thay đổi TypeScript/JS bình thường chỉ cần restart Metro.

### EAS profiles

`eas.json` cung cấp ba profile:

| Profile       | Dùng cho                | Android                          | iOS                                              |
| ------------- | ----------------------- | -------------------------------- | ------------------------------------------------ |
| `development` | Lập trình/debug nội bộ  | Dev client internal distribution | Dev client internal distribution                 |
| `preview`     | QA tablet robot và demo | APK internal, dễ sideload        | Internal distribution/TestFlight theo credential |
| `production`  | Phát hành               | AAB store build                  | Archive store build                              |

Thiết lập EAS lần đầu bằng `npx eas-cli@latest login` và `npx eas-cli@latest build:configure`. Owner của Expo organization chịu trách nhiệm sở hữu Android keystore và Apple credentials; không export credential vào source tree. Các lệnh build tiêu chuẩn:

```bash
npx eas-cli@latest build --platform android --profile development
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform all --profile production
```

Trước preview Android, xác nhận APK đã cài trên tablet robot, display landscape đúng, touch target hoạt động, app không sleep trong phiên hướng dẫn, layout vượt qua các width class compact/medium/expanded và connectivity với backend trên mạng thực.

## 6. Chất lượng và acceptance checklist

`npm run validate` chạy theo thứ tự typecheck, lint, unit test, `expo install --check` và `expo-doctor`. Chạy lệnh này trước mỗi build preview/production và sau mọi thay đổi dependency/config native. `npm audit` được theo dõi riêng: không chạy `npm audit fix --force` tự động vì có thể thay dependency ngoài phạm vi SDK.

Test tối thiểu cần có:

- Unit test mapper/validator, query key, reducer/store kiosk và logic idle timeout.
- Mock REST cho tìm thấy sách, không có kết quả, sách unavailable, timeout và server error.
- Mock SignalR cho event đúng, reconnect, event sai schema, mission complete/cancel/error.
- Navigation test flow 01: idle → book search → book detail → map → guidance → arrived → feedback → idle; test nhánh rate từ detail/map và các timeout 10/15 giây.
- Navigation test flow 02: idle → facility search → facility detail → map → guidance → arrived → feedback → idle; test nhánh rate từ detail/map và các timeout 10/15 giây.
- Manual device test: compact phone portrait, Android tablet portrait/landscape/touch, orientation/resize giữ nguyên workflow, offline/reconnect, APK cài đặt; iOS development và preview build tạo thành công.

Tiêu chí hoàn thành feature: route mỏng, một composition adaptive dùng chung cho phone/tablet (không duplicate screen), feature không gọi ROS2 trực tiếp, loading/empty/error được render nhất quán, không tạo mission trùng, subscription cleanup đúng khi rời màn hình, responsive acceptance chạy đủ ba width class, và pipeline kiểm tra chạy xanh.
