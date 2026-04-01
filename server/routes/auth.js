const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { sendOTP, verifyOTP } = require('../utils/otpHelper');

const router = express.Router();

// Rate limiter for OTP routes
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 OTP requests per window
  message: { 
    success: false,
    message: 'Too many OTP requests. Try again in 15 minutes.'
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Create user
    const user = await User.create({ username, email, password });

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        settings: user.settings,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        settings: user.settings,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      settings: user.settings,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/send-otp
router.post('/send-otp',
  otpLimiter,
  async (req, res) => {
    try {
      let { email, type } = req.body
      
      // Validate
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        })
      }
      
      if (!type) {
        return res.status(400).json({
          success: false,
          message: 'Type is required'
        })
      }
      
      // Clean email
      email = email.toLowerCase().trim()
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address'
        })
      }
      
      // Check for register type
      if (type === 'register') {
        const existing = await User.findOne({
          email
        })
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Email already registered. Please login.'
          })
        }
      }
      
      // Check for login type
      if (type === 'login') {
        const user = await User.findOne({ email })
        if (!user) {
          return res.status(400).json({
            success: false,
            message: 'No account found with this email.'
          })
        }
      }
      
      // Send OTP
      await sendOTP(email, type)
      
      return res.status(200).json({
        success: true,
        message: `OTP sent to ${email}`
      })
      
    } catch (error) {
      console.error('send-otp error:', 
        error.message)
      
      let message = 'Failed to send OTP. Please try again.'
      
      if (error.code === 'EAUTH') {
        message = 'Email service error. Contact support.'
        console.error('SMTP AUTH FAILED -',
          'Check SMTP_USER and SMTP_PASS in Render')
      }
      
      if (error.code === 'ECONNECTION' || 
          error.code === 'ETIMEDOUT') {
        message = 'Email server unavailable. Please try again in a moment.'
      }
      
      return res.status(500).json({
        success: false,
        message
      })
    }
  }
)

router.get('/test-smtp', async (req, res) => {
  try {
    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: { rejectUnauthorized: false }
    })
    await transporter.verify()
    transporter.close()
    res.json({
      success: true,
      message: 'SMTP is working correctly',
      smtpUser: process.env.SMTP_USER || 'NOT SET',
      smtpPass: process.env.SMTP_PASS 
        ? 'SET ✓' : 'NOT SET ✗',
      port: 465,
      secure: true
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      smtpUser: process.env.SMTP_USER || 'NOT SET',
      smtpPass: process.env.SMTP_PASS 
        ? 'SET ✓' : 'NOT SET ✗'
    })
  }
})

// POST /api/auth/verify-register
router.post('/verify-register', async (req, res) => {
  try {
    const { username, email, password, otp } = req.body;

    if (!username || !email || !password || !otp) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Verify OTP first
    const verification = await verifyOTP(email, otp, 'register');
    if (!verification.success) {
      return res.status(400).json({ message: verification.message });
    }

    // Check if username already taken (email was checked in send-otp)
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Password length check
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Create user (User model handles hashing via pre-save hook)
    const user = await User.create({ username, email, password });

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        settings: user.settings,
      },
    });
  } catch (error) {
    console.error('Verify Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/auth/verify-login
router.post('/verify-login', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Verify OTP
    const verification = await verifyOTP(email, otp, 'login');
    if (!verification.success) {
      return res.status(400).json({ message: verification.message });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        settings: user.settings,
      },
    });
  } catch (error) {
    console.error('Verify Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// POST /api/auth/forgot-password/send
router.post('/forgot-password/send', otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'No account with this email' });

    await sendOTP(email, 'forgot-password');
    res.json({ success: true, message: 'OTP sent for password reset' });
  } catch (error) {
    console.error('Forgot password send error:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// POST /api/auth/forgot-password/reset
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Verify OTP
    const verification = await verifyOTP(email, otp, 'forgot-password');
    if (!verification.success) {
      return res.status(400).json({ message: verification.message });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

module.exports = router;
