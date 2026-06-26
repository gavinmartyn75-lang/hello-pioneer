import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const APP_URL = 'https://hello-pioneer-red-six.vercel.app'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }

  const { noteBody, recipientEmail } = body ?? {}

  if (!noteBody || !recipientEmail) {
    return res.status(400).json({ error: 'noteBody and recipientEmail are required' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(recipientEmail)) {
    return res.status(400).json({ error: 'Invalid email address' })
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A note from Pioneer Notes</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#111111;padding:28px 40px;">
              <p style="margin:0;font-size:20px;font-weight:600;color:#ffffff;letter-spacing:-0.3px;">Pioneer Notes</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 20px;font-size:13px;color:#999;text-transform:uppercase;letter-spacing:0.8px;">Someone shared a note with you</p>
              <p style="margin:0;font-size:17px;line-height:1.65;color:#111;white-space:pre-wrap;">${escapeHtml(noteBody)}</p>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #eee;margin:0;">
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 36px;">
              <a href="${APP_URL}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-size:14px;font-weight:500;">View all notes →</a>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-size:12px;color:#bbb;">Sent via Pioneer Notes</p>
      </td>
    </tr>
  </table>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: 'Pioneer Notes <onboarding@resend.dev>',
    to: recipientEmail,
    subject: 'Someone shared a note with you',
    html,
  })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ ok: true })
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
