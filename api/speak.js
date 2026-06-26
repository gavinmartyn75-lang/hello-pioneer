const VOICE_ID = '21m00Tcm4TlvDq8ikWAM' // ElevenLabs "Rachel" voice

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }

  const { text } = body ?? {}
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' })

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    return res.status(500).json({ error: err.detail?.message ?? 'TTS request failed' })
  }

  const audio = await response.arrayBuffer()
  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('Cache-Control', 'no-store')
  res.send(Buffer.from(audio))
}
