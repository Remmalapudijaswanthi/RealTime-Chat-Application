module.exports = {
  getEmailTemplate: (otp, type) => {
    const titles = {
      register: 'Verify Your Email',
      login: 'Your Login Code',
      'forgot-password': 'Reset Your Password'
    }
    const subtitles = {
      register: 'Enter this code to complete registration',
      login: 'Enter this code to sign in to PingMe',
      'forgot-password': 'Enter this code to reset your password'
    }
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <title>PingMe OTP</title>
</head>
<body style="margin:0;padding:0;background:#0D0D0D;
  font-family:'Segoe UI',Arial,sans-serif;">
  
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#0D0D0D;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0"
          style="background:#141414;border-radius:20px;
          border:1px solid #2A2A2A;overflow:hidden;
          max-width:500px;width:100%;">
          
          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(
              135deg,#7C3AED,#C084FC);
              padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;
                font-size:32px;font-weight:900;
                letter-spacing:-1px;">
                <span style="color:#ffffff;">Ping</span>
                <span style="color:#E9D5FF;">Me</span>
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);
                font-size:14px;letter-spacing:2px;">
                PING. CONNECT. CHAT.
              </p>
            </td>
          </tr>
          
          <!-- BODY -->
          <tr>
            <td style="padding:40px 32px;">
              
              <h2 style="margin:0 0 8px;color:#F8FAFC;
                font-size:22px;font-weight:700;">
                ${titles[type]}
              </h2>
              <p style="margin:0 0 32px;color:#6B7280;
                font-size:15px;line-height:1.5;">
                ${subtitles[type]}. 
                This code expires in 
                <strong style="color:#C084FC;">
                10 minutes</strong>.
              </p>
              
              <!-- OTP BOX -->
              <div style="background:#1A1A1A;
                border:2px solid #C084FC;
                border-radius:16px;
                padding:28px;
                text-align:center;
                margin-bottom:32px;">
                <p style="margin:0 0 8px;
                  color:#6B7280;font-size:13px;
                  text-transform:uppercase;
                  letter-spacing:2px;">
                  Your verification code
                </p>
                <div style="font-size:42px;
                  font-weight:900;
                  letter-spacing:12px;
                  color:#C084FC;
                  font-family:monospace;">
                  ${otp}
                </div>
              </div>
              
              <!-- WARNING -->
              <div style="background:#1A1A1A;
                border-left:3px solid #F87171;
                border-radius:0 8px 8px 0;
                padding:14px 16px;
                margin-bottom:24px;">
                <p style="margin:0;color:#94A3B8;
                  font-size:13px;line-height:1.5;">
                  ⚠️ Never share this code with anyone.
                  PingMe will never ask for your OTP.
                  If you did not request this,
                  please ignore this email.
                </p>
              </div>
              
              <!-- FOOTER NOTE -->
              <p style="margin:0;color:#475569;
                font-size:12px;text-align:center;
                line-height:1.6;">
                This code is valid for 10 minutes only.<br>
                After 3 wrong attempts your code 
                will be invalidated.
              </p>
              
              </td>
          </tr>
          
          <!-- BOTTOM -->
          <tr>
            <td style="background:#0D0D0D;
              padding:20px 32px;
              border-top:1px solid #2A2A2A;">
              <p style="margin:0;color:#374151;
                font-size:12px;text-align:center;">
                © 2026 PingMe. 
                Built with MERN Stack + Socket.io<br>
                This is an automated email. 
                Do not reply.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
  
</body>
</html>
      `
  }
}
