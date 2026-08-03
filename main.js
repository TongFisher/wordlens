// WordLens — selection & hover translator for Obsidian with bilingual dictionary.
// Engines: Google, Bing, Youdao Zhiyun, Baidu, Tencent TMT, Aliyun MT.
const { Plugin, PluginSettingTab, Setting, Notice, requestUrl, ItemView, Platform } = require('obsidian');
const nodeCrypto = require('crypto');

const DEFAULT_SETTINGS = {
  mouseoverEngine: 'google',
  selectionEngine: 'google',
  pageEngine: 'google',
  sourceLang: 'auto',
  targetLang: 'zh-CN',
  // 'fixed' | 'auto' — smart bidirectional direction:
  // auto: Chinese text → autoChineseTarget; other languages → targetLang.
  directionMode: 'auto',
  autoChineseTarget: 'en',
  enableHover: true,
  enableSelection: true,
  enablePage: true,
  enableHoverMobile: true,
  enableSelectionMobile: true,
  enablePageMobile: true,
  textType: 'word',               // 'word' | 'sentence'
  delayMs: 500,
  showSourceText: false,
  showDetectedLang: false,
  showDictionary: true,
  showMultiTranslation: true,   // 'one word, many translations' free dictionary
  showTransliteration: false,
  enabled: true,
  // When true, only react inside Obsidian note content (editor / preview / rendered embeds).
  // When false, react across the entire UI (sidebars, headers, etc.) — original behavior.
  restrictToNoteContent: true,
  // Which Obsidian view modes to react in (requires restrictToNoteContent: true).
  // 'edit'    : editor only (source / live preview)
  // 'reading' : reading view only
  // 'both'    : both (default)
  activeMode: 'both',
  // Suppress the tooltip when detected source language equals the target language.
  skipSameLanguage: true,
  // Stricter fallback: suppress when the translated text is identical to the input.
  // Helps when language detection is wrong (e.g. short tokens, proper nouns).
  skipIdenticalText: false,
  // When true, always call the translation API and never read from in-memory cache.
  disableCache: false,
  // 'system' | 'ja' | 'en'
  uiLang: 'system',
  // When true and page translation is showing, hover shows the pre-translation text
  // of the paragraph instead of running the normal word/sentence tooltip.
  pageTranslationHoverOriginal: true,
  // LLM engine settings
  // Baidu Translate (fanyi-api.baidu.com)
  baiduAppId: '',
  baiduSecretKey: '',
  // Tencent Cloud TMT (tmt.tencentcloudapi.com)
  tencentSecretId: '',
  tencentSecretKey: '',
  // Alibaba Cloud MT (mt.aliyuncs.com)
  aliyunAccessKeyId: '',
  aliyunAccessKeySecret: '',
  // Youdao Zhiyun (有道智云) — free trial credits, rich translations + dictionary.
  youdaoAppKey: '',
  youdaoSecret: '',
};

// ── i18n ─────────────────────────────────────────────────────────────────────
const STRINGS = {
  en: {
    // Tooltip
    origLabel: 'Original:',
    noTranslation: '(no translation)',
    // Vocab view
    vocabTitle: 'Vocabulary',
    vocabReload: 'Reload',
    sortByCount: 'By view count',
    sortByRecent: 'Recently viewed',
    sortAlpha: 'Alphabetical',
    filterAll: 'All',
    filterWord: 'Word',
    filterSentence: 'Sentence',
    vocabEmpty: 'No translation history',
    vocabCopy: 'Copy',
    vocabCopied: 'Copied!',
    copyTranslation: 'Copy translation',
    copyTranslationNotice: (text) => `Copied: ${text}`,
    copyTranslationNone: 'No translation to copy.',
    speakTitle: 'Speak source text',
    copyTitle: 'Copy translation',
    // Page translator
    pageAlreadyRunning: 'Page translation is already running.',
    pageNeedReadingView: 'Please switch to Reading View to translate the page.',
    pageNoText: 'No text found to translate.',
    pageTranslating: (cur, tot) => `Translating... ${cur}/${tot}`,
    pageCancel: 'Cancel',
    pageDone: (done, tot) => `Page translation complete (${done}/${tot} sections)`,
    pageRestoreReadingOnly: 'Page restore is only available in Reading View.',
    pageNoTranslated: 'No translated text found.',
    pageRestored: (n) => `Restored original text (${n} sections)`,
    // Plugin actions
    pageDisabled: 'Page translation is disabled.',
    pluginToggle: (on) => `Mouse Tooltip Translator: ${on ? 'ON' : 'OFF'}`,
    // Ribbon / commands
    ribbonVocab: 'Open vocabulary list',
    ribbonPage: 'Translate page / Restore',
    // Settings headings
    settingsTitle: 'Mouse Tooltip Translator',
    secFeatures: 'Features',
    secDesktop: 'Desktop',
    secMobile: 'Mobile',
    secTranslation: 'Translation',
    secEngines: 'Engine Settings',
    secPerFeature: '🎯Per-feature Settings',
    secHoverSelection: 'Hover / Text Selection',
    secPage: 'Page Translation',
    secTooltip: 'Tooltip Contents',
    // Master toggle
    masterEnabled: 'Enabled',
    masterEnabledDesc: 'Master switch for the translator.',
    masterRestrict: 'Restrict to note content',
    masterRestrictDesc: 'Only react inside the note body (editor, preview, embeds). Turn off to translate anywhere in the Obsidian UI — sidebars, headings, settings, etc.',
    // Feature toggles
    featHover: 'Hover translation',
    featHoverDesc: 'Show a translation tooltip when hovering over text.',
    featSelection: 'Text selection translation',
    featSelectionDesc: 'Show a translation tooltip when text is selected.',
    featPage: 'Page translation',
    featPageDesc: 'Enable full-page translation via the ribbon button or command.',
    featHoverMobile: 'Tap translation',
    featHoverMobileDesc: 'Show a translation tooltip when tapping on a word.',
    featSelectionMobile: 'Selection translation',
    featSelectionMobileDesc: 'Show a translation tooltip when text is selected after a touch.',
    featPageMobile: 'Page translation',
    featPageMobileDesc: 'Enable full-page translation via the ribbon button or command.',
    // Translation settings
    translateFrom: 'Translate from',
    translateTo: 'Translate to',
    directionMode: 'Translation direction',
    directionModeDesc: 'Smart: Chinese text is translated to the language below; other languages to the target language set above.',
    directionAuto: 'Smart (auto both directions)',
    directionFixed: 'Fixed target language',
    autoChineseTarget: 'When source is Chinese, translate to',
    autoChineseTargetDesc: 'Only applies in smart direction mode.',
    skipSame: 'Skip same-language translations',
    skipSameDesc: "Hide the tooltip when the detected source language matches the target language (e.g. Japanese → Japanese).",
    skipIdentical: 'Skip identical translations',
    skipIdenticalDesc: 'Also hide the tooltip when the translated text is identical to the source text. Useful for short tokens, proper nouns, or code.',
    // Engine settings
    engineHover: 'Hover translation engine',
    engineHoverDesc: 'Engine to use when hovering.',
    engineSelection: 'Text translation engine',
    engineSelectionDesc: 'Engine to use for text selection.',
    enginePage: 'Page translation engine',
    enginePageDesc: 'Engine to use for full-page translation.',
    // Youdao Zhiyun (有道智云)
    secYoudao: 'Youdao Zhiyun (有道智云)',
    youdaoAppKey: 'App ID',
    youdaoAppKeyDesc: 'From the youdao.ai console → Application Management.',
    youdaoSecret: 'App Secret',
    youdaoSecretDesc: 'Used to sign requests. Keep it private.',
    youdaoKeyMissing: 'Youdao Zhiyun API Key is not configured.',
    // Baidu Translate
    secBaidu: 'Baidu Translate (百度翻译)',
    baiduAppId: 'App ID',
    baiduAppIdDesc: 'From fanyi-api.baidu.com console. Free tier: ~50k chars/month.',
    baiduSecretKey: 'Secret Key',
    baiduSecretKeyDesc: 'Used to sign requests. Keep it private.',
    baiduKeyMissing: 'Baidu Translate API key is not configured.',
    // Tencent Cloud TMT
    secTencent: 'Tencent Cloud TMT (腾讯云翻译)',
    tencentSecretId: 'SecretId',
    tencentSecretIdDesc: 'From Tencent Cloud CAM console. Free tier available.',
    tencentSecretKey: 'SecretKey',
    tencentSecretKeyDesc: 'Used to sign requests. Keep it private.',
    tencentKeyMissing: 'Tencent TMT API key is not configured.',
    // Alibaba Cloud MT
    secAliyun: 'Alibaba Cloud MT (阿里云翻译)',
    aliyunAccessKeyId: 'AccessKey ID',
    aliyunAccessKeyIdDesc: 'From Alibaba Cloud RAM console. Free tier available.',
    aliyunAccessKeySecret: 'AccessKey Secret',
    aliyunAccessKeySecretDesc: 'Used to sign requests. Keep it private.',
    aliyunKeyMissing: 'Alibaba MT API key is not configured.',
    // Per-feature settings
    activeMode: 'Active mode',
    activeModeDesc: 'Select which Obsidian view mode to enable tooltip translation in.',
    modeBoth: 'Edit + Reading',
    modeEdit: 'Edit only',
    modeReading: 'Reading only',
    mouseUnit: 'Mouseover unit',
    mouseUnitDesc: 'Word picks one word under the cursor. Sentence expands to sentence boundary.',
    hoverDelay: 'Hover delay (ms)',
    hoverDelayDesc: 'Wait time before the tooltip is requested.',
    pageHoverOrig: 'Show original paragraph on hover during page translation',
    pageHoverOrigDesc: 'While page translation is active, disable normal hover/selection translation and show the pre-translation text of the hovered paragraph instead.',
    // Tooltip contents
    showDict: 'Show dictionary (POS) for single words',
    showDictDesc: 'When Google returns a bilingual dictionary, show "noun: ..." / "verb: ..." lines instead of the plain translation. Other engines do not return POS info.',
    showMulti: 'One word, many translations',
    showMultiDesc: 'Show multiple meanings / translations (Chinese word → several English words, English word → several meanings) from the free Youdao dictionary. Free — does not consume NMT quota. Turn off to show a single translation.',
    unitWord: 'Word',
    unitSentence: 'Sentence',
    showTranslit: 'Show transliteration (romanization)',
    showTranslitDesc: 'Display the romanized reading of the source word (Google / Bing only).',
    showSource: 'Show source text',
    showDetected: 'Show detected language',
    uiLang: 'Interface language',
    uiLangDesc: 'Language used in the plugin settings UI.',
    uiLangSystem: 'Follow system',
    // Translation panel
    ribbonTrans: 'Open translation panel',
    transPanelTitle: 'Translation',
    transPanelPlaceholder: 'Enter text to translate…',
    transPanelSwap: 'Swap languages',
    transPanelClear: 'Clear',
    transPanelCopy: 'Copy',
    transPanelCopied: 'Copied!',
  },
  zh: {
    // Tooltip
    origLabel: '原文:',
    noTranslation: '（无翻译结果）',
    // Vocab view
    vocabTitle: '生词本',
    vocabReload: '重新加载',
    sortByCount: '按查看次数',
    sortByRecent: '最近查看',
    sortAlpha: '按字母顺序',
    filterAll: '全部',
    filterWord: '单词',
    filterSentence: '句子',
    vocabEmpty: '暂无翻译记录',
    vocabCopy: '复制',
    vocabCopied: '已复制!',
    copyTranslation: '复制译文',
    copyTranslationNotice: (text) => `已复制：${text}`,
    copyTranslationNone: '没有可复制的译文。',
    speakTitle: '朗读原文',
    copyTitle: '复制译文',
    // Page translator
    pageAlreadyRunning: '页面翻译正在运行中。',
    pageNeedReadingView: '请切换到阅读视图后再翻译页面。',
    pageNoText: '未找到可翻译的文本。',
    pageTranslating: (cur, tot) => `翻译中... ${cur}/${tot}`,
    pageCancel: '取消',
    pageDone: (done, tot) => `页面翻译完成（${done}/${tot} 个段落）`,
    pageRestoreReadingOnly: '仅可在阅读视图恢复原文。',
    pageNoTranslated: '未找到已翻译的文本。',
    pageRestored: (n) => `已恢复原文（${n} 个段落）`,
    // Plugin actions
    pageDisabled: '页面翻译已禁用。',
    pluginToggle: (on) => `Mouse Tooltip Translator：${on ? '开' : '关'}`,
    // Ribbon / commands
    ribbonVocab: '打开生词本',
    ribbonPage: '翻译页面 / 恢复',
    ribbonTrans: '打开翻译面板',
    // Settings headings
    settingsTitle: 'Mouse Tooltip Translator',
    secFeatures: '功能开关',
    secDesktop: '桌面端',
    secMobile: '移动端',
    secTranslation: '翻译设置',
    secEngines: '引擎设置',
    secPerFeature: '🎯 分项设置',
    secHoverSelection: '悬停 / 划词翻译',
    secPage: '页面翻译',
    secTooltip: '弹窗内容',
    // Master toggle
    masterEnabled: '启用',
    masterEnabledDesc: '翻译功能总开关。',
    masterRestrict: '仅限笔记内容',
    masterRestrictDesc: '仅在笔记正文（编辑器、预览、嵌入内容）内响应。关闭后可在 Obsidian 界面任意位置翻译——侧边栏、标题、设置等。',
    // Feature toggles
    featHover: '悬停翻译',
    featHoverDesc: '鼠标悬停在文本上时显示翻译弹窗。',
    featSelection: '划词翻译',
    featSelectionDesc: '选中文本后显示翻译弹窗。',
    featPage: '页面翻译',
    featPageDesc: '通过功能按钮或命令启用整页翻译。',
    featHoverMobile: '点按翻译',
    featHoverMobileDesc: '点按单词时显示翻译弹窗。',
    featSelectionMobile: '划词翻译',
    featSelectionMobileDesc: '触摸后选中文本时显示翻译弹窗。',
    featPageMobile: '页面翻译',
    featPageMobileDesc: '通过功能按钮或命令启用整页翻译。',
    // Translation settings
    translateFrom: '翻译自',
    translateTo: '翻译为',
    directionMode: '翻译方向',
    directionModeDesc: '智能模式：中文文本翻译为下方设置的语言，其他语言翻译为上方设置的「翻译为」。',
    directionAuto: '智能（自动识别双向）',
    directionFixed: '固定目标语言',
    autoChineseTarget: '源语言为中文时，翻译为',
    autoChineseTargetDesc: '仅在智能方向模式下生效。',
    skipSame: '跳过同语言翻译',
    skipSameDesc: '检测到的源语言与目标语言相同时隐藏弹窗（例如：中文 → 中文）。',
    skipIdentical: '跳过相同文本翻译',
    skipIdenticalDesc: '译文与原文完全相同时也隐藏弹窗。适合短词、专有名词、代码等场景。',
    // Engine settings
    engineHover: '悬停翻译引擎',
    engineHoverDesc: '悬停翻译使用的引擎。',
    engineSelection: '划词翻译引擎',
    engineSelectionDesc: '划词翻译使用的引擎。',
    enginePage: '页面翻译引擎',
    enginePageDesc: '整页翻译使用的引擎。',
    secYoudao: '有道智云（Youdao Zhiyun）',
    youdaoAppKey: '应用 ID（App Key）',
    youdaoAppKeyDesc: '从有道智云控制台「应用管理」获取。',
    youdaoSecret: '应用密钥（App Secret）',
    youdaoSecretDesc: '用于请求签名，请妥善保管。',
    youdaoKeyMissing: '有道智云 API Key 未配置，请在设置中填写。',
    secBaidu: '百度翻译开放平台',
    baiduAppId: 'App ID（应用 ID）',
    baiduAppIdDesc: '在 fanyi-api.baidu.com 控制台获取。免费版约 5 万字符/月。',
    baiduSecretKey: '密钥（Secret Key）',
    baiduSecretKeyDesc: '用于请求签名，请妥善保管。',
    baiduKeyMissing: '百度翻译 API Key 未配置，请在设置中填写。',
    secTencent: '腾讯云机器翻译（翻译君）',
    tencentSecretId: 'SecretId',
    tencentSecretIdDesc: '在腾讯云 CAM 控制台获取。有免费额度。',
    tencentSecretKey: 'SecretKey',
    tencentSecretKeyDesc: '用于请求签名，请妥善保管。',
    tencentKeyMissing: '腾讯云翻译 API Key 未配置，请在设置中填写。',
    secAliyun: '阿里云机器翻译',
    aliyunAccessKeyId: 'AccessKey ID',
    aliyunAccessKeyIdDesc: '在阿里云 RAM 控制台获取。有免费额度。',
    aliyunAccessKeySecret: 'AccessKey Secret',
    aliyunAccessKeySecretDesc: '用于请求签名，请妥善保管。',
    aliyunKeyMissing: '阿里云翻译 API Key 未配置，请在设置中填写。',
    // Per-feature settings
    activeMode: '生效模式',
    activeModeDesc: '选择启用弹窗翻译的 Obsidian 视图模式。',
    modeBoth: '编辑 + 阅读',
    modeEdit: '仅编辑',
    modeReading: '仅阅读',
    mouseUnit: '悬停取词单位',
    mouseUnitDesc: '「单词」取光标下的单个词；「句子」扩展到句末。',
    hoverDelay: '悬停延迟（毫秒）',
    hoverDelayDesc: '请求翻译前的等待时间。',
    pageHoverOrig: '页面翻译时悬停显示段落原文',
    pageHoverOrigDesc: '页面翻译进行中时，禁用普通悬停/划词翻译，改为显示悬停段落的原文。',
    // Tooltip contents
    showDict: '单词显示词性词典',
    showDictDesc: '当 Google 返回双语词典时，以「名词: …」「动词: …」行显示而非纯译文。其他引擎不返回词性信息。',
    showMulti: '一词多译（免费词典）',
    showMultiDesc: '用免费的有道词典显示多个释义/译词（中文词→多个英文译词，英文词→多个中文释义）。免费，不消耗翻译 API 额度。关闭后只显示单个译文。',
    unitWord: '单词',
    unitSentence: '句子',
    showTranslit: '显示音译（罗马音）',
    showTranslitDesc: '显示源词对应的罗马音（仅 Google / Bing）。',
    showSource: '显示源文本',
    showDetected: '显示检测到的语言',
    uiLang: '界面语言',
    uiLangDesc: '插件设置界面的显示语言。',
    uiLangSystem: '跟随系统',
    // Translation panel
    transPanelTitle: '翻译',
    transPanelPlaceholder: '输入要翻译的文本…',
    transPanelSwap: '交换语言',
    transPanelClear: '清空',
    transPanelCopy: '复制',
    transPanelCopied: '已复制!',
  },
};

// Returns the merged strings for the current Obsidian locale (falls back to English).
let _mttSettings = null;
function i18n() {
  if (_mttSettings?.uiLang === 'zh') return { ...STRINGS.en, ...STRINGS.zh };
  if (_mttSettings?.uiLang === 'en') return STRINGS.en;
  const loc = (typeof window !== 'undefined' && window.moment?.locale?.()) || 'en';
  const lang = /^zh/.test(loc) ? 'zh' : 'en';
  if (lang === 'zh') return { ...STRINGS.en, ...STRINGS.zh };
  return STRINGS.en;
}

// Selector for nodes that count as "note content".
// .cm-content       : CodeMirror 6 editor content (source / live preview)
// .markdown-preview-view : reading mode container
// .markdown-rendered     : rendered markdown anywhere (embeds, hover preview, etc.)
const NOTE_CONTENT_SELECTOR = '.cm-content, .markdown-preview-view, .markdown-rendered';

function isInNoteContent(node, selector) {
  if (!node) return false;
  const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  if (!el) return false;
  return !!el.closest(selector || NOTE_CONTENT_SELECTOR);
}

// Extracts the pre-translation text stored in data-mtt-orig (which is raw innerHTML).
function getOriginalText(el) {
  const orig = el.getAttribute('data-mtt-orig');
  if (!orig) return null;
  const tmp = document.createElement('div');
  tmp.innerHTML = orig;
  return tmp.textContent.trim() || null;
}

// A "no-op translation" is one we don't want to display. Each check is gated
// by its own user setting so the behavior can be tuned:
//   - skipSameLanguage : detected source language equals target language.
//   - skipIdenticalText: translated text is identical to the source text
//                        (catches mis-detected language codes for proper nouns,
//                         codes, single tokens that the API echoed back, etc.).
function isNoopTranslation(result, text, opts) {
  if (!result || !result.targetText) return false;
  const { skipSameLanguage = true, skipIdenticalText = false } = opts || {};
  if (skipSameLanguage
      && result.sourceLang && result.targetLang
      && result.sourceLang === result.targetLang) return true;
  if (skipIdenticalText && result.targetText.trim() === (text || '').trim()) return true;
  return false;
}

const COMMON_LANGS = {
  auto: 'Auto detect',
  en: 'English',
  ja: 'Japanese',
  zh: 'Chinese',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
  nl: 'Dutch',
  pl: 'Polish',
  tr: 'Turkish',
  uk: 'Ukrainian',
};

// Chinese names for the language dropdown (used when the UI is in Chinese).
const LANG_NAMES_ZH = {
  auto: '自动检测', en: '英语', ja: '日语', zh: '中文', 'zh-CN': '简体中文',
  'zh-TW': '繁体中文', ko: '韩语', es: '西班牙语', fr: '法语', de: '德语',
  it: '意大利语', pt: '葡萄牙语', ru: '俄语', ar: '阿拉伯语', hi: '印地语',
  th: '泰语', vi: '越南语', id: '印尼语', nl: '荷兰语', pl: '波兰语',
  tr: '土耳其语', uk: '乌克兰语',
};

// True when the effective interface language is Chinese.
function isChineseUI() {
  if (_mttSettings?.uiLang === 'zh') return true;
  if (_mttSettings?.uiLang === 'ja' || _mttSettings?.uiLang === 'en') return false;
  const loc = (typeof window !== 'undefined' && window.moment?.locale?.()) || 'en';
  return /^zh/.test(loc);
}
// Localized label for a language dropdown option.
function langName(code, label) {
  return isChineseUI() ? (LANG_NAMES_ZH[code] || label) : label;
}

// ---- Smart bidirectional direction (划中文→外文，划外文→中文) ----
// Heuristic: if more than half of the letters are CJK unified ideographs,
// treat the text as Chinese.
function isChineseText(text) {
  if (!text) return false;
  let han = 0, letters = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x4E00 && cp <= 0x9FFF) han++;
    if (/\p{L}/u.test(ch)) letters++;
  }
  return letters > 0 && han / letters > 0.5;
}
// Resolve the effective target language for a given source text.
//   directionMode === 'auto': Chinese text → autoChineseTarget (default en);
//                              anything else → settings.targetLang (default zh-CN).
//   otherwise: settings.targetLang as usual.
function effectiveTarget(text, settings) {
  if (settings.directionMode === 'auto') {
    return isChineseText(text) ? (settings.autoChineseTarget || 'en') : settings.targetLang;
  }
  return settings.targetLang;
}

// ---- HTTP helpers wrapping Obsidian's requestUrl (bypasses CORS) ----
function buildUrl(base, searchParams) {
  if (!searchParams) return base;
  const u = new URL(base);
  for (const [k, v] of Object.entries(searchParams)) {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  }
  return u.toString();
}

async function http(method, url, { headers, body, searchParams, timeout = 8000 } = {}) {
  const finalUrl = buildUrl(url, searchParams);
  let bodyStr;
  if (body instanceof URLSearchParams) bodyStr = body.toString();
  else if (body !== undefined && typeof body !== 'string') bodyStr = JSON.stringify(body);
  else bodyStr = body;
  // Wrap in a timeout so unreachable endpoints (e.g. Google behind the GFW)
  // fail fast instead of leaving the tooltip stuck on "⋯" forever.
  const res = await Promise.race([
    requestUrl({
      url: finalUrl,
      method,
      headers: headers || undefined,
      body: bodyStr,
      throw: false,
    }),
    new Promise((_, rej) => setTimeout(() => rej(new Error(`HTTP timeout after ${timeout}ms`)), timeout)),
  ]);
  if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
  return res;
}
async function httpGetText(url, opts) { return (await http('GET', url, opts)).text; }
// Extract "name=value" cookie pairs from a Set-Cookie response header.
// Obsidian's requestUrl may expose it as an array (one entry per cookie) or as a
// single comma-joined string; handle both, avoiding the comma inside Expires=...GMT.
function parseSetCookie(setCookie) {
  if (!setCookie) return '';
  const list = Array.isArray(setCookie)
    ? setCookie
    : String(setCookie).split(/,(?=\s*[A-Za-z0-9!#$%&'*+\-.^_`|~]+=)/);
  return list.map((c) => c.split(';')[0].trim()).filter(Boolean).join('; ');
}
async function httpJson(method, url, opts) {
  const res = await http(method, url, opts);
  // Obsidian's requestUrl only fills res.json when it detects JSON content;
  // fall back to parsing res.text so engines never silently fail on null json.
  if (res.json != null) return res.json;
  if (res.text) { try { return JSON.parse(res.text); } catch (_) { /* not JSON */ } }
  return null;
}

// ---- Base translator (shared request/response pipeline) ----
class BaseTranslator {
  static langCodeJson = {};
  static encodeLang(c) {
    return Object.prototype.hasOwnProperty.call(this.langCodeJson, c) ? this.langCodeJson[c] : c;
  }
  static decodeLang(c) {
    if (!this._swap) {
      this._swap = Object.fromEntries(
        Object.entries(this.langCodeJson).map(([k, v]) => [v, k])
      );
    }
    return Object.prototype.hasOwnProperty.call(this._swap, c) ? this._swap[c] : c;
  }
  static async translate(text, src, tgt, settings) {
    try {
      const esrc = this.encodeLang(src || 'auto');
      const etgt = this.encodeLang(tgt);
      const raw = await this.requestTranslate(text, esrc, etgt, settings);
      const wrapped = await this.wrapResponse(raw, text, esrc, etgt, settings);
      if (!wrapped || wrapped.targetText == null) return null;
      return {
        targetText: wrapped.targetText,
        sourceLang: this.decodeLang(wrapped.detectedLang || esrc),
        targetLang: this.decodeLang(etgt),
        transliteration: wrapped.transliteration || '',
        dict: Array.isArray(wrapped.dict) && wrapped.dict.length ? wrapped.dict : null,
      };
    } catch (e) {
      console.warn('[mtt]', this.name || 'translator', 'failed:', e);
      return null;
    }
  }
  static async requestTranslate() { throw new Error('not implemented'); }
  static async wrapResponse() { throw new Error('not implemented'); }
}

// ---- Google (translate_a/single) ----
// dj=1: JSON object form.  dt=bd: bilingual dictionary (POS).  dt=rm: transliteration.
class GoogleEngine extends BaseTranslator {
  static langCodeJson = { auto: 'auto' };
  static async requestTranslate(text, src, tgt) {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: src || 'auto',
      tl: tgt,
      dj: '1',
      hl: tgt,
      q: text,
    });
    params.append('dt', 't');
    params.append('dt', 'bd');
    params.append('dt', 'rm');
    return await httpJson('GET', `https://translate.googleapis.com/translate_a/single?${params.toString()}`);
  }
  static async wrapResponse(data, text, src) {
    if (!data || typeof data !== 'object') return null;
    const sentences = Array.isArray(data.sentences) ? data.sentences : [];
    let targetText = sentences.map((s) => (s && s.trans) || '').filter(Boolean).join(' ');
    if (targetText) targetText = targetText.replace(/\n /g, '\n');
    let transliteration = sentences.map((s) => (s && s.src_translit) || '').filter(Boolean).join(' ').trim();
    if (transliteration) transliteration = transliteration.replace(/\n /g, '\n');
    if (!targetText) return null;
    const dict = Array.isArray(data.dict)
      ? data.dict
          .filter((d) => d && Array.isArray(d.terms) && d.terms.length > 0)
          .map((d) => ({ pos: d.pos || '', terms: d.terms.slice(0, 3) }))
      : null;
    return { targetText, detectedLang: data.src || src, transliteration, dict };
  }
}

// ---- Google GTX (translate_a/t) ----
class GoogleGTXEngine extends BaseTranslator {
  static langCodeJson = { auto: 'auto' };
  static async requestTranslate(text, src, tgt) {
    return await httpJson('GET', 'https://translate.googleapis.com/translate_a/t', {
      searchParams: { client: 'dict-chrome-ex', sl: src || 'auto', tl: tgt, q: text },
    });
  }
  static async wrapResponse(data, text, src) {
    if (!Array.isArray(data)) return null;
    const first = Array.isArray(data[0]) ? data[0] : data;
    const targetText = Array.isArray(first) ? (first[0] || '') : String(first);
    const detected = Array.isArray(first) ? (first[1] || src) : src;
    return { targetText, detectedLang: detected };
  }
}

// ---- Bing (ttranslatev3) ----
class BingEngine extends BaseTranslator {
  static langCodeJson = {
    auto: 'auto-detect', ar: 'ar', bg: 'bg', bn: 'bn', cs: 'cs', da: 'da',
    de: 'de', el: 'el', en: 'en', es: 'es', et: 'et', fa: 'fa', fi: 'fi',
    fr: 'fr', he: 'he', iw: 'he', hi: 'hi', hu: 'hu', id: 'id', it: 'it',
    ja: 'ja', kk: 'kk', ko: 'ko', lt: 'lt', lv: 'lv', ms: 'ms', nl: 'nl',
    no: 'nb', pl: 'pl', pt: 'pt', 'pt-BR': 'pt', 'pt-PT': 'pt-pt',
    ro: 'ro', ru: 'ru', sk: 'sk', sl: 'sl', sv: 'sv', th: 'th', tr: 'tr',
    uk: 'uk', ur: 'ur', vi: 'vi', 'zh-CN': 'zh-Hans', 'zh-TW': 'zh-Hant',
  };
  static tokenUrl = 'https://www.bing.com/translator';
  static chinaTokenUrl = 'https://cn.bing.com/translator';
  static baseUrl = 'https://www.bing.com/ttranslatev3';
  static chinaBaseUrl = 'https://cn.bing.com/ttranslatev3';
  static accessToken = null;
  static useChina = false;

  static get userAgent() {
    return (typeof navigator !== 'undefined' && navigator.userAgent) || 'Mozilla/5.0';
  }

  static async fetchToken(tokenUrl) {
    const res = await http('GET', tokenUrl, { headers: { 'User-Agent': this.userAgent } });
    const html = res.text;
    const cookie = parseSetCookie(
      res.headers && (res.headers['set-cookie'] || res.headers['Set-Cookie'])
    );
    const IG = (html.match(/IG:"([^"]+)"/) || [])[1];
    const IID = (html.match(/data-iid="([^"]+)"/) || [])[1];
    const m = html.match(/params_AbusePreventionHelper\s?=\s?(\[[^\]]+\])/);
    if (!IG || !m) throw new Error('Bing token parse failed');
    // params_AbusePreventionHelper = [key, token, expiryInterval]
    const [key, token, expiryInterval] = JSON.parse(m[1]);
    return { IG, IID, key, token, tokenTs: Date.now(), expiryInterval, count: 0, cookie };
  }

  static async getAccessToken() {
    if (this.accessToken && Date.now() - this.accessToken.tokenTs <= this.accessToken.expiryInterval) {
      return this.accessToken;
    }
    // Try the China endpoint first (works for mainland users without a proxy),
    // then fall back to the global endpoint. cn.bing.com is reachable in both
    // regions and 301-redirects to www.bing.com when necessary.
    let lastErr;
    for (const china of [true, false]) {
      try {
        this.accessToken = await this.fetchToken(china ? this.chinaTokenUrl : this.tokenUrl);
        this.useChina = china;
        return this.accessToken;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Bing token fetch failed');
  }

  static async requestTranslate(text, src, tgt) {
    const tk = await this.getAccessToken();
    const body = new URLSearchParams({ text, fromLang: src, to: tgt, token: tk.token, key: String(tk.key) });
    return await httpJson('POST', this.useChina ? this.chinaBaseUrl : this.baseUrl, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent,
        Referer: this.useChina ? this.chinaTokenUrl : this.tokenUrl,
        ...(tk.cookie ? { Cookie: tk.cookie } : {}),
      },
      searchParams: {
        IG: tk.IG,
        IID: tk.IID && tk.IID.length ? `${tk.IID}.${tk.count++}` : '',
        isVertical: '1',
      },
      body,
    });
  }

  static async wrapResponse(resp) {
    if (Array.isArray(resp) && resp[0] && resp[0].translations) {
      const t = resp[0];
      // Current Bing response nests transliteration inside translations[0].
      const tr = (t.translations && t.translations[0] && t.translations[0].transliteration) || null;
      return {
        targetText: t.translations[0].text,
        detectedLang: t.detectedLanguage && t.detectedLanguage.language,
        transliteration: tr ? (tr.text || '') : '',
      };
    }
    return null;
  }
}

// ---- Youdao (有道智云 NMT + free dictionary enrichment) ----
// Translation via openapi.youdao.com (needs appKey/secret from the console).
// For single words we additionally query dict.youdao.com's free dictionary
// endpoint so the tooltip shows rich multi-meaning POS entries (n./v./…),
// which the NMT API alone no longer returns.
class YoudaoEngine extends BaseTranslator {
  static langCodeJson = {
    auto: 'auto', zh: 'zh-CHS', 'zh-CN': 'zh-CHS', 'zh-TW': 'zh-CHT',
    en: 'en', ja: 'ja', ko: 'ko', fr: 'fr', de: 'de', es: 'es',
    ru: 'ru', pt: 'pt', it: 'it', ar: 'ar', th: 'th', vi: 'vi',
    id: 'id', nl: 'nl', pl: 'pl', tr: 'tr', uk: 'uk', hi: 'hi',
  };
  static dictUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

  static truncate(text) {
    return text.length <= 20 ? text : text.slice(0, 10) + text.length + text.slice(-10);
  }
  static async requestTranslate(text, src, tgt, settings) {
    const appKey = settings.youdaoAppKey;
    const secret = settings.youdaoSecret;
    if (!appKey || !secret) throw new Error(i18n().youdaoKeyMissing);
    const salt = nodeCrypto.randomBytes(16).toString('hex');
    const curtime = String(Math.floor(Date.now() / 1000));
    const sign = nodeCrypto.createHash('sha256')
      .update(appKey + this.truncate(text) + salt + curtime + secret)
      .digest('hex');
    return await httpJson('POST', 'https://openapi.youdao.com/api', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ q: text, from: src, to: tgt, appKey, salt, curtime, sign, signType: 'v3' }),
    });
  }
  static async fetchDict(text) {
    const dicts = JSON.stringify({ count: 99, dicts: [['ec'], ['ce']] });
    const url = 'https://dict.youdao.com/jsonapi?jsonversion=2&client=mobile&q='
      + encodeURIComponent(text) + '&dicts=' + encodeURIComponent(dicts);
    return await httpJson('GET', url, {
      headers: { 'User-Agent': this.dictUA, Referer: 'https://dict.youdao.com/' },
    });
  }
  static async wrapResponse(resp, text, src, tgt, settings) {
    if (!resp || resp.errorCode !== '0') return null;
    const targetText = Array.isArray(resp.translation) ? resp.translation.join('\n') : '';
    if (!targetText) return null;
    const detectedLang = resp.l ? resp.l.split('2')[0] : null;
    let dict = null;
    let phonetic = '';
    // Free dictionary enrichment is optional — "one word, many translations".
    // The dictionary endpoint is free and does NOT consume NMT quota.
    const useDict = settings.showMultiTranslation !== false;
    const isChinese = isChineseText(text);
    const isWord = /^[\p{L}\p{N}]+(?:['\-]\p{L}+)*$/u.test(text);
    const isPhrase = !isWord && /^[\p{L}\p{N}]+(?:[\s'\-][\p{L}\p{N}]+){1,4}$/u.test(text);
    if (useDict && (isWord || isPhrase) && text.length <= 40) {
      try {
        const dj = await this.fetchDict(text);
        const cw = isChinese && dj.ce && dj.ce.word && dj.ce.word[0];   // 汉→英 (ce)
        const ew = !isChinese && dj.ec && dj.ec.word && dj.ec.word[0];  // 英→汉 (ec)
        const entry = cw || ew;
        if (entry) {
          if (ew) {
            if (ew.usphone || ew.ukphone) {
              phonetic = (ew.usphone ? `US /${ew.usphone}/` : '') + (ew.usphone && ew.ukphone ? '  ' : '') + (ew.ukphone ? `UK /${ew.ukphone}/` : '');
            }
          } else if (cw && cw.phone) {
            phonetic = `pinyin /${cw.phone}/`;
          }
          const rows = [];
          if (cw) {
            // 汉英: one row per entry — 词性 + 英文译词 + first definition.
            for (const t of (cw.trs || [])) {
              for (const tr of (t.tr || [])) {
                const l = tr && tr.l;
                if (!l) continue;
                const pos = String(l.pos || '').trim();
                const words = (l.i || []).map(x => typeof x === 'object' ? (x['#text'] || '') : x).filter(Boolean);
                const tran = String(l['#tran'] || '').trim();
                if (!pos && !words.length) continue;
                const terms = [];
                if (words.length) terms.push(words.join(', '));
                if (tran) terms.push(tran.split('；')[0].trim());
                if (terms.length) rows.push({ pos, terms: terms.slice(0, 2) });
              }
            }
          } else if (isWord) {
            // 英汉 single word: POS-prefixed entries (n. / v. / adj. …).
            for (const t of (entry.trs || [])) {
              const parts = (t.tr || []).map(x => (x.l && x.l.i || []).join('；')).filter(Boolean);
              if (!parts.length) continue;
              const m = parts[0].match(/^([a-z]+)\.\s*(.*)$/i);
              const pos = m ? `${m[1].toLowerCase()}.` : '';
              // Skip entries without a POS prefix (e.g. 【名】 proper-noun rows).
              if (!pos) continue;
              const defs = (m ? m[2].split('；') : [parts[0]]).map(s => s.trim()).filter(Boolean);
              if (defs.length) rows.push({ pos, terms: defs.slice(0, 8) });
            }
          } else {
            // 英汉 phrase: dictionary returns "释义：解释" style entries — collect
            // the core meanings into a single row tagged 短语.
            const cores = [];
            for (const t of (entry.trs || [])) {
              const parts = (t.tr || []).map(x => (x.l && x.l.i || []).join('；')).filter(Boolean);
              for (const p of parts) {
                const pieces = p.includes('：') ? [p.split('：')[0]] : p.split('；');
                for (const piece of pieces) {
                  const s = piece.trim();
                  if (s && !cores.includes(s)) cores.push(s);
                }
              }
              if (cores.length >= 12) break;
            }
            if (cores.length) rows.push({ pos: '短语', terms: cores.slice(0, 12) });
          }
          if (rows.length) dict = rows;
        }
      } catch (_) { /* dictionary is optional — never block translation */ }
    }
    return { targetText, detectedLang, transliteration: phonetic, dict };
  }
}

// ---- 百度翻译开放平台 (Baidu Translate API) ----
// https://fanyi-api.baidu.com — free tier available (appid + secret key).
// Sign: md5(appid + q + salt + secret). Single request limited to 2000 bytes.
class BaiduEngine extends BaseTranslator {
  static langCodeJson = {
    auto: 'auto', 'zh-CN': 'zh', zh: 'zh', 'zh-TW': 'cht',
    en: 'en', ja: 'jp', ko: 'kor', fr: 'fra', es: 'spa', de: 'de',
    ru: 'ru', pt: 'pt', it: 'it', ar: 'ara', th: 'th', vi: 'vie',
    id: 'id', nl: 'nl', pl: 'pl', tr: 'tr', uk: 'uk', hi: 'hi',
  };
  static async requestTranslate(text, src, tgt, settings) {
    const appid = settings.baiduAppId;
    const secret = settings.baiduSecretKey;
    if (!appid || !secret) throw new Error(i18n().baiduKeyMissing);
    const salt = String(Date.now());
    const sign = nodeCrypto.createHash('md5').update(appid + text + salt + secret).digest('hex');
    return await httpJson('GET', 'https://fanyi-api.baidu.com/api/trans/vip/translate', {
      searchParams: { q: text, from: src, to: tgt, appid, salt, sign },
    });
  }
  static async wrapResponse(resp) {
    if (!resp || resp.error_code) return null;
    const targetText = Array.isArray(resp.trans_result)
      ? resp.trans_result.map(t => t.dst).filter(Boolean).join('\n') : '';
    return targetText ? { targetText, detectedLang: resp.from || null } : null;
  }
}

// ---- 腾讯云机器翻译（翻译君 TMT, TC3-HMAC-SHA256 签名）----
// https://cloud.tencent.com/product/tmt — free tier (SecretId + SecretKey).
class TencentEngine extends BaseTranslator {
  static langCodeJson = {
    auto: 'auto', 'zh-CN': 'zh', zh: 'zh', 'zh-TW': 'zh-TW',
    en: 'en', ja: 'ja', ko: 'ko', fr: 'fr', es: 'es', de: 'de',
    ru: 'ru', pt: 'pt', it: 'it', ar: 'ar', th: 'th', vi: 'vi',
    id: 'id', nl: 'nl', pl: 'pl', tr: 'tr', uk: 'uk', hi: 'hi',
  };
  static service = 'tmt';
  static host = 'tmt.tencentcloudapi.com';
  static version = '2018-03-21';
  static region = 'ap-guangzhou';
  static async requestTranslate(text, src, tgt, settings) {
    const sid = settings.tencentSecretId;
    const skey = settings.tencentSecretKey;
    if (!sid || !skey) throw new Error(i18n().tencentKeyMissing);
    const ts = Math.floor(Date.now() / 1000);
    const date = new Date(ts * 1000).toISOString().slice(0, 10);
    const payload = { SourceText: text, Source: src, Target: tgt, ProjectId: 0 };
    const bodyStr = JSON.stringify(payload);
    const hashedPayload = nodeCrypto.createHash('sha256').update(bodyStr).digest('hex');
    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${this.host}\n`;
    const signedHeaders = 'content-type;host';
    const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`;
    const stringToSign = `TC3-HMAC-SHA256\n${ts}\n${date}/${this.service}/tc3_request\n`
      + nodeCrypto.createHash('sha256').update(canonicalRequest).digest('hex');
    const kDate = nodeCrypto.createHmac('sha256', `TC3${skey}`).update(date).digest();
    const kService = nodeCrypto.createHmac('sha256', kDate).update(this.service).digest();
    const kSigning = nodeCrypto.createHmac('sha256', kService).update('tc3_request').digest();
    const signature = nodeCrypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
    const authorization = `TC3-HMAC-SHA256 Credential=${sid}/${date}/${this.service}/tc3_request, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    return await httpJson('POST', `https://${this.host}`, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-TC-Action': 'TextTranslate',
        'X-TC-Version': this.version,
        'X-TC-Timestamp': String(ts),
        'X-TC-Region': this.region,
        Authorization: authorization,
      },
      body: bodyStr,
    });
  }
  static async wrapResponse(resp) {
    const r = resp && resp.Response;
    if (!r || r.Error || r.TargetText == null) return null;
    return { targetText: r.TargetText, detectedLang: r.Source || null };
  }
}

// ---- 阿里云机器翻译 (Alibaba Cloud MT, RPC + HMAC-SHA1 签名) ----
// https://www.alibabacloud.com/product/machine-translation — free tier (AccessKey).
class AliyunEngine extends BaseTranslator {
  static langCodeJson = {
    auto: 'auto', 'zh-CN': 'zh', zh: 'zh', 'zh-TW': 'zh-tw',
    en: 'en', ja: 'ja', ko: 'ko', fr: 'fr', es: 'es', de: 'de',
    ru: 'ru', pt: 'pt', it: 'it', ar: 'ar', th: 'th', vi: 'vi',
    id: 'id', nl: 'nl', pl: 'pl', tr: 'tr', uk: 'uk', hi: 'hi',
  };
  static encode(s) {
    return encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  }
  static async requestTranslate(text, src, tgt, settings) {
    const ak = settings.aliyunAccessKeyId;
    const sk = settings.aliyunAccessKeySecret;
    if (!ak || !sk) throw new Error(i18n().aliyunKeyMissing);
    const params = {
      AccessKeyId: ak,
      Action: 'TranslateGeneral',
      Format: 'JSON',
      FormatType: 'text',
      Scene: 'general',
      SignatureMethod: 'HMAC-SHA1',
      SignatureNonce: nodeCrypto.randomBytes(16).toString('hex'),
      SignatureVersion: '1.0',
      SourceLanguage: src,
      SourceText: text,
      TargetLanguage: tgt,
      Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      Version: '2018-10-12',
    };
    const canonical = Object.keys(params).sort()
      .map(k => `${this.encode(k)}=${this.encode(params[k])}`).join('&');
    const stringToSign = `GET&%2F&${this.encode(canonical)}`;
    params.Signature = nodeCrypto.createHmac('sha1', `${sk}&`).update(stringToSign).digest('base64');
    return await httpJson('GET', 'https://mt.aliyuncs.com', { searchParams: params });
  }
  static async wrapResponse(resp) {
    const d = resp && resp.Data;
    if (!d || d.Translated == null) return null;
    return { targetText: d.Translated, detectedLang: d.DetectedLanguage || null };
  }
}

const ENGINE_CLASSES = {
  google: GoogleEngine,
  googleGTX: GoogleGTXEngine,
  bing: BingEngine,
  youdao: YoudaoEngine,
  baidu: BaiduEngine,
  tencent: TencentEngine,
  aliyun: AliyunEngine,
};

const ENGINE_LABELS = {
  google: 'Google',
  googleGTX: 'Google (translate_a/t)',
  bing: 'Bing (experimental)',
  youdao: '有道智云 (Youdao)',
  baidu: '百度翻译 (Baidu)',
  tencent: '腾讯云翻译 (Tencent TMT)',
  aliyun: '阿里云翻译 (Aliyun MT)',
};

const ENGINES = Object.fromEntries(
  Object.entries(ENGINE_CLASSES).map(([k, C]) => [
    k,
    {
      label: ENGINE_LABELS[k] || k,
      translate: (text, src, tgt, settings) => C.translate(text, src, tgt, settings),
    },
  ])
);

function isWordChar(c) {
  return !!c && /[\p{L}\p{N}'\-_]/u.test(c);
}

function isSentenceBoundary(c) {
  return /[.!?。！？\n\r]/.test(c);
}

function caretRange(x, y) {
  if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    if (!p) return null;
    const r = document.createRange();
    r.setStart(p.offsetNode, p.offset);
    r.setEnd(p.offsetNode, p.offset);
    return r;
  }
  return null;
}

function extractAtPoint(x, y, mode) {
  const range = caretRange(x, y);
  if (!range) return null;
  const node = range.startContainer;
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent;
  if (!text) return null;
  const off = range.startOffset;

  let start = off, end = off;
  if (mode === 'sentence') {
    while (start > 0 && !isSentenceBoundary(text[start - 1])) start--;
    while (end < text.length && !isSentenceBoundary(text[end])) end++;
  } else {
    while (start > 0 && isWordChar(text[start - 1])) start--;
    while (end < text.length && isWordChar(text[end])) end++;
  }
  const slice = text.slice(start, end).trim();
  if (!slice) return null;

  const wordRange = document.createRange();
  wordRange.setStart(node, start);
  wordRange.setEnd(node, end);
  const rect = wordRange.getBoundingClientRect();
  // make sure the cursor is actually inside the rect (caretRangeFromPoint can snap)
  if (x < rect.left - 4 || x > rect.right + 4 || y < rect.top - 4 || y > rect.bottom + 4) return null;
  return { text: slice, rect };
}

// Persists translation history to translation-log.json in the plugin folder.
// Each entry records the source/target text, languages, and view count.
// Writes are debounced to 2 s to avoid hammering the filesystem on every hover.
class TranslationLog {
  constructor(app, pluginDir) {
    this.app = app;
    this.filePath = `${pluginDir}/translation-log.json`;
    this.entries = {};
    this.saveTimer = null;
  }

  async load() {
    try {
      if (await this.app.vault.adapter.exists(this.filePath)) {
        const raw = await this.app.vault.adapter.read(this.filePath);
        const data = JSON.parse(raw);
        if (data && typeof data.entries === 'object') this.entries = data.entries;
      }
    } catch (e) {
      console.warn('[mtt] translation-log load failed:', e);
      this.entries = {};
    }
  }

  record(key, result, sourceText) {
    const now = Date.now();
    const hasDict = Array.isArray(result.dict) && result.dict.length > 0;
    if (this.entries[key]) {
      this.entries[key].count++;
      this.entries[key].lastSeen = now;
      // Backfill pos/type if the first hit lacked dict data but this one has it.
      if (hasDict && this.entries[key].pos.length === 0) {
        this.entries[key].pos = result.dict;
        this.entries[key].type = 'word';
      }
    } else {
      this.entries[key] = {
        sourceText,
        targetText: result.targetText,
        sourceLang: result.sourceLang,
        targetLang: result.targetLang,
        pos: hasDict ? result.dict : [],
        type: hasDict ? 'word' : 'sentence',
        count: 1,
        firstSeen: now,
        lastSeen: now,
      };
    }
    this._scheduleSave();
  }

  _scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this._flush(), 2000);
  }

  async _flush() {
    this.saveTimer = null;
    try {
      await this.app.vault.adapter.write(
        this.filePath,
        JSON.stringify({ version: 1, entries: this.entries }, null, 2)
      );
    } catch (e) {
      console.warn('[mtt] translation-log save failed:', e);
    }
  }

  async destroy() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      await this._flush();
    }
  }
}

class TooltipManager {
  constructor(plugin, log) {
    this.plugin = plugin;
    this.log = log;
    this.el = null;
    this.token = 0;
    this.lastText = '';
    this.lastResult = null;
    this.cache = new Map();
    this.maxCache = 1000;
  }
  ensure() {
    if (this.el) return this.el;
    const el = document.createElement('div');
    el.className = 'mtt-tooltip';
    el.style.display = 'none';
    document.body.appendChild(el);
    this.el = el;
    return el;
  }
  hide() {
    this.lastText = '';
    this.lastResult = null;
    this.token++;
    if (this.el) this.el.style.display = 'none';
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (_) { /* noop */ }
  }
  // Show plain text (no translation API call) — used when hovering over a
  // page-translated paragraph to display the pre-translation original.
  showPlain(text, rect) {
    if (!text) { this.hide(); return; }
    if (text === this.lastText && this.el && this.el.style.display !== 'none') {
      this.position(rect);
      return;
    }
    this.lastText = text;
    this.token++;
    const el = this.ensure();
    el.empty ? el.empty() : (el.textContent = '');
    const label = document.createElement('div');
    label.className = 'mtt-orig-label';
    label.textContent = i18n().origLabel;
    el.appendChild(label);
    const sep = document.createElement('div');
    sep.className = 'mtt-orig-sep';
    el.appendChild(sep);
    const main = document.createElement('div');
    main.className = 'mtt-target mtt-orig-preview';
    main.textContent = text;
    el.appendChild(main);
    el.style.display = 'block';
    this.position(rect);
  }
  isOwn(target) {
    return !!(this.el && target instanceof Node && this.el.contains(target));
  }
  cacheGet(key) { return this.cache.get(key); }
  cacheSet(key, val, sourceText) {
    if (this.cache.size >= this.maxCache) {
      const k = this.cache.keys().next().value;
      this.cache.delete(k);
    }
    this.cache.set(key, val);
    if (this.log) this.log.record(key, val, sourceText);
    if (this.plugin) {
      this.plugin.app.workspace.getLeavesOfType(VOCAB_VIEW_TYPE)
        .forEach(l => { if (l.view && l.view.refresh) l.view.refresh(); });
    }
  }
  async show(text, rect, engineKey) {
    if (!text) return;
    const { sourceLang } = this.plugin.settings;
    const targetLang = effectiveTarget(text, this.plugin.settings);
    const engine = engineKey || 'google';
    if (text === this.lastText && this.el && this.el.style.display !== 'none') {
      this.position(rect);
      return;
    }

    // Short-circuit when source/target are explicitly the same — no API call needed.
    if (sourceLang !== 'auto' && sourceLang === targetLang) {
      this.hide();
      return;
    }

    const key = `v2|${engine}|${sourceLang}|${targetLang}|${text}`;
    const cached = this.plugin.settings.disableCache ? null : this.cacheGet(key);
    // Sync no-op check on cache hit — avoids flashing the "…" loading state.
    if (cached && isNoopTranslation(cached, text, this.plugin.settings)) {
      this.hide();
      return;
    }

    this.lastText = text;
    const my = ++this.token;

    const el = this.ensure();
    if (cached) {
      el.style.display = 'none';
      this.position(rect);
    } else {
      // Instant response with a subtle loading state.
      el.empty ? el.empty() : (el.textContent = '');
      const loading = document.createElement('div');
      loading.className = 'mtt-loading';
      loading.textContent = '⋯';
      el.appendChild(loading);
      el.style.display = 'block';
      this.position(rect);
    }

    let result = cached;
    if (!result) {
      try {
        const eng = ENGINES[engine] || ENGINES.google;
        result = await eng.translate(text, sourceLang, targetLang, this.plugin.settings);
      } catch (e) {
        if (my === this.token) {
          el.textContent = `⚠ ${e.message || e}`;
          el.style.display = 'block';
          this.position(rect);
        }
        return;
      }
      if (result && result.targetText) this.cacheSet(key, result, text);
    }
    if (my !== this.token) return;
    if (!result || !result.targetText) {
      el.textContent = i18n().noTranslation;
      el.style.display = 'block';
      this.position(rect);
      return;
    }
    if (isNoopTranslation(result, text, this.plugin.settings)) {
      this.hide();
      return;
    }
    this.lastResult = result;
    this.lastSourceText = text;
    this._notifyTransView(text, result);
    el.empty ? el.empty() : (el.textContent = '');

    // ── Toolbar: speak + copy ──────────────────
    const toolbar = document.createElement('div');
    toolbar.className = 'mtt-toolbar';

    const speakBtn = document.createElement('button');
    speakBtn.type = 'button';
    speakBtn.className = 'mtt-toolbar-btn mtt-speak-btn';
    speakBtn.textContent = '🔊';
    speakBtn.title = i18n().speakTitle;
    speakBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this._speak(text);
    });
    toolbar.appendChild(speakBtn);

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'mtt-toolbar-btn mtt-copy-btn';
    copyBtn.textContent = '📋';
    copyBtn.title = i18n().copyTitle;
    copyBtn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const out = result && result.targetText;
      if (!out) return;
      try {
        await navigator.clipboard.writeText(out);
        new Notice(i18n().copyTranslationNotice(out));
      } catch (_) { /* clipboard unavailable */ }
    });
    toolbar.appendChild(copyBtn);

    el.appendChild(toolbar);

    const showDict = this.plugin.settings.showDictionary
      && Array.isArray(result.dict) && result.dict.length > 0;

    if (showDict) {
      // Big headword line for the dictionary card.
      const head = document.createElement('div');
      head.className = 'mtt-headword';
      head.textContent = text;
      el.appendChild(head);

      const dictWrap = document.createElement('div');
      dictWrap.className = 'mtt-dict';
      for (const { pos, terms } of result.dict) {
        const row = document.createElement('div');
        row.className = 'mtt-dict-row';
        if (pos) {
          const posEl = document.createElement('b');
          posEl.className = 'mtt-pos';
          posEl.textContent = pos;
          row.appendChild(posEl);
          row.appendChild(document.createTextNode(' '));
        }
        const termsEl = document.createElement('span');
        termsEl.className = 'mtt-terms';
        termsEl.textContent = (terms || []).join(', ');
        row.appendChild(termsEl);
        dictWrap.appendChild(row);
      }
      el.appendChild(dictWrap);
    } else {
      const main = document.createElement('div');
      main.className = 'mtt-target';
      main.textContent = result.targetText;
      el.appendChild(main);
    }

    if (this.plugin.settings.showTransliteration && result.transliteration) {
      const translit = document.createElement('div');
      translit.className = 'mtt-translit';
      translit.textContent = result.transliteration;
      el.appendChild(translit);
    }
    if (this.plugin.settings.showSourceText) {
      const src = document.createElement('div');
      src.className = 'mtt-source';
      src.textContent = text;
      el.appendChild(src);
    }
    if (this.plugin.settings.showDetectedLang && result.sourceLang) {
      const meta = document.createElement('div');
      meta.className = 'mtt-meta';
      meta.textContent = `${result.sourceLang} → ${result.targetLang}`;
      el.appendChild(meta);
    }
    el.style.display = 'block';
    this.position(rect);
  }
  position(rect) {
    if (!this.el || !rect) return;
    const pad = 8;
    const w = this.el.offsetWidth || 200;
    const h = this.el.offsetHeight || 30;
    let x = rect.left;
    let y;
    if (Platform.isMobile) {
      // Upper half → show above finger; lower half → show below finger
      if (rect.top < window.innerHeight / 2) {
        y = rect.top - h - pad;
      } else {
        y = rect.bottom + pad;
      }
    } else {
      y = rect.bottom + pad;
      if (y + h > window.innerHeight) y = rect.top - h - pad;
    }
    if (y < 0) y = pad;
    if (y + h > window.innerHeight) y = window.innerHeight - h - pad;
    if (x + w > window.innerWidth) x = window.innerWidth - w - pad;
    if (x < 0) x = pad;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }
  _speak(text) {
    if (!text) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) { new Notice('TTS unavailable'); return; }
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const detected = this.lastResult && this.lastResult.sourceLang;
      const cfg = this.plugin.settings.sourceLang;
      u.lang = (detected && detected !== 'auto') ? detected
        : (cfg && cfg !== 'auto') ? cfg : 'en';
      u.rate = 0.95;
      synth.speak(u);
    } catch (_) { /* ignore */ }
  }
  _notifyTransView(text, result) {
    if (!this.plugin) return;
    this.plugin.app.workspace.getLeavesOfType(TRANS_VIEW_TYPE)
      .forEach(l => { if (l.view?.update) l.view.update(text, result); });
  }
  async destroy() {
    this.hide();
    if (this.el) { this.el.remove(); this.el = null; }
    this.cache.clear();
    if (this.log) await this.log.destroy();
  }
}

const VOCAB_VIEW_TYPE = 'mtt-vocab-view';

class VocabView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this._sort = 'count-desc';
    this._filter = 'word';
    this._listEl = null;
  }

  getViewType() { return VOCAB_VIEW_TYPE; }
  getDisplayText() { return i18n().vocabTitle; }
  getIcon() { return 'book-open'; }

  async onOpen() { this.render(); }

  render() {
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass('mtt-vocab-root');

    const header = root.createEl('div', { cls: 'mtt-vocab-header' });
    const s = i18n();
    header.createEl('span', { cls: 'mtt-vocab-title', text: s.vocabTitle });
    const reload = header.createEl('button', { cls: 'mtt-vocab-reload', title: s.vocabReload });
    reload.textContent = '↻';
    reload.addEventListener('click', () => this.refresh());

    const controls = root.createEl('div', { cls: 'mtt-vocab-controls' });

    const sortSelect = controls.createEl('select', { cls: 'mtt-vocab-sort' });
    for (const [value, label] of [
      ['count-desc', s.sortByCount],
      ['last-desc', s.sortByRecent],
      ['alpha', s.sortAlpha],
    ]) {
      const opt = sortSelect.createEl('option', { text: label });
      opt.value = value;
      if (value === this._sort) opt.selected = true;
    }
    sortSelect.addEventListener('change', () => { this._sort = sortSelect.value; this.refresh(); });

    const filterWrap = controls.createEl('div', { cls: 'mtt-vocab-filter-wrap' });
    for (const [value, label] of [['all', s.filterAll], ['word', s.filterWord], ['sentence', s.filterSentence]]) {
      const btn = filterWrap.createEl('button', { cls: 'mtt-vocab-filter-btn', text: label });
      btn.dataset.filter = value;
      if (value === this._filter) btn.addClass('is-active');
      btn.addEventListener('click', () => {
        this._filter = value;
        filterWrap.querySelectorAll('.mtt-vocab-filter-btn').forEach(b =>
          b.classList.toggle('is-active', b.dataset.filter === value)
        );
        this.refresh();
      });
    }

    this._listEl = root.createEl('div', { cls: 'mtt-vocab-list' });
    this._renderList();
  }

  refresh() {
    if (this._listEl) this._renderList();
  }

  _renderList() {
    const container = this._listEl;
    container.empty();
    const entries = Object.values(this.plugin.log.entries);

    let filtered = entries;
    if (this._filter === 'word') filtered = entries.filter(e => e.type === 'word');
    else if (this._filter === 'sentence') filtered = entries.filter(e => e.type === 'sentence');

    const sorted = [...filtered];
    if (this._sort === 'count-desc') sorted.sort((a, b) => b.count - a.count);
    else if (this._sort === 'last-desc') sorted.sort((a, b) => b.lastSeen - a.lastSeen);
    else sorted.sort((a, b) => a.sourceText.localeCompare(b.sourceText));

    if (sorted.length === 0) {
      container.createEl('div', { cls: 'mtt-vocab-empty', text: i18n().vocabEmpty });
      return;
    }

    for (const entry of sorted) {
      const card = container.createEl('div', { cls: 'mtt-vocab-card' });
      const main = card.createEl('div', { cls: 'mtt-vocab-main' });
      main.createEl('span', { cls: 'mtt-vocab-source', text: entry.sourceText });
      main.createEl('span', { cls: 'mtt-vocab-sep', text: ' → ' });
      main.createEl('span', { cls: 'mtt-vocab-target', text: entry.targetText });
      main.createEl('span', { cls: 'mtt-vocab-count', text: `×${entry.count}` });
      const copyBtn = main.createEl('button', { cls: 'mtt-vocab-copy', text: i18n().vocabCopy });
      copyBtn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(`${entry.sourceText} → ${entry.targetText}`);
        copyBtn.textContent = i18n().vocabCopied;
        setTimeout(() => { copyBtn.textContent = i18n().vocabCopy; }, 1500);
      });

      if (Array.isArray(entry.pos) && entry.pos.length > 0) {
        const posWrap = card.createEl('div', { cls: 'mtt-vocab-pos-wrap' });
        for (const { pos, terms } of entry.pos) {
          const row = posWrap.createEl('span', { cls: 'mtt-vocab-pos-entry' });
          if (pos) row.createEl('span', { cls: 'mtt-vocab-pos-label', text: pos + ': ' });
          row.appendText((terms || []).join(' / '));
        }
      }
    }
  }
}

// ── Translation Panel ─────────────────────────────────────────────────────────
const TRANS_VIEW_TYPE = 'mtt-trans-view';

class TranslationView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this._srcLang = plugin.settings.sourceLang;
    this._tgtLang = plugin.settings.targetLang;
    this._result = null;
    this._debounceTimer = null;
    this._inputEl = null;
    this._resultEl = null;
    this._metaEl = null;
    this._copyBtn = null;
    this._srcSelect = null;
    this._tgtSelect = null;
  }

  getViewType() { return TRANS_VIEW_TYPE; }
  getDisplayText() { return i18n().transPanelTitle; }
  getIcon() { return 'message-square'; }

  async onOpen() {
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass('mtt-trans-root');
    this._build(root);
  }

  _build(root) {
    const s = i18n();

    // ── Language selector bar ────────────────────────────────────
    const langBar = root.createEl('div', { cls: 'mtt-trans-lang-bar' });

    this._srcSelect = langBar.createEl('select', { cls: 'mtt-trans-lang-select' });
    for (const [code, label] of Object.entries(COMMON_LANGS)) {
      const opt = this._srcSelect.createEl('option', { text: langName(code, label) });
      opt.value = code;
      if (code === this._srcLang) opt.selected = true;
    }
    this._srcSelect.addEventListener('change', () => {
      this._srcLang = this._srcSelect.value;
      this._scheduleTranslate();
    });

    const swapBtn = langBar.createEl('button', { cls: 'mtt-trans-swap', title: s.transPanelSwap });
    swapBtn.textContent = '⇄';
    swapBtn.addEventListener('click', () => this._swapLangs());

    this._tgtSelect = langBar.createEl('select', { cls: 'mtt-trans-lang-select' });
    for (const [code, label] of Object.entries(COMMON_LANGS)) {
      if (code === 'auto') continue;
      const opt = this._tgtSelect.createEl('option', { text: langName(code, label) });
      opt.value = code;
      if (code === this._tgtLang) opt.selected = true;
    }
    this._tgtSelect.addEventListener('change', () => {
      this._tgtLang = this._tgtSelect.value;
      this._scheduleTranslate();
    });

    // ── Source textarea ──────────────────────────────────────────
    const inputWrap = root.createEl('div', { cls: 'mtt-trans-input-wrap' });
    this._inputEl = inputWrap.createEl('textarea', {
      cls: 'mtt-trans-input',
      attr: { placeholder: s.transPanelPlaceholder },
    });
    this._inputEl.addEventListener('input', () => this._scheduleTranslate());

    const clearBtn = inputWrap.createEl('button', {
      cls: 'mtt-trans-clear-btn',
      title: s.transPanelClear,
      text: '✕',
    });
    clearBtn.addEventListener('click', () => {
      this._inputEl.value = '';
      this._result = null;
      this._renderResult();
    });

    // ── Result area ──────────────────────────────────────────────
    this._resultEl = root.createEl('div', { cls: 'mtt-trans-result' });

    // ── Footer ───────────────────────────────────────────────────
    const footer = root.createEl('div', { cls: 'mtt-trans-footer' });
    this._metaEl = footer.createEl('span', { cls: 'mtt-trans-meta' });
    this._copyBtn = footer.createEl('button', { cls: 'mtt-trans-copy', text: s.transPanelCopy });
    this._copyBtn.style.visibility = 'hidden';
    this._copyBtn.addEventListener('click', async () => {
      if (!this._result?.targetText) return;
      await navigator.clipboard.writeText(this._result.targetText);
      this._copyBtn.textContent = s.transPanelCopied;
      setTimeout(() => { this._copyBtn.textContent = s.transPanelCopy; }, 1500);
    });
  }

  _swapLangs() {
    const prevSrc = this._srcLang;
    const prevTgt = this._tgtLang;
    const newSrc = prevSrc === 'auto' ? (this._result?.sourceLang || prevTgt) : prevTgt;
    const newTgt = prevSrc === 'auto' ? prevTgt : prevSrc;
    this._srcLang = newSrc;
    this._tgtLang = newTgt;
    if (this._srcSelect) this._srcSelect.value = newSrc;
    if (this._tgtSelect) this._tgtSelect.value = newTgt;
    if (this._inputEl && this._result?.targetText) {
      this._inputEl.value = this._result.targetText;
    }
    this._scheduleTranslate();
  }

  _scheduleTranslate() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._doTranslate(), 600);
  }

  async _doTranslate() {
    this._debounceTimer = null;
    const text = this._inputEl?.value.trim();
    if (!text) {
      this._result = null;
      this._renderResult();
      return;
    }
    if (this._resultEl) {
      this._resultEl.empty ? this._resultEl.empty() : (this._resultEl.textContent = '');
      this._resultEl.createEl('span', { cls: 'mtt-trans-loading', text: '…' });
    }
    try {
      const engineKey = this.plugin.settings.mouseoverEngine || 'google';
      const eng = ENGINES[engineKey] || ENGINES.google;
      this._result = await eng.translate(text, this._srcLang, this._tgtLang, this.plugin.settings);
    } catch (e) {
      this._result = { _error: e.message || String(e) };
    }
    this._renderResult();
  }

  _renderResult() {
    const el = this._resultEl;
    if (!el) return;
    el.empty ? el.empty() : (el.textContent = '');
    const s = i18n();

    if (!this._result) {
      this._metaEl.textContent = '';
      this._copyBtn.style.visibility = 'hidden';
      return;
    }
    if (this._result._error) {
      el.createEl('div', { cls: 'mtt-trans-error', text: `⚠ ${this._result._error}` });
      this._metaEl.textContent = '';
      this._copyBtn.style.visibility = 'hidden';
      return;
    }
    if (!this._result.targetText) {
      el.createEl('div', { cls: 'mtt-trans-empty', text: s.noTranslation });
      this._metaEl.textContent = '';
      this._copyBtn.style.visibility = 'hidden';
      return;
    }

    const { targetText, sourceLang, targetLang, dict, transliteration } = this._result;
    const showDict = Array.isArray(dict) && dict.length > 0;

    if (showDict) {
      const dictWrap = el.createEl('div', { cls: 'mtt-trans-dict' });
      for (const { pos, terms } of dict) {
        const row = dictWrap.createEl('div', { cls: 'mtt-trans-dict-row' });
        if (pos) row.createEl('span', { cls: 'mtt-trans-pos', text: pos + ': ' });
        row.createEl('span', { cls: 'mtt-trans-terms', text: (terms || []).join(' / ') });
      }
    } else {
      el.createEl('div', { cls: 'mtt-trans-target-text', text: targetText });
    }

    if (transliteration) {
      el.createEl('div', { cls: 'mtt-trans-translit', text: transliteration });
    }

    this._metaEl.textContent = sourceLang && targetLang ? `${sourceLang} → ${targetLang}` : '';
    this._copyBtn.style.visibility = '';
  }

  // Called by TooltipManager on hover translation — fills input only when empty.
  update(text, result) {
    if (!this._inputEl || this._inputEl.value.trim()) return;
    this._inputEl.value = text || '';
    this._result = result;
    this._renderResult();
  }
}

// ── Page Translator ───────────────────────────────────────────────────────────
class PageTranslator {
  constructor(plugin) {
    this.plugin = plugin;
    this._cancelled = false;
    this._running = false;
    this._progressEl = null;
  }

  _getViewContainer(view) {
    if (!view) return null;
    if (view.getMode?.() !== 'preview') return null;
    const previewEl = view.previewMode?.containerEl;
    if (!previewEl) return null;
    return previewEl.querySelector('.markdown-rendered') ?? previewEl;
  }

  // Returns the .markdown-rendered container for the active reading-view leaf,
  // or null when not in reading mode.
  _getContainer() {
    return this._getViewContainer(this.plugin.app.workspace.activeLeaf?.view);
  }

  // Reflects the current translation state on the header button of a given view.
  _syncButton(view) {
    const btn = view?.containerEl?.querySelector('.mtt-page-btn');
    if (!btn) return;
    const active = !!(this._getViewContainer(view)?.querySelector('[data-mtt-orig]'));
    btn.classList.toggle('is-active', active);
  }

  // Returns leaf-level translatable block elements (headings, paragraphs, list
  // items, table cells, etc.) that haven't been translated yet.
  _getBlocks(container) {
    const SEL = 'h1,h2,h3,h4,h5,h6,p,li,td,th,figcaption';
    return Array.from(container.querySelectorAll(SEL)).filter(el => {
      // Skip content inside code/math/frontmatter
      if (el.closest('pre,.math,.math-block,.frontmatter-container,.katex')) return false;
      // Skip already translated
      if (el.hasAttribute('data-mtt-orig')) return false;
      // Only translate leaf-level elements — skip if nested blocks exist inside
      // (prevents double-translating a li > p hierarchy).
      if (el.querySelector('h1,h2,h3,h4,h5,h6,p,li,td,th')) return false;
      return el.textContent.trim().length >= 2;
    });
  }

  _showProgress(current, total) {
    if (!this._progressEl) {
      const el = document.createElement('div');
      el.className = 'mtt-page-progress';
      el.innerHTML = `<span class="mtt-page-progress-label"></span>` +
        `<div class="mtt-page-progress-bar-wrap"><div class="mtt-page-progress-bar"></div></div>` +
        `<button class="mtt-page-progress-cancel" aria-label="${i18n().pageCancel}">✕</button>`;
      el.querySelector('.mtt-page-progress-cancel').onclick = () => this.cancel();
      document.body.appendChild(el);
      this._progressEl = el;
      this._repositionProgress();
    }
    const pct = total > 0 ? Math.round(current / total * 100) : 0;
    this._progressEl.querySelector('.mtt-page-progress-label').textContent =
      i18n().pageTranslating(current, total);
    this._progressEl.querySelector('.mtt-page-progress-bar').style.width = `${pct}%`;
  }

  _repositionProgress() {
    if (!this._progressEl) return;
    const view = this.plugin.app.workspace.activeLeaf?.view;
    const headerEl = view?.containerEl?.querySelector('.view-header');
    if (headerEl) {
      const rect = headerEl.getBoundingClientRect();
      Object.assign(this._progressEl.style, {
        top: `${rect.bottom - 26}px`,
        left: `${rect.left + 8}px`,
        bottom: 'auto',
        transform: 'none',
      });
    }
  }

  _hideProgress() {
    if (this._progressEl) { this._progressEl.remove(); this._progressEl = null; }
  }

  cancel() {
    this._cancelled = true;
    this._running = false;
    this._hideProgress();
    // Revert any blocks that were translated before cancellation
    const container = this._getContainer();
    if (container) {
      container.querySelectorAll('[data-mtt-orig]').forEach(el => {
        el.innerHTML = el.getAttribute('data-mtt-orig');
        el.removeAttribute('data-mtt-orig');
        el.classList.remove('mtt-page-translated');
      });
    }
    this._syncButton(this.plugin.app.workspace.activeLeaf?.view);
  }

  hasTranslation() {
    const container = this._getContainer();
    return !!(container && container.querySelector('[data-mtt-orig]'));
  }

  async translatePage() {
    if (this._running) {
      new Notice(i18n().pageAlreadyRunning);
      return;
    }
    const container = this._getContainer();
    if (!container) {
      new Notice(i18n().pageNeedReadingView);
      return;
    }
    const blocks = this._getBlocks(container);
    if (blocks.length === 0) {
      new Notice(i18n().pageNoText);
      return;
    }

    this._running = true;
    this._cancelled = false;

    const { pageEngine, sourceLang, disableCache } = this.plugin.settings;
    const engine = pageEngine || 'google';
    const eng = ENGINES[engine] || ENGINES.google;
    const tooltip = this.plugin.tooltip;

    this._showProgress(0, blocks.length);
    let done = 0;

    for (const el of blocks) {
      if (this._cancelled) break;
      const originalText = el.textContent.trim();
      if (!originalText) { done++; continue; }

      try {
        // Smart direction: pick the target per paragraph.
        const targetLang = effectiveTarget(originalText, this.plugin.settings);
        const key = `v2|${engine}|${sourceLang}|${targetLang}|${originalText}`;
        const cached = disableCache ? null : tooltip?.cacheGet(key);
        const result = cached ?? await eng.translate(originalText, sourceLang, targetLang, this.plugin.settings);
        if (!cached && result?.targetText) tooltip?.cacheSet(key, result, originalText);
        if (this._cancelled) break;
        if (result?.targetText && !isNoopTranslation(result, originalText, this.plugin.settings)) {
          el.setAttribute('data-mtt-orig', el.innerHTML);
          el.textContent = result.targetText;
          el.classList.add('mtt-page-translated');
        }
      } catch (e) {
        console.warn('[mtt] page translation error:', e);
      }

      done++;
      this._showProgress(done, blocks.length);
      // Yield every 3 blocks to keep the UI responsive and avoid rate-limiting.
      if (done % 3 === 0) await new Promise(r => setTimeout(r, 50));
    }

    this._hideProgress();
    this._running = false;

    const activeView = this.plugin.app.workspace.activeLeaf?.view;
    this._syncButton(activeView);

    if (!this._cancelled) {
      new Notice(i18n().pageDone(done, blocks.length));
    }
  }

  restorePage() {
    const container = this._getContainer();
    if (!container) {
      new Notice(i18n().pageRestoreReadingOnly);
      return;
    }
    const translated = container.querySelectorAll('[data-mtt-orig]');
    if (translated.length === 0) {
      new Notice(i18n().pageNoTranslated);
      return;
    }
    translated.forEach(el => {
      el.innerHTML = el.getAttribute('data-mtt-orig');
      el.removeAttribute('data-mtt-orig');
      el.classList.remove('mtt-page-translated');
    });
    this._syncButton(this.plugin.app.workspace.activeLeaf?.view);
    new Notice(i18n().pageRestored(translated.length));
  }
}

module.exports = class MouseTooltipPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.log = new TranslationLog(this.app, this.manifest.dir);
    await this.log.load();
    this.tooltip = new TooltipManager(this, this.log);
    this.pageTranslator = new PageTranslator(this);
    this.pendingTimer = null;
    this.lastTriggerKey = '';
    // Selection-priority lock: while a non-empty selection exists, mouseover follow is paused
    // and the tooltip stays pinned to the selection translation.
    this.selectionActive = false;

    this.addSettingTab(new MouseTooltipSettingTab(this.app, this));

    this.registerView(VOCAB_VIEW_TYPE, (leaf) => new VocabView(leaf, this));
    this.registerView(TRANS_VIEW_TYPE, (leaf) => new TranslationView(leaf, this));

    this.addRibbonIcon('message-square', i18n().ribbonTrans, () => this.openTransView());
    this.addRibbonIcon('book-open', i18n().ribbonVocab, () => this.openVocabView());
    this.ribbonPageEl = this.addRibbonIcon('languages', i18n().ribbonPage, () => {
      if (this.pageTranslator._running) {
        this.pageTranslator.cancel();
      } else if (this.pageTranslator.hasTranslation()) {
        this.pageTranslator.restorePage();
      } else {
        this.pageTranslator.translatePage();
      }
    });
    if (!(Platform.isMobile ? this.settings.enablePageMobile : this.settings.enablePage)) this.ribbonPageEl.style.display = 'none';

    this.addCommand({
      id: 'mtt-open-trans-panel',
      name: 'Open translation panel',
      callback: () => this.openTransView(),
    });
    this.addCommand({
      id: 'mtt-open-vocab',
      name: 'Open vocabulary list',
      callback: () => this.openVocabView(),
    });
    this.addCommand({
      id: 'mtt-hide-tooltip',
      name: 'Hide tooltip',
      callback: () => this.tooltip.hide(),
    });
    this.addCommand({
      id: 'mtt-toggle-enabled',
      name: 'Toggle translator on/off',
      callback: async () => {
        this.settings.enabled = !this.settings.enabled;
        await this.saveSettings();
        new Notice(i18n().pluginToggle(this.settings.enabled));
        if (!this.settings.enabled) this.tooltip.hide();
      },
    });
    this.addCommand({
      id: 'mtt-translate-selection',
      name: 'Translate current selection',
      callback: () => this.translateSelection(),
    });
    this.addCommand({
      id: 'mtt-translate-page',
      name: 'Translate current page',
      callback: () => this.pageTranslator.translatePage(),
    });
    this.addCommand({
      id: 'mtt-restore-page',
      name: 'Restore original text (page translation)',
      callback: () => this.pageTranslator.restorePage(),
    });
    this.addCommand({
      id: 'mtt-copy-translation',
      name: 'Copy translation to clipboard',
      callback: async () => {
        const result = this.tooltip.lastResult;
        const s = i18n();
        if (!result || !result.targetText) {
          new Notice(s.copyTranslationNone);
          return;
        }
        await navigator.clipboard.writeText(result.targetText);
        new Notice(s.copyTranslationNotice(result.targetText));
      },
    });

    // Add translate button to all current and future markdown view headers.
    const addButtons = () => {
      this.app.workspace.getLeavesOfType('markdown').forEach(leaf => {
        this._addPageTranslateButton(leaf.view);
      });
    };
    addButtons();
    this.registerEvent(this.app.workspace.on('layout-change', addButtons));

    this.registerDomEvent(document, 'keydown', (e) => {
      if (e.key === 'Escape') {
        this.tooltip.hide();
        // ESC also releases the selection lock so mouseover can resume
        this.selectionActive = false;
      }
    });
    this.registerDomEvent(document, 'scroll', () => {
      if (this.selectionActive) return;
      this.tooltip.hide();
    }, true);
    this.registerDomEvent(document, 'selectionchange', () => this.onSelectionChange());

    if (Platform.isMobile) {
      this.registerDomEvent(document, 'touchstart', (e) => {
        if (!this.tooltip.isOwn(e.target)) this.tooltip.hide();
      });
      this.registerDomEvent(document, 'touchend', (e) => this.onTouchEnd(e));
    } else {
      this.registerDomEvent(document, 'mousemove', (e) => this.onMouseMove(e));
      this.registerDomEvent(document, 'mouseleave', () => {
        // keep tooltip while a selection is locking it
        if (this.selectionActive) return;
        this.tooltip.hide();
      });
      this.registerDomEvent(document, 'mousedown', (e) => {
        if (!this.tooltip.isOwn(e.target)) this.tooltip.hide();
      });
      this.registerDomEvent(document, 'mouseup', (e) => this.onMouseUp(e));
    }

    console.log('[mouse-tooltip-translator] loaded');
  }

  async onunload() {
    if (this.pendingTimer) clearTimeout(this.pendingTimer);
    if (this.pageTranslator?._running) this.pageTranslator.cancel();
    if (this.tooltip) await this.tooltip.destroy();
    this.app.workspace.detachLeavesOfType(VOCAB_VIEW_TYPE);
    this.app.workspace.detachLeavesOfType(TRANS_VIEW_TYPE);
  }

  _addPageTranslateButton(view) {
    if (!(Platform.isMobile ? this.settings.enablePageMobile : this.settings.enablePage)) return;
    if (!view || typeof view.addAction !== 'function') return;
    if (view.containerEl?.querySelector('.mtt-page-btn')) return;
    const btn = view.addAction('languages', i18n().ribbonPage, () => {
      if (this.pageTranslator._running) {
        this.pageTranslator.cancel();
      } else if (this.pageTranslator.hasTranslation()) {
        this.pageTranslator.restorePage();
      } else {
        this.pageTranslator.translatePage();
      }
    });
    btn.classList.add('mtt-page-btn');
    this.pageTranslator._syncButton(view);
  }

  async openTransView() {
    const existing = this.app.workspace.getLeavesOfType(TRANS_VIEW_TYPE);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: TRANS_VIEW_TYPE, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }

  async openVocabView() {
    const existing = this.app.workspace.getLeavesOfType(VOCAB_VIEW_TYPE);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VOCAB_VIEW_TYPE, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }

  _noteContentSelector() {
    switch (this.settings.activeMode) {
      case 'edit':    return '.cm-content, .markdown-rendered';
      case 'reading': return '.markdown-preview-view, .markdown-rendered';
      default:        return NOTE_CONTENT_SELECTOR;
    }
  }

  onMouseMove(e) {
    if (!this.settings.enabled) return;
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    if (this.tooltip.isOwn(e.target)) return;
    if (this.settings.restrictToNoteContent && !isInNoteContent(e.target, this._noteContentSelector())) {
      if (this.pendingTimer) { clearTimeout(this.pendingTimer); this.pendingTimer = null; }
      if (!this.selectionActive) this.tooltip.hide();
      return;
    }
    if (this.pendingTimer) { clearTimeout(this.pendingTimer); this.pendingTimer = null; }

    if (!this.settings.enableHover) return;
    // While a selection is active, freeze the tooltip on the selection translation.
    if (this.selectionActive) return;

    const x = e.clientX, y = e.clientY;

    // Page-translation hover mode: show pre-translation original of the hovered paragraph.
    if (this.settings.pageTranslationHoverOriginal && this.pageTranslator.hasTranslation()) {
      this.pendingTimer = window.setTimeout(() => {
        this.pendingTimer = null;
        if (this.selectionActive) return;
        const target = document.elementFromPoint(x, y);
        const block = target?.closest('[data-mtt-orig]');
        if (block) {
          const origText = getOriginalText(block);
          if (origText) {
            this.tooltip.showPlain(origText, block.getBoundingClientRect());
            return;
          }
        }
        this.tooltip.hide();
      }, Math.max(0, this.settings.delayMs | 0));
      return;
    }

    this.pendingTimer = window.setTimeout(() => {
      this.pendingTimer = null;
      // Re-check: a drag-selection may have started during the hover delay.
      if (this.selectionActive) return;
      const hit = extractAtPoint(x, y, this.settings.textType);
      if (!hit) { this.tooltip.hide(); return; }
      this.tooltip.show(hit.text, hit.rect, this.settings.mouseoverEngine);
    }, Math.max(0, this.settings.delayMs | 0));
  }

  onMouseUp(_e) {
    if (!this.settings.enabled) return;
    // While page-translation hover mode is active, suppress selection-based translation
    // (selected text would be translated text, not original).
    if (this.settings.pageTranslationHoverOriginal && this.pageTranslator.hasTranslation()) return;
    if (!this.settings.enableSelection) return;
    // Scope is judged from the selection itself (anchorNode), not from where the mouse
    // was released — a fast drag can land the cursor outside note content even when
    // the selection is entirely inside it.
    setTimeout(() => {
      if (this.settings.restrictToNoteContent) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;
        const _sel = this._noteContentSelector();
        if (!isInNoteContent(sel.anchorNode, _sel) && !isInNoteContent(sel.focusNode, _sel)) return;
      }
      this.translateSelection();
    }, 0);
  }

  onSelectionChange() {
    if (!this.settings.enabled) return;
    if (this.settings.pageTranslationHoverOriginal && this.pageTranslator.hasTranslation()) return;
    if (!this.settings.enableSelection) return;
    const sel = window.getSelection();
    const hasSelection = !!(sel && !sel.isCollapsed && sel.toString().trim());
    if (hasSelection) {
      if (this.settings.restrictToNoteContent) {
        const _sel = this._noteContentSelector();
        if (!isInNoteContent(sel.anchorNode, _sel) && !isInNoteContent(sel.focusNode, _sel)) return;
      }
      // Lock onto the selection — mousemove follow is suspended.
      this.selectionActive = true;
    } else if (this.selectionActive) {
      // Selection cleared — release lock and let mouseover resume.
      this.selectionActive = false;
      this.tooltip.hide();
    }
  }

  translateSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (!text) return;
    let rect;
    try {
      const range = sel.getRangeAt(0);
      // Use the first line's rect — the whole-range rect spans every line for
      // multi-line selections and makes the popup float far from the cursor.
      const rects = range.getClientRects();
      rect = rects && rects.length ? rects[0] : range.getBoundingClientRect();
    } catch { rect = null; }
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      // Fallback to the last known mouse position.
      if (typeof this.mouseX === 'number' && typeof this.mouseY === 'number') {
        rect = { left: this.mouseX, top: this.mouseY, bottom: this.mouseY + 6, width: 0, height: 0 };
      } else {
        rect = null;
      }
    }
    if (!rect) return;
    this.tooltip.show(text, rect, this.settings.selectionEngine);
  }

  onTouchEnd(e) {
    if (!this.settings.enabled) return;
    if (this.tooltip.isOwn(e.target)) return;

    // Page-translation tap mode: show pre-translation original of the tapped paragraph.
    if (this.settings.pageTranslationHoverOriginal && this.pageTranslator.hasTranslation()) {
      const touch = e.changedTouches[0];
      if (!touch) return;
      const x = touch.clientX, y = touch.clientY;
      setTimeout(() => {
        const target = document.elementFromPoint(x, y);
        const block = target?.closest('[data-mtt-orig]');
        if (block) {
          const origText = getOriginalText(block);
          if (origText) {
            this.tooltip.showPlain(origText, block.getBoundingClientRect());
            return;
          }
        }
        this.tooltip.hide();
      }, 100);
      return;
    }

    // Delay to let the browser finalize selection state after touch
    setTimeout(() => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim()) {
        if (!this.settings.enableSelectionMobile) return;
        if (this.settings.restrictToNoteContent) {
          const _sel = this._noteContentSelector();
          if (!isInNoteContent(sel.anchorNode, _sel) && !isInNoteContent(sel.focusNode, _sel)) return;
        }
        this.translateSelection();
        return;
      }
      // No selection: try word at touch point
      if (!this.settings.enableHoverMobile) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const x = touch.clientX, y = touch.clientY;
      if (this.settings.restrictToNoteContent) {
        const el = document.elementFromPoint(x, y);
        if (el && !isInNoteContent(el, this._noteContentSelector())) return;
      }
      const hit = extractAtPoint(x, y, 'word');
      if (hit) {
        this.tooltip.show(hit.text, hit.rect, this.settings.selectionEngine);
      }
    }, 100);
  }

  async loadSettings() {
    const loaded = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
    _mttSettings = this.settings;
    // Migrate old single 'engine' setting to per-context engines
    if (loaded?.engine) {
      if (!loaded.mouseoverEngine) this.settings.mouseoverEngine = loaded.engine;
      if (!loaded.selectionEngine) this.settings.selectionEngine = loaded.engine;
      if (!loaded.pageEngine) this.settings.pageEngine = loaded.engine;
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
    _mttSettings = this.settings;
  }
};

class MouseTooltipSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    const s = i18n();
    containerEl.createEl('h2', { text: s.settingsTitle });

    // ---- UI Language ----
    new Setting(containerEl)
      .setName(s.uiLang)
      .setDesc(s.uiLangDesc)
      .addDropdown((d) => d
        .addOption('system', s.uiLangSystem)
        .addOption('zh', '简体中文')
        .addOption('ja', '日本語')
        .addOption('en', 'English')
        .setValue(this.plugin.settings.uiLang)
        .onChange(async (v) => {
          this.plugin.settings.uiLang = v;
          await this.plugin.saveSettings();
          this.display();
        }));

    // ---- Master Toggle ----
    new Setting(containerEl)
      .setName(s.masterEnabled)
      .setDesc(s.masterEnabledDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.enabled)
        .onChange(async (v) => { this.plugin.settings.enabled = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.masterRestrict)
      .setDesc(s.masterRestrictDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.restrictToNoteContent)
        .onChange(async (v) => {
          this.plugin.settings.restrictToNoteContent = v;
          await this.plugin.saveSettings();
          this.plugin.tooltip.hide();
          this.display();
        }));

    // ---- Features ----
    containerEl.createEl('h3', { text: s.secFeatures });

    containerEl.createEl('h4', { text: s.secDesktop });

    new Setting(containerEl)
      .setName(s.featHover)
      .setDesc(s.featHoverDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.enableHover)
        .onChange(async (v) => { this.plugin.settings.enableHover = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.featSelection)
      .setDesc(s.featSelectionDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.enableSelection)
        .onChange(async (v) => { this.plugin.settings.enableSelection = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.featPage)
      .setDesc(s.featPageDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.enablePage)
        .onChange(async (v) => {
          this.plugin.settings.enablePage = v;
          await this.plugin.saveSettings();
          if (!Platform.isMobile) {
            if (this.plugin.ribbonPageEl) this.plugin.ribbonPageEl.style.display = v ? '' : 'none';
            if (v) {
              this.plugin.app.workspace.getLeavesOfType('markdown').forEach(leaf => this.plugin._addPageTranslateButton(leaf.view));
            } else {
              document.querySelectorAll('.mtt-page-btn').forEach(el => el.remove());
            }
          }
        }));

    containerEl.createEl('h4', { text: s.secMobile });

    new Setting(containerEl)
      .setName(s.featHoverMobile)
      .setDesc(s.featHoverMobileDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.enableHoverMobile)
        .onChange(async (v) => { this.plugin.settings.enableHoverMobile = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.featSelectionMobile)
      .setDesc(s.featSelectionMobileDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.enableSelectionMobile)
        .onChange(async (v) => { this.plugin.settings.enableSelectionMobile = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.featPageMobile)
      .setDesc(s.featPageMobileDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.enablePageMobile)
        .onChange(async (v) => {
          this.plugin.settings.enablePageMobile = v;
          await this.plugin.saveSettings();
          if (Platform.isMobile) {
            if (this.plugin.ribbonPageEl) this.plugin.ribbonPageEl.style.display = v ? '' : 'none';
            if (v) {
              this.plugin.app.workspace.getLeavesOfType('markdown').forEach(leaf => this.plugin._addPageTranslateButton(leaf.view));
            } else {
              document.querySelectorAll('.mtt-page-btn').forEach(el => el.remove());
            }
          }
        }));

    // ---- Translation ----
    containerEl.createEl('h3', { text: s.secTranslation });

    new Setting(containerEl)
      .setName(s.translateFrom)
      .addDropdown((d) => {
        for (const [k, v] of Object.entries(COMMON_LANGS)) d.addOption(k, langName(k, v));
        d.setValue(this.plugin.settings.sourceLang)
          .onChange(async (v) => { this.plugin.settings.sourceLang = v; await this.plugin.saveSettings(); });
      });

    new Setting(containerEl)
      .setName(s.translateTo)
      .addDropdown((d) => {
        for (const [k, v] of Object.entries(COMMON_LANGS)) {
          if (k === 'auto') continue;
          d.addOption(k, langName(k, v));
        }
        d.setValue(this.plugin.settings.targetLang)
          .onChange(async (v) => { this.plugin.settings.targetLang = v; await this.plugin.saveSettings(); });
      });

    // ---- Smart bidirectional direction ----
    new Setting(containerEl)
      .setName(s.directionMode)
      .setDesc(s.directionModeDesc)
      .addDropdown((d) => d
        .addOption('auto', s.directionAuto)
        .addOption('fixed', s.directionFixed)
        .setValue(this.plugin.settings.directionMode || 'auto')
        .onChange(async (v) => {
          this.plugin.settings.directionMode = v;
          await this.plugin.saveSettings();
          this.display();
        }));

    if ((this.plugin.settings.directionMode || 'auto') === 'auto') {
      new Setting(containerEl)
        .setName(s.autoChineseTarget)
        .setDesc(s.autoChineseTargetDesc)
        .addDropdown((d) => {
          for (const [k, v] of Object.entries(COMMON_LANGS)) {
            if (k === 'auto') continue;
            d.addOption(k, langName(k, v));
          }
          d.setValue(this.plugin.settings.autoChineseTarget || 'en')
            .onChange(async (v) => { this.plugin.settings.autoChineseTarget = v; await this.plugin.saveSettings(); });
        });
    }

    new Setting(containerEl)
      .setName(s.skipSame)
      .setDesc(s.skipSameDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.skipSameLanguage)
        .onChange(async (v) => {
          this.plugin.settings.skipSameLanguage = v;
          await this.plugin.saveSettings();
          this.plugin.tooltip.hide();
        }));

    new Setting(containerEl)
      .setName(s.skipIdentical)
      .setDesc(s.skipIdenticalDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.skipIdenticalText)
        .onChange(async (v) => {
          this.plugin.settings.skipIdenticalText = v;
          await this.plugin.saveSettings();
          this.plugin.tooltip.hide();
        }));

    // ---- Engine Settings ----
    containerEl.createEl('h3', { text: s.secEngines });

    const engineConfigs = [
      { key: 'mouseoverEngine', name: s.engineHover,     desc: s.engineHoverDesc },
      { key: 'selectionEngine', name: s.engineSelection, desc: s.engineSelectionDesc },
      { key: 'pageEngine',      name: s.enginePage,      desc: s.enginePageDesc },
    ];
    for (const { key, name, desc } of engineConfigs) {
      new Setting(containerEl)
        .setName(name)
        .setDesc(desc)
        .addDropdown((d) => {
          for (const [k, v] of Object.entries(ENGINES)) d.addOption(k, v.label);
          d.setValue(this.plugin.settings[key] || 'google')
            .onChange(async (v) => {
              this.plugin.settings[key] = v;
              await this.plugin.saveSettings();
              this.display();
            });
        });
    }

    // Youdao Zhiyun settings (shown when the Youdao engine is in use)
    const usedYoudao = [
      this.plugin.settings.mouseoverEngine,
      this.plugin.settings.selectionEngine,
      this.plugin.settings.pageEngine,
    ].includes('youdao');
    if (usedYoudao) {
      containerEl.createEl('h4', { text: s.secYoudao });
      new Setting(containerEl)
        .setName(s.youdaoAppKey)
        .setDesc(s.youdaoAppKeyDesc)
        .addText((t) => t
          .setPlaceholder('your-app-id')
          .setValue(this.plugin.settings.youdaoAppKey || '')
          .onChange(async (v) => { this.plugin.settings.youdaoAppKey = v.trim(); await this.plugin.saveSettings(); }));
      new Setting(containerEl)
        .setName(s.youdaoSecret)
        .setDesc(s.youdaoSecretDesc)
        .addText((t) => t
          .setPlaceholder('your-app-secret')
          .setValue(this.plugin.settings.youdaoSecret || '')
          .onChange(async (v) => { this.plugin.settings.youdaoSecret = v.trim(); await this.plugin.saveSettings(); }));
    }

    // Cloud engine credentials (shown when the corresponding engine is in use)
    const usedCloud = [
      this.plugin.settings.mouseoverEngine,
      this.plugin.settings.selectionEngine,
      this.plugin.settings.pageEngine,
    ];
    if (usedCloud.includes('baidu')) {
      containerEl.createEl('h4', { text: s.secBaidu });
      new Setting(containerEl)
        .setName(s.baiduAppId)
        .setDesc(s.baiduAppIdDesc)
        .addText((t) => t
          .setPlaceholder('your-app-id')
          .setValue(this.plugin.settings.baiduAppId || '')
          .onChange(async (v) => { this.plugin.settings.baiduAppId = v.trim(); await this.plugin.saveSettings(); }));
      new Setting(containerEl)
        .setName(s.baiduSecretKey)
        .setDesc(s.baiduSecretKeyDesc)
        .addText((t) => t
          .setPlaceholder('your-secret-key')
          .setValue(this.plugin.settings.baiduSecretKey || '')
          .onChange(async (v) => { this.plugin.settings.baiduSecretKey = v.trim(); await this.plugin.saveSettings(); }));
    }
    if (usedCloud.includes('tencent')) {
      containerEl.createEl('h4', { text: s.secTencent });
      new Setting(containerEl)
        .setName(s.tencentSecretId)
        .setDesc(s.tencentSecretIdDesc)
        .addText((t) => t
          .setPlaceholder('AKID...')
          .setValue(this.plugin.settings.tencentSecretId || '')
          .onChange(async (v) => { this.plugin.settings.tencentSecretId = v.trim(); await this.plugin.saveSettings(); }));
      new Setting(containerEl)
        .setName(s.tencentSecretKey)
        .setDesc(s.tencentSecretKeyDesc)
        .addText((t) => t
          .setPlaceholder('your-secret-key')
          .setValue(this.plugin.settings.tencentSecretKey || '')
          .onChange(async (v) => { this.plugin.settings.tencentSecretKey = v.trim(); await this.plugin.saveSettings(); }));
    }
    if (usedCloud.includes('aliyun')) {
      containerEl.createEl('h4', { text: s.secAliyun });
      new Setting(containerEl)
        .setName(s.aliyunAccessKeyId)
        .setDesc(s.aliyunAccessKeyIdDesc)
        .addText((t) => t
          .setPlaceholder('LTAI...')
          .setValue(this.plugin.settings.aliyunAccessKeyId || '')
          .onChange(async (v) => { this.plugin.settings.aliyunAccessKeyId = v.trim(); await this.plugin.saveSettings(); }));
      new Setting(containerEl)
        .setName(s.aliyunAccessKeySecret)
        .setDesc(s.aliyunAccessKeySecretDesc)
        .addText((t) => t
          .setPlaceholder('your-access-key-secret')
          .setValue(this.plugin.settings.aliyunAccessKeySecret || '')
          .onChange(async (v) => { this.plugin.settings.aliyunAccessKeySecret = v.trim(); await this.plugin.saveSettings(); }));
    }

    // ---- Per-feature Settings ----
    containerEl.createEl('h3', { text: s.secPerFeature });

    containerEl.createEl('h4', { text: s.secHoverSelection });

    if (this.plugin.settings.restrictToNoteContent) {
      new Setting(containerEl)
        .setName(s.activeMode)
        .setDesc(s.activeModeDesc)
        .addDropdown((d) => d
          .addOption('both', s.modeBoth)
          .addOption('edit', s.modeEdit)
          .addOption('reading', s.modeReading)
          .setValue(this.plugin.settings.activeMode || 'both')
          .onChange(async (v) => {
            this.plugin.settings.activeMode = v;
            await this.plugin.saveSettings();
            this.plugin.tooltip.hide();
          }));
    }

    new Setting(containerEl)
      .setName(s.mouseUnit)
      .setDesc(s.mouseUnitDesc)
      .addDropdown((d) => d
        .addOption('word', s.unitWord)
        .addOption('sentence', s.unitSentence)
        .setValue(this.plugin.settings.textType)
        .onChange(async (v) => { this.plugin.settings.textType = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.hoverDelay)
      .setDesc(s.hoverDelayDesc)
      .addText((t) => t
        .setPlaceholder('500')
        .setValue(String(this.plugin.settings.delayMs))
        .onChange(async (v) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0) return;
          this.plugin.settings.delayMs = n;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h4', { text: s.secPage });

    new Setting(containerEl)
      .setName(s.pageHoverOrig)
      .setDesc(s.pageHoverOrigDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.pageTranslationHoverOriginal)
        .onChange(async (v) => {
          this.plugin.settings.pageTranslationHoverOriginal = v;
          await this.plugin.saveSettings();
          this.plugin.tooltip.hide();
        }));

    // ---- Tooltip Contents ----
    containerEl.createEl('h3', { text: s.secTooltip });

    new Setting(containerEl)
      .setName(s.showDict)
      .setDesc(s.showDictDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.showDictionary)
        .onChange(async (v) => { this.plugin.settings.showDictionary = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.showMulti)
      .setDesc(s.showMultiDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.showMultiTranslation !== false)
        .onChange(async (v) => { this.plugin.settings.showMultiTranslation = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.showTranslit)
      .setDesc(s.showTranslitDesc)
      .addToggle((t) => t
        .setValue(this.plugin.settings.showTransliteration)
        .onChange(async (v) => { this.plugin.settings.showTransliteration = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.showSource)
      .addToggle((t) => t
        .setValue(this.plugin.settings.showSourceText)
        .onChange(async (v) => { this.plugin.settings.showSourceText = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(s.showDetected)
      .addToggle((t) => t
        .setValue(this.plugin.settings.showDetectedLang)
        .onChange(async (v) => { this.plugin.settings.showDetectedLang = v; await this.plugin.saveSettings(); }));
  }
}

/* nosourcemap */