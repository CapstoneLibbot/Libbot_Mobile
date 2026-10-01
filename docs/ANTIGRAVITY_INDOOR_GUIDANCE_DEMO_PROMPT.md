# Prompt cho Antigravity: Indoor guidance demo của LiBot

Sao chép nguyên prompt bên dưới vào Antigravity.

---

Bạn đang làm trong Expo/React Native repository `Libbot_Mobile`. Hãy triển khai một **demo UI mock-first** thay cho màn guidance hiện tại của kiosk robot LiBot. Mục tiêu là giúp team hình dung robot đang dẫn người dùng trong thư viện bằng bản đồ indoor, không phải xây tích hợp ROS2/backend thật.

## Bối cảnh bắt buộc

- Route hiện tại là `app/(kiosk)/guidance/[missionId].tsx`, render `src/features/guidance/screens/GuidanceScreen.tsx`.
- Guidance hiện dùng `src/shared/components/MobileMap.tsx` với `react-native-maps` và latitude/longitude giả. Điều này sai cho indoor ROS map; bỏ việc dùng `MobileMap` trong **guidance screen**.
- App đã có `react-native-svg`, Expo Router, TanStack Query, Zustand, Zod và responsive hook/theme. Không thêm dependency mới, không sửa tay `ios/` hoặc `android/`, không gọi ROS2, không gọi backend thật.
- Các token UI ở `src/shared/theme`; responsive hook hiện có ở `src/shared/hooks/useResponsiveLayout.ts`. Tuân thủ mobile/tablet first, safe areas, touch targets tối thiểu 44dp và không tạo route/screen riêng cho tablet.
- Map ROS hiện có `docs/maps/library_map.pgm` + YAML, 278×198 cells ở 0.05 m/cell, khoảng 13.9×9.9 m. Trong demo, dùng mock indoor floor plan local; không cần render PGM thô.

## Kết quả cần tạo

Thay UI của `GuidanceScreen` bằng một composition indoor-map có thể chạy qua route hiện có.

1. Tạo reusable component indoor map trong `src/shared/components` hoặc feature guidance, với:
   - Nền sơ đồ thư viện đơn giản từ SVG/PNG local hoặc SVG được vẽ trong component.
   - Overlay `react-native-svg` cho polyline route, robot marker có hướng yaw, destination marker, và legend.
   - Props rõ ràng cho `mapVersion`, transform, robot pose, destination pose, path và trạng thái mission.
   - Hàm/helper thuần để project ROS map-frame `{x, y}` (mét) sang pixel/viewBox; không dùng latitude/longitude.
   - Transform mock được tập trung một chỗ. Phải đảo/chuyển trục Y theo quy ước indoor asset, không rải công thức toạ độ trong screen.

2. Cập nhật mock mission cho đúng map hiện có:
   - `currentPose`, `destination` và toàn bộ `path` nằm trong khoảng x `0..13.9`, y `0..9.9`.
   - Giữ `yaw` bằng radians.
   - Mở rộng kiểu/demo view-model cục bộ, nếu cần, với `mapVersion: 'library-l1-v1'` và `routeRevision` số nguyên.

3. Thiết kế màn guidance bằng tiếng Việt:
   - **Expanded tablet (>= 840dp):** map lớn bên trái/phía ưu tiên, panel mission bên phải gồm đích, trạng thái, progress, hướng dẫn đi cùng robot và CTA.
   - **Compact/medium (< 840dp):** map đứng đầu, mission panel và CTA xếp một cột bên dưới; không mất state khi đổi orientation.
   - Map có route màu `colors.mapRoute`, robot màu `colors.robot`, đích màu `colors.destination`, legend và label “LiBot”/“Kệ đích”.
   - Robot marker thể hiện hướng từ `yaw`; không dùng pin Google Maps.
   - UI đang navigation hiển thị “LiBot đang dẫn bạn tới Kệ …” và lưu ý giữ khoảng cách an toàn.
   - CTA hủy vẫn có mặt cho trạng thái phù hợp, nhưng demo chỉ thay state local; không gọi repository cancel hoặc backend thật.

4. Thêm một **demo-only state switcher** dễ thấy cho reviewer. Nó chuyển local state qua:
   - `navigating`: route bình thường và progress.
   - `replanning`: thông báo “Robot đang chọn lối đi an toàn”, tăng `routeRevision`, đổi sang mock path thay thế.
   - `arrived`: robot trùng/kề destination, route hoàn thành và CTA sang feedback.
   - `cancelled`: route mờ/dừng, thông báo hành trình bị hủy và CTA quay về tìm kiếm.

   Switcher không dùng timer, không giả vờ là production control và phải được đánh dấu bằng label “Chế độ xem trước UI”. Không đưa switcher vào production contract/backend DTO.

5. Giữ loading/error/empty states hiện hữu hợp lý. Không phá vỡ route, kiosk store, feedback navigation, theme hay các feature không liên quan. Chỉ đổi guidance map presentation và mock presentation state cần thiết.

## Chất lượng và kiểm thử

- Viết unit test cho helper projection: map origin/bounds, góc Y đảo, robot/destination/path nằm đúng viewBox và output ổn định.
- Viết test cho state view-model: bốn trạng thái, route revision replan tăng, CTA/label đúng.
- Không dùng hard-coded độ phân giải thiết bị; dùng responsive primitives hiện có hoặc bổ sung một responsive contract chia compact `<600`, medium `600–839`, expanded `>=840` ở shared layer nếu cần.
- Kiểm tra thủ công UI ở khoảng 360dp, 768dp và 1024dp; gồm text tiếng Việt dài, safe area, đổi orientation và mọi demo state.
- Chạy `npm run typecheck` và `npm run lint`; báo rõ kết quả hoặc lỗi tồn tại không do thay đổi này.

## Tiêu chí hoàn thành

- Guidance route không còn dùng latitude/longitude giả hoặc `MobileMap` để hiển thị indoor robot mission.
- Reviewer mở một mission mock và thấy indoor map, planned route, robot heading, destination, status và state switcher.
- Replanning thay route bằng revision mới; arrived/cancelled có feedback/navigation phù hợp.
- Demo hoàn toàn mock-only: không có ROS2, Nav2, sensor, SignalR hay backend network calls mới.

Khi hoàn tất, tóm tắt file thay đổi, cách mở demo và kết quả typecheck/lint.
