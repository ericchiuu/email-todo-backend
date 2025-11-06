const express = require('express');
const { google } = require('googleapis');
const supabase = require('../utils/supabase');

const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Generate auth URL
router.get('/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  });
  res.json({ authUrl });
});

// Handle OAuth callback
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Store tokens in Supabase
    const { data, error } = await supabase
      .from('users')
      .upsert({
        email: userInfo.data.email,
        name: userInfo.data.name,
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        token_expiry: new Date(tokens.expiry_date),
      }, { onConflict: 'email' })
      .select()
      .single();

    if (error) throw error;

    // Redirect to app with user ID
    res.redirect(`myapp://auth-success?userId=${data.id}`);
  } catch (error) {
    console.error('Auth error:', error);
    res.redirect('myapp://auth-error');
  }
});

module.exports = router;