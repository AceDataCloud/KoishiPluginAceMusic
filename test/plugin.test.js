const { test } = require('node:test')
const assert = require('node:assert/strict')
const { App } = require('koishi')
const mock = require('@koishijs/plugin-mock')
const memory = require('@koishijs/plugin-database-memory')
const plugin = require('..')

test('a direct administrator can look up an owned task and select a playable track', async (t) => {
  const app = new App()
  app.plugin(memory.default)
  app.plugin(mock.default)
  app.plugin(plugin, { token: 'test-only' })
  await app.start()
  t.after(() => app.stop())
  await app.mock.initUser('operator', 3)
  await app.mock.initUser('member', 1)
  await app.mock.initChannel('chat')
  const operator = app.mock.client('operator')
  let result = { id: 'existing', response: { task_id: 'existing', status: 'pending', data: [] } }
  const requests = t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.acedata.cloud/acemusic/tasks')
    assert.equal(options.headers.Authorization, 'Bearer test-only')
    assert.deepEqual(JSON.parse(options.body), { action: 'retrieve', id: 'existing' })
    return Response.json(result)
  })
  await app.mock.client('member').receive('acemusic existing')
  await app.mock.client('operator', 'chat').receive('acemusic existing')
  assert.equal(requests.mock.callCount(), 0)
  await operator.shouldReply('acemusic existing', /pending/)
  result.response = { task_id: 'existing', status: 'partial', data: [
    { title: 'One', audio_url: 'https://example.test/1.mp3' },
    { title: 'Unsafe', audio_url: 'javascript:alert(1)' },
    { title: 'Two', audio_url: 'https://example.test/2.mp3' },
  ] }
  await operator.shouldReply('acemusic existing', /1\. One\n2\. Two/)
  await operator.shouldReply('acemusic existing 2', /<audio src="https:\/\/example.test\/2.mp3"\/>/)
  await operator.shouldReply('acemusic existing 3', /请选择/)
  result.id = 'different'
  await operator.shouldReply('acemusic existing', /任务 ID 与查询不符/)
  assert.equal(requests.mock.callCount(), 5)
})
