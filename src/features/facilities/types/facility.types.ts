export type FacilityType = "ENDPOINT";

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
  mapId?: string;
}

export interface FacilitySearchPage {
  items: FacilitySearchItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface FacilitiesRepository {
  search(filter?: FacilitySearchFilter): Promise<FacilitySearchItem[]>;
  searchPage?(
    filter?: FacilitySearchFilter & { page?: number; pageSize?: number },
  ): Promise<FacilitySearchPage>;
  getById(facilityId: string): Promise<FacilityDetail | null>;
}

