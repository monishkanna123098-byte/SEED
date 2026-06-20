import nodemailer from 'nodemailer'
import { logger } from './logger'

// In development: log emails to console (Ethereal/Mailtrap compatible)
// In production: replace transport with real SMTP credentials
const isDev = process.env.NODE_ENV === 'development'

function createTransport() {
  if (isDev) {
    // Ethereal fake SMTP — emails are logged, not sent
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.SMTP_USER ?? 'seed-dev@ethereal.email',
        pass: process.env.SMTP_PASS ?? 'devpassword',
      },
    })
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  })
}

const transport = createTransport()

const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'S.E.E.D. Platform <noreply@seed-platform.in>'
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'

export async function sendVerificationEmail(
  toEmail: string,
  name: string,
  verifyToken: string
): Promise<void> {
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verifyToken}`

  const info = await transport.sendMail({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: 'Verify your S.E.E.D. account',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #065A82;">S.E.E.D. — Social Emotional Early Detection</h2>
        <p>Hello ${name},</p>
        <p>Please verify your email address to activate your account:</p>
        <a href="${verifyUrl}" 
           style="display:inline-block; background:#028090; color:#fff; 
                  padding:12px 24px; border-radius:8px; text-decoration:none; 
                  font-weight:600; margin:16px 0;">
          Verify Email
        </a>
        <p style="color:#64748B; font-size:14px;">
          This link expires in 24 hours. If you did not create an account, 
          please ignore this email.
        </p>
        <hr style="border:none; border-top:1px solid #EAF4F8; margin:24px 0;">
        <p style="color:#64748B; font-size:12px;">
          <strong>Screening tool only. Not a diagnostic instrument. 
          Clinical confirmation required.</strong>
        </p>
      </div>
    `,
    text: `Hello ${name},\n\nVerify your email: ${verifyUrl}\n\nThis link expires in 24 hours.\n\nScreening tool only. Not a diagnostic instrument. Clinical confirmation required.`,
  })

  if (isDev) {
    logger.info('Dev email sent', {
      to: toEmail,
      subject: 'Verify your S.E.E.D. account',
      preview: nodemailer.getTestMessageUrl(info),
    })
  }
}

export async function sendPasswordResetEmail(
  toEmail: string,
  name: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`

  const info = await transport.sendMail({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: 'Reset your S.E.E.D. password',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #065A82;">S.E.E.D. — Password Reset</h2>
        <p>Hello ${name},</p>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <a href="${resetUrl}" 
           style="display:inline-block; background:#028090; color:#fff; 
                  padding:12px 24px; border-radius:8px; text-decoration:none; 
                  font-weight:600; margin:16px 0;">
          Reset Password
        </a>
        <p style="color:#64748B; font-size:14px;">
          This link expires in 1 hour. If you did not request a reset, 
          please ignore this email.
        </p>
      </div>
    `,
    text: `Hello ${name},\n\nReset your password: ${resetUrl}\n\nExpires in 1 hour.`,
  })

  if (isDev) {
    logger.info('Dev password reset email sent', {
      to: toEmail,
      preview: nodemailer.getTestMessageUrl(info),
    })
  }
}
