export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Read raw audio bytes from request body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const audioBuffer = Buffer.concat(chunks)

  if (!audioBuffer.length) return res.status(400).json({ error: 'No audio received' })

  // Forward to ElevenLabs as multipart form
  const form = new FormData()
  form.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'recording.webm')
  form.append('model_id', 'scribe_v1')

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
    body: form,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return res.status(500).json({ error: data.detail?.message ?? 'Transcription failed' })
  }

  return res.status(200).json({ text: data.text ?? '' })
}
