export interface GarminAuthTokens {
  oauthToken: string;
  oauthTokenSecret: string;
  oauth2AccessToken: string;
  oauth2RefreshToken: string;
  oauth2TokenType: string;
  oauth2Scope: string;
  oauth2ExpiresAt: number;
  oauth2RefreshExpiresAt: number;
  mfaToken?: string | null;
  displayName?: string;
}

export interface GarminCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface GarminHealthData {
  steps: number;
  distance?: number; // in meters
  calories?: number;
  activeMinutes?: number;
  heartRate?: number; // resting heart rate
  sleep?: {
    duration?: number; // in minutes
    deepSleep?: number; // in minutes
    lightSleep?: number; // in minutes
    remSleep?: number; // in minutes
    awake?: number; // in minutes
  };
  weight?: number; // in kg
  weightDate?: string; // date when weight was logged (may be different from main date)
  date: string;
}

export interface GarminUser {
  userId: string;
  displayName?: string;
  email?: string;
}

