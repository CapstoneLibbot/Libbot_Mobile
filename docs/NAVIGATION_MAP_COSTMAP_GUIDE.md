# Hướng dẫn navigation map và costmap cho LiBot

## Mục tiêu và ranh giới hệ thống

LiBot có ba phần phối hợp với nhau:

```text
Người dùng kiosk
       │ REST / SignalR
Expo mobile ─── ASP.NET Core backend ─── Robot bridge trên LAN ─── ROS 2 / Nav2
                                                                    │
                                                      LiDAR, odometry, TF, map
```

Mobile chỉ là giao diện hướng dẫn. Robot mới là nơi quyết định đường đi, tránh vật cản và dừng an toàn. Backend là ranh giới bảo mật và điều phối: nó tạo mission, kiểm tra dữ liệu, gửi lệnh cho robot bridge và chiếu trạng thái đã được chuẩn hoá sang REST/SignalR.

Không để Expo app gọi ROS 2, Nav2, LiDAR hoặc motor trực tiếp. Không để app tự tính đường đi hay tự tạo costmap.

## Map hiện có là gì

`docs/maps/library_map.yaml` tham chiếu tới `library_map.pgm`. Đây là một ROS static occupancy map:

| Thuộc tính               | Giá trị              |
| ------------------------ | -------------------- |
| Kích thước ảnh           | 278 × 198 cells      |
| Resolution               | 0.05 m/cell          |
| Kích thước vật lý xấp xỉ | 13.9 × 9.9 m         |
| Origin map frame         | `[0.0539, 0.028, 0]` |
| Chế độ                   | `trinary`            |

PGM biểu diễn ô trống, vật cản và vùng chưa biết. YAML mô tả cách chuyển pixel sang tọa độ mét trong frame `map`. Nó **không** là costmap, **không** là bản đồ GPS và không nên được tải xuống mobile để điều hướng.

Map này nên được robot/Nav2 tải qua map server. Khi map thay đổi, lưu một `mapVersion` mới và chỉ kích hoạt sau khi đã kiểm tra localization, các điểm đích và khu vực an toàn.

## Static map, localization, costmap và navigation

Đây là luồng chuẩn từ lúc khảo sát thư viện tới lúc robot dẫn người dùng:

1. Dùng SLAM để khảo sát không gian, tạo occupancy map; dọn map và lưu PGM/YAML đã kiểm tra.
2. Khi vận hành hằng ngày, dùng localization để robot đặt pose hiện tại lên static map đã lưu. Không chạy SLAM thay thế localization trong mission bình thường.
3. Nav2 dựng costmap từ nhiều layer:
   - **Static layer:** nội dung của static map.
   - **Obstacle layer:** chướng ngại vật động từ LiDAR; raytrace dùng để xoá vùng đã quan sát lại là trống.
   - **Inflation layer:** nở vùng nguy hiểm quanh tường/vật cản theo footprint, padding và khoảng cách an toàn.
4. Nav2 dùng **global costmap** để lập kế hoạch từ vị trí hiện tại tới đích, và **local costmap** dạng rolling window để điều khiển và tránh người/vật cản gần robot.
5. Planner/controller của Nav2 gửi lệnh vận tốc; Nav2 có thể replan hoặc thực hiện recovery nếu đường bị chặn.

Costmap không phải ảnh nền để đẹp hơn. Nó là dữ liệu an toàn phục vụ kiểm tra va chạm và lập kế hoạch. Nav2 định nghĩa nó là lưới chi phí với free, occupied và inflated cells; static, obstacle và inflation là các plugin mặc định thường dùng. Xem [Nav2 Environmental Representation](https://docs.nav2.org/rolling/getting_started/navigation_concepts/environmental_representation/) và [Nav2 Costmap2D](https://docs.nav2.org/rolling/configuration_and_development/configuration_guide/core_servers/costmap_2d/).

### Tham số cần đo và tune trên robot thật

- `robot_base_frame`, `map`, `odom` và toàn bộ TF phải nhất quán.
- Khai báo footprint polygon đúng kích thước robot; chỉ dùng `robot_radius` khi robot thực sự gần hình tròn.
- Thêm footprint padding; chọn inflation radius lớn hơn nửa bề rộng robot và phù hợp khoảng cách dừng an toàn.
- Chọn resolution giữ chi tiết cần thiết nhưng vừa tài nguyên. Map hiện tại là 0.05 m/cell, một điểm khởi đầu hợp lý cho nhà sách/thư viện nhỏ.
- Tune `cost_scaling_factor`, obstacle/raytrace range, update frequency và controller bằng thử nghiệm vật thật: lối hẹp, người đi bộ, chân bàn/kệ, góc cua và bề mặt phản xạ LiDAR.

Không đưa robot vào khu vực công cộng trước khi thử goal success, goal unreachable, vật cản động, localization failure, cancel và Nav2 restart.

## Phân chia trách nhiệm

| Thành phần           | Sở hữu và thực hiện                                                                                                         | Không thực hiện                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Robot + ROS2/Nav2    | Static map, TF, LiDAR, localization, global/local costmap, planning, control, replanning, recovery và dừng an toàn          | Tin cậy trực tiếp lệnh UI hay render giao diện người dùng              |
| Robot bridge         | Nhận lệnh đã xác thực từ backend, chuyển thành Nav2 goal/cancel, theo dõi feedback/result, phát pose/route/status chuẩn hoá | Expose ROS graph, LiDAR hoặc costmap trực tiếp ra internet/app         |
| ASP.NET Core backend | Map version, mission persistence, idempotency, phân quyền, destination lookup, dispatch, audit, REST và SignalR             | Tự điều khiển motor hoặc giả lập costmap                               |
| Expo kiosk           | Tải/cached floor-plan thân thiện, vẽ robot/đích/route, hiển thị trạng thái và gửi yêu cầu tạo/hủy mission                   | Gọi ROS2, tính global path, xử lý PGM/costmap hoặc quyết định recovery |

## Dữ liệu bản đồ và điểm đích

Tách hai loại asset:

1. **ROS navigation map:** PGM/YAML giữ ở robot/deployment Nav2, dùng cho navigation.
2. **Kiosk floor plan:** SVG/PNG đơn giản, có tên khu vực/kệ/lối đi; backend phân phối theo `mapVersion`, mobile cache để hiển thị.

Mỗi kệ sách hoặc facility trong database cần tối thiểu:

```json
{
  "id": "shelf-r-a12",
  "label": "Kệ A-12",
  "floor": "L1",
  "mapVersion": "library-l1-v3",
  "pose": { "x": 8.42, "y": 4.15, "yaw": 1.57 }
}
```

`x`, `y`, `yaw` luôn là mét/radian trong ROS `map` frame. Backend từ chối mission khi `destination.mapVersion` khác map version robot đang active. Cách này tránh việc robot được gửi tới tọa độ cũ sau khi map bị sửa.

### Export floor plan và coordinate transform

Không ép tọa độ indoor vào latitude/longitude. Pipeline export cần tạo:

- SVG/PNG semantic cho kiosk, có `mapVersion` trong URL hoặc manifest.
- `IndoorMapTransform` gồm độ rộng/cao asset, map origin, resolution và quy ước trục; hoặc một affine transform đã hiệu chuẩn.
- Điểm kiểm tra landmark: ít nhất dock, góc tường và một kệ đã đo trên thực địa.

Ảnh PGM thường có trục Y hướng xuống, còn ROS map frame có quy ước tọa độ khác. Renderer phải đảo/biến đổi Y đúng theo manifest thay vì hard-code công thức trong screen. Trước khi publish map version mới, vẽ pose của các landmark lên floor plan và xác nhận sai lệch nằm trong tolerance đã đặt ra.

## REST và SignalR contract tối thiểu

### REST

| Endpoint                                     | Ý nghĩa                                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `POST /guidance-missions`                    | Tạo mission idempotent với destination ID, workflow type và kiosk session ID; backend resolve pose và dispatch bridge.    |
| `GET /guidance-missions/{missionId}`         | Nguồn khôi phục sau reconnect; trả state snapshot, `mapVersion`, route revision, pose, destination và path hiển thị được. |
| `POST /guidance-missions/{missionId}/cancel` | Yêu cầu hủy; backend authorise, bridge cancel Nav2 goal, rồi chỉ trả terminal state sau khi robot xác nhận.               |
| `GET /maps/{mapVersion}/indoor-manifest`     | Trả URL SVG/PNG và coordinate transform cho kiosk.                                                                        |

Tạo mission phải dùng idempotency key gắn kiosk session để double tap/retry không tạo hai goal Nav2.

### Realtime events

Mọi event nên có `schemaVersion`, `occurredAt`, `missionId` hoặc `robotId` phù hợp.

```ts
type RobotPositionUpdated = {
  schemaVersion: 1;
  robotId: string;
  mapVersion: string;
  pose: { x: number; y: number; yaw: number };
  occurredAt: string;
};

type MissionStatusChanged = {
  schemaVersion: 1;
  missionId: string;
  status:
    "queued" | "navigating" | "replanning" | "arrived" | "cancelled" | "failed";
  displayMessage: string;
  occurredAt: string;
};

type MissionRouteChanged = {
  schemaVersion: 1;
  missionId: string;
  mapVersion: string;
  routeRevision: number;
  path: Array<{ x: number; y: number; yaw?: number }>;
  occurredAt: string;
};
```

Bridge chỉ phát `MissionRouteChanged` khi Nav2 tạo/replan một route mới. Kiosk thay polyline theo `routeRevision` tăng dần và animate robot theo pose; không stream costmap, scan hay dữ liệu cảm biến. Payload sai schema bị bỏ qua và log chẩn đoán, không làm hỏng màn hình.

## Kiosk guidance UX

Màn hình công cộng cần đơn giản:

- Nền floor plan, route màu xanh, robot icon có hướng, đích/kệ rõ ràng và legend.
- Copy dễ hiểu: “LiBot đang dẫn bạn tới Kệ A-12”, “Robot đang chọn lối đi an toàn”, “Đã đến nơi”.
- Hiển thị tiến độ/đích và nút **Hủy hành trình**. Backend mới quyết định hủy thành công; emergency stop vật lý luôn hoạt động độc lập.
- Khi reconnect, giữ snapshot cuối, báo đang kết nối lại, refetch mission và resubscribe SignalR.
- Không hiển thị laser scan, costmap, TF hoặc debug Nav2 cho độc giả. Nếu cần, làm trang admin riêng có authentication.

## Roadmap triển khai

1. **Robot navigation:** xác thực TF/odometry/LiDAR, localization và Nav2 goal cơ bản; cấu hình/tune global-local costmap trên robot thật.
2. **Robot bridge:** đóng gói giao tiếp Nav2 thành API bridge an toàn, có heartbeat, retry, mission correlation và terminal result.
3. **Backend:** thêm map version/destination pose, migration dữ liệu, dispatch/cancel workflow, REST snapshot và SignalR event validation.
4. **UI demo:** thay bản đồ GPS mock bằng indoor SVG/PNG + route/pose mock. Dùng prompt Antigravity trong `docs/ANTIGRAVITY_INDOOR_GUIDANCE_DEMO_PROMPT.md`.
5. **Tích hợp thật:** map manifest API, mission snapshot, SignalR, route replan, reconnect, cancel và kiểm thử thiết bị theo compact/medium/expanded widths.

## Checklist trước khi demo vận hành

- [ ] Robot localization ổn định trên map active.
- [ ] Footprint/inflation được đo và kiểm thử trên lối hẹp.
- [ ] Mỗi destination có pose, floor và mapVersion hợp lệ.
- [ ] Floor plan đã được hiệu chuẩn với landmark ROS.
- [ ] Mission tạo/hủy idempotent và có audit log.
- [ ] Replan hiển thị bằng route revision mới, không phải stream costmap.
- [ ] Kiosk xử lý loading, failed, cancel, arrived và offline/reconnect.
- [ ] Nút emergency stop vật lý đã thử độc lập với backend/mobile.
