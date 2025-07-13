const nodemailer = require('nodemailer');
const config = require('../config/server');
const logger = require('./logger');

// Create transporter
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure, // true for 465, false for other ports
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});

// Send a generic email
async function sendEmail({ to, subject, html, text }) {
  const mailOptions = {
    from: config.email.user,
    to,
    subject,
    text,
    html
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent', { to, subject, messageId: info.messageId });
    return info;
  } catch (error) {
    logger.error('Error sending email', { to, subject, error: error.message });
    throw error;
  }
}

// Send verification email
async function sendVerificationEmail({ to, token, firstName }) {
  const subject = 'Verify your email address';
  const verificationUrl = `${config.client.url}/verify-email?token=${token}&email=${encodeURIComponent(to)}`;
  const html = `
    <p>Hi ${firstName || ''},</p>
    <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
    <p><a href="${verificationUrl}">Verify Email</a></p>
    <p>If you did not create an account, you can ignore this email.</p>
  `;
  return sendEmail({ to, subject, html });
}

// Send password reset email
async function sendPasswordResetEmail({ to, token, firstName }) {
  const subject = 'Reset your password';
  const resetUrl = `${config.client.url}/reset-password?token=${token}&email=${encodeURIComponent(to)}`;
  const html = `
    <p>Hi ${firstName || ''},</p>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <p><a href="${resetUrl}">Reset Password</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `;
  return sendEmail({ to, subject, html });
}

// Send welcome email
async function sendWelcomeEmail({ to, firstName }) {
  const subject = 'Welcome to Falcons!';
  const html = `
    <p>Hi ${firstName || ''},</p>
    <p>Welcome to Falcons! We are excited to have you on board.</p>
    <p>Start exploring our courses and resources today.</p>
    <p>If you have any questions, feel free to reply to this email.</p>
    <p>Best regards,<br/>The Falcons Team</p>
  `;
  return sendEmail({ to, subject, html });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
}; 