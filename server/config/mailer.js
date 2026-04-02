const nodemailer = require('nodemailer');
const { google } = require('googleapis');

/**
 * Sends an email using Gmail API (OAuth2)
 * This method is highly reliable on platforms like Render/Railway 
 * because it uses Port 443 (HTTPS) instead of blocked SMTP ports.
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

    // Generate accurate access token
    const accessToken = await new Promise((resolve, reject) => {
      oauth2Client.getAccessToken((err, token) => {
        if (err) {
          console.error("Failed to create access token :(", err);
          reject(err);
        }
        resolve(token);
      });
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: accessToken
      }
    });

    const mailOptions = {
      from: `PingMe <${process.env.GMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
      text: html.replace(/<[^>]*>?/gm, '') // Simple fallback for text-only clients
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully using Gmail API");
    return result;
  } catch (error) {
    console.error('Email Error:', error.message);
    throw error;
  }
};

module.exports = { sendEmail };
