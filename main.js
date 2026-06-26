import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const notesEl   = document.getElementById('notes')
const bodyEl    = document.getElementById('body')
const submitEl  = document.getElementById('submit')
const statusEl  = document.getElementById('status')
const micBtn    = document.getElementById('mic-btn')
const micStatus = document.getElementById('mic-status')

// ── Relative time ──────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const secs = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (secs < 60)    return 'just now'
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

const EVENT_LABEL = {
  'sent':            { icon: '📤', label: 'sent' },
  'email.delivered': { icon: '📬', label: 'delivered' },
  'email.opened':    { icon: '👁️',  label: 'opened' },
  'email.clicked':   { icon: '🔗', label: 'clicked' },
  'email.bounced':   { icon: '⚠️', label: 'bounced' },
}

// ── Activity feed ──────────────────────────────────────────────────────────────
function renderActivity(noteId, events) {
  const noteEvents = events.filter(e => e.note_id === noteId)
  if (!noteEvents.length) return ''

  const byRecipient = {}
  for (const e of noteEvents) {
    if (!byRecipient[e.recipient] || new Date(e.created_at) > new Date(byRecipient[e.recipient].created_at)) {
      byRecipient[e.recipient] = e
    }
  }

  const rows = Object.values(byRecipient)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(e => {
      const { icon, label } = EVENT_LABEL[e.event_type] ?? { icon: '•', label: e.event_type }
      return `<li class="activity-row">${icon} <span class="activity-recipient">${escapeHtml(e.recipient)}</span> <span class="activity-status">${label}</span> <span class="activity-time">${timeAgo(e.created_at)}</span></li>`
    })

  return `<ul class="activity-feed">${rows.join('')}</ul>`
}

// ── Load & render notes ────────────────────────────────────────────────────────
async function loadNotes() {
  const { data: notes, error } = await supabase
    .from('notes')
    .select('id, body, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    notesEl.innerHTML = `<p style="color:red">Failed to load notes: ${error.message}</p>`
    return
  }

  if (!notes.length) {
    notesEl.innerHTML = '<p style="color:#999">No notes yet. Be the first!</p>'
    return
  }

  const noteIds = notes.map(n => n.id)
  const { data: events = [] } = await supabase
    .from('email_events')
    .select('note_id, recipient, event_type, created_at')
    .in('note_id', noteIds)
    .order('created_at', { ascending: false })

  notesEl.innerHTML = notes.map(note => `
    <div class="note" data-id="${note.id}">
      <p>${escapeHtml(note.body)}</p>
      <div class="note-footer">
        <time>${new Date(note.created_at).toLocaleString()}</time>
        <button class="listen-btn" data-body="${escapeAttr(note.body)}">▶ Listen</button>
        <button class="share-btn"  data-note-id="${note.id}" data-body="${escapeAttr(note.body)}">Share via email</button>
      </div>
      <p class="share-status"></p>
      ${renderActivity(note.id, events)}
    </div>
  `).join('')

  notesEl.querySelectorAll('.share-btn').forEach(btn  => btn.addEventListener('click', () => handleShare(btn)))
  notesEl.querySelectorAll('.listen-btn').forEach(btn => btn.addEventListener('click', () => handleListen(btn)))
}

// ── Text-to-speech ─────────────────────────────────────────────────────────────
async function handleListen(btn) {
  const text = btn.dataset.body
  const original = btn.textContent

  btn.disabled = true
  btn.textContent = '⏳ Loading…'

  try {
    const res = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error)
    }
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const audio = new Audio(url)
    btn.textContent = '⏹ Stop'
    btn.disabled = false
    audio.play()
    audio.onended = () => {
      btn.textContent = original
      URL.revokeObjectURL(url)
    }
    btn.onclick = () => {
      audio.pause()
      audio.currentTime = 0
      btn.textContent = original
      btn.onclick = () => handleListen(btn)
    }
  } catch (err) {
    alert(`Listen failed: ${err.message}`)
    btn.textContent = original
    btn.disabled = false
  }
}

// ── Speech-to-text ─────────────────────────────────────────────────────────────
let mediaRecorder = null
let audioChunks   = []

micBtn.addEventListener('click', async () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioChunks  = []
    mediaRecorder = new MediaRecorder(stream)

    mediaRecorder.ondataavailable = e => { if (e.data.size) audioChunks.push(e.data) }

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      micBtn.textContent = '🎤'
      micBtn.classList.remove('recording')
      micStatus.textContent = 'Transcribing…'

      const blob = new Blob(audioChunks, { type: 'audio/webm' })
      try {
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'audio/webm' },
          body: blob,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        bodyEl.value = data.text
        micStatus.textContent = ''
      } catch (err) {
        micStatus.textContent = `Transcription failed: ${err.message}`
      }
    }

    mediaRecorder.start()
    micBtn.textContent = '⏹ Stop'
    micBtn.classList.add('recording')
    micStatus.textContent = 'Recording… click Stop when done'
  } catch {
    micStatus.textContent = 'Microphone access denied'
  }
})

// ── Share via email ────────────────────────────────────────────────────────────
async function handleShare(btn) {
  const noteBody = btn.dataset.body
  const noteId   = btn.dataset.noteId
  const email    = window.prompt('Enter recipient email address:')
  if (!email) return

  const noteEl     = btn.closest('.note')
  const shareStatus = noteEl.querySelector('.share-status')

  btn.disabled = true
  shareStatus.textContent = 'Sending…'
  shareStatus.style.color = '#555'

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteBody, noteId, recipientEmail: email }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Unknown error')
    shareStatus.textContent = `Sent to ${email}!`
    shareStatus.style.color = '#090'
    await loadNotes()
  } catch (err) {
    shareStatus.textContent = `Failed: ${err.message}`
    shareStatus.style.color = 'red'
    btn.disabled = false
  }

  setTimeout(() => { shareStatus.textContent = '' }, 4000)
}

// ── Post new note ──────────────────────────────────────────────────────────────
submitEl.addEventListener('click', async () => {
  const body = bodyEl.value.trim()
  if (!body) return

  submitEl.disabled = true
  statusEl.textContent = 'Posting…'

  const { error } = await supabase.from('notes').insert({ body })

  if (error) {
    statusEl.textContent = `Error: ${error.message}`
  } else {
    bodyEl.value = ''
    statusEl.textContent = 'Posted!'
    await loadNotes()
    setTimeout(() => { statusEl.textContent = '' }, 2000)
  }

  submitEl.disabled = false
})

// ── Helpers ────────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

loadNotes()
