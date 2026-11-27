# Ace Data Cloud media for Koishi

在机器人私聊中生成音乐、图片或视频，查询进度并发送选中的媒体。支持 Suno、ACE Music、Nano Banana、GPT Image、Seedream、FLUX、Seedance、Kling、Veo 和 Hailuo。

## 安装

在 Koishi 插件市场搜索 `@acedatacloud/media`，或在 Koishi 项目目录执行 `npm install @acedatacloud/koishi-plugin-media`。启用该插件及 Koishi 数据库服务。在插件的密钥字段填入具备对应服务权限的 [Ace Data Cloud 应用令牌](https://platform.acedata.cloud/console/applications)。

机器人使用配置的应用令牌提交和获取任务。命令仅向权限等级 3 或以上的私聊用户开放。已有 `acemusic` 命令可以继续与此插件一起使用。

## 命令

| 命令 | 作用 |
| --- | --- |
| `ace-media` | 列出支持的服务和用法。 |
| `ace-media.make nano-banana 池塘上的折纸小船` | 提交一次图像生成，回复可直接复制的查询命令。每次提交都会使用该服务的额度。 |
| `ace-media.make -m gpt-image-2 gpt-image 池塘上的折纸小船` | 使用该服务支持的指定模型生成。 |
| `ace-media.task suno YOUR_TASK_ID` | 查询已有任务的状态，列出已就绪的媒体。 |
| `ace-media.task suno YOUR_TASK_ID 1` | 发送第一项音频。图片或视频任务会发送对应的 Koishi 消息元素。 |

服务参数为 `suno`、`acemusic`、`nano-banana`、`gpt-image`、`seedream`、`flux`、`seedance`、`kling`、`veo`、`hailuo`。生成命令接受文本描述。GPT Image 默认选用 `gpt-image-2`，Seedream 选用 `doubao-seedream-5-0-lite-260128`，Seedance 选用 `doubao-seedance-1-5-pro-251215`，Hailuo 选用 `minimax-t2v`。FLUX 的默认输出尺寸为 1024×1024。其他模型沿用相应接口的默认值。

## English

Install `@acedatacloud/koishi-plugin-media` in a Koishi 4.18 project with its database service enabled. Configure an application token in the plugin's secret field. A Koishi user with authority level 3 or higher can send private commands to the bot.

Send `ace-media.make suno A cheerful song about a paper boat` to submit one generation request using the application's subscription. Copy the lookup command from the reply. A lookup returns the current state and available assets, including partial results. Append an asset number to send an audio, image or video message. The chat adapter determines playback and display support. When a submission times out, check your application history before submitting it again.

[API documentation](https://docs.acedata.cloud) · [Support](https://github.com/AceDataCloud/KoishiPluginAceMusic/issues)
