# ACE Music for Koishi

在机器人私聊中查询已有 ACE Music 任务的状态，选择其中一条音轨播放。查询不会发起音乐生成。音频的实际呈现方式取决于聊天适配器是否支持 Koishi 的音频消息。

如需在 Koishi 中生成并发送音乐、图片和视频，可安装[十项服务的媒体插件](https://github.com/AceDataCloud/KoishiPluginAceMusic/tree/main/media)。

## 安装和配置

1. 在 Koishi 控制台插件市场搜索 `@acedatacloud/koishi-plugin-acemusic`。也可在 Koishi 项目目录执行 `npm install @acedatacloud/koishi-plugin-acemusic`。
2. 在 [Ace Data Cloud 应用管理](https://platform.acedata.cloud/console/applications) 为拥有这些任务的应用创建独立令牌。只需允许 ACE Music 的任务查询接口。
3. 在 Koishi 配置中添加 `@acedatacloud/acemusic` 插件，并将令牌填入其 `token` 密钥字段（不含 `Bearer `）。请在插件配置中设置令牌，勿在聊天中发送。
4. 用 Koishi 已启用 Koishi 数据库的机器人和权限等级 3 或以上的账号私聊机器人。输入 `acemusic YOUR_TASK_ID` 查看状态及音轨清单，再输入 `acemusic YOUR_TASK_ID 1` 播放第一条。仍在处理的任务可以稍后使用相同 ID 再查。

## English

Install `@acedatacloud/koishi-plugin-acemusic` in a Koishi 4.18 project with its database service enabled so the host can enforce user authority. Enable the plugin and set its secret `token` field to a dedicated [Ace application key](https://platform.acedata.cloud/console/applications) with access to ACE Music task lookup. Use a Koishi authority level 3 account or higher to message the bot privately:

- `acemusic YOUR_TASK_ID` lists the task state and available tracks.
- `acemusic YOUR_TASK_ID 2` sends the second available track as an audio message. The chat adapter determines playback support.

The bot uses the configured application's library. Restrict its use to administrators who should have access to those tracks. No generation command is provided. An unfinished task can be looked up again using its original ID.

[ACE Music API reference](https://docs.acedata.cloud/openapi/acemusic.json) · [Support](https://github.com/AceDataCloud/KoishiPluginAceMusic/issues)
