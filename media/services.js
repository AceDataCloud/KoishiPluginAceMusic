const services = new Map([
  ['suno', { label: 'Suno', submit: '/suno/audios', defaults: { action: 'generate' }, kind: 'audio', url: 'audio_url' }],
  ['acemusic', { label: 'ACE Music', submit: '/acemusic/audios', defaults: { action: 'generate' }, kind: 'audio', url: 'audio_url' }],
  ['nano-banana', { label: 'Nano Banana', submit: '/nano-banana/images', defaults: { action: 'generate' }, kind: 'image', url: 'image_url' }],
  ['gpt-image', { label: 'GPT Image', submit: '/openai/images/generations', tasks: '/openai/tasks', defaults: { model: 'gpt-image-2', response_format: 'url' }, kind: 'image', url: 'url' }],
  ['seedream', { label: 'Seedream', submit: '/seedream/images', defaults: { model: 'doubao-seedream-5-0-lite-260128', response_format: 'url' }, kind: 'image', url: 'image_url' }],
  ['flux', { label: 'FLUX', submit: '/flux/images', defaults: { action: 'generate', size: '1024x1024' }, kind: 'image', url: 'image_url' }],
  ['seedance', { label: 'Seedance', submit: '/seedance/videos', defaults: { model: 'doubao-seedance-1-5-pro-251215' }, kind: 'video', url: 'video_url' }],
  ['kling', { label: 'Kling', submit: '/kling/videos', defaults: { action: 'text2video' }, kind: 'video', url: 'video_url' }],
  ['veo', { label: 'Veo', submit: '/veo/videos', defaults: { action: 'text2video' }, kind: 'video', url: 'video_url' }],
  ['hailuo', { label: 'Hailuo', submit: '/hailuo/videos', defaults: { action: 'generate', model: 'minimax-t2v' }, kind: 'video', url: 'video_url' }],
])

function makeRequest(service, prompt, model) {
  const request = { ...services.get(service).defaults, async: true }
  if (model) request.model = model
  if (service === 'seedance') request.content = [{ type: 'text', text: prompt }]
  else request.prompt = prompt
  return request
}

function decodeImage(encoded) {
  if (typeof encoded !== 'string' || !encoded.length) return
  const buffer = Buffer.from(encoded, 'base64')
  let mime
  if (buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) mime = 'image/png'
  else if (buffer.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) mime = 'image/jpeg'
  else if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') mime = 'image/webp'
  if (mime) return { buffer, mime }
}

function readTask(service, task) {
  const spec = services.get(service)
  const result = task.response
  let rows = Array.isArray(result?.data) ? result.data : []
  if (service === 'kling') rows = [result]
  if (service === 'seedance') rows = [result?.data?.content]
  const assets = []
  const states = new Set()
  for (const row of rows) {
    if (!row) continue
    const state = row.state || row.status
    if (state) states.add(state)
    let url
    if (typeof row[spec.url] === 'string') {
      try { url = new URL(row[spec.url]) } catch {}
    }
    const label = String(row.title || spec.label)
    if (url?.protocol === 'https:' && !url.username && !url.password) {
      assets.push({ kind: spec.kind, label, url: url.href })
    } else if (service === 'gpt-image' || service === 'seedream') {
      const image = decodeImage(row.b64_json)
      if (image) assets.push({ kind: 'image', label, ...image })
    }
  }
  let state = result?.status || result?.state || result?.data?.status || task.status || task.state
  if (!state && (result?.success === false || result?.error)) state = 'failed'
  if (!state && states.size) state = states.size === 1 ? [...states][0] : 'mixed'
  if (!state) state = (task.finished_at || result?.finished_at || result?.success === true) ? 'completed' : 'pending'
  return { state, assets }
}

module.exports = { services, makeRequest, readTask }
