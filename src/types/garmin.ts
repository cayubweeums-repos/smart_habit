export interface GarminAuthTokens {
  accessToken: string;
  accessTokenSecret: string;
  expiresAt?: string;
}

export interface GarminHealthData {
  steps: number;
  distance?: number; // in meters
  calories?: number;
  activeMinutes?: number;
  heartRate?: number;
  date: string;
}

export interface GarminUser {
  userId: string;
  displayName?: string;
  email?: string;
}

