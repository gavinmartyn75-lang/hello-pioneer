import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

// Resend event types we care about
const TRACKED_EVENTS = new Set(['email.delivered', 'email.opened', 'email.clicked', 'email.bounced'])

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let payload = req.body
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload) } catch {
      return res.status(400).json({ error: 'Invalid JSON' })
    }
  }

  const eventType = payload?.type
  if (!TRACKED_EVENTS.has(eventType)) {
    // Acknowledge untracked events without storing them
    return res.status(200).json({ ok: true, skipped: true })
  }

  const data = payload?.data ?? {}
  const messageId = data.email_id
  const recipient = Array.isArray(data.to) ? data.to[0] : data.to

  // note_id is attached as a tag; Resend delivers tags as { name, value } array or plain object
  let noteId = null
  if (Array.isArray(data.tags)) {
    noteId = data.tags.find(t => t.name === 'note_id')?.value ?? null
  } else if (data.tags && typeof data.tags === 'object') {
    noteId = data.tags.note_id ?? null
  }

  if (!messageId || !recipient) {
    return res.status(400).json({ error: 'Missing message_id or recipient in payload' })
  }

  const { error } = await supabase.from('email_events').insert({
    message_id: messageId,
    note_id: noteId,
    recipient,
    event_type: eventType,
  })

  if (error) {
    console.error('Failed to insert email event:', error.message)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ ok: true })
}
