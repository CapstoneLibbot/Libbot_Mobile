export interface FacilityArea {
  id: string;
  name: string;
  type: 'Library' | 'Study Hall' | 'Reading Zone' | 'Bookshelf Area' | 'Robot Dock';
  floor: number;
  description: string;
  shelfCode?: string;
  location: {
    lat: number;
    lng: number;
  };
}

export type Facility = FacilityArea;
