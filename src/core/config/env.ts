export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api',
  signalRUrl: process.env.EXPO_PUBLIC_SIGNALR_URL ?? 'http://localhost:5000/hubs',
  mapProvider: process.env.EXPO_PUBLIC_MAP_PROVIDER ?? 'google',
};

export const isDev = process.env.NODE_ENV !== 'production';
