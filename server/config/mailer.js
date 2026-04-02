const { Resend } = require('resend')

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null

const sendEmail = async (to, subject, html, retries = 2) => {
  if (!resend) {
    console.error('RESEND_API_KEY is not set')
    throw new Error('Email service configuration missing')
  }

  let lastError = null
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Email attempt ${attempt}/${retries} to ${to} using Resend`)
      
      const { data, error } = await resend.emails.send({
        from: 'PingMe <onboarding@resend.dev>', // Default for unverified domains
        to: to,
        subject: subject,
        html: html
      })

      if (error) {
        throw error
      }

      console.log('Email sent successfully via Resend:', data.id)
      return { success: true, id: data.id }
      
    } catch (error) {
      lastError = error
      console.error(`Email attempt ${attempt} failed:`, error.message)
      
      // If unauthorized, don't retry
      if (error.statusCode === 401) {
        throw error
      }
      
      // Wait before retry
      if (attempt < retries) {
        console.log(`Waiting 2s before retry...`)
        await new Promise(r => setTimeout(r, 2000))
      }
    }
  }
  
  throw lastError
}

module.exports = { sendEmail }
