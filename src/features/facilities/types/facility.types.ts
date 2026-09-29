export interface Facility {
  id: string;
  name: string;
  type: 'Library' | 'Study Hall' | 'Reading Zone' | 'Store Room';
  floor: number;
  description: string;
  location: {
    lat: number;
    lng: number;
  };
}
