import { FacilityArea } from "../features/facilities/types/facility.types";

export const facilitiesMock: FacilityArea[] = [
  {
    id: "fac-reading-1",
    name: "Khu vực Đọc Sách Yên Tĩnh (Quiet Reading Zone)",
    type: "Reading Zone",
    floor: 1,
    description:
      "Khu vực bàn học cá nhân yên tĩnh, trang bị ổ cắm điện và đèn học chuyên dụng.",
    location: {
      lat: 10.7769,
      lng: 106.7009,
    },
  },
  {
    id: "fac-shelf-a",
    name: "Dãy Kệ Sách Kỹ Thuật Phần Mềm (Shelf A)",
    type: "Bookshelf Area",
    floor: 2,
    shelfCode: "A-12",
    description:
      "Lưu trữ giáo trình và sách tham khảo lập trình, kiến trúc phần mềm và hệ thống.",
    location: {
      lat: 10.7772,
      lng: 106.7012,
    },
  },
  {
    id: "fac-shelf-r",
    name: "Dãy Kệ Sách Robotics & Tự Động Hóa (Shelf R)",
    type: "Bookshelf Area",
    floor: 3,
    shelfCode: "R-02",
    description:
      "Tài liệu chuyên ngành kỹ thuật robot, cơ điện tử và điều khiển tự động.",
    location: {
      lat: 10.7775,
      lng: 106.7015,
    },
  },
  {
    id: "fac-dock-1",
    name: "Trạm Sạc & Điểm Xuất Phát LiBot (Robot Dock 01)",
    type: "Robot Dock",
    floor: 1,
    description:
      "Vị trí đỗ và tiếp năng lượng mặc định của robot LiBot trung tâm.",
    location: {
      lat: 10.7765,
      lng: 106.7005,
    },
  },
];
