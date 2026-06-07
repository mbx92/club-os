/**
 * Google Drive OAuth Refresh Token Helper
 *
 * Usage:
 *   NODE_ENV=development node scripts/googleDriveOAuthHelper.js
 *   npm run google:drive:oauth
 *
 * Required env:
 *   GOOGLE_DRIVE_OAUTH_CLIENT_ID
 *   GOOGLE_DRIVE_OAUTH_CLIENT_SECRET
 *
 * Optional env:
 *   GOOGLE_DRIVE_OAUTH_REDIRECT_URI  (default: http://127.0.0.1:8787/oauth2callback)
 *   GOOGLE_DRIVE_OAUTH_SCOPE         (default: https://www.googleapis.com/auth/drive.file)
 */

const http = require('http');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const axios = require('axios');

const env = process.argv[2] || process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
const envFilePath = path.resolve(process.cwd(), envFile);

dotenv.config();
if (fs.existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath, override: true });
}

const clientId = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI || 'http://127.0.0.1:8787/oauth2callback';
const scope = process.env.GOOGLE_DRIVE_OAUTH_SCOPE || 'https://www.googleapis.com/auth/drive.file';
const tokenUri = process.env.GOOGLE_DRIVE_OAUTH_TOKEN_URI || 'https://oauth2.googleapis.com/token';

if (!clientId || !clientSecret) {
  console.error('Missing GOOGLE_DRIVE_OAUTH_CLIENT_ID or GOOGLE_DRIVE_OAUTH_CLIENT_SECRET in env.');
  process.exit(1);
}

let parsedRedirect;
try {
  parsedRedirect = new URL(redirectUri);
} catch (error) {
  console.error(`Invalid GOOGLE_DRIVE_OAUTH_REDIRECT_URI: ${error.message}`);
  process.exit(1);
}

const state = crypto.randomBytes(24).toString('hex');

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', scope);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');
authUrl.searchParams.set('state', state);

async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  }).toString();

  const response = await axios.post(tokenUri, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data;
}

const server = http.createServer(async (req, res) => {
  try {
    const callbackUrl = new URL(req.url, redirectUri);

    if (callbackUrl.pathname !== parsedRedirect.pathname) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    const error = callbackUrl.searchParams.get('error');
    const returnedState = callbackUrl.searchParams.get('state');
    const code = callbackUrl.searchParams.get('code');

    if (error) {
      res.statusCode = 400;
      res.end(`OAuth error: ${error}`);
      console.error(`OAuth error returned by Google: ${error}`);
      server.close(() => process.exit(1));
      return;
    }

    if (returnedState !== state) {
      res.statusCode = 400;
      res.end('Invalid state');
      console.error('State mismatch. Aborting for safety.');
      server.close(() => process.exit(1));
      return;
    }

    if (!code) {
      res.statusCode = 400;
      res.end('Missing authorization code');
      console.error('Authorization code not found in callback.');
      server.close(() => process.exit(1));
      return;
    }

    const tokenData = await exchangeCodeForToken(code);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Google OAuth completed. You can close this tab and return to your terminal.');

    console.log('\nOAuth exchange succeeded.\n');
    console.log('Add these values to your env:\n');
    console.log(`GOOGLE_DRIVE_OAUTH_CLIENT_ID=${clientId}`);
    console.log(`GOOGLE_DRIVE_OAUTH_CLIENT_SECRET=${clientSecret}`);
    console.log(`GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN=${tokenData.refresh_token || ''}`);

    if (!tokenData.refresh_token) {
      console.log('\nNo refresh token was returned.');
      console.log('If you already authorized this app before, revoke access for the app/account and run this script again.');
      console.log('Google may only issue a refresh token on a fresh consent flow.');
    }

    console.log('\nToken response summary:');
    console.log(JSON.stringify({
      scope: tokenData.scope,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      has_refresh_token: !!tokenData.refresh_token,
    }, null, 2));

    server.close(() => process.exit(0));
  } catch (error) {
    res.statusCode = 500;
    res.end('OAuth exchange failed');
    console.error(`OAuth exchange failed: ${error.message}`);
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
    server.close(() => process.exit(1));
  }
});

server.listen(Number(parsedRedirect.port || 80), parsedRedirect.hostname, () => {
  console.log(`Listening for OAuth callback on ${redirectUri}`);
  console.log('\nOpen this URL in your browser:\n');
  console.log(authUrl.toString());
  console.log('\nAfter you approve access, the script will capture the callback and print the refresh token.\n');
});
