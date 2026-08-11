# WordLens 词镜

> **语言 / Language：** [简体中文](#简体中文) | [English](#english)

---

## 简体中文

**老哥们镇楼！** 今天给大伙盘一款我最近真香到不行的神器——**WordLens 词镜**。

说人话：它是 Obsidian 的一款划词翻译插件，你划一下、悬一下，译文"啪"就弹出来了，跟沙拉查词那味儿一模一样，而且**专门为咱们中文用户调教过**。

### 🔥 凭啥说它与众不同？划重点了啊

- **一词多译，白嫖党的胜利**：查个「评估」，它直接给你甩出 `assess / evaluation / estimate / measure`…… 不是给一个意思，是**一堆**。关键是——这套词典走有道免费接口，**不！耗！你！一！分！API 额度**！白嫖怪狂喜。
- **双向智能，傻瓜式体验**：你划中文，它自动翻外文（默认英文）；你划英文，它自动翻中文。不用切来切去选语言，脑子不用动。
- **七路翻译源随便挑**：有道智云、百度、腾讯云、阿里云、Bing、Google、Google GTX。Bing 和有道**免密钥开箱即用**，墙内直连不翻车。
- **整页翻译**：一整篇文档一键全翻，还能逐段还原，长文突击必备。
- **生词本 + 发音 + 一键复制**：查过的词自动收，听发音、抄译文，丝滑。
- **全中文界面**：设置给你整得明明白白，小白也能秒上手。

> 说实话，原版 Mouse Tooltip Translator 我也用过，但那英文界面 + 单引擎真不够爽。WordLens 是在它基础上**二次开发**的：加了汉化、一词多译词典、七引擎、双向智能，原作者 toki1703 的版权声明我们也原样保留，MIT 协议开源免费。

**兄弟们，这波属于闭眼入的宝藏。笔记党、文献党、考研党，别犹豫了，盘它！**

### 怎么装（手把手）

1. 去 [Releases](https://github.com/546335130/wordlens/releases) 页下载 `main.js`、`manifest.json`、`styles.css` 三个文件
2. 丢进你的库：`<你的笔记库>/.obsidian/plugins/wordlens/`（没有就新建）
3. 重启 Obsidian → 设置 → 第三方插件 → 启用 **WordLens**
4. （进阶）想偷懒也能用 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 装：添加 `546335130/wordlens` 为 Beta 插件源

### 怎么用

- 在笔记正文里**划一段** / **鼠标悬个词** → 翻译弹窗就来了
- 设置里挑引擎、填密钥（只用哪个填哪个，没填的不耗额度）
- 划中文不弹框？检查「跳过同语言翻译」开关（设置 → 翻译设置）
- 整页翻译消耗云端 API 额度，注意用量；划词翻译消耗极小

### 翻译引擎配置

| 引擎 | 需要的密钥 | 免费额度 | 特点 |
|---|---|---|---|
| 有道智云 | 应用 ID + 应用密钥 | 新账号有体验金 | 带一词多译词典（推荐） |
| 百度翻译 | App ID + 密钥 | 约 5 万字符/月 | 稳定、中文友好 |
| 腾讯云翻译 | SecretId + SecretKey | 有免费额度 | 机器翻译 TMT |
| 阿里云翻译 | AccessKey ID + Secret | 有免费额度 | 机器翻译 |
| Bing | 无需密钥 | 免费 | 开箱即用 |
| Google / Google GTX | 无需密钥 | 免费 | 需能访问 Google（海外用户） |

> 词典（一词多译、音标、短语释义）来自有道词典的免费接口，**不消耗任何翻译 API 额度**。

### 致谢与许可证

本项目基于 **Mouse Tooltip Translator for Obsidian**（作者：ときくん / toki1703，[GitHub](https://github.com/toki1703/mouse-tooltip-translator)）二次开发，在其 MIT 许可下进行了引擎扩展、界面汉化、词典增强与交互改进，并保留原作者版权声明。

本项目采用 **MIT License**，详见 [LICENSE](LICENSE)。

---

## English

**WordLens** is a hover / select-to-translate plugin for Obsidian. Select or hover any text in your notes and a translation popup appears instantly — like a built-in Saladict. It is tuned specifically for Chinese-speaking users.

### Features

- **Hover & select translation** with a cursor-following popup
- **Multi-translation (free dictionary)**: one word → many senses with phonetics. Powered by Youdao's free dictionary API, so it **consumes zero translation API quota**
- **Bidirectional smart mode**: Chinese → foreign language, foreign → Chinese, auto-detected — no manual language switching
- **7 translation sources**: Youdao, Baidu, Tencent Cloud, Alibaba Cloud, Bing, Google, Google GTX. Bing and Youdao work **out of the box with no API key**
- **Full-page translation** with per-paragraph restore
- **Wordbook, TTS pronunciation, one-click copy**
- **Full Chinese UI** (switchable to English)

WordLens is a derivative work of **Mouse Tooltip Translator for Obsidian** by toki1703 ([GitHub](https://github.com/toki1703/mouse-tooltip-translator)), extended with a Chinese UI, a multi-translation dictionary, 7 engines, and bidirectional smart mode, under the original MIT license with attribution preserved.

### Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [Releases](https://github.com/546335130/wordlens/releases) page
2. Place them in `<your vault>/.obsidian/plugins/wordlens/` (create the folder if needed)
3. Reload Obsidian and enable **WordLens** under Settings → Community plugins
4. (Optional) Install via [BRAT](https://github.com/TfTHacker/obsidian42-brat) by adding `546335130/wordlens` as a Beta plugin source

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

### Credits & License

Based on **Mouse Tooltip Translator for Obsidian** by toki1703 ([GitHub](https://github.com/toki1703/mouse-tooltip-translator)), MIT licensed. WordLens extends it with a Chinese UI, multi-translation dictionary, 7 engines, and bidirectional smart mode, preserving the original copyright notice. Released under the **MIT License** — see [LICENSE](LICENSE).
