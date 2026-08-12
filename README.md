# WordLens 词镜

> **语言 / Language：** [简体中文](#简体中文) | [English](#english)

---

## 简体中文

📖 **这是什么**

如果你也在用 Obsidian 记笔记，大概率撞上过这个场景：读外文资料，看到个词想立刻知道意思，又懒得切出去开翻译软件。WordLens 词镜就是解决这个的——划一下、悬一下，译文直接跟在光标旁边弹出来，沙拉查词那味儿，懂的都懂 😎。

WordLens 是完全独立开发的 Obsidian 插件：界面全中文、配置简单、划词弹窗交互顺手，专门给中文用户调过。

✨ **为什么值得装**

🎯 **一词多译，免费还不耗额度**：查「评估」，它不会只甩一个 assess，而是直接给你 `assess / evaluation / estimate / measure` 一整排同义译法。底层走的是有道词典的免费接口，**零 API 额度消耗**——这波不亏，你细品 💡。

⚡️ **双向智能识别**：划中文自动翻外文，划外文自动翻中文，语言方向自己判断，不用手动切来切去。脑子不用动，体验直接拉满 ✅。

🚀 **7 路翻译源随便切**：有道、百度、腾讯云、阿里云、Bing、Google、Google GTX 全给你备齐。重点来了——**Bing 和有道免密钥开箱即用**，国内直连不翻车，装上就能用 🔥。

🤯 **不止划词**：整页翻译（一键全文 + 逐段还原）、生词本、真人发音、一键复制…… 长文突击和日常积累都照顾到了。

🧩 **词根词缀拆解**：查 `unbelievable`，直接拆给你看——`un-（不） + believ（词根） + -able（可…的）`。有道词典词根优先，内置规则兜底，都**不耗翻译额度**。背单词事半功倍，你细品 💡。

📌 **单词本笔记**：弹窗右上角一键 📌，把词存进**你自己的 md 文件**（路径在设置里点「选择文件…」挑，还能选只存词或带译文），复习不愁，越攒越厚 📚。

🎨 **智能布局**：查单词照旧原文在上；划**句子/段落**时自动把**译文放大置顶**，一眼看明白，不用在原文里找译文 🥹。

⭐ **全中文界面**：设置项明明白白，第一次用也能秒上手。

> 说句实在的，做它的初衷很简单：市面上的翻译插件要么英文界面、要么单引擎，中文用户用着不够爽。所以自己造了一个——全中文、多引擎、带免费词典，开箱即用。

⚙️ **怎么装（两种姿势）**

1. **手动装**：去 [Releases](https://github.com/TongFisher/wordlens/releases) 下载 `main.js`、`manifest.json`、`styles.css` 三个文件，丢进 `<你的笔记库>/.obsidian/plugins/wordlens/`（没有就新建），重启 Obsidian 后在「设置 → 第三方插件」启用即可。
2. **BRAT 装**：懒得动手就用 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 添加 `TongFisher/wordlens` 为 Beta 插件源，一键搞定 📌。

🛠️ **怎么用 & 配置**

- 在笔记里**划词或悬停** → 翻译弹窗自动出现（单词/短语/整句/段落都支持）
- 弹窗右上角：🔊 朗读 / 📋 复制译文 / 📌 存进单词本
- 设置里挑引擎、填密钥（只用哪个填哪个，没填的不耗额度）
- 划中文不弹框？检查「跳过同语言翻译」开关
- 整页翻译走云端 API，注意用量；划词翻译消耗极小 😏
- 词典、音标、词根词缀、一词多译全走有道免费接口，**零额度消耗**

📊 **引擎配置速查**

| 引擎 | 密钥 | 免费额度 | 特点 |
|---|---|---|---|
| 有道智云 | 应用 ID + 密钥 | 体验金 | 带一词多译词典（推荐） |
| 百度翻译 | App ID + 密钥 | ~5 万字符/月 | 稳定、中文友好 |
| 腾讯云翻译 | SecretId + SecretKey | 有 | 机器翻译 TMT |
| 阿里云翻译 | AccessKey ID + Secret | 有 | 机器翻译 |
| Bing | 无需 | 免费 | 开箱即用 |
| Google / Google GTX | 无需 | 免费 | 需能访问 Google |

> 一词多译、音标、短语释义来自有道免费词典接口，**不消耗任何翻译 API 额度**。

📌 **许可证**

WordLens 是完全独立开发的插件，采用 **MIT License** 开源，免费使用，欢迎提 Issue 和 PR 👏。

🙌 开源免费，用得顺手就是最好的反馈，Star 不求多 🎉。

---

## English

**WordLens** is a hover / select-to-translate plugin for Obsidian. Select or hover any text in your notes and a translation popup appears instantly — like a built-in Saladict. It is tuned specifically for Chinese-speaking users.

### Features

- **Hover & select translation** with a cursor-following popup — words, phrases, sentences and paragraphs all supported
- **Multi-translation (free dictionary)**: one word → many senses with phonetics. Powered by Youdao's free dictionary API, so it **consumes zero translation API quota**
- **Bidirectional smart mode**: Chinese → foreign language, foreign → Chinese, auto-detected — no manual language switching
- **7 translation sources**: Youdao, Baidu, Tencent Cloud, Alibaba Cloud, Bing, Google, Google GTX. Bing and Youdao work **out of the box with no API key**
- **Morphology breakdown**: prefix / root / suffix with meanings (e.g. `un-` + `believ` + `-able`) — Youdao roots first, built-in rules as fallback, all free
- **Word note**: one-click 📌 in the popup appends the word to your own md file — pick the file via a file browser, save word-only or with translation
- **Smart layout**: sentences & paragraphs show a **large translation on top**; single words keep the classic original-first order
- **Full-page translation** with per-paragraph restore
- **Wordbook, TTS pronunciation, one-click copy**
- **Full Chinese UI** (switchable to English)

WordLens is an independent implementation, released under the MIT License.

### Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [Releases](https://github.com/TongFisher/wordlens/releases) page
2. Place them in `<your vault>/.obsidian/plugins/wordlens/` (create the folder if needed)
3. Reload Obsidian and enable **WordLens** under Settings → Community plugins
4. (Optional) Install via [BRAT](https://github.com/TfTHacker/obsidian42-brat) by adding `TongFisher/wordlens` as a Beta plugin source

### Usage

- Select or hover text inside a note to open the translation popup
- Pick an engine and enter its API key in settings (only the engine you use consumes quota)
- Translating Chinese shows nothing? Check the "Skip same-language translation" toggle under Translation settings
- Full-page translation consumes cloud API quota; select-to-translate uses very little

### Engine setup

| Engine | Key required | Free tier | Notes |
|---|---|---|---|
| Youdao | App ID + App Key | Trial credit | Includes multi-translation dictionary (recommended) |
| Baidu | App ID + Key | ~50k chars/month | Stable, China-friendly |
| Tencent Cloud | SecretId + SecretKey | Free tier | Machine Translation TMT |
| Alibaba Cloud | AccessKey ID + Secret | Free tier | Machine Translation |
| Bing | None | Free | Works out of the box |
| Google / Google GTX | None | Free | Requires Google access (overseas) |

> The dictionary (multi-translation, phonetics, phrase glosses) comes from Youdao's free API and **uses no translation API quota**.

### License

WordLens is an independent Obsidian plugin released under the **MIT License** — see [LICENSE](LICENSE).
