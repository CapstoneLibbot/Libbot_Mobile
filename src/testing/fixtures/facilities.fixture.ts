import { FacilitySearchItem } from "@/features/facilities/types/facility.types";

export const facilitiesFixture: FacilitySearchItem[] = [
  {
    id: "fac-reading-1",
    name: "Phòng đọc yên tĩnh",
    type: "ENDPOINT", mapId: "map-1", mapName: "Library map",
  },
  {
    id: "fac-shelf-a",
    name: "Dãy Kệ Sách Kỹ Thuật Phần Mềm (Shelf A)",
    type: "ENDPOINT", mapId: "map-1", mapName: "Library map",
  },
  {
    id: "fac-shelf-r",
    name: "Dãy Kệ Sách Robotics & Tự Động Hóa (Shelf R)",
    type: "ENDPOINT", mapId: "map-1", mapName: "Library map",
  },
  {
    id: "fac-dock-1",
    name: "Trạm Sạc & Điểm Xuất Phát LiBot (Robot Dock 01)",
    type: "ENDPOINT", mapId: "map-1", mapName: "Library map",
  },
];
