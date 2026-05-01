import nodemailer from 'nodemailer'

/**
 * SMTP email utility.
 * Reads SMTP config from environment variables.
 * If SMTP_HOST is not set, emails are logged to console instead of sent.
 */

let _transporter = null

function getTransporter() {
  if (_transporter) return _transporter

  const host = process.env.SMTP_HOST
  if (!host) return null

  const port = parseInt(process.env.SMTP_PORT || '587')
  const secure = process.env.SMTP_SECURE === 'true'

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    // For port 587 with STARTTLS, nodemailer upgrades automatically when secure=false
    // For port 465 with implicit TLS, secure=true is required
    tls: {
      // Don't fail on self-signed certs in dev
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  return _transporter
}

/**
 * Send an email. Falls back to console.log if SMTP is not configured.
 * Never throws — returns { accepted, error? } so callers can check success.
 */
export async function sendEmail({ to, subject, html }) {
  const from = process.env.SMTP_FROM || 'noreply@numori.app'
  const transporter = getTransporter()

  if (!transporter) {
    console.warn(`[email] SMTP not configured. Would send to ${to}:`)
    console.warn(`  Subject: ${subject}`)
    console.warn(`  Body: ${html}`)
    return { accepted: [to], preview: true }
  }

  try {
    return await transporter.sendMail({ from, to, subject, html })
  } catch (err) {
    console.error(`[email] Failed to send to ${to}:`, err.message)
    return { accepted: [], error: err.message }
  }
}

/**
 * Generate a 6-digit OTP code.
 */
export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/**
 * Shared email layout wrapper.
 */
function emailLayout(content) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 420px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
        <!-- Logo bar -->
        <tr><td style="background-color: #4f46e5; padding: 20px 24px; text-align: center;">
          <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">Numori</span>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding: 28px 24px 20px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding: 0 24px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
              <p style="margin: 0; font-size: 11px; color: #9ca3af; text-align: center; line-height: 1.5;">
                This is an automated message from Numori.<br>If you didn't request this, you can safely ignore it.
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/**
 * Send a verification OTP email.
 */
export async function sendVerificationEmail(to, code) {
  return sendEmail({
    to,
    subject: 'Verify your email — Numori',
    html: emailLayout(`
      <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #111827;">Verify your email</h1>
      <p style="margin: 0 0 20px; font-size: 14px; color: #6b7280; line-height: 1.5;">Enter this code in Numori to confirm your email address:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="background-color: #f3f4f6; border-radius: 10px; padding: 20px; text-align: center;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #111827; font-family: 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;">${code}</span>
        </td></tr>
      </table>
      <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">This code expires in <span style="font-weight: 600; color: #6b7280;">15 minutes</span>.</p>
    `),
  })
}

/**
 * Send a password recovery OTP email.
 */
export async function sendPasswordRecoveryEmail(to, code) {
  return sendEmail({
    to,
    subject: 'Password recovery — Numori',
    html: emailLayout(`
      <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #111827;">Password recovery</h1>
      <p style="margin: 0 0 20px; font-size: 14px; color: #6b7280; line-height: 1.5;">Enter this code in Numori to reset your password:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="background-color: #f3f4f6; border-radius: 10px; padding: 20px; text-align: center;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #111827; font-family: 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;">${code}</span>
        </td></tr>
      </table>
      <!-- Destruction warning -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
        <tr><td style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align: top; padding-right: 10px;">
              <span style="font-size: 18px;">🔴</span>
            </td>
            <td>
              <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #991b1b;">All your notes will be permanently deleted</p>
              <p style="margin: 0; font-size: 12px; color: #b91c1c; line-height: 1.5;">Your notes are end-to-end encrypted with your current password. Resetting your password means they can never be decrypted. This action cannot be undone.</p>
            </td>
          </tr></table>
        </td></tr>
      </table>
      <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">This code expires in <span style="font-weight: 600; color: #6b7280;">15 minutes</span>.</p>
    `),
  })
}
