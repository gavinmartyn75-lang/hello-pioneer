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
    <div class="note">
      <p>${escapeHtml(note.body)}</p>
      <time>${new Date(note.created_at).toLocaleString()}</time>
    </div>
  `).join('')
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
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

loadNotes()
