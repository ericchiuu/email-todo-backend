const express = require('express');
const { google } = require('googleapis');
const supabase = require('../utils/supabase');
const { parseEmailForTasks } = require('../utils/gemini');

const router = express.Router();

// Sync emails for a user
router.post('/sync', async (req, res) => {
  const { userId } = req.body;

  try {
    // Get user tokens from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Setup Gmail API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: user.google_access_token,
      refresh_token: user.google_refresh_token,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get unread emails from last 7 days
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread newer_than:7d',
      maxResults: 20,
    });

    const messages = response.data.messages || [];
    let tasksCreated = 0;

    for (const message of messages) {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });

      // Extract email content
      const headers = msg.data.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      
      let body = '';
      if (msg.data.payload.body.data) {
        body = Buffer.from(msg.data.payload.body.data, 'base64').toString();
      } else if (msg.data.payload.parts) {
        const textPart = msg.data.payload.parts.find(
          part => part.mimeType === 'text/plain'
        );
        if (textPart && textPart.body.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString();
        }
      }

      // Parse with Gemini
      const tasks = await parseEmailForTasks(body, subject);

      // Save tasks to Supabase
      for (const task of tasks) {
        if (task.title && task.title.trim()) {
          await supabase.from('tasks').insert({
            user_id: userId,
            title: task.title,
            description: task.description,
            due_date: task.due_date,
            due_time: task.due_time,
            priority: task.priority,
            category: task.category,
            source_email_id: message.id,
            completed: false,
          });
          tasksCreated++;
        }
      }
    }

    res.json({
      success: true,
      emailsProcessed: messages.length,
      tasksCreated,
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;