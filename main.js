import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const notesEl = document.getElementById('notes')
const bodyEl = document.getElementById('body')
const submitEl = document.getElementById('submit')
const statusEl = document.getElementById('status')

async function loadNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select('id, body, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    notesEl.innerHTML = `<p style="color:red">Failed to load notes: ${error.message}</p>`
    return
  }

  if (!data.length) {
    notesEl.innerHTML = '<p style="color:#999">No notes yet. Be the first!</p>'
    return
  }

  notesEl.innerHTML = data.map(note => `
    <div class="note" data-id="${note.id}">
      <p>${escapeHtml(note.body)}</p>
      <div class="note-footer">
        <time>${new Date(note.created_at).toLocaleString()}</time>
        <button class="share-btn" data-body="${escapeAttr(note.body)}">Share via email</button>
      </div>
      <p class="share-status"></p>
    </div>
  `).join('')

  notesEl.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', () => handleShare(btn))
  })
}

async function handleShare(btn) {
  const noteBody = btn.dataset.body
  const email = window.prompt('Enter recipient email address:')
  if (!email) return

  const noteEl = btn.closest('.note')
  const shareStatus = noteEl.querySelector('.share-status')

  btn.disabled = true
  shareStatus.textContent = 'Sending…'
  shareStatus.style.color = '#555'

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteBody, recipientEmail: email }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Unknown error')
    shareStatus.textContent = `Sent to ${email}!`
    shareStatus.style.color = '#090'
  } catch (err) {
    shareStatus.textContent = `Failed: ${err.message}`
    shareStatus.style.color = 'red'
  } finally {
    btn.disabled = false
    setTimeout(() => { shareStatus.textContent = '' }, 4000)
  }
}

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

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

loadNotes()
