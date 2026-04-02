import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { exchangeCodeForTokens } from '@/lib/strava';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const memberId = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  // User denied access
  if (error) {
    return Response.redirect(
      `https://bitrunners.kr/member/${encodeURIComponent(memberId || '')}?strava=denied`
    );
  }

  if (!code || !memberId) {
    return Response.json(
      { error: 'Missing code or state (member_id)' },
      { status: 400 }
    );
  }

  try {
    // Verify member exists
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return Response.json({ error: 'Member not found' }, { status: 404 });
    }

    // Exchange code for tokens
    const tokenData = await exchangeCodeForTokens(code);

    const expiresAt = new Date(tokenData.expires_at * 1000).toISOString();

    // Upsert strava_connections (update if member already connected)
    const { error: upsertError } = await supabase
      .from('strava_connections')
      .upsert(
        {
          member_id: memberId,
          strava_athlete_id: tokenData.athlete.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
        },
        { onConflict: 'member_id' }
      );

    if (upsertError) {
      console.error('Failed to store Strava connection:', upsertError);
      return Response.json(
        { error: 'Failed to store connection' },
        { status: 500 }
      );
    }

    // Redirect back to the member page with success
    return Response.redirect(
      `https://bitrunners.kr/member/${encodeURIComponent(member.name)}?strava=connected`
    );
  } catch (err) {
    console.error('Strava callback error:', err);
    return Response.redirect(
      `https://bitrunners.kr/member/${encodeURIComponent(memberId)}?strava=error`
    );
  }
}
