const OTP = require('../models/OTP')
const { sendEmail } = require('../config/mailer')

const generateOTP = () => {
  return Math.floor(
    100000 + Math.random() * 900000
  ).toString()
}

const getEmailHTML = (otp, type) => {
  const messages = {
    register: 'Complete your PingMe registration',
    login: 'Sign in to your PingMe account',
    'forgot-password': 'Reset your PingMe password'
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;
      background:#0D0D0D;
      font-family:Arial,sans-serif;">
      <table width="100%" 
        style="padding:40px 20px;">
        <tr><td align="center">
          <table width="480" style="
            background:#141414;
            border-radius:16px;
            border:1px solid #2A2A2A;
            overflow:hidden;
            max-width:480px;
            width:100%;">
            
            <tr><td style="
              background:linear-gradient(
                135deg,#7C3AED,#C084FC);
              padding:24px;
              text-align:center;">
              <h1 style="margin:0;
                color:#fff;font-size:28px;
                font-weight:900;">
                PingMe
              </h1>
            </td></tr>
            
            <tr><td style="padding:32px;">
              <p style="color:#94A3B8;
                font-size:15px;margin:0 0 24px;">
                ${messages[type] || 
                  'Verify your email'}
              </p>
              
              <div style="
                background:#1A1A1A;
                border:2px solid #C084FC;
                border-radius:12px;
                padding:24px;
                text-align:center;
                margin-bottom:24px;">
                <p style="margin:0 0 8px;
                  color:#6B7280;font-size:12px;
                  text-transform:uppercase;
                  letter-spacing:2px;">
                  Your verification code
                </p>
                <div style="
                  font-size:38px;
                  font-weight:900;
                  letter-spacing:10px;
                  color:#C084FC;
                  font-family:monospace;">
                  ${otp}
                </div>
              </div>
              
              <p style="color:#475569;
                font-size:13px;
                text-align:center;">
                This code expires in 
                <strong style="color:#C084FC;">
                  10 minutes
                </strong>
              </p>
              <p style="color:#374151;
                font-size:12px;
                text-align:center;
                margin-top:16px;">
                Never share this code.
                If you did not request this,
                ignore this email.
              </p>
            </td></tr>
            
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `
}

const sendOTP = async (email, type) => {
  try {
    console.log('Sending OTP to:', email,
      'Type:', type)
    
    // Validate inputs
    if (!email || !type) {
      throw new Error('Email and type required')
    }
    
    // Delete old OTPs for this email
    await OTP.deleteMany({ email, type })
    
    // Generate new OTP
    const otp = generateOTP()
    
    // Save to database with 10 min expiry
    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    )
    
    await OTP.create({
      email: email.toLowerCase().trim(),
      otp,
      type,
      expiresAt,
      attempts: 0,
      verified: false
    })
    
    console.log('OTP saved to DB:', otp,
      'Expires:', expiresAt)
    
    // Send email
    const subject = 
      `${otp} is your PingMe verification code`
    const html = getEmailHTML(otp, type)
    
    await sendEmail(email, subject, html)
    
    console.log('OTP process complete for:', email)
    return { success: true }
    
  } catch (error) {
    console.error('sendOTP failed:', error.message)
    throw error
  }
}

const verifyOTP = async (email, otp, type) => {
  const record = await OTP.findOne({ 
    email, type, verified: false 
  })
  
  if (!record) {
    return { 
      success: false, 
      message: 'OTP not found. Please request a new one.' 
    }
  }
  
  if (new Date() > record.expiresAt) {
    await OTP.deleteOne({ _id: record._id })
    return { 
      success: false, 
      message: 'OTP expired. Please request a new one.' 
    }
  }
  
  if (record.attempts >= 3) {
    await OTP.deleteOne({ _id: record._id })
    return { 
      success: false, 
      message: 'Too many wrong attempts. Request a new OTP.' 
    }
  }
  
  if (record.otp !== otp) {
    await OTP.updateOne(
      { _id: record._id },
      { $inc: { attempts: 1 } }
    )
    const remaining = 3 - (record.attempts + 1)
    return { 
      success: false, 
      message: `Wrong OTP. ${remaining} attempts remaining.` 
    }
  }
  
  // OTP is correct - delete it after use
  await OTP.deleteOne({ _id: record._id })
  return { success: true }
}

module.exports = { sendOTP, verifyOTP }
