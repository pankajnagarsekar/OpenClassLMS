// File: backend/utils/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,    // Your Gmail address
    pass: process.env.GMAIL_PASSWORD  // Your Gmail App Password (16-char password)
  }
});

const sendVerificationEmail = async (userEmail, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const verificationLink = `${frontendUrl}/#/verify/${token}`;

  const mailOptions = {
    from: process.env.GMAIL_EMAIL,
    to: userEmail,
    subject: 'Email Verification - OpenClass',
    html: `
      <h2>Welcome to OpenClass!</h2>
      <p>Please verify your email address to complete your registration.</p>
      <p>
        <a href="${verificationLink}" style="background-color: #5B7DFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
      </p>
      <p>Or copy this link: ${verificationLink}</p>
      <p>This link expires in 24 hours.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

module.exports = { sendVerificationEmail };
