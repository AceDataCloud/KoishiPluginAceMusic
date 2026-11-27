const { test } = require('node:test')
const assert = require('node:assert/strict')
const { App } = require('koishi')
const mock = require('@koishijs/plugin-mock')
const memory = require('@koishijs/plugin-database-memory')
const plugin = require(process.env.KOISHI_MEDIA_TEST_PACKAGE || '../media')
const original = require('..')

async function host(t) {
  const app = new App()
  app.plugin(memory.default)
  app.plugin(mock.default)
  app.plugin(original, { token: 'fixture' })
  app.plugin(plugin, { token: 'fixture' })
  await app.start()
  t.after(() => app.stop())
  await app.mock.initUser('operator', 3)
  await app.mock.initUser('member', 1)
  await app.mock.initChannel('room')
  return { app, operator: app.mock.client('operator') }
}

const src = 'https://example.test/asset'
const cases = [
  ['suno', '/suno/audios', { action: 'generate' }, { data: [{ audio_url: src, state: 'complete' }] }, 'audio', 'complete'],
  ['acemusic', '/acemusic/audios', { action: 'generate' }, { status: 'partial_failed', data: [{}, { audio_url: src }] }, 'audio', 'partial_failed'],
  ['nano-banana', '/nano-banana/images', { action: 'generate' }, { data: [{ image_url: src }] }, 'img', 'completed'],
  ['gpt-image', '/openai/images/generations', { model: 'gpt-image-2', response_format: 'url' }, { data: [{ url: src }] }, 'img', 'completed'],
  ['seedream', '/seedream/images', { model: 'doubao-seedream-5-0-lite-260128', response_format: 'url' }, { data: [{ image_url: src }] }, 'img', 'completed'],
  ['flux', '/flux/images', { action: 'generate', size: '1024x1024' }, { data: [{ image_url: src }] }, 'img', 'completed'],
  ['seedance', '/seedance/videos', { model: 'doubao-seedance-1-5-pro-251215' }, { data: { status: 'succeeded', content: { video_url: src } } }, 'video', 'succeeded'],
  ['kling', '/kling/videos', { action: 'text2video' }, { state: 'succeed', video_url: src }, 'video', 'succeed'],
  ['veo', '/veo/videos', { action: 'text2video' }, { data: [{ video_url: src, state: 'succeeded' }] }, 'video', 'succeeded'],
  ['hailuo', '/hailuo/videos', { action: 'generate', model: 'minimax-t2v' }, { data: [{ video_url: src, state: 'succeeded' }] }, 'video', 'succeeded'],
]

for (const [service, endpoint, defaults, response, element, state] of cases) {
  test(service + ' accepts a private generation command, checks the task and sends a native media element', async t => {
    const { operator } = await host(t)
    const calls = []
    t.mock.method(globalThis, 'fetch', async (url, opts) => {
      assert.equal(opts.headers.Authorization, 'Bearer fixture')
      assert.equal(opts.redirect, 'error')
      assert.equal(opts.method, 'POST')
      calls.push([url.replace('https://api.acedata.cloud', ''), JSON.parse(opts.body)])
      return Response.json(calls.length === 1 ? { task_id: 'ticket' } : { id: 'ticket', response: { task_id: 'ticket', success: true, ...response } })
    })
    await operator.shouldReply('ace-media.make ' + service + ' a paper boat', new RegExp('ace-media.task ' + service + ' ticket'))
    await operator.shouldReply('ace-media.task ' + service + ' ticket', new RegExp(state))
    await operator.shouldReply('ace-media.task ' + service + ' ticket 1', new RegExp('<' + element + ' src="https://example.test/asset"'))
    const prompt = service === 'seedance' ? { content: [{ type: 'text', text: 'a paper boat' }] } : { prompt: 'a paper boat' }
    const lookup = [(service === 'gpt-image' ? '/openai' : '/' + service) + '/tasks', { action: 'retrieve', id: 'ticket' }]
    assert.deepEqual(calls, [[endpoint, { ...defaults, async: true, ...prompt }], lookup, lookup])
  })
}

test('member and group commands never use the application token', async t => {
  const { app } = await host(t)
  const req = t.mock.method(globalThis, 'fetch', async () => { throw new Error('unexpected network') })
  for (const client of [app.mock.client('member'), app.mock.client('operator', 'room')]) {
    await client.receive('ace-media.make suno a song')
    await client.receive('ace-media.task suno ticket 1')
  }
  assert.equal(req.mock.callCount(), 0)
})

test('an operator can choose a model explicitly', async t => {
  const { operator } = await host(t)
  const req = t.mock.method(globalThis, 'fetch', async () => Response.json({ task_id: 'ticket' }))
  await operator.shouldReply('ace-media.make -m gpt-image-1.5 gpt-image a boat', /ticket/)
  assert.equal(JSON.parse(req.mock.calls[0].arguments[1].body).model, 'gpt-image-1.5')
})

test('handles pending, failed, missing and mismatched tasks plus refused authorization', async t => {
  const { operator } = await host(t)
  let result
  let http = 200
  t.mock.method(globalThis, 'fetch', async () => Response.json(result, { status: http }))
  result = { id: 'ticket', response: null }
  await operator.shouldReply('ace-media.task veo ticket', /pending/)
  result.response = { success: false }
  await operator.shouldReply('ace-media.task veo ticket', /failed/)
  result = {}
  await operator.shouldReply('ace-media.task veo ticket', /没有找到/)
  result = { id: 'ticket', response: { task_id: 'different' } }
  await operator.shouldReply('ace-media.task veo ticket', /任务 ID 与查询不符/)
  http = 401
  await operator.shouldReply('ace-media.make suno a song', /HTTP 401/)
})

test('inline PNG images use the chat image element and private URLs are excluded', async t => {
  const { operator } = await host(t)
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0yMAAAAASUVORK5CYII='
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    id: 'ticket', response: { task_id: 'ticket', success: true, data: [{ url: 'https://user:password@example.test/image' }, { b64_json: png }] }
  }))
  await operator.shouldReply('ace-media.task gpt-image ticket 1', /<img src="data:image\/png;base64,/)
  await operator.shouldReply('ace-media.task gpt-image ticket 2', /请选择/)
})
