import { supabase } from './supabase';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID!;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!;
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

export interface StravaConnection {
  id: string;
  member_id: string;
  strava_athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
  };
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  distance: number; // meters
  moving_time: number; // seconds
  start_date_local: string;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token exchange failed: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(connection: StravaConnection): Promise<StravaConnection> {
  const expiresAt = new Date(connection.expires_at);
  const now = new Date();

  // Still valid (with 5 min buffer)
  if (expiresAt.getTime() - 5 * 60 * 1000 > now.getTime()) {
    return connection;
  }

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token refresh failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const newExpiresAt = new Date(data.expires_at * 1000).toISOString();

  const { error } = await supabase
    .from('strava_connections')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: newExpiresAt,
    })
    .eq('id', connection.id);

  if (error) throw error;

  return {
    ...connection,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: newExpiresAt,
  };
}

/**
 * Fetch running activities from Strava for a given connection
 */
export async function fetchStravaActivities(
  connection: StravaConnection,
  after?: number
): Promise<StravaActivity[]> {
  const refreshed = await refreshAccessToken(connection);

  const allActivities: StravaActivity[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    if (after) params.set('after', String(after));

    const res = await fetch(`${STRAVA_API_BASE}/athlete/activities?${params}`, {
      headers: { Authorization: `Bearer ${refreshed.access_token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Strava API error: ${res.status} ${text}`);
    }

    const activities: StravaActivity[] = await res.json();
    if (activities.length === 0) break;

    // Filter to only running activities
    const runs = activities.filter(
      (a) => a.type === 'Run' || a.sport_type === 'Run'
    );
    allActivities.push(...runs);

    if (activities.length < perPage) break;
    page++;
  }

  return allActivities;
}

/**
 * Get Strava connection for a member
 */
export async function getStravaConnection(memberId: string): Promise<StravaConnection | null> {
  const { data, error } = await supabase
    .from('strava_connections')
    .select('*')
    .eq('member_id', memberId)
    .single();

  if (error || !data) return null;
  return data as StravaConnection;
}
