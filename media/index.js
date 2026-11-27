const { h, Schema } = require('koishi')
const { services, makeRequest, readTask } = require('./services')

exports.name = 'acedatacloud-media'
exports.inject = ['database']
exports.Config = Schema.object({
  token: Schema.string().role('secret').required()
    .description('Ace Data Cloud application token for the enabled media services.'),
})

async function request(path, body, token) {
  const reply = await fetch('https://api.acedata.cloud' + path, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!reply.ok) throw new Error('HTTP ' + reply.status)
  return reply.json()
}

const available = [...services.keys()].join('、')

exports.apply = (ctx, config) => {
  const chat = ctx.private()
  chat.command('ace-media', 'Ace Data Cloud 音乐、图片和视频', { authority: 3 })
    .action(() => '服务：' + available + '\n生成：ace-media.make <服务> <描述>\n查询：ace-media.task <服务> <任务 ID> [编号]')

  chat.command('ace-media.make <service:string> <prompt:text>', '提交一次按所选服务计费的媒体生成任务', { authority: 3 })
    .option('model', '-m <model:string> 指定服务支持的公开模型')
    .example('ace-media.make nano-banana 折纸小船漂浮在池塘上')
    .action(async ({ options }, service, prompt) => {
      const spec = services.get(service)
      if (!spec || !prompt?.trim()) return '用法：ace-media.make <服务> <描述>\n服务：' + available
      let result
      try {
        result = await request(spec.submit, makeRequest(service, prompt, options.model), config.token)
      } catch (error) {
        const status = /^HTTP \d{3}$/.test(error.message) ? '（' + error.message + '）' : ''
        return '提交未确认' + status + '。再次提交前请先核对应用任务记录，以免重复计费。'
      }
      if (result?.success === false || typeof result?.task_id !== 'string' || !result.task_id.trim()) {
        return '服务没有返回可查询的任务 ID。再次提交前请核对应用任务记录。'
      }
      return h.text(spec.label + ' 已接收。查询：ace-media.task ' + service + ' ' + result.task_id)
    })

  chat.command('ace-media.task <service:string> <taskId:string> [index:posint]', '查询一次现有任务，或发送选中的媒体', { authority: 3 })
    .example('ace-media.task suno YOUR_TASK_ID 1')
    .action(async (_, service, taskId, index) => {
      const spec = services.get(service)
      if (!spec || !taskId) return '用法：ace-media.task <服务> <任务 ID> [编号]\n服务：' + available
      let task
      try {
        task = await request(spec.tasks || '/' + service + '/tasks', { action: 'retrieve', id: taskId }, config.token)
      } catch (error) {
        const status = /^HTTP \d{3}$/.test(error.message) ? '（' + error.message + '）' : ''
        return '查询失败' + status + '。请检查应用权限后使用相同 ID 再查。'
      }
      if (!task || !Object.keys(task).length) return '没有找到该任务。'
      if (task.id !== taskId || (task.response?.task_id != null && task.response.task_id !== taskId)) {
        return '响应中的任务 ID 与查询不符。'
      }
      const { state, assets } = readTask(service, task)
      if (!assets.length) return h.text('状态：' + state + '。暂无可发送的媒体。')
      if (index === undefined) {
        const items = assets.map((asset, i) => (i + 1) + '. ' + asset.label)
        return h.text('状态：' + state + '\n' + items.join('\n') + '\n发送：ace-media.task ' + service + ' ' + taskId + ' <编号>')
      }
      if (!Number.isInteger(index) || index < 1 || index > assets.length) return '请选择 1 至 ' + assets.length + ' 的编号。'
      const asset = assets[index - 1]
      const media = asset.buffer ? h.image(asset.buffer, asset.mime) : h[asset.kind](asset.url)
      return [h.text(asset.label), media]
    })
}
