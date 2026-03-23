const crypto = require('crypto')
const OTP = require('../models/OTP')
const transporter = require('../config/mailer')
const { getEmailTemplate } = require('./emailTemplates')

const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString()
}

const sendOTP = async (email, type) => {
  try {
    // Delete any existing OTP for this email
    await OTP.deleteMany({ email, type })
    
    // Generate new 6 digit OTP
    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString()
    
    // Set expiry 10 minutes from now
    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    )
    
    // Save OTP to database
    await OTP.create({ 
      email, 
      otp, 
      type, 
      expiresAt 
    })
    
    // Send email
    await transporter.sendMail({
      from: `"PingMe" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `${otp} is your PingMe verification code`,
      html: getEmailTemplate(otp, type)
    })
    
    console.log('OTP sent successfully to:', email)
    return { success: true }
    
  } catch (error) {
    console.error('sendOTP error:', error.message)
    throw new Error(
      'Failed to send OTP email. ' +
      'Please try again.'
    )
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
  
  // OTP is correct - delete it after use (or mark as verified if needed, but here we delete)
  await OTP.deleteOne({ _id: record._id })
  return { success: true }
}

module.exports = { sendOTP, verifyOTP }
