export type FacilityType = "AREA" | "READING_ROOM";

export interface FacilitySearchItem {
  id: string;
  name: string;
  type: FacilityType;
  mapId: string;
  mapName: string;
}

export interface FacilityEndpoint {
  endpointId: string;
  name: string;
  x: number;
  y: number;
  theta: number;
}

export interface FacilityDetail {
  id: string;
  name: string;
  type: FacilityType;
  description?: string | null;
  location: {
    mapId: string;
    mapName: string;
    mapWidth: number;
    mapHeight: number;
    endpoint: FacilityEndpoint;
  };
  actions: string[];
}

export interface FacilitySearchFilter {
  query?: string;
  type?: FacilityType;
}

export interface FacilitiesRepository {
  search(filter?: FacilitySearchFilter): Promise<FacilitySearchItem[]>;
  getById(facilityId: string): Promise<FacilityDetail | null>;
}

