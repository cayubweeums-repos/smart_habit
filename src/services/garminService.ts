import OAuth from 'oauth-1.0a';
import hmacSHA1 from 'crypto-js/hmac-sha1';
import encBase64 from 'crypto-js/enc-base64';
import {
  GarminHealthData,
  GarminUser,
  GarminAuthTokens,
  GarminCredentials,
} from '../types';
import {
  saveGarminTokens,
  loadGarminTokens,
  clearGarminTokens,
  saveGarminHealthData,
  loadGarminHealthData,
  getLastSyncTimestamp,
} from '../storage';

const GARTH_CONSUMER_ENDPOINT = 'https://thegarth.s3.amazonaws.com/oauth_consumer.json';
const SSO_BASE = 'https://sso.garmin.com/sso';
const CONNECTAPI_BASE = 'https://connectapi.garmin.com';
const MOBILE_USER_AGENT = 'com.garmin.android.apps.connectmobile';
const EMBED_PARAMS = {
  id: 'gauth-widget',
  embedWidget: 'true',
  gauthHost: SSO_BASE,
};
const SIGNIN_PARAMS = {
  ...EMBED_PARAMS,
  gauthHost: `${SSO_BASE}/embed`,
  service: `${SSO_BASE}/embed`,
  source: `${SSO_BASE}/embed`,
  redirectAfterAccountLoginUrl: `${SSO_BASE}/embed`,
  redirectAfterAccountCreationUrl: `${SSO_BASE}/embed`,
};

// Prevent multiple simultaneous login attempts
let isLoggingIn = false;
let lastLoginAttempt = 0;
const MIN_LOGIN_INTERVAL = 10000; // 10 seconds minimum between login attempts

type OAuthConsumer = {
  consumer_key: string;
  consumer_secret: string;
};

type OAuth1Response = {
  oauth_token: string;
  oauth_token_secret: string;
  mfa_token?: string | null;
};

type OAuth2Response = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  scope: string;
  expires_at: number;
  expires_in: number;
  refresh_token_expires_at: number;
  refresh_token_expires_in: number;
};

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

let cachedConsumer: OAuthConsumer | null = null;
let cachedProfile: GarminUser | null = null;

export async function isGarminAuthenticated(): Promise<boolean> {
  const tokens = await loadGarminTokens();
  if (!tokens) {
    return false;
  }
  return tokens.oauth2ExpiresAt > Date.now();
}

export async function signInWithGarmin(credentials: GarminCredentials): Promise<boolean> {
  const email = credentials.email?.trim();
  if (!email || !credentials.password) {
    const error = new Error('Email and password are required to connect Garmin.');
    console.error('[Garmin Login Error]', error);
    throw error;
  }

  // Prevent multiple simultaneous login attempts
  const now = Date.now();
  if (isLoggingIn) {
    const error = new Error('A login attempt is already in progress. Please wait.');
    console.log('[Garmin] Login already in progress, rejecting duplicate attempt');
    throw error;
  }

  // Rate limiting: don't attempt login if we tried recently
  if (now - lastLoginAttempt < MIN_LOGIN_INTERVAL) {
    const error = new Error('Please wait before attempting to login again.');
    console.log('[Garmin] Rate limited: too soon after last login attempt');
    throw error;
  }

  // Check if already authenticated before attempting login
  const alreadyAuthenticated = await isGarminAuthenticated();
  if (alreadyAuthenticated) {
    console.log('[Garmin] Already authenticated, skipping login');
    return true;
  }

  isLoggingIn = true;
  lastLoginAttempt = now;

  try {
    console.log('[Garmin] Starting login process...');
    const tokens = await performCredentialLogin(email, credentials.password, credentials.mfaCode);
    console.log('[Garmin] Login successful, fetching user profile...');
    const profile = await fetchUserProfile(tokens);

    const enrichedTokens: GarminAuthTokens = {
      ...tokens,
      displayName: profile?.displayName ?? tokens.displayName,
    };

    await saveGarminTokens(enrichedTokens);
    cachedProfile = profile;
    console.log('[Garmin] Login completed successfully');
    return true;
  } catch (error: any) {
    // Handle rate limiting errors (429) gracefully
    if (error?.message?.includes('429') || error?.status === 429) {
      console.error('[Garmin] Rate limited by Garmin. Please wait before trying again.');
      // Update last attempt time to enforce longer backoff
      lastLoginAttempt = now;
    }
    console.error('[Garmin Login Error]', {
      message: error?.message,
      stack: error?.stack,
      email: email, // Log email for debugging (not password)
    });
    throw error;
  } finally {
    isLoggingIn = false;
  }
}

export async function logoutGarmin(): Promise<void> {
  cachedProfile = null;
  await clearGarminTokens();
}

/**
 * Fetch Garmin health data for a specific date
 * First checks local cache, then fetches from API if needed
 */
export async function fetchGarminHealthData(
  date: string,
  forceRefresh: boolean = false
): Promise<GarminHealthData | null> {
  // Check cache first unless forcing refresh
  if (!forceRefresh) {
    const cached = await loadGarminHealthData(date);
    if (cached) {
      return cached;
    }
  }

  const tokens = await ensureGarminTokens();
  if (!tokens) {
    // Return cached data if available even if not authenticated
    return await loadGarminHealthData(date);
  }

  try {
    const profile = await fetchUserProfile(tokens);
    const displayName = profile?.displayName ?? tokens.displayName;
    const userId = profile?.userId;

    if (!displayName) {
      // Return cached data if available
      return await loadGarminHealthData(date);
    }

    // Fetch all health data in parallel
    const [summary, sleepData, weightData] = await Promise.allSettled([
      connectApiRequest<any>(
        `/usersummary-service/usersummary/daily/${encodeURIComponent(displayName)}`,
        tokens,
        {
          params: { calendarDate: date },
        }
      ),
      fetchSleepData(displayName, date, tokens),
      fetchWeightData(displayName, userId, date, tokens),
    ]);

    const summaryResult = summary.status === 'fulfilled' ? summary.value : null;
    const sleepResult = sleepData.status === 'fulfilled' ? sleepData.value : null;
    const weightResult = weightData.status === 'fulfilled' ? weightData.value : null;

    // Log sleep and weight results
    if (sleepResult) {
      console.log('[Garmin] Sleep data fetched successfully');
    } else {
      console.log('[Garmin] Sleep data not available or failed:', sleepData.status === 'rejected' ? sleepData.reason?.message : 'no data');
    }
    
    if (weightResult) {
      console.log('[Garmin] Weight data fetched successfully:', weightResult);
    } else {
      console.log('[Garmin] Weight data not available or failed:', weightData.status === 'rejected' ? weightData.reason?.message : 'no data');
    }

    // Log summary data structure to help debug weight fields
    if (summaryResult) {
      console.log('[Garmin] Summary data keys:', Object.keys(summaryResult).slice(0, 30).join(', '));
      // Log any fields that might contain weight
      const weightLikeKeys = Object.keys(summaryResult).filter(key => 
        /weight|body|mass|scale/i.test(key)
      );
      if (weightLikeKeys.length > 0) {
        console.log('[Garmin] Weight-like fields found:', weightLikeKeys.join(', '));
        weightLikeKeys.forEach(key => {
          console.log(`[Garmin] ${key}:`, summaryResult[key]);
        });
      }
    }

    if (!summaryResult) {
      // Return cached data if available
      return await loadGarminHealthData(date);
    }

    const healthData = mapSummaryToHealthData(summaryResult, date, sleepResult, weightResult);
    
    // Save to local cache
    await saveGarminHealthData(date, healthData);
    
    return healthData;
  } catch (error: any) {
    console.error('[Garmin Health Data Error]', {
      date,
      message: error?.message,
      stack: error?.stack,
    });
    // Return cached data if available on error
    const cached = await loadGarminHealthData(date);
    if (cached) {
      console.log('[Garmin] Using cached data due to error');
    }
    return cached;
  }
}

/**
 * Sync Garmin health data for today
 * Called on app launch and periodically
 */
export async function syncGarminHealthData(): Promise<GarminHealthData | null> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return fetchGarminHealthData(today, true); // Force refresh for sync
}

export async function getGarminUser(): Promise<GarminUser | null> {
  const tokens = await ensureGarminTokens();
  if (!tokens) {
    return null;
  }
  return fetchUserProfile(tokens);
}

async function performCredentialLogin(
  email: string,
  password: string,
  mfaCode?: string
): Promise<GarminAuthTokens> {
  console.log('[Garmin] Performing credential login...');
  const embedUrl = buildUrl(`${SSO_BASE}/embed`, EMBED_PARAMS);
  await fetchText(embedUrl);

  const signinUrl = buildUrl(`${SSO_BASE}/signin`, SIGNIN_PARAMS);
  const signinHtml = await fetchText(signinUrl, {
    headers: { Referer: embedUrl },
  });

  const csrfToken = extractCsrf(signinHtml);
  const formBody = new URLSearchParams({
    username: email,
    password,
    embed: 'true',
    _csrf: csrfToken,
  }).toString();

  let loginHtml = await fetchText(signinUrl, {
    method: 'POST',
    headers: {
      Referer: signinUrl,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  });

  let title = extractTitle(loginHtml);

  if (/MFA/i.test(title)) {
    if (!mfaCode) {
      const error = new Error('Garmin MFA is enabled. Please provide the MFA code.');
      console.error('[Garmin Login Error]', error);
      throw error;
    }
    console.log('[Garmin] Submitting MFA code...');
    loginHtml = await submitMfaCode(loginHtml, mfaCode);
    title = extractTitle(loginHtml);
  }

  if (title !== 'Success') {
    const error = new Error(`Garmin login failed: ${title}`);
    console.error('[Garmin Login Error]', {
      title,
      message: error.message,
    });
    throw error;
  }

  console.log('[Garmin] Login successful, extracting ticket...');
  const ticket = extractTicket(loginHtml);
  if (!ticket) {
    const error = new Error('Unable to parse Garmin SSO ticket.');
    console.error('[Garmin Login Error]', {
      message: error.message,
      htmlSnippet: loginHtml.substring(0, 200), // Log first 200 chars for debugging
    });
    throw error;
  }

  const consumer = await fetchOAuthConsumer();
  const oauth1 = await fetchOAuth1Token(ticket, consumer);
  const oauth2 = await exchangeOAuth2Token(oauth1, consumer);

  return mapTokens(oauth1, oauth2);
}

async function fetchOAuthConsumer(): Promise<OAuthConsumer> {
  if (cachedConsumer) {
    return cachedConsumer;
  }

  const response = await fetch(GARTH_CONSUMER_ENDPOINT);
  if (!response.ok) {
    const error = new Error('Unable to fetch Garmin OAuth consumer keys.');
    console.error('[Garmin OAuth Error]', {
      status: response.status,
      statusText: response.statusText,
      message: error.message,
    });
    throw error;
  }

  cachedConsumer = (await response.json()) as OAuthConsumer;
  return cachedConsumer;
}

async function fetchOAuth1Token(ticket: string, consumer: OAuthConsumer): Promise<OAuth1Response> {
  const baseUrl = `${CONNECTAPI_BASE}/oauth-service/oauth/preauthorized`;
  const query = {
    ticket,
    'login-url': `${SSO_BASE}/embed`,
    'accepts-mfa-tokens': 'true',
  };

  const oauthClient = buildOAuthClient(consumer);
  const authHeader = oauthClient.toHeader(
    oauthClient.authorize({
      url: baseUrl,
      method: 'GET',
      data: query,
    })
  );

  const response = await fetch(buildUrl(baseUrl, query), {
    method: 'GET',
    headers: {
      ...authHeader,
      'User-Agent': MOBILE_USER_AGENT,
    },
  });

  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`Garmin OAuth1 token request failed: ${text}`);
    console.error('[Garmin OAuth1 Error]', {
      status: response.status,
      statusText: response.statusText,
      responseText: text.substring(0, 500),
      message: error.message,
    });
    throw error;
  }

  const params = new URLSearchParams(text);
  const oauth_token = params.get('oauth_token');
  const oauth_token_secret = params.get('oauth_token_secret');
  const mfa_token = params.get('mfa_token');

  if (!oauth_token || !oauth_token_secret) {
    const error = new Error('Invalid OAuth1 response from Garmin.');
    console.error('[Garmin OAuth1 Error]', {
      message: error.message,
      responseText: text.substring(0, 200),
    });
    throw error;
  }

  return {
    oauth_token,
    oauth_token_secret,
    mfa_token: mfa_token ?? undefined,
  };
}

async function exchangeOAuth2Token(
  oauth1: OAuth1Response,
  consumer: OAuthConsumer
): Promise<OAuth2Response> {
  const url = `${CONNECTAPI_BASE}/oauth-service/oauth/exchange/user/2.0`;
  const data = oauth1.mfa_token ? { mfa_token: oauth1.mfa_token } : {};

  const oauthClient = buildOAuthClient(consumer);
  const authHeader = oauthClient.toHeader(
    oauthClient.authorize(
      {
        url,
        method: 'POST',
        data,
      },
      {
        key: oauth1.oauth_token,
        secret: oauth1.oauth_token_secret,
      }
    )
  );

  const body = new URLSearchParams(
    Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v != null)
    ) as Record<string, string>
  ).toString();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeader,
      'User-Agent': MOBILE_USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const text = await response.text();

  if (!response.ok) {
    const error = new Error(`Garmin OAuth2 exchange failed: ${text}`);
    console.error('[Garmin OAuth2 Error]', {
      status: response.status,
      statusText: response.statusText,
      responseText: text.substring(0, 500),
      message: error.message,
    });
    throw error;
  }

  return JSON.parse(text) as OAuth2Response;
}

function mapTokens(oauth1: OAuth1Response, oauth2: OAuth2Response): GarminAuthTokens {
  return {
    oauthToken: oauth1.oauth_token,
    oauthTokenSecret: oauth1.oauth_token_secret,
    oauth2AccessToken: oauth2.access_token,
    oauth2RefreshToken: oauth2.refresh_token,
    oauth2TokenType: oauth2.token_type,
    oauth2Scope: oauth2.scope,
    oauth2ExpiresAt: oauth2.expires_at * 1000,
    oauth2RefreshExpiresAt: oauth2.refresh_token_expires_at * 1000,
    mfaToken: oauth1.mfa_token ?? undefined,
  };
}

async function ensureGarminTokens(
  initial?: GarminAuthTokens | null
): Promise<GarminAuthTokens | null> {
  let tokens = initial ?? (await loadGarminTokens());
  if (!tokens) {
    return null;
  }

  if (tokens.oauth2ExpiresAt <= Date.now()) {
    try {
      tokens = await refreshOAuth2(tokens);
    } catch (error: any) {
      // If refresh fails, try to re-login with saved credentials
      console.log('[Garmin] Token refresh failed, attempting re-login with saved credentials...');
      const { loadGarminCredentials } = await import('../storage/settingsStorage');
      const savedCredentials = await loadGarminCredentials();
      
      if (savedCredentials && savedCredentials.password) {
        // Check if we're already logging in or recently attempted
        const now = Date.now();
        if (isLoggingIn || (now - lastLoginAttempt < MIN_LOGIN_INTERVAL)) {
          console.log('[Garmin] Skipping re-login: already in progress or too soon after last attempt');
          throw error;
        }

        try {
          isLoggingIn = true;
          lastLoginAttempt = now;
          console.log('[Garmin] Re-logging in with saved credentials...');
          const newTokens = await performCredentialLogin(
            savedCredentials.email,
            savedCredentials.password
          );
          const profile = await fetchUserProfile(newTokens);
          const enrichedTokens: GarminAuthTokens = {
            ...newTokens,
            displayName: profile?.displayName ?? newTokens.displayName,
          };
          await saveGarminTokens(enrichedTokens);
          cachedProfile = profile;
          console.log('[Garmin] Re-login successful');
          return enrichedTokens;
        } catch (reLoginError: any) {
          // Handle rate limiting
          if (reLoginError?.message?.includes('429') || reLoginError?.status === 429) {
            console.error('[Garmin] Re-login rate limited by Garmin');
            lastLoginAttempt = now;
          } else {
            console.error('[Garmin] Re-login failed:', reLoginError?.message);
          }
          // Re-throw original refresh error
          throw error;
        } finally {
          isLoggingIn = false;
        }
      } else {
        // No saved credentials, throw original error
        throw error;
      }
    }
  }

  return tokens;
}

async function refreshOAuth2(tokens: GarminAuthTokens): Promise<GarminAuthTokens> {
  try {
    console.log('[Garmin] Refreshing OAuth2 token...');
    const consumer = await fetchOAuthConsumer();
    const oauth1: OAuth1Response = {
      oauth_token: tokens.oauthToken,
      oauth_token_secret: tokens.oauthTokenSecret,
      mfa_token: tokens.mfaToken,
    };

    const oauth2 = await exchangeOAuth2Token(oauth1, consumer);
    const updated: GarminAuthTokens = {
      ...tokens,
      oauth2AccessToken: oauth2.access_token,
      oauth2RefreshToken: oauth2.refresh_token,
      oauth2TokenType: oauth2.token_type,
      oauth2Scope: oauth2.scope,
      oauth2ExpiresAt: oauth2.expires_at * 1000,
      oauth2RefreshExpiresAt: oauth2.refresh_token_expires_at * 1000,
    };

    await saveGarminTokens(updated);
    console.log('[Garmin] OAuth2 token refreshed successfully');
    return updated;
  } catch (error: any) {
    console.error('[Garmin OAuth2 Refresh Error]', {
      message: error?.message,
      stack: error?.stack,
    });
    throw error;
  }
}

async function fetchUserProfile(tokens: GarminAuthTokens): Promise<GarminUser | null> {
  if (cachedProfile) {
    return cachedProfile;
  }

  if (tokens.displayName) {
    cachedProfile = {
      userId: tokens.displayName,
      displayName: tokens.displayName,
    };
  }

  try {
    const profile = await connectApiRequest<any>(
      '/userprofile-service/socialProfile',
      tokens
    );

    if (!profile) {
      return cachedProfile;
    }

    const garminUser: GarminUser = {
      userId: profile.profileId?.toString() ?? profile.userId?.toString() ?? 'garmin-user',
      displayName: profile.displayName ?? profile.userName ?? tokens.displayName,
      email: profile.primaryEmail,
    };

    if (garminUser.displayName && garminUser.displayName !== tokens.displayName) {
      tokens.displayName = garminUser.displayName;
      await saveGarminTokens(tokens);
    }

    cachedProfile = garminUser;
    return garminUser;
  } catch (error: any) {
    console.error('[Garmin Profile Error]', {
      message: error?.message,
      stack: error?.stack,
    });
    return cachedProfile;
  }
}

async function connectApiRequest<T = any>(
  path: string,
  tokens?: GarminAuthTokens,
  options: {
    method?: HttpMethod;
    params?: Record<string, string>;
    body?: any;
  } = {}
): Promise<T> {
  const method = options.method ?? 'GET';
  const url = new URL(`${CONNECTAPI_BASE}${path}`);

  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const activeTokens = await ensureGarminTokens(tokens);
  if (!activeTokens) {
    const error = new Error('Garmin account is not connected.');
    console.error('[Garmin API Error]', {
      message: error.message,
      url: url.toString(),
    });
    throw error;
  }

  const headers: Record<string, string> = {
    'User-Agent': MOBILE_USER_AGENT,
    Accept: 'application/json',
    Authorization: `${activeTokens.oauth2TokenType} ${activeTokens.oauth2AccessToken}`,
  };

  let body: string | undefined;
  if (options.body) {
    body = JSON.stringify(options.body);
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body,
  });

  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();

  if (!response.ok) {
    // Log full error details to console
    console.error('[Garmin API Error]', {
      status: response.status,
      statusText: response.statusText,
      url: url.toString(),
      method,
      responseText: text.substring(0, 500), // Log first 500 chars to avoid huge logs
    });
    
    // Format user-friendly error message
    let errorMessage = `Garmin API error (${response.status})`;
    if (response.status === 401) {
      errorMessage = 'Garmin authentication failed. Please check your credentials and try again.';
    } else if (response.status === 404) {
      errorMessage = 'Garmin data not found. The requested resource does not exist.';
    } else if (response.status >= 500) {
      errorMessage = 'Garmin server error. Please try again later.';
    } else if (text && !text.startsWith('<!DOCTYPE')) {
      // If response is JSON, try to extract error message
      try {
        const json = JSON.parse(text);
        if (json.message || json.error) {
          errorMessage = json.message || json.error;
        }
      } catch {
        // Not JSON, use default message
      }
    }
    
    throw new Error(errorMessage);
  }

  return text ? (JSON.parse(text) as T) : (null as T);
}

async function fetchSleepData(
  displayName: string,
  date: string,
  tokens: GarminAuthTokens
): Promise<any | null> {
  try {
    console.log('[Garmin Sleep] Fetching sleep data for', date);
    const sleepData = await connectApiRequest<any>(
      `/wellness-service/wellness/dailySleepData/${encodeURIComponent(displayName)}`,
      tokens,
      {
        params: { date },
      }
    );
    console.log('[Garmin Sleep] Sleep data raw response keys:', Object.keys(sleepData || {}).slice(0, 20).join(', '));
    return normalizeSleepPayload(sleepData);
  } catch (error: any) {
    // Sleep data might not be available for all dates, log but don't fail
    if (error?.message?.includes('404') || error?.message?.includes('not found')) {
      console.log('[Garmin Sleep] No sleep data available for', date);
    } else {
      console.error('[Garmin Sleep Data Error]', {
        date,
        message: error?.message,
      });
    }
    return null;
  }
}

async function fetchWeightData(
  displayName: string,
  userId: string | undefined,
  date: string,
  tokens: GarminAuthTokens
): Promise<{ weight?: number; weightDate?: string } | null> {
  try {
    // Based on python-garminconnect library actual API calls:
    // 1. First try /weight-service/weight/dateRange (GET with query params) - returns dateWeightList array
    // 2. Fallback to /userprofile-service/userprofile/user-settings - returns userData.weight (profile weight in grams)
    
    // Primary: weight-service/weight/dateRange (GET method, as shown in Python library)
    try {
      const weightRange = await connectApiRequest<{
        startDate: string;
        endDate: string;
        dateWeightList: Array<{
          samplePk?: number;
          date?: string;
          calendarDate?: string;
          weight?: number;
          bmi?: number;
          bodyFat?: number;
          bodyWater?: number;
          boneMass?: number;
          muscleMass?: number;
          physiqueRating?: number;
          visceralFat?: number;
          metabolicAge?: number;
          timestamp?: number;
        }>;
        totalAverage?: {
          weight?: number;
          bmi?: number;
          bodyFat?: number;
          bodyWater?: number;
          boneMass?: number;
          muscleMass?: number;
          physiqueRating?: number;
          visceralFat?: number;
          metabolicAge?: number;
        };
      }>(
        '/weight-service/weight/dateRange',
        tokens,
        {
          method: 'GET',
          params: {
            startDate: date,
            endDate: date,
          },
        }
      );

      console.log('[Garmin Weight] weight-service/weight/dateRange response:', JSON.stringify(weightRange).substring(0, 500));

      // Check dateWeightList for today's weight
      if (weightRange?.dateWeightList && weightRange.dateWeightList.length > 0) {
        // Find weight entry for the requested date
        let weightEntry = weightRange.dateWeightList.find((entry: any) => {
          const entryDate = entry.calendarDate || entry.date;
          return entryDate === date;
        });
        
        // If no exact match, use first entry
        if (!weightEntry) {
          weightEntry = weightRange.dateWeightList[0];
        }

        const entryDate = weightEntry.calendarDate || weightEntry.date;
        const weight = parseWeightValue(weightEntry);
        const weightDate = parseWeightDate(weightEntry) || entryDate || date;

        if (weight) {
          console.log('[Garmin Weight] Found weight in dateWeightList:', weight, 'kg on', weightDate);
          return { weight, weightDate };
        }
      }

      // If no weight in dateWeightList, check totalAverage
      if (weightRange?.totalAverage?.weight) {
        const weight = weightRange.totalAverage.weight / 1000; // Convert grams to kg
        console.log('[Garmin Weight] Found weight in totalAverage:', weight, 'kg');
        return { weight, weightDate: date };
      }
    } catch (weightServiceError: any) {
      // Continue to fallback if this fails
      if (!weightServiceError?.message?.includes('405') && !weightServiceError?.message?.includes('NotAllowedException')) {
        console.log('[Garmin Weight] weight-service/weight/dateRange failed:', weightServiceError?.message);
      }
    }

    // Fallback: Try to get historical weight (last 60 days)
    const sixtyDaysAgo = new Date(date);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const startDate = sixtyDaysAgo.toISOString().split('T')[0];

    try {
      const weightRange = await connectApiRequest<{
        startDate: string;
        endDate: string;
        dateWeightList: Array<any>;
        totalAverage?: any;
      }>(
        '/weight-service/weight/dateRange',
        tokens,
        {
          method: 'GET',
          params: {
            startDate,
            endDate: date,
          },
        }
      );

      console.log('[Garmin Weight] Historical weight range response:', JSON.stringify(weightRange).substring(0, 1000));

      if (weightRange?.dateWeightList && weightRange.dateWeightList.length > 0) {
        // Get the most recent weight entry
        const sortedWeights = weightRange.dateWeightList
          .map((entry: any) => {
            const weight = parseWeightValue(entry);
            const weightDate = parseWeightDate(entry);
            return { weight, weightDate, entry };
          })
          .filter((item: any) => item.weight)
          .sort((a: any, b: any) => {
            const dateA = new Date(a.weightDate || 0).getTime();
            const dateB = new Date(b.weightDate || 0).getTime();
            return dateB - dateA; // Most recent first
          });

        if (sortedWeights.length > 0) {
          const lastWeight = sortedWeights[0];
          console.log('[Garmin Weight] Found most recent weight:', lastWeight.weight, 'kg on', lastWeight.weightDate);
          return { weight: lastWeight.weight ?? undefined, weightDate: lastWeight.weightDate ?? date };
        }
      }
    } catch (rangeError: any) {
      if (!rangeError?.message?.includes('405') && !rangeError?.message?.includes('NotAllowedException')) {
        console.log('[Garmin Weight] Historical weight range failed:', rangeError?.message);
      }
    }

    // Final fallback: Get weight from user profile settings (profile weight in grams)
    try {
      const userSettings = await connectApiRequest<{
        id?: number;
        userData?: {
          weight?: number; // in grams
          height?: number;
          measurementSystem?: string;
        };
      }>(
        '/userprofile-service/userprofile/user-settings',
        tokens
      );

      console.log('[Garmin Weight] User profile settings response:', JSON.stringify(userSettings).substring(0, 500));

      if (userSettings?.userData?.weight) {
        const weight = userSettings.userData.weight / 1000; // Convert grams to kg
        console.log('[Garmin Weight] Found weight in user profile:', weight, 'kg');
        // Profile weight doesn't have a specific date, so use current date
        return { weight, weightDate: date };
      }
    } catch (profileError: any) {
      console.log('[Garmin Weight] User profile settings failed:', profileError?.message);
    }

    console.log('[Garmin Weight] No weight data found from any source');
    return null;
  } catch (error: any) {
    // Weight data might not be available or endpoint might not be accessible
    // Handle 405 (Method Not Allowed) and 404 (Not Found) gracefully
    if (
      error?.message?.includes('405') ||
      error?.message?.includes('Method Not Allowed') ||
      error?.message?.includes('NotAllowedException') ||
      error?.message?.includes('404') ||
      error?.message?.includes('not found')
    ) {
      console.log('[Garmin] Weight data endpoint not accessible or no weight data available for', date);
      return null;
    } else {
      console.error('[Garmin Weight Data Error]', {
        date,
        message: error?.message,
      });
      return null;
    }
  }
}

/**
 * Parse weight value from various possible field names and units
 * Returns weight in kg
 * Based on python-garminconnect library field names
 */
function parseWeightValue(entry: any): number | null {
  if (!entry) return null;

  // Try all possible weight field names (including body composition fields)
  const weightFields = [
    // Direct weight fields
    'weight',
    'value',
    'weightInGrams',
    'weightInKg',
    'weightInPounds',
    'weightInLbs',
    'bodyWeight',
    'bodyWeightInGrams',
    'bodyWeightInKg',
    'bodyWeightInPounds',
    'bodyWeightInLbs',
    'weightValue',
    'weightValueInGrams',
    'weightValueInKg',
    'weightValueInPounds',
    'weightValueInLbs',
    // Body composition fields (from python-garminconnect)
    'weightInKilograms',
    'weightInPounds',
    'weightInGrams',
    'totalWeight',
    'currentWeight',
    'latestWeight',
    'bodyCompositionWeight',
  ];

  for (const field of weightFields) {
    const value = entry[field];
    if (value != null && typeof value === 'number' && value > 0) {
      // Convert to kg based on field name
      if (field.includes('Pounds') || field.includes('Lbs') || field.includes('lbs')) {
        return value * 0.453592; // Convert pounds to kg
      } else if (field.includes('Grams') || field.includes('grams')) {
        return value / 1000; // Convert grams to kg
      } else if (field.includes('Kg') || field.includes('kg')) {
        return value; // Already in kg
      } else {
        // Default: assume grams if value is large (> 100), otherwise assume kg
        return value > 100 ? value / 1000 : value;
      }
    }
  }

  // Also check nested objects (common in body composition responses)
  if (entry.weightData) {
    const nested = parseWeightValue(entry.weightData);
    if (nested) return nested;
  }

  if (entry.bodyComposition) {
    const nested = parseWeightValue(entry.bodyComposition);
    if (nested) return nested;
  }

  // Check for bodyCompositionDTO (common structure from body-composition-service)
  if (entry.bodyCompositionDTO) {
    const nested = parseWeightValue(entry.bodyCompositionDTO);
    if (nested) return nested;
  }

  // Check for nested weight object
  if (entry.weight && typeof entry.weight === 'object') {
    const nested = parseWeightValue(entry.weight);
    if (nested) return nested;
  }

  return null;
}

/**
 * Parse weight date from various possible field names
 */
function parseWeightDate(entry: any): string | null {
  if (!entry) return null;

  const dateFields = [
    'date',
    'dateTime',
    'startDate',
    'endDate',
    'timestamp',
    'logDate',
    'measurementDate',
    'dateTimeStamp',
  ];

  for (const field of dateFields) {
    const value = entry[field];
    if (value) {
      // Try to parse as date
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      }
    }
  }

  return null;
}

function normalizeSleepPayload(payload: any): any {
  if (!payload) {
    return null;
  }

  if (payload.dailySleepDTO) {
    return {
      source: 'dailySleepDTO',
      ...payload.dailySleepDTO,
    };
  }

  if (Array.isArray(payload.dailySleepDTOList) && payload.dailySleepDTOList.length > 0) {
    return {
      source: 'dailySleepDTOList',
      ...payload.dailySleepDTOList[payload.dailySleepDTOList.length - 1],
    };
  }

  if (payload.sleepSummaryDTO) {
    return {
      source: 'sleepSummaryDTO',
      ...payload.sleepSummaryDTO,
    };
  }

  return payload;
}

function extractSleepFromSummary(summary: any): any | null {
  if (!summary) {
    return null;
  }

  const sleepingSeconds =
    summary.sleepingSeconds ??
    summary.sleepDurationInSeconds ??
    summary.totalSleepTimeSeconds ??
    summary.totalSleepingSeconds ??
    null;

  if (!sleepingSeconds) {
    return null;
  }

  return {
    source: 'summary',
    sleepTimeSeconds: sleepingSeconds,
    lightSleepSeconds: summary.lightSleepSeconds,
    deepSleepSeconds: summary.deepSleepSeconds,
    remSleepSeconds: summary.remSleepSeconds,
    awakeSleepSeconds: summary.awakeSeconds ?? summary.awakeSleepSeconds,
  };
}

function mapSummaryToHealthData(
  summary: any,
  date: string,
  sleepData?: any | null,
  weightData?: { weight?: number; weightDate?: string } | null
): GarminHealthData {
  const steps =
    summary.steps ??
    summary.totalSteps ??
    summary.stepCount ??
    summary.activeSteps ??
    0;

  const distance =
    summary.distance ??
    summary.totalDistanceMeters ??
    summary.distanceInMeters ??
    summary.totalDistance ??
    undefined;

  const calories =
    summary.caloriesTotal ??
    summary.calories ??
    summary.totalKilocalories ??
    summary.activeKilocalories ??
    undefined;

  const activeMinutes =
    summary.activeMinutes ??
    (summary.activeTimeInSeconds
      ? Math.round(summary.activeTimeInSeconds / 60)
      : undefined);

  const heartRate =
    summary.restingHeartRate ??
    summary.averageHeartRateInBeatsPerMinute ??
    summary.averageHeartRate ??
    undefined;

  // Check if weight is in summary data (fallback if weight endpoint is not accessible)
  let weight = weightData?.weight;
  let weightDate = weightData?.weightDate;
  
  if (!weight && summary) {
    // Try to get weight from summary data using comprehensive parsing
    console.log('[Garmin Weight] Checking summary data for weight fields...');
    const summaryWeight = parseWeightValue(summary);
    
    if (summaryWeight) {
      weight = summaryWeight;
      weightDate = parseWeightDate(summary) ?? date; // Use parsed date or fallback to current date
      console.log('[Garmin Weight] Found weight in summary:', weight, 'kg on', weightDate);
    } else {
      // Log summary keys to help debug
      console.log('[Garmin Weight] Summary keys:', Object.keys(summary).slice(0, 20).join(', '));
    }
  }

  // Map sleep data - check both sleepData and summary
  let sleep: GarminHealthData['sleep'] | undefined;
  
  const normalizedSleepData = normalizeSleepPayload(sleepData);
  const summarySleepData = extractSleepFromSummary(summary);
  const sleepSource = normalizedSleepData ?? summarySleepData;
  const sleepSourceName = normalizedSleepData ? 'sleep endpoint' : summarySleepData ? 'summary data' : 'none';
  
  if (sleepSource) {
    console.log(`[Garmin Sleep] Mapping sleep data from ${sleepSourceName}, keys:`, Object.keys(sleepSource).slice(0, 30).join(', '));
    
    // Try multiple possible field names for sleep duration
    const sleepDuration =
      sleepSource.sleepTimeSeconds ??
      sleepSource.totalSleepTimeSeconds ??
      sleepSource.duration ??
      sleepSource.sleepDurationSeconds ??
      sleepSource.totalSleepDurationSeconds ??
      sleepSource.sleepDuration ??
      (sleepSource.sleepingSeconds ? sleepSource.sleepingSeconds : undefined) ??
      (sleepSource.sleepTimeMinutes ? sleepSource.sleepTimeMinutes * 60 : undefined) ??
      (sleepSource.totalSleepTimeMinutes ? sleepSource.totalSleepTimeMinutes * 60 : undefined) ??
      undefined;
    
    const deepSleep =
      sleepSource.deepSleepSeconds ??
      sleepSource.deepSleepTimeSeconds ??
      sleepSource.deepSleepDurationSeconds ??
      (sleepSource.deepSleepMinutes ? sleepSource.deepSleepMinutes * 60 : undefined) ??
      undefined;
    
    const lightSleep =
      sleepSource.lightSleepSeconds ??
      sleepSource.lightSleepTimeSeconds ??
      sleepSource.lightSleepDurationSeconds ??
      (sleepSource.lightSleepMinutes ? sleepSource.lightSleepMinutes * 60 : undefined) ??
      undefined;
    
    const remSleep =
      sleepSource.remSleepSeconds ??
      sleepSource.remSleepTimeSeconds ??
      sleepSource.remSleepDurationSeconds ??
      sleepSource.remDurationSeconds ??
      (sleepSource.remSleepMinutes ? sleepSource.remSleepMinutes * 60 : undefined) ??
      undefined;
    
    const awake =
      sleepSource.awakeSleepSeconds ??
      sleepSource.awakeTimeSeconds ??
      sleepSource.awakeDurationSeconds ??
      sleepSource.awakeDuration ??
      (sleepSource.awakeMinutes ? sleepSource.awakeMinutes * 60 : undefined) ??
      undefined;

    console.log('[Garmin Sleep] Parsed values:', {
      sleepDuration,
      deepSleep,
      lightSleep,
      remSleep,
      awake,
    });

    if (sleepDuration || deepSleep || lightSleep || remSleep || awake) {
      sleep = {
        duration: sleepDuration ? Math.round(sleepDuration / 60) : undefined,
        deepSleep: deepSleep ? Math.round(deepSleep / 60) : undefined,
        lightSleep: lightSleep ? Math.round(lightSleep / 60) : undefined,
        remSleep: remSleep ? Math.round(remSleep / 60) : undefined,
        awake: awake ? Math.round(awake / 60) : undefined,
      };
      console.log('[Garmin Sleep] Mapped sleep object:', sleep);
    } else {
      console.log('[Garmin Sleep] No valid sleep duration found in data');
    }
  } else {
    console.log('[Garmin Sleep] No sleep data provided to mapper');
  }

  const result = {
    steps,
    distance,
    calories,
    activeMinutes,
    heartRate,
    sleep,
    weight,
    weightDate,
    date,
  };

  console.log('[Garmin] Final health data:', {
    hasSteps: !!steps,
    hasDistance: !!distance,
    hasCalories: !!calories,
    hasHeartRate: !!heartRate,
    hasSleep: !!sleep,
    sleepDuration: sleep?.duration,
    hasWeight: !!weight,
    weightValue: weight,
    weightDate,
  });

  return result;
}

async function submitMfaCode(currentHtml: string, mfaCode: string): Promise<string> {
  try {
    const csrfToken = extractCsrf(currentHtml);
    if (!csrfToken) {
      const error = new Error('Unable to parse MFA verification form.');
      console.error('[Garmin MFA Error]', {
        message: error.message,
        htmlSnippet: currentHtml.substring(0, 300),
      });
      throw error;
    }

    const url = buildUrl(`${SSO_BASE}/verifyMFA/loginEnterMfaCode`, SIGNIN_PARAMS);

    const body = new URLSearchParams({
      'mfa-code': mfaCode,
      embed: 'true',
      _csrf: csrfToken,
      fromPage: 'setupEnterMfaCode',
    }).toString();

    return await fetchText(url, {
      method: 'POST',
      headers: {
        Referer: buildUrl(`${SSO_BASE}/signin`, SIGNIN_PARAMS),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
  } catch (error: any) {
    console.error('[Garmin MFA Submit Error]', {
      message: error?.message,
      stack: error?.stack,
    });
    throw error;
  }
}

function buildUrl(base: string, params?: Record<string, string>): string {
  if (!params) {
    return base;
  }
  const search = new URLSearchParams(params);
  return `${base}?${search.toString()}`;
}

async function fetchText(
  url: string,
  options: RequestInit & { body?: string } = {}
): Promise<string> {
  const headers: Record<string, string> = {
    'User-Agent': MOBILE_USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body,
    credentials: 'include',
  });

  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`[Garmin] ${response.status}: ${text}`);
    console.error('[Garmin HTTP Error]', {
      url,
      method: options.method ?? 'GET',
      status: response.status,
      statusText: response.statusText,
      responseText: text.substring(0, 500), // Log first 500 chars
      message: error.message,
    });
    throw error;
  }

  return text;
}

function extractCsrf(html: string): string {
  const match = html.match(/name="_csrf"\s+value="(.+?)"/i);
  if (!match) {
    const error = new Error('Unable to locate Garmin CSRF token.');
    console.error('[Garmin CSRF Error]', {
      message: error.message,
      htmlSnippet: html.substring(0, 500), // Log first 500 chars for debugging
    });
    throw error;
  }
  return match[1];
}

function extractTitle(html: string): string {
  const match = html.match(/<title>(.+?)<\/title>/i);
  if (!match) {
    return 'Unknown';
  }
  return match[1];
}

function extractTicket(html: string): string | null {
  const match = html.match(/embed\?ticket=([^"]+)"/);
  return match ? match[1] : null;
}

function buildOAuthClient(consumer: OAuthConsumer) {
  return new OAuth({
    consumer: {
      key: consumer.consumer_key,
      secret: consumer.consumer_secret,
    },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString: string, key: string) {
      return hmacSHA1(baseString, key).toString(encBase64);
    },
  });
}

