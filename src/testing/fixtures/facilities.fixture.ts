import { FacilitySearchItem } from "@/features/facilities/types/facility.types";

export const facilitiesFixture: FacilitySearchItem[] = [
  {
    id: "fac-reading-1",
    name: "Khu vực Đọc Sách Yên Tĩnh (Quiet Reading Zone)",
    type: "READING_ROOM", mapId: "map-1", mapName: "Library map",
  },
  {
    id: "fac-shelf-a",
    name: "Dãy Kệ Sách Kỹ Thuật Phần Mềm (Shelf A)",
    type: "AREA", mapId: "map-1", mapName: "Library map",
  },
  {
    id: "fac-shelf-r",
    name: "Dãy Kệ Sách Robotics & Tự Động Hóa (Shelf R)",
    type: "AREA", mapId: "map-1", mapName: "Library map",
  },
  {
    id: "fac-dock-1",
    name: "Trạm Sạc & Điểm Xuất Phát LiBot (Robot Dock 01)",
    type: "AREA", mapId: "map-1", mapName: "Library map",
  },
];
