const { h, Schema } = require('koishi')

exports.name = 'acemusic'
exports.inject = ['database']
exports.Config = Schema.object({
  token: Schema.string().role('secret').required()
    .description('ACE Music application token with task lookup access.'),
})

exports.apply = (ctx, config) => {
  ctx.private().command('acemusic <taskId:string> [track:posint]', '查询 ACE Music 任务，或播放指定音轨', { authority: 3 })
    .example('acemusic YOUR_TASK_ID')
    .example('acemusic YOUR_TASK_ID 1')
    .action(async (_, taskId, track) => {
      if (!taskId) return '用法：acemusic <任务 ID> [音轨编号]'

      let result
      try {
        const response = await fetch('https://api.acedata.cloud/acemusic/tasks', {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(15000),
          headers: { Authorization: 'Bearer ' + config.token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'retrieve', id: taskId }),
        })
        if (!response.ok) return '查询失败（HTTP ' + response.status + '）。请检查应用权限和任务 ID。'
        result = await response.json()
      } catch {
        return '无法连接 ACE Music 查询服务，请稍后重试。'
      }

      const group = result?.response
      if (result?.id !== taskId || (group?.task_id != null && group.task_id !== taskId)) {
        return '响应中的任务 ID 与查询不符。'
      }
      const state = String(group?.status || result.state || 'pending')
      const tracks = []
      for (const item of Array.isArray(group?.data) ? group.data : []) {
        if (typeof item?.audio_url !== 'string') continue
        let url
        try { url = new URL(item.audio_url) } catch { continue }
        if (url.protocol !== 'https:' || url.username || url.password) continue
        tracks.push({ title: String(item.title || 'ACE Music'), url: url.href })
      }

      if (!tracks.length) return h.text('状态：' + state + '。暂无可播放音轨。')
      if (track === undefined) {
        const list = tracks.map((item, index) => (index + 1) + '. ' + item.title).join('\n')
        return h.text('状态：' + state + '\n' + list + '\n播放：acemusic ' + taskId + ' <编号>')
      }
      if (!Number.isInteger(track) || track < 1 || track > tracks.length) {
        return '请选择 1 至 ' + tracks.length + ' 的音轨编号。'
      }
      const selected = tracks[track - 1]
      return [h.text(selected.title), h.audio(selected.url)]
    })
}
