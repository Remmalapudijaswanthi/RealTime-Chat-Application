const crypto = require('crypto')
const OTP = require('../models/OTP')
const transporter = require('../config/mailer')
const { otpEmail } = require('./emailTemplates')

const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString()
}

const sendOTP = async (email, type) => {
  // Delete existing unverified OTPs of the same type for this email
  await OTP.deleteMany({ email, type, verified: false })
  
  const otp = generateOTP()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  
  await OTP.create({ email, otp, type, expiresAt })
  
  const template = otpEmail(otp, type)
  
  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: template.subject,
    html: template.html
  })
  
  return true
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
