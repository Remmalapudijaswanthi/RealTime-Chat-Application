const { google } = require('googleapis');

/**
 * Sends an email using Gmail REST API (HTTP Port 443)
 * This is the MOST reliable method for Render/Railway because it 
 * bypasses SMTP ports (465/587) which are often blocked.
 */
const sendEmail = async (to, subject, html) => {
  try {
    const OAuth2 = google.auth.OAuth2;
    const oauth2Client = new OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.REFRESH_TOKEN
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create the RFC 2822 message
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `From: "PingMe" <${process.env.GMAIL_USER}>`,
      `To: ${to}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      `Subject: ${utf8Subject}`,
      '',
      html,
    ];
    const message = messageParts.join('\n');

    // The body needs to be base64url encoded.
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log("Email sent successfully using Gmail REST API! ✅");
    return res.data;
  } catch (error) {
    console.error('Gmail API Error:', error.message);
    if (error.response && error.response.data) {
      console.error('Google Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
};

module.exports = { sendEmail };
