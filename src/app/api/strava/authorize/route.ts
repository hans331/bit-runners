import { NextRequest } from 'next/server';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID!;
const CALLBACK_URL = 'https://bitrunners.kr/api/strava/callback';

export async function GET(request: NextRequest) {
  const memberId = request.nextUrl.searchParams.get('member_id');

  if (!memberId) {
    return Response.json({ error: 'member_id is required' }, { status: 400 });
  }

  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    response_type: 'code',
    redirect_uri: CALLBACK_URL,
    scope: 'activity:read_all',
    state: memberId,
    approval_prompt: 'auto',
  });

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?${params}`;

  return Response.redirect(stravaAuthUrl);
}
