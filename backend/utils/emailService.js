
// File: backend/utils/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_PORT == '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // Your Hostinger email
    pass: process.env.SMTP_PASS, // Your Hostinger email password
  },
});

const sendVerificationEmail = async (userEmail, token) => {
  // FIX: Update to Vite default port 5173
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verificationLink = `${frontendUrl}/#/verify/${token}`;

  // Local Development Logic: Skip actual email sending if configured
  if (process.env.SKIP_EMAIL_VERIFICATION === 'true') {
    console.log('---------------------------------------------------');
    console.log(`[DEV MODE] Mock Verification Email Sent`);
    console.log(`To: ${userEmail}`);
    console.log(`Link: ${verificationLink}`);
    console.log('---------------------------------------------------');
    return Promise.resolve(true);
  }

  const mailOptions = {
    from: `"OpenClass LMS" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: 'Verify Your OpenClass Account',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4f46e5; text-align: center;">Welcome to OpenClass!</h2>
        <p>Thank you for joining our learning community. To get started, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p style="color: #666; font-size: 14px;">If you did not create an account, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">OpenClass LMS - Professional Learning Infrastructure</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail };
