import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing code from Zoho' }, { status: 400 });
  }

  const clientId = process.env.ZOHO_CLIENT_ID!;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET!;
  const redirectUri = process.env.ZOHO_REDIRECT_URI!;

  try {
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      },
    });

    const { access_token, refresh_token, expires_in } = response.data;

    // TODO: Store securely in Supabase (or wherever you're persisting user auth)

    console.log('Access Token:', access_token);
    console.log('Refresh Token:', refresh_token);

    return NextResponse.redirect(new URL('/subscriptions', req.url));
  } catch (error: any) {
    console.error('Token exchange failed:', error.response?.data || error.message);
    return NextResponse.json({ error: 'Token exchange failed' }, { status: 500 });
  }
}
