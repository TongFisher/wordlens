// WordLens 词镜 — Obsidian 划词 / 悬停翻译插件（独立实现）
// 功能：划词即译、悬停取词、双向智能语言、一词多译词典、生词本、发音、一键复制、整页翻译
// 引擎：Google / Google GTX / Bing / 有道智云 / 百度 / 腾讯云 / 阿里云
// 依赖：仅 Obsidian 官方 API + Node 内置 crypto，无任何第三方库

const { Plugin, PluginSettingTab, Setting, Notice, ItemView, Platform, requestUrl } = require('obsidian');
const crypto = require('crypto');

/* ================================================================
 * 默认设置 —— 字段名与 v0.1 保持一致，旧 data.json 可直接沿用
 * ================================================================ */
const DEFAULT_SETTINGS = {
  mouseoverEngine: 'youdao',
  selectionEngine: 'youdao',
  pageEngine: 'youdao',
  sourceLang: 'auto',
  targetLang: 'zh',
  // 方向模式：fixed = 固定用 sourceLang/targetLang；
  // auto = 检测到中文就译成 autoChineseTarget，其他语言译成 targetLang
  directionMode: 'auto',
  autoChineseTarget: 'en',
  enableHover: true,
  enableSelection: true,
  enablePage: true,
  enableHoverMobile: true,
  enableSelectionMobile: true,
  enablePageMobile: true,
  textType: 'word',                 // word | sentence（悬停取词粒度）
  delayMs: 500,                     // 悬停触发延迟
  showSourceText: true,             // 弹窗显示原文
  showDetectedLang: true,           // 弹窗显示检测到的语言
  showDictionary: true,             // 显示词典（一词多译）
  showMultiTranslation: true,       // 显示全部同义译法
  showTransliteration: true,        // 显示音标/注音
  enabled: true,                    // 总开关
  restrictToNoteContent: true,      // 仅在笔记正文内响应
  activeMode: 'both',               // edit | reading | both
  skipSameLanguage: true,           // 源语言 == 目标语言时跳过
  skipIdenticalText: false,         // 译文与原文相同时跳过
  disableCache: false,              // 禁用内存缓存
  uiLang: 'zh',                     // system | zh | en
  pageTranslationHoverOriginal: true, // 悬停在已翻译段落上显示原文
  youdaoAppKey: '',
  youdaoSecret: '',
  baiduAppId: '',
  baiduSecretKey: '',
  tencentSecretId: '',
  tencentSecretKey: '',
  aliyunAccessKeyId: '',
  aliyunAccessKeySecret: '',
};

/* ================================================================
 * 文案（简体中文 / English）
 * ================================================================ */
const I18N = {
  zh: {
    noTranslation: '（未找到译文）',
    translating: '翻译中…',
    origLabel: '原文',
    copy: '复制',
    copied: '已复制',
    copyTranslation: '复制译文',
    speak: '朗读原文',
    vocabTitle: '生词本',
    vocabEmpty: '还没有翻译记录',
    vocabReload: '刷新',
    sortByCount: '按次数',
    sortByRecent: '按最近',
    sortAlpha: '按字母',
    filterAll: '全部',
    filterWord: '词',
    filterSentence: '句',
    vocabClear: '清空',
    vocabCleared: '生词本已清空',
    transTitle: '翻译面板',
    transPlaceholder: '输入或粘贴要翻译的内容…',
    transBtn: '翻译',
    transCopy: '复制译文',
    transCopied: '已复制译文',
    pageNeedReading: '请切换到阅读视图（Reading View）后再翻译整页。',
    pageNoText: '没有找到可翻译的段落。',
    pageTranslating: (cur, tot) => `正在翻译… ${cur}/${tot}`,
    pageDone: (n) => `整页翻译完成（${n} 段）`,
    pageRestored: (n) => `已还原原文（${n} 段）`,
    pageCanceled: '整页翻译已取消',
    pageDisabled: '整页翻译未启用（可在设置中打开）。',
    pluginToggle: (on) => `WordLens：${on ? '已开启' : '已关闭'}`,
    ribbonTrans: '打开翻译面板',
    ribbonVocab: '打开生词本',
    ribbonPage: '翻译整页 / 还原',
    togglePage: '翻译整页',
    restorePage: '还原原文',
    // 设置
    settingsTitle: 'WordLens 词镜 · 设置',
    secGeneral: '通用',
    secFeatures: '功能开关',
    secTranslation: '翻译设置',
    secEngines: '引擎设置',
    secTooltip: '弹窗内容',
    secPage: '整页翻译',
    masterEnabled: '启用翻译器',
    masterEnabledDesc: '总开关：关闭后不响应任何划词与悬停。',
    hoverEnabled: '悬停翻译',
    hoverEnabledDesc: '鼠标悬停在词上时自动取词翻译。',
    selectionEnabled: '划词翻译',
    selectionEnabledDesc: '选中文本后自动翻译。',
    pageEnabled: '整页翻译',
    pageEnabledDesc: '在阅读视图工具栏显示「翻译整页」按钮。',
    restrictDesc: '仅在笔记正文（编辑/阅读/嵌入内容）内响应，侧边栏、标题栏等区域不触发。',
    activeModeDesc: '选择响应区域：编辑视图 / 阅读视图 / 两者。',
    hoverDelay: '悬停延迟（毫秒）',
    hoverDelayDesc: '鼠标停住多久后触发取词，建议 300–800。',
    textType: '取词粒度',
    textTypeWord: '单词',
    textTypeSentence: '整句',
    directionMode: '语言方向',
    directionFixed: '固定方向',
    directionAuto: '智能双向',
    directionDesc: '智能双向：划中文自动译成目标外语，划其他语言自动译成中文。',
    autoChineseTarget: '中文的默认目标语言',
    sourceLang: '源语言',
    targetLang: '目标语言',
    langAuto: '自动检测',
    skipSameLanguage: '跳过同语言翻译',
    skipSameLanguageDesc: '检测到源语言与目标语言相同时不翻译。',
    skipIdenticalText: '跳过无变化译文',
    skipIdenticalTextDesc: '译文与原文完全相同时不显示。',
    disableCache: '禁用缓存',
    disableCacheDesc: '每次划词都重新请求 API。',
    uiLang: '界面语言',
    uiLangSystem: '跟随系统',
    uiLangZh: '简体中文',
    uiLangEn: 'English',
    engineHover: '悬停引擎',
    engineSelection: '划词引擎',
    enginePage: '整页引擎',
    engineDesc: '有道的词典增强（一词多译）最完整，推荐优先使用。',
    youdaoKey: '有道智云 · 应用 ID',
    youdaoSecret: '有道智云 · 应用密钥',
    baiduKey: '百度翻译 · App ID',
    baiduSecret: '百度翻译 · 密钥',
    tencentKey: '腾讯云 · SecretId',
    tencentSecret: '腾讯云 · SecretKey',
    aliyunKey: '阿里云 · AccessKey ID',
    aliyunSecret: '阿里云 · AccessKey Secret',
    showSourceText: '显示原文',
    showDetectedLang: '显示检测语言',
    showDictionary: '显示词典释义',
    showMultiTranslation: '显示一词多译',
    showMultiTranslationDesc: '词典接口免费，不消耗翻译 API 额度。',
    showTransliteration: '显示音标',
    pageHoverOriginal: '悬停显示原文',
    pageHoverOriginalDesc: '悬停在已翻译段落上时，显示该段翻译前的原文。',
    resetBtn: '恢复默认设置',
    resetDone: '已恢复默认设置',
    engineNeedsKey: '（需填写密钥）',
    engineNoKey: '（免密钥）',
  },
  en: {
    noTranslation: '(no translation)',
    translating: 'Translating…',
    origLabel: 'Original',
    copy: 'Copy',
    copied: 'Copied',
    copyTranslation: 'Copy translation',
    speak: 'Speak source text',
    vocabTitle: 'Vocabulary',
    vocabEmpty: 'No translation history yet',
    vocabReload: 'Reload',
    sortByCount: 'By count',
    sortByRecent: 'Recent',
    sortAlpha: 'Alphabetical',
    filterAll: 'All',
    filterWord: 'Word',
    filterSentence: 'Sentence',
    vocabClear: 'Clear',
    vocabCleared: 'Vocabulary cleared',
    transTitle: 'Translator',
    transPlaceholder: 'Type or paste text to translate…',
    transBtn: 'Translate',
    transCopy: 'Copy translation',
    transCopied: 'Translation copied',
    pageNeedReading: 'Switch to Reading View to translate the whole page.',
    pageNoText: 'No translatable paragraphs found.',
    pageTranslating: (cur, tot) => `Translating… ${cur}/${tot}`,
    pageDone: (n) => `Page translated (${n} sections)`,
    pageRestored: (n) => `Original text restored (${n} sections)`,
    pageCanceled: 'Page translation canceled',
    pageDisabled: 'Page translation is disabled (enable it in settings).',
    pluginToggle: (on) => `WordLens: ${on ? 'ON' : 'OFF'}`,
    ribbonTrans: 'Open translator',
    ribbonVocab: 'Open vocabulary',
    ribbonPage: 'Translate page / Restore',
    togglePage: 'Translate page',
    restorePage: 'Restore original',
    // settings
    settingsTitle: 'WordLens · Settings',
    secGeneral: 'General',
    secFeatures: 'Features',
    secTranslation: 'Translation',
    secEngines: 'Engines',
    secTooltip: 'Tooltip contents',
    secPage: 'Page translation',
    masterEnabled: 'Enable translator',
    masterEnabledDesc: 'Master switch.',
    hoverEnabled: 'Hover translation',
    hoverEnabledDesc: 'Translate words under the mouse cursor.',
    selectionEnabled: 'Selection translation',
    selectionEnabledDesc: 'Translate selected text automatically.',
    pageEnabled: 'Page translation',
    pageEnabledDesc: 'Show the "Translate page" button in the reading view toolbar.',
    restrictDesc: 'Only react inside note content (editor / reading view / embeds).',
    activeModeDesc: 'Where to react: editor / reading view / both.',
    hoverDelay: 'Hover delay (ms)',
    hoverDelayDesc: 'How long the cursor must rest before lookup (300–800).',
    textType: 'Lookup granularity',
    textTypeWord: 'Word',
    textTypeSentence: 'Sentence',
    directionMode: 'Direction mode',
    directionFixed: 'Fixed',
    directionAuto: 'Smart bidirectional',
    directionDesc: 'Smart: Chinese text → foreign language, other text → Chinese.',
    autoChineseTarget: 'Default target for Chinese',
    sourceLang: 'Source language',
    targetLang: 'Target language',
    langAuto: 'Auto detect',
    skipSameLanguage: 'Skip same-language translation',
    skipSameLanguageDesc: 'Do nothing when the detected source equals the target.',
    skipIdenticalText: 'Skip unchanged output',
    skipIdenticalTextDesc: 'Hide when the output equals the input.',
    disableCache: 'Disable cache',
    disableCacheDesc: 'Always call the API.',
    uiLang: 'UI language',
    uiLangSystem: 'System',
    uiLangZh: '简体中文',
    uiLangEn: 'English',
    engineHover: 'Hover engine',
    engineSelection: 'Selection engine',
    enginePage: 'Page engine',
    engineDesc: 'Youdao provides the richest dictionary (multi-translation). Recommended.',
    youdaoKey: 'Youdao · App ID',
    youdaoSecret: 'Youdao · App Secret',
    baiduKey: 'Baidu · App ID',
    baiduSecret: 'Baidu · Secret Key',
    tencentKey: 'Tencent · SecretId',
    tencentSecret: 'Tencent · SecretKey',
    aliyunKey: 'Aliyun · AccessKey ID',
    aliyunSecret: 'Aliyun · AccessKey Secret',
    showSourceText: 'Show original text',
    showDetectedLang: 'Show detected language',
    showDictionary: 'Show dictionary entries',
    showMultiTranslation: 'Show all translations',
    showMultiTranslationDesc: 'Free dictionary API, no translation quota consumed.',
    showTransliteration: 'Show phonetics',
    pageHoverOriginal: 'Hover shows original',
    pageHoverOriginalDesc: 'Hovering a translated paragraph shows its original text.',
    resetBtn: 'Reset to defaults',
    resetDone: 'Settings reset',
    engineNeedsKey: '(key required)',
    engineNoKey: '(no key needed)',
  },
};

/* ================================================================
 * 工具函数
 * ================================================================ */
function hash(method, data) {
  return crypto.createHash(method).update(data, 'utf8').digest('hex');
}
function md5(s) { return hash('md5', s); }
function sha256Hex(s) { return hash('sha256', s); }
function hmac(key, algo, data) {
  return crypto.createHmac(algo, key).update(data, 'utf8').digest();
}
function hmacSha256Hex(key, msg) {
  return crypto.createHmac('sha256', key).update(msg, 'utf8').digest('hex');
}
function base64(buf) { return Buffer.from(buf).toString('base64'); }

/** 统一 HTTP 请求：GET 或 POST，返回解析后的 JSON（失败抛错）。 */
async function httpJson(method, url, opts = {}) {
  const headers = opts.headers || {};
  let body = opts.body;
  let contentType = opts.contentType;
  if (opts.form) {
    contentType = 'application/x-www-form-urlencoded; charset=UTF-8';
    body = new URLSearchParams(opts.form).toString();
  }
  if (opts.json !== undefined) {
    contentType = 'application/json; charset=utf-8';
    body = JSON.stringify(opts.json);
  }
  const resp = await requestUrl({ url, method, headers, body, contentType, throw: false });
  if (resp.status >= 400) {
    throw new Error(`HTTP ${resp.status} for ${url}`);
  }
  try { return resp.json; } catch (_) { return null; }
}

/** 简单语言识别：仅用于双向方向判断。 */
function looksChinese(text) {
  return /[\u4e00-\u9fff]/.test(text || '');
}
function looksJapanese(text) {
  return /[\u3040-\u30ff]/.test(text || '');
}
function detectLang(text) {
  if (looksChinese(text)) return 'zh';
  if (looksJapanese(text)) return 'ja';
  return 'en';
}

/** 规范化语言代码（各引擎方言） */
function normLang(code, engine) {
  if (!code || code === 'auto' || code === 'auto-detect') return 'auto';
  const map = { 'zh-CN': 'zh', 'zh-CHS': 'zh', 'zh-TW': 'zh', 'zh-Hant': 'zh' };
  const c = map[code] || code;
  if (engine === 'google' && c === 'zh') return 'zh-CN';
  if (engine === 'youdao' && c === 'zh') return 'zh-CHS';
  return c;
}

/** 数组去重（保持原顺序）。 */
function dedupe(arr) {
  return Array.from(new Set(arr));
}

function isWordChar(c) {
  return !!c && /[\p{L}\p{N}'\-_]/u.test(c);
}
function isSentenceBoundary(c) {
  return !c || /[.!?。！？，,；;：:\n\r]/.test(c);
}

/** 取 (x, y) 处的文本节点与偏移。 */
function caretRangeAt(x, y) {
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

/** 从坐标点提取单词或整句。 */
function extractAtPoint(x, y, mode) {
  const range = caretRangeAt(x, y);
  if (!range) return null;
  const node = range.startContainer;
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent || '';
  if (!text) return null;
  const off = range.startOffset;
  let start = off;
  let end = off;
  if (mode === 'sentence') {
    while (start > 0 && !isSentenceBoundary(text[start - 1])) start--;
    while (end < text.length && !isSentenceBoundary(text[end])) end++;
  } else {
    while (start > 0 && isWordChar(text[start - 1])) start--;
    while (end < text.length && isWordChar(text[end])) end++;
  }
  if (start >= end) return null;
  const word = text.slice(start, end).trim();
  if (!word || word.length > 200) return null;
  const rr = document.createRange();
  rr.setStart(node, start);
  rr.setEnd(node, end);
  return { text: word, rect: rr.getBoundingClientRect() };
}

/** 判断节点是否位于笔记正文（可选编辑/阅读限定）。 */
function inNoteContent(node, activeMode) {
  if (!node || !node.closest) return false;
  if (activeMode === 'edit') return !!node.closest('.markdown-source-view, .cm-content, .markdown-embed');
  if (activeMode === 'reading') return !!node.closest('.markdown-reading-view, .markdown-embed');
  return !!node.closest('.markdown-source-view, .markdown-reading-view, .cm-content, .markdown-embed');
}

/** 是否在弹窗自身内部。 */
function isInsidePopup(target, popupEl) {
  return !!(popupEl && target instanceof Node && popupEl.contains(target));
}

/* ================================================================
 * 翻译引擎 —— 每个引擎实现 translate(text, src, tgt, settings)
 * 返回统一结构：{ targetText, sourceLang, transliteration, dict }
 * dict 可选：{ phonetics: string[], entries: [{ pos, meaning }] }
 * ================================================================ */
class BaseEngine {
  static async translate(text, src, tgt, settings) {
    try {
      const esrc = normLang(src || 'auto', this.key);
      const etgt = normLang(tgt, this.key);
      const out = await this.request(text, esrc, etgt, settings);
      if (!out || out.targetText == null || !String(out.targetText).trim()) return null;
      return {
        targetText: String(out.targetText).trim(),
        sourceLang: out.sourceLang || esrc || 'auto',
        transliteration: out.transliteration || '',
        dict: out.dict || null,
      };
    } catch (e) {
      console.warn('[wordlens]', this.key, 'failed:', e && e.message ? e.message : e);
      return null;
    }
  }
}

class GoogleEngine extends BaseEngine {
  static key = 'google';
  static async request(text, src, tgt) {
    const p = new URLSearchParams({ client: 'gtx', sl: src, tl: tgt, dj: '1', hl: tgt, q: text });
    p.append('dt', 't');
    p.append('dt', 'bd');
    p.append('dt', 'rm');
    const data = await httpJson('GET', `https://translate.googleapis.com/translate_a/single?${p.toString()}`);
    if (!data || typeof data !== 'object') return null;
    const sentences = Array.isArray(data.sentences) ? data.sentences : [];
    const targetText = sentences.map((s) => (s && s.trans) || '').filter(Boolean).join(' ').replace(/\n /g, '\n');
    if (!targetText) return null;
    const transliteration = sentences.map((s) => (s && s.src_translit) || '').filter(Boolean).join(' ').trim();
    const dict = Array.isArray(data.dict)
      ? {
          phonetics: [],
          entries: data.dict
            .filter((d) => d && Array.isArray(d.terms) && d.terms.length)
            .map((d) => ({ pos: d.pos || '', meaning: d.terms.slice(0, 4).join(' / ') })),
        }
      : null;
    return { targetText, sourceLang: data.src || src, transliteration, dict };
  }
}

class GoogleGTXEngine extends BaseEngine {
  static key = 'googleGTX';
  static async request(text, src, tgt) {
    const data = await httpJson(
      'GET',
      `https://translate.googleapis.com/translate_a/t?client=dict-chrome-ex&sl=${src}&tl=${tgt}&q=${encodeURIComponent(text)}`
    );
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
    const first = data[0];
    const targetText = (first[0] || '').replace(/\n/g, ' ');
    if (!targetText) return null;
    return { targetText, sourceLang: first[1] || src };
  }
}

class BingEngine extends BaseEngine {
  static key = 'bing';
  static tokenCache = null;
  static userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  /** 访问 translator 页面，解析防滥用 token（IG / key / token）与 cookie。 */
  static async fetchToken() {
    const tokenUrl = 'https://cn.bing.com/translator';
    const resp = await requestUrl({ url: tokenUrl, method: 'GET', throw: false });
    if (resp.status >= 400) throw new Error('Bing translator page ' + resp.status);
    const html = resp.text || '';
    const ig = (html.match(/IG:"([^"]+)"/) || [])[1];
    const abuse = (html.match(/params_AbusePreventionHelper\s*=\s*(\[[^\]]+\])/) || [])[1];
    if (!ig || !abuse) throw new Error('Bing token parse failed');
    const parsed = JSON.parse(abuse);
    const key = parsed[0];
    const token = parsed[1];
    const expiry = parsed[2];
    // 提取 cookie 链：Obsidian 中 set-cookie 可能是数组（每个 cookie 一项）或
    // 逗号合并的字符串；每个 cookie 只取首个 name=value（忽略 domain/expires 等属性）
    const h = resp.headers || {};
    let raw = '';
    if (h.get && typeof h.get === 'function') raw = h.get('set-cookie') || '';
    else raw = h['set-cookie'] || h['Set-Cookie'] || '';
    const parts = Array.isArray(raw) ? raw : [raw];
    const names = new Set();
    const cookieParts = [];
    for (const p of parts) {
      const m = String(p).trim().match(/^([^=;,\s]+)=([^;]*)/);
      if (!m) continue;
      const name = m[1].trim();
      if (name && !names.has(name)) {
        names.add(name);
        cookieParts.push(`${name}=${m[2].trim()}`);
      }
    }
    const cookie = cookieParts.join('; ');
    this.tokenCache = { ig, key, token, expiry, cookie, ts: Date.now() };
    return this.tokenCache;
  }
  static async getToken() {
    const c = this.tokenCache;
    if (c && Date.now() - c.ts < (c.expiry || 600000)) return c;
    return this.fetchToken();
  }
  static async request(text, src, tgt) {
    const tok = await this.getToken();
    const fromLang = src === 'auto' ? 'auto-detect' : src;
    const url = `https://cn.bing.com/ttranslatev3?isVertical=1&&IG=${tok.ig}&IID=translator.5028`;
    const data = await httpJson('POST', url, {
      headers: {
        'user-agent': this.userAgent,
        referer: 'https://cn.bing.com/translator',
        cookie: tok.cookie,
      },
      form: { fromLang, text, to: tgt, token: tok.token, key: tok.key },
    });
    if (!Array.isArray(data) || !data[0] || !Array.isArray(data[0].translations) || !data[0].translations[0]) return null;
    const targetText = (data[0].translations[0].text || '').trim();
    if (!targetText) return null;
    const detected = (data[0].detectedLanguage && data[0].detectedLanguage.language) || src;
    return { targetText, sourceLang: detected };
  }
}

/** 有道智云 NMT + 免费词典（一词多译） */
class YoudaoEngine extends BaseEngine {
  static key = 'youdao';
  static truncate(q) {
    return q.length <= 20 ? q : q.slice(0, 10) + q.length + q.slice(-10);
  }
  static async request(text, src, tgt, settings) {
    if (!settings.youdaoAppKey || !settings.youdaoSecret) return null;
    const salt = String(Date.now());
    const curtime = String(Math.floor(Date.now() / 1000));
    const sign = sha256Hex(settings.youdaoAppKey + this.truncate(text) + salt + curtime + settings.youdaoSecret);
    const data = await httpJson('POST', 'https://openapi.youdao.com/api', {
      form: {
        q: text,
        from: src,
        to: tgt,
        appKey: settings.youdaoAppKey,
        salt,
        sign,
        signType: 'v3',
        curtime,
      },
    });
    if (!data || data.errorCode !== '0') return null;
    const targetText = (Array.isArray(data.translation) ? data.translation[0] : data.translation || '').trim();
    if (!targetText) return null;
    const detected = data.l ? String(data.l).split('2')[0] : src;
    const dict = await this.fetchDict(text, detected);
    return { targetText, sourceLang: detected, transliteration: data.transliteration ? data.transliteration[0] : '', dict };
  }
  /** 有道免费词典接口：英汉 ec / 汉英 ce，返回多义项。 */
  static async fetchDict(q, lang) {
    try {
      const le = lang === 'zh' ? 'zh' : 'eng';
      const data = await httpJson(
        'GET',
        `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(q)}&le=${le}&t=2`,
        {
          headers: {
            'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
            referer: 'https://dict.youdao.com/',
          },
        }
      );
      if (!data || typeof data !== 'object') return null;
      const ec = data.ec && data.ec.word;
      const ce = data.ce && data.ce.word;
      let phonetics = [];
      let entries = [];
      if (ec && ec.length) {
        const w = ec[0];
        phonetics = [w.usphone, w.ukphone].filter(Boolean).map((p) => `/${p}/`);
        entries = (w.trs || [])
          .map((t) => {
            const parts = (t.tr || []).map((x) => x.l && x.l.i).filter(Boolean);
            return { pos: (t.pos || '').trim(), meaning: dedupe(parts).join('；') };
          })
          .filter((e) => e.meaning);
      } else if (ce && ce.length) {
        const w = ce[0];
        phonetics = (w.trs || [])
          .map((t) => t.tr && t.tr[0] && t.tr[0].l && t.tr[0].l.i)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => `/${p}/`);
        entries = (w.trs || [])
          .map((t) => {
            const parts = (t.tr || []).map((x) => x.l && x.l.i).filter(Boolean);
            return { pos: (t.pos || '').trim(), meaning: dedupe(parts).join('；') };
          })
          .filter((e) => e.meaning);
      }
      if (!entries.length && !phonetics.length) return null;
      return { phonetics, entries };
    } catch (_) {
      return null;
    }
  }
}

class BaiduEngine extends BaseEngine {
  static key = 'baidu';
  static async request(text, src, tgt, settings) {
    if (!settings.baiduAppId || !settings.baiduSecretKey) return null;
    const salt = String(Date.now());
    const sign = md5(settings.baiduAppId + text + salt + settings.baiduSecretKey);
    const data = await httpJson(
      'GET',
      `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(text)}&from=${src}&to=${tgt}&appid=${settings.baiduAppId}&salt=${salt}&sign=${sign}`
    );
    if (!data || !Array.isArray(data.trans_result) || !data.trans_result[0]) return null;
    const targetText = data.trans_result.map((r) => r.dst).join('\n').trim();
    if (!targetText) return null;
    return { targetText, sourceLang: data.from || src };
  }
}

class TencentEngine extends BaseEngine {
  static key = 'tencent';
  static async request(text, src, tgt, settings) {
    if (!settings.tencentSecretId || !settings.tencentSecretKey) return null;
    const host = 'tmt.tencentcloudapi.com';
    const service = 'tmt';
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    const payload = JSON.stringify({ SourceText: text, Source: src === 'auto' ? 'auto' : src, Target: tgt, ProjectId: 0 });
    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\n`;
    const signedHeaders = 'content-type;host';
    const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256Hex(payload)}`;
    const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${date}/${service}/tc3_request\n${sha256Hex(canonicalRequest)}`;
    const kDate = hmac('TC3' + settings.tencentSecretKey, 'sha256', date);
    const kService = hmac(kDate, 'sha256', service);
    const kSigning = hmac(kService, 'sha256', 'tc3_request');
    const signature = hmacSha256Hex(kSigning, stringToSign);
    const auth = `TC3-HMAC-SHA256 Credential=${settings.tencentSecretId}/${date}/${service}/tc3_request, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const data = await httpJson('POST', `https://${host}`, {
      headers: {
        Authorization: auth,
        'X-TC-Action': 'TextTranslate',
        'X-TC-Version': '2018-03-26',
        'X-TC-Timestamp': String(timestamp),
        'X-TC-Region': 'ap-guangzhou',
        'X-TC-Language': 'zh-CN',
      },
      json: JSON.parse(payload),
    });
    if (!data || !data.Response || !data.Response.TargetText) return null;
    return { targetText: data.Response.TargetText.trim(), sourceLang: data.Response.Source || src };
  }
}

class AliyunEngine extends BaseEngine {
  static key = 'aliyun';
  static percentEncode(s) {
    return encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  }
  static async request(text, src, tgt, settings) {
    if (!settings.aliyunAccessKeyId || !settings.aliyunAccessKeySecret) return null;
    const params = {
      Format: 'JSON',
      Version: '2018-10-12',
      AccessKeyId: settings.aliyunAccessKeyId,
      SignatureMethod: 'HMAC-SHA1',
      Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      SignatureVersion: '1.0',
      SignatureNonce: String(Date.now()) + Math.floor(Math.random() * 1e6),
      Action: 'TranslateGeneral',
      SourceText: text,
      SourceLanguage: src === 'auto' ? 'auto' : src,
      TargetLanguage: tgt,
      Scene: 'general',
      FormatType: 'text',
    };
    const canonical = Object.keys(params)
      .sort()
      .map((k) => this.percentEncode(k) + '=' + this.percentEncode(String(params[k])))
      .join('&');
    const stringToSign = 'POST&%2F&' + this.percentEncode(canonical);
    const sig = base64(hmac(settings.aliyunAccessKeySecret + '&', 'sha1', stringToSign));
    params.Signature = sig;
    const data = await httpJson('POST', `https://mt.aliyuncs.com/?${new URLSearchParams(params).toString()}`);
    if (!data || data.Code !== '200' || !data.Data || !data.Data.Translated) return null;
    return { targetText: data.Data.Translated.trim(), sourceLang: src };
  }
}

const ENGINES = {
  google: { label: 'Google（谷歌）', cls: GoogleEngine },
  googleGTX: { label: 'Google GTX（免密钥）', cls: GoogleGTXEngine },
  bing: { label: 'Bing（必应）', cls: BingEngine },
  youdao: { label: '有道智云', cls: YoudaoEngine },
  baidu: { label: '百度翻译', cls: BaiduEngine },
  tencent: { label: '腾讯云翻译', cls: TencentEngine },
  aliyun: { label: '阿里云翻译', cls: AliyunEngine },
};

function engineNeedsKey(key) {
  return ['youdao', 'baidu', 'tencent', 'aliyun'].includes(key);
}

/* ================================================================
 * 弹窗（Popup）—— 自研 DOM
 * ================================================================ */
class Popup {
  constructor(plugin) {
    this.plugin = plugin;
    this.el = null;
    this.token = 0;
    this.lastText = '';
    this.lastResult = null;
    this.cache = new Map();
    this.maxCache = 500;
  }
  ensure() {
    if (this.el) return this.el;
    const el = document.createElement('div');
    el.className = 'wordlens-popup';
    el.style.display = 'none';
    document.body.appendChild(el);
    this.el = el;
    return el;
  }
  hide() {
    this.token++;
    this.lastText = '';
    this.lastResult = null;
    if (this.el) this.el.style.display = 'none';
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (_) {}
  }
  isOwn(target) {
    return isInsidePopup(target, this.el);
  }
  cacheGet(key) { return this.cache.get(key); }
  cacheSet(key, val) {
    if (this.cache.size >= this.maxCache) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key, val);
  }
  position(rect) {
    if (!this.el) return;
    const pad = 12;
    let left = rect ? rect.left : 0;
    let top = rect ? rect.bottom + 6 : 0;
    const w = this.el.offsetWidth || 320;
    const h = this.el.offsetHeight || 100;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (left + w + pad > vw) left = vw - w - pad;
    if (left < pad) left = pad;
    if (top + h + pad > vh) top = (rect ? rect.top : 0) - h - 6;
    if (top < pad) top = pad;
    this.el.style.left = left + 'px';
    this.el.style.top = top + 'px';
  }
  /** 展示纯文本（如悬停已翻译段落显示原文）。 */
  showPlain(text, rect) {
    if (!text) { this.hide(); return; }
    if (text === this.lastText && this.el && this.el.style.display !== 'none') { this.position(rect); return; }
    this.token++;
    this.lastText = text;
    const el = this.ensure();
    el.textContent = '';
    const main = document.createElement('div');
    main.className = 'wordlens-popup-orig';
    main.textContent = text;
    el.appendChild(main);
    el.style.display = 'block';
    this.position(rect);
  }
  /** 展示加载反馈（请求翻译期间）。 */
  showLoading(rect) {
    this.token++;
    const el = this.ensure();
    el.textContent = '';
    const ld = document.createElement('div');
    ld.className = 'wordlens-popup-loading';
    ld.textContent = '⋯';
    el.appendChild(ld);
    el.style.display = 'block';
    this.position(rect);
  }
  /** 展示翻译结果（布局与经典版一致：工具栏→词头→译文→词典→检测语言）。 */
  show(result, sourceText, rect) {
    if (!result || !result.targetText) return;
    const tk = ++this.token;
    this.lastText = sourceText;
    this.lastResult = result;
    const s = this.plugin.i18n();
    const el = this.ensure();
    el.textContent = '';
    // 1. 工具栏（右上角小图标按钮）
    const bar = document.createElement('div');
    bar.className = 'wordlens-popup-bar';
    const btnSpeak = document.createElement('button');
    btnSpeak.className = 'wordlens-popup-btn wordlens-speak-btn';
    btnSpeak.textContent = '🔊';
    btnSpeak.title = s.speak;
    btnSpeak.addEventListener('click', (e) => {
      e.stopPropagation();
      try {
        const u = new SpeechSynthesisUtterance(sourceText);
        u.lang = result.sourceLang === 'zh' ? 'zh-CN' : result.sourceLang;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch (_) {}
    });
    const btnCopy = document.createElement('button');
    btnCopy.className = 'wordlens-popup-btn wordlens-copy-btn';
    btnCopy.textContent = '📋';
    btnCopy.title = s.copy;
    btnCopy.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(result.targetText);
        new Notice(s.copied);
      } catch (_) {}
    });
    bar.appendChild(btnSpeak);
    bar.appendChild(btnCopy);
    el.appendChild(bar);
    // 2. 词头（大号原文）
    if (this.plugin.settings.showSourceText) {
      const head = document.createElement('div');
      head.className = 'wordlens-popup-headword';
      head.textContent = sourceText;
      el.appendChild(head);
    }
    // 3. 译文 + 音标
    const target = document.createElement('div');
    target.className = 'wordlens-popup-target';
    if (this.plugin.settings.showTransliteration && result.transliteration) {
      const ph = document.createElement('div');
      ph.className = 'wordlens-popup-phonetic';
      ph.textContent = result.transliteration;
      target.appendChild(ph);
    }
    target.appendChild(document.createTextNode(result.targetText));
    el.appendChild(target);
    // 4. 词典区（一词多译：词性 + 释义同行）
    const dict = result.dict;
    if (dict && this.plugin.settings.showDictionary) {
      const dictEl = document.createElement('div');
      dictEl.className = 'wordlens-popup-dict';
      if (dict.phonetics && dict.phonetics.length && this.plugin.settings.showTransliteration) {
        const ph = document.createElement('div');
        ph.className = 'wordlens-popup-phonetic';
        ph.textContent = dict.phonetics.join('  ');
        dictEl.appendChild(ph);
      }
      if (this.plugin.settings.showMultiTranslation && Array.isArray(dict.entries) && dict.entries.length) {
        for (const e of dict.entries) {
          const row = document.createElement('div');
          row.className = 'wordlens-popup-dict-row';
          if (e.pos) {
            const posEl = document.createElement('b');
            posEl.className = 'wordlens-popup-pos';
            posEl.textContent = e.pos;
            row.appendChild(posEl);
            row.appendChild(document.createTextNode(' '));
          }
          const termsEl = document.createElement('span');
          termsEl.className = 'wordlens-popup-terms';
          termsEl.textContent = e.meaning;
          row.appendChild(termsEl);
          dictEl.appendChild(row);
        }
      }
      if (dictEl.childNodes.length) el.appendChild(dictEl);
    }
    // 5. 检测语言（底部小字）
    if (this.plugin.settings.showDetectedLang && result.sourceLang && result.sourceLang !== 'auto') {
      const meta = document.createElement('div');
      meta.className = 'wordlens-popup-meta';
      meta.textContent = String(result.sourceLang).toUpperCase();
      el.appendChild(meta);
    }
    el.style.display = 'block';
    this.position(rect);
  }
}

/* ================================================================
 * 插件主体
 * ================================================================ */
class WordLensPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.i18n = () => {
      const lang = this.settings.uiLang === 'system' ? (Platform.isMobileApp ? 'zh' : (navigator.language && navigator.language.startsWith('zh') ? 'zh' : 'en')) : this.settings.uiLang;
      return I18N[lang] || I18N.zh;
    };
    this.popup = new Popup(this);
    this.selectionActive = false;
    this._reqSeq = 0; // 翻译请求竞态序号
    this.paged = new WeakMap(); // 整页翻译原文缓存（段落元素 → 原文）
    this._lastHover = { x: 0, y: 0, t: 0, text: '' };

    this.addSettingTab(new WordLensSettingTab(this.app, this));

    // —— 命令（ID 与 v0.1 兼容） ——
    this.addCommand({
      id: 'wordlens-open-trans-panel',
      name: this.i18n().ribbonTrans,
      callback: () => this.openTransView(),
    });
    this.addCommand({
      id: 'wordlens-open-vocab',
      name: this.i18n().ribbonVocab,
      callback: () => this.openVocabView(),
    });
    this.addCommand({
      id: 'wordlens-hide-tooltip',
      name: '隐藏翻译弹窗',
      callback: () => this.popup.hide(),
    });
    this.addCommand({
      id: 'wordlens-toggle',
      name: '开/关翻译器',
      callback: async () => {
        this.settings.enabled = !this.settings.enabled;
        await this.saveSettings();
        new Notice(this.i18n().pluginToggle(this.settings.enabled));
        if (!this.settings.enabled) this.popup.hide();
      },
    });
    this.addCommand({
      id: 'wordlens-translate-selection',
      name: '翻译当前划选内容',
      callback: () => this.translateSelection(),
    });
    this.addCommand({
      id: 'wordlens-translate-page',
      name: '翻译当前页面',
      callback: () => this.translatePage(),
    });
    this.addCommand({
      id: 'wordlens-restore-page',
      name: '还原原文（页面翻译）',
      callback: () => this.restorePage(),
    });
    this.addCommand({
      id: 'wordlens-copy-translation',
      name: '复制译文到剪贴板',
      callback: async () => {
        const r = this.popup.lastResult;
        if (!r || !r.targetText) { new Notice(this.i18n().noTranslation); return; }
        await navigator.clipboard.writeText(r.targetText);
        new Notice(this.i18n().copied);
      },
    });

    // —— 侧边栏图标（容错：个别 Obsidian 版本图标缺失不影响核心功能） ——
    try {
      this.addRibbonIcon('message-square', this.i18n().ribbonTrans, () => this.openTransView());
      this.addRibbonIcon('book-open', this.i18n().ribbonVocab, () => this.openVocabView());
    } catch (e) {
      console.warn('[wordlens] ribbon icon failed:', e);
    }

    // —— 整页翻译按钮（阅读视图工具栏，容错：addAction 兼容低版本） ——
    const addPageBtn = () => {
      try {
        this.app.workspace.getLeavesOfType('markdown').forEach((leaf) => {
          const view = leaf.view;
          if (!view || view._wlPageBtn) return;
          if (!(Platform.isMobile ? this.settings.enablePageMobile : this.settings.enablePage)) return;
          if (typeof view.addAction !== 'function') return; // 低版本 Obsidian 无此 API，跳过
          view._wlPageBtn = view.addAction('languages', this.i18n().togglePage, () => this.togglePageTranslate());
        });
      } catch (e) {
        console.warn('[wordlens] page button failed:', e);
      }
    };
    addPageBtn();
    this.registerEvent(this.app.workspace.on('layout-change', addPageBtn));

    // —— 全局事件 ——
    this.registerDomEvent(document, 'mousemove', (e) => this.onMouseMove(e));
    this.registerDomEvent(document, 'selectionchange', () => this.onSelectionChange());
    this.registerDomEvent(document, 'keydown', (e) => {
      if (e.key === 'Escape') { this.popup.hide(); this.selectionActive = false; }
    });
    this.registerDomEvent(document, 'scroll', () => { if (!this.selectionActive) this.popup.hide(); }, true);
    this.registerDomEvent(document, 'click', (e) => {
      if (this.popup.isOwn(e.target)) return;
      this.popup.hide();
      this.selectionActive = false;
    });
  }

  onunload() {
    this.popup && this.popup.hide();
    // 兜底保存未落盘的生词本
    clearTimeout(this._vocabTimer);
    this.saveSettings();
  }

  /* ---------- 设置 ---------- */
  async loadSettings() {
    const data = (await this.loadData()) || {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    this.vocab = Array.isArray(data.vocab) ? data.vocab : [];
  }
  async saveSettings() {
    await this.saveData(Object.assign({}, this.settings, { vocab: this.vocab }));
  }

  /* ---------- 悬停 ---------- */
  onMouseMove(e) {
    if (!this.settings.enabled || !this.settings.enableHover) return;
    if (this.selectionActive) return;
    if (this.popup.isOwn(e.target)) return;
    // 移出笔记正文 → 立即隐藏弹窗
    if (this.settings.restrictToNoteContent && !inNoteContent(e.target, this.settings.activeMode)) {
      this.popup.hide();
      return;
    }
    const now = Date.now();
    if (now - this._lastHover.t < this.settings.delayMs) return;
    if (Math.abs(e.clientX - this._lastHover.x) < 3 && Math.abs(e.clientY - this._lastHover.y) < 3) return;
    this._lastHover = { x: e.clientX, y: e.clientY, t: now };
    // 整页翻译段落：悬停显示原文
    if (this.settings.pageTranslationHoverOriginal) {
      const el = e.target instanceof Element ? e.target.closest('.wl-paged') : null;
      if (el) {
        const orig = this.paged.get(el) || el.getAttribute('data-wl-orig');
        if (orig) { this.popup.showPlain(orig, el.getBoundingClientRect()); return; }
      }
    }
    const hit = extractAtPoint(e.clientX, e.clientY, this.settings.textType);
    // 取不到词（空白/标点/间隔处）→ 隐藏弹窗
    if (!hit) { this.popup.hide(); return; }
    this.translate(hit.text, this.settings.mouseoverEngine, hit.rect);
  }

  /* ---------- 划词 ---------- */
  onSelectionChange() {
    if (!this.settings.enabled || !this.settings.enableSelection) return;
    const s = this.i18n();
    setTimeout(() => {
      const sel = window.getSelection && window.getSelection();
      if (!sel) return;
      if (sel.isCollapsed) {
        if (this.selectionActive) { this.popup.hide(); this.selectionActive = false; }
        return;
      }
      const text = sel.toString().replace(/\s+/g, ' ').trim();
      if (!text || text.length > 5000) return;
      if (this.settings.restrictToNoteContent && sel.anchorNode && !inNoteContent(sel.anchorNode, this.settings.activeMode)) return;
      this.selectionActive = true;
      const range = sel.getRangeAt(0);
      this.translate(text, this.settings.selectionEngine, range.getBoundingClientRect());
    }, 200);
  }

  async translateSelection() {
    const sel = window.getSelection && window.getSelection();
    if (!sel || sel.isCollapsed) { new Notice(this.i18n().noTranslation); return; }
    const text = sel.toString().replace(/\s+/g, ' ').trim();
    if (!text) return;
    this.selectionActive = true;
    this.translate(text, this.settings.selectionEngine, sel.getRangeAt(0).getBoundingClientRect());
  }

  /* ---------- 翻译核心 ---------- */
  async translate(text, engineKey, rect) {
    if (!text || !this.settings.enabled) return;
    const seq = ++this._reqSeq; // 竞态保护：只显示最新一次请求的结果
    const s = this.i18n();
    // 语言方向
    let src = this.settings.sourceLang || 'auto';
    let tgt = this.settings.targetLang || 'zh';
    if (this.settings.directionMode === 'auto') {
      const d = detectLang(text);
      if (d === 'zh') { src = 'auto'; tgt = this.settings.autoChineseTarget || 'en'; }
      else { src = 'auto'; tgt = this.settings.targetLang || 'zh'; }
    }
    const engine = ENGINES[engineKey] || ENGINES.youdao;
    const cacheKey = `${engineKey}|${src}|${tgt}|${text}`;
    if (!this.settings.disableCache) {
      const hit = this.popup.cacheGet(cacheKey);
      if (hit) { this.popup.show(hit, text, rect); return; }
    }
    this.popup.showLoading(rect); // 请求期间显示加载反馈
    const result = await engine.cls.translate(text, src, tgt, this.settings);
    if (seq !== this._reqSeq) return; // 已被更新的请求取代，丢弃过期结果
    if (!result) return;
    // 跳过同语言 / 无变化
    if (this.settings.skipSameLanguage && result.sourceLang && result.sourceLang !== 'auto' && normLang(result.sourceLang, engineKey) === normLang(tgt, engineKey)) return;
    if (this.settings.skipIdenticalText && result.targetText === text) return;
    if (!this.settings.disableCache) this.popup.cacheSet(cacheKey, result);
    // 生词本（仅单词/短词）
    if (text.length <= 60 && !looksChinese(text)) this.vocabAdd(text, result.targetText);
    this.popup.show(result, text, rect);
  }

  /* ---------- 生词本（存入插件 data.json，防抖落盘） ---------- */
  vocabSave() {
    clearTimeout(this._vocabTimer);
    this._vocabTimer = setTimeout(() => { this.saveSettings(); }, 400);
  }
  vocabAdd(text, target) {
    const now = Date.now();
    const item = this.vocab.find((v) => v.text === text);
    if (item) { item.count = (item.count || 1) + 1; item.ts = now; }
    else { this.vocab.unshift({ text, target, count: 1, ts: now }); }
    if (this.vocab.length > 500) this.vocab.length = 500;
    this.vocabSave();
  }
  vocabClear() {
    this.vocab = [];
    this.vocabSave();
  }

  /* ---------- 视图 ---------- */
  async openTransView() {
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: TRANS_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
  async openVocabView() {
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VOCAB_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  /* ---------- 整页翻译 ---------- */
  getMarkdownView() {
    const view = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
    return view;
  }
  togglePageTranslate() {
    const s = this.i18n();
    if (!(Platform.isMobile ? this.settings.enablePageMobile : this.settings.enablePage)) { new Notice(s.pageDisabled); return; }
    const hasPaged = this.app.workspace.getLeavesOfType('markdown').some((l) => {
      const c = l.view && l.view.containerEl;
      return c && c.querySelector('.wl-paged');
    });
    if (hasPaged) this.restorePage(); else this.translatePage();
  }
  async translatePage() {
    const s = this.i18n();
    if (!(Platform.isMobile ? this.settings.enablePageMobile : this.settings.enablePage)) { new Notice(s.pageDisabled); return; }
    const view = this.getMarkdownView();
    if (!view || view.getMode() !== 'preview') { new Notice(s.pageNeedReading); return; }
    const root = view.containerEl.querySelector('.markdown-reading-view') || view.contentEl;
    const nodes = Array.from(root.querySelectorAll('p, li, blockquote, h1, h2, h3, h4, h5, h6, td, th'))
      .filter((n) => {
        const txt = (n.textContent || '').trim();
        return txt.length >= 2 && txt.length <= 4000 && !n.querySelector('.wl-paged') && !(n.closest && n.closest('.wl-paged'));
      });
    if (!nodes.length) { new Notice(s.pageNoText); return; }
    const engineKey = this.settings.pageEngine;
    let done = 0;
    const total = nodes.length;
    const workers = Array.from({ length: 3 }, async () => {
      while (nodes.length) {
        const node = nodes.shift();
        const text = (node.textContent || '').trim();
        if (!text) { done++; continue; }
        const result = await ENGINES[engineKey].cls.translate(text, 'auto', this.settings.targetLang || 'zh', this.settings);
        if (result && result.targetText) {
          const span = document.createElement('span');
          span.className = 'wl-paged';
          span.textContent = result.targetText;
          node.textContent = '';
          node.appendChild(span);
          this.paged.set(span, text);
          span.setAttribute('data-wl-orig', text);
        }
        done++;
        if (done % 10 === 0 || done === total) new Notice(s.pageTranslating(done, total));
      }
    });
    await Promise.all(workers);
    new Notice(s.pageDone(total));
  }
  restorePage() {
    const s = this.i18n();
    const view = this.getMarkdownView();
    if (!view) return;
    const root = view.containerEl.querySelector('.markdown-reading-view') || view.contentEl;
    const nodes = Array.from(root.querySelectorAll('.wl-paged'));
    let n = 0;
    for (const span of nodes) {
      const orig = this.paged.get(span) || span.getAttribute('data-wl-orig');
      const parent = span.parentElement;
      if (orig) {
        if (parent && parent.childNodes.length === 1 && parent.querySelector('.wl-paged') === span) {
          parent.textContent = orig;
        } else {
          const tn = document.createTextNode(orig);
          span.replaceWith(tn);
        }
      } else {
        span.replaceWith(document.createTextNode(span.textContent || ''));
      }
      n++;
    }
    if (n) new Notice(s.pageRestored(n));
  }
}

/* ================================================================
 * 设置界面
 * ================================================================ */
class WordLensSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    const s = this.plugin.i18n();
    containerEl.empty();
    containerEl.createEl('h2', { text: s.settingsTitle });

    /* —— 通用 —— */
    new Setting(containerEl).setName(s.masterEnabled).setDesc(s.masterEnabledDesc)
      .addToggle((t) => t.setValue(this.plugin.settings.enabled)
        .onChange(async (v) => { this.plugin.settings.enabled = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl).setName(s.uiLang)
      .addDropdown((d) => d
        .addOption('system', s.uiLangSystem)
        .addOption('zh', s.uiLangZh)
        .addOption('en', s.uiLangEn)
        .setValue(this.plugin.settings.uiLang)
        .onChange(async (v) => { this.plugin.settings.uiLang = v; await this.plugin.saveSettings(); this.display(); }));

    new Setting(containerEl).setName(s.resetBtn)
      .addButton((b) => b.setButtonText(s.resetBtn).onClick(async () => {
        this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS, { uiLang: this.plugin.settings.uiLang });
        await this.plugin.saveSettings();
        new Notice(s.resetDone);
        this.display();
      }));

    containerEl.createEl('h3', { text: s.secFeatures });

    new Setting(containerEl).setName(s.hoverEnabled).setDesc(s.hoverEnabledDesc)
      .addToggle((t) => t.setValue(this.plugin.settings.enableHover)
        .onChange(async (v) => { this.plugin.settings.enableHover = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.selectionEnabled).setDesc(s.selectionEnabledDesc)
      .addToggle((t) => t.setValue(this.plugin.settings.enableSelection)
        .onChange(async (v) => { this.plugin.settings.enableSelection = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.pageEnabled).setDesc(s.pageEnabledDesc)
      .addToggle((t) => t.setValue(this.plugin.settings.enablePage)
        .onChange(async (v) => { this.plugin.settings.enablePage = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.masterEnabled).setDesc(s.restrictDesc)
      .addToggle((t) => t.setValue(this.plugin.settings.restrictToNoteContent)
        .onChange(async (v) => { this.plugin.settings.restrictToNoteContent = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.hoverEnabled).setDesc(s.activeModeDesc)
      .addDropdown((d) => d
        .addOption('edit', '编辑视图')
        .addOption('reading', '阅读视图')
        .addOption('both', '两者')
        .setValue(this.plugin.settings.activeMode)
        .onChange(async (v) => { this.plugin.settings.activeMode = v; await this.plugin.saveSettings(); }));

    /* —— 翻译设置 —— */
    containerEl.createEl('h3', { text: s.secTranslation });

    new Setting(containerEl).setName(s.directionMode).setDesc(s.directionDesc)
      .addDropdown((d) => d
        .addOption('fixed', s.directionFixed)
        .addOption('auto', s.directionAuto)
        .setValue(this.plugin.settings.directionMode)
        .onChange(async (v) => { this.plugin.settings.directionMode = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.autoChineseTarget)
      .addDropdown((d) => d
        .addOption('en', 'English (en)')
        .addOption('ja', '日本語 (ja)')
        .addOption('zh', '中文 (zh)')
        .addOption('fr', 'Français (fr)')
        .addOption('de', 'Deutsch (de)')
        .addOption('ru', 'Русский (ru)')
        .addOption('ko', '한국어 (ko)')
        .setValue(this.plugin.settings.autoChineseTarget)
        .onChange(async (v) => { this.plugin.settings.autoChineseTarget = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.sourceLang)
      .addDropdown((d) => d
        .addOption('auto', s.langAuto)
        .addOption('zh', '中文 (zh)')
        .addOption('en', 'English (en)')
        .addOption('ja', '日本語 (ja)')
        .addOption('fr', 'Français (fr)')
        .addOption('de', 'Deutsch (de)')
        .addOption('ru', 'Русский (ru)')
        .addOption('ko', '한국어 (ko)')
        .setValue(this.plugin.settings.sourceLang)
        .onChange(async (v) => { this.plugin.settings.sourceLang = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.targetLang)
      .addDropdown((d) => d
        .addOption('zh', '中文 (zh)')
        .addOption('en', 'English (en)')
        .addOption('ja', '日本語 (ja)')
        .addOption('fr', 'Français (fr)')
        .addOption('de', 'Deutsch (de)')
        .addOption('ru', 'Русский (ru)')
        .addOption('ko', '한국어 (ko)')
        .setValue(this.plugin.settings.targetLang)
        .onChange(async (v) => { this.plugin.settings.targetLang = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.textType)
      .addDropdown((d) => d
        .addOption('word', s.textTypeWord)
        .addOption('sentence', s.textTypeSentence)
        .setValue(this.plugin.settings.textType)
        .onChange(async (v) => { this.plugin.settings.textType = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.hoverDelay).setDesc(s.hoverDelayDesc)
      .addSlider((sl) => sl.setLimits(100, 2000, 50).setValue(this.plugin.settings.delayMs)
        .onChange(async (v) => { this.plugin.settings.delayMs = v; await this.plugin.saveSettings(); })
        .setDynamicTooltip());
    new Setting(containerEl).setName(s.skipSameLanguage).setDesc(s.skipSameLanguageDesc)
      .addToggle((t) => t.setValue(this.plugin.settings.skipSameLanguage)
        .onChange(async (v) => { this.plugin.settings.skipSameLanguage = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.skipIdenticalText).setDesc(s.skipIdenticalTextDesc)
      .addToggle((t) => t.setValue(this.plugin.settings.skipIdenticalText)
        .onChange(async (v) => { this.plugin.settings.skipIdenticalText = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.disableCache).setDesc(s.disableCacheDesc)
      .addToggle((t) => t.setValue(this.plugin.settings.disableCache)
        .onChange(async (v) => { this.plugin.settings.disableCache = v; await this.plugin.saveSettings(); }));

    /* —— 引擎 —— */
    containerEl.createEl('h3', { text: s.secEngines });
    new Setting(containerEl).setDesc(s.engineDesc);

    const engineDropdown = (name, key) => {
      new Setting(containerEl).setName(name)
        .addDropdown((d) => {
          for (const [k, v] of Object.entries(ENGINES)) d.addOption(k, v.label);
          d.setValue(this.plugin.settings[key]).onChange(async (v) => { this.plugin.settings[key] = v; await this.plugin.saveSettings(); });
        });
    };
    engineDropdown(s.engineHover, 'mouseoverEngine');
    engineDropdown(s.engineSelection, 'selectionEngine');
    engineDropdown(s.enginePage, 'pageEngine');

    new Setting(containerEl).setName(s.youdaoKey)
      .addText((t) => t.setPlaceholder('…').setValue(this.plugin.settings.youdaoAppKey)
        .onChange(async (v) => { this.plugin.settings.youdaoAppKey = v.trim(); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.youdaoSecret)
      .addText((t) => t.setPlaceholder('…').setValue(this.plugin.settings.youdaoSecret)
        .onChange(async (v) => { this.plugin.settings.youdaoSecret = v.trim(); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.baiduKey)
      .addText((t) => t.setPlaceholder('…').setValue(this.plugin.settings.baiduAppId)
        .onChange(async (v) => { this.plugin.settings.baiduAppId = v.trim(); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.baiduSecret)
      .addText((t) => t.setPlaceholder('…').setValue(this.plugin.settings.baiduSecretKey)
        .onChange(async (v) => { this.plugin.settings.baiduSecretKey = v.trim(); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.tencentKey)
      .addText((t) => t.setPlaceholder('…').setValue(this.plugin.settings.tencentSecretId)
        .onChange(async (v) => { this.plugin.settings.tencentSecretId = v.trim(); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.tencentSecret)
      .addText((t) => t.setPlaceholder('…').setValue(this.plugin.settings.tencentSecretKey)
        .onChange(async (v) => { this.plugin.settings.tencentSecretKey = v.trim(); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.aliyunKey)
      .addText((t) => t.setPlaceholder('…').setValue(this.plugin.settings.aliyunAccessKeyId)
        .onChange(async (v) => { this.plugin.settings.aliyunAccessKeyId = v.trim(); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.aliyunSecret)
      .addText((t) => t.setPlaceholder('…').setValue(this.plugin.settings.aliyunAccessKeySecret)
        .onChange(async (v) => { this.plugin.settings.aliyunAccessKeySecret = v.trim(); await this.plugin.saveSettings(); }));

    /* —— 弹窗内容 —— */
    containerEl.createEl('h3', { text: s.secTooltip });
    new Setting(containerEl).setName(s.showSourceText)
      .addToggle((t) => t.setValue(this.plugin.settings.showSourceText)
        .onChange(async (v) => { this.plugin.settings.showSourceText = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.showDetectedLang)
      .addToggle((t) => t.setValue(this.plugin.settings.showDetectedLang)
        .onChange(async (v) => { this.plugin.settings.showDetectedLang = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.showDictionary)
      .addToggle((t) => t.setValue(this.plugin.settings.showDictionary)
        .onChange(async (v) => { this.plugin.settings.showDictionary = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.showMultiTranslation).setDesc(s.showMultiTranslationDesc)
      .addToggle((t) => t.setValue(this.plugin.settings.showMultiTranslation)
        .onChange(async (v) => { this.plugin.settings.showMultiTranslation = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(s.showTransliteration)
      .addToggle((t) => t.setValue(this.plugin.settings.showTransliteration)
        .onChange(async (v) => { this.plugin.settings.showTransliteration = v; await this.plugin.saveSettings(); }));

    /* —— 整页翻译 —— */
    containerEl.createEl('h3', { text: s.secPage });
    new Setting(containerEl).setName(s.pageHoverOriginal).setDesc(s.pageHoverOriginalDesc)
      .addToggle((t) => t.setValue(this.plugin.settings.pageTranslationHoverOriginal)
        .onChange(async (v) => { this.plugin.settings.pageTranslationHoverOriginal = v; await this.plugin.saveSettings(); }));
  }
}

/* ================================================================
 * 视图：生词本 / 翻译面板
 * ================================================================ */
const VOCAB_VIEW_TYPE = 'wordlens-vocab';
const TRANS_VIEW_TYPE = 'wordlens-trans';

class VocabView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.sortMode = 'recent';
    this.filterMode = 'all';
  }
  getViewType() { return VOCAB_VIEW_TYPE; }
  getDisplayText() { return this.plugin.i18n().vocabTitle; }
  getIcon() { return 'book-open'; }
  async onOpen() { this.render(); }
  async onClose() {}
  render() {
    const s = this.plugin.i18n();
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: s.vocabTitle });
    // 工具栏
    const bar = contentEl.createDiv({ cls: 'wordlens-vocab-bar' });
    const sortSel = document.createElement('select');
    sortSel.className = 'dropdown';
    sortSel.innerHTML = `<option value="recent">${s.sortByRecent}</option><option value="count">${s.sortByCount}</option><option value="alpha">${s.sortAlpha}</option>`;
    sortSel.value = this.sortMode;
    sortSel.addEventListener('change', () => { this.sortMode = sortSel.value; this.render(); });
    const filterSel = document.createElement('select');
    filterSel.className = 'dropdown';
    filterSel.innerHTML = `<option value="all">${s.filterAll}</option><option value="word">${s.filterWord}</option><option value="sentence">${s.filterSentence}</option>`;
    filterSel.value = this.filterMode;
    filterSel.addEventListener('change', () => { this.filterMode = filterSel.value; this.render(); });
    const clearBtn = document.createElement('button');
    clearBtn.className = 'wordlens-vocab-clear';
    clearBtn.textContent = s.vocabClear;
    clearBtn.addEventListener('click', () => { this.plugin.vocabClear(); this.render(); });
    bar.appendChild(sortSel);
    bar.appendChild(filterSel);
    bar.appendChild(clearBtn);
    contentEl.appendChild(bar);

    let items = this.plugin.vocab.slice();
    if (this.filterMode === 'word') items = items.filter((v) => v.text && v.text.split(/\s+/).length <= 2);
    if (this.filterMode === 'sentence') items = items.filter((v) => v.text && v.text.split(/\s+/).length > 2);
    if (this.sortMode === 'count') items.sort((a, b) => (b.count || 0) - (a.count || 0));
    else if (this.sortMode === 'alpha') items.sort((a, b) => a.text.localeCompare(b.text));
    else items.sort((a, b) => (b.ts || 0) - (a.ts || 0));

    if (!items.length) {
      contentEl.createEl('p', { text: s.vocabEmpty, cls: 'wordlens-vocab-empty' });
      return;
    }
    for (const item of items) {
      const row = contentEl.createDiv({ cls: 'wordlens-vocab-row' });
      const left = row.createDiv({ cls: 'wordlens-vocab-left' });
      left.createEl('div', { text: item.text, cls: 'wordlens-vocab-word' });
      if (item.target) left.createEl('div', { text: item.target, cls: 'wordlens-vocab-target' });
      const right = row.createDiv({ cls: 'wordlens-vocab-right' });
      right.createEl('span', { text: `×${item.count || 1}`, cls: 'wordlens-vocab-count' });
      const cBtn = document.createElement('button');
      cBtn.textContent = s.copy;
      cBtn.className = 'wordlens-vocab-copy';
      cBtn.addEventListener('click', async () => { await navigator.clipboard.writeText(item.target || item.text); new Notice(s.copied); });
      right.appendChild(cBtn);
    }
  }
}

class TransView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() { return TRANS_VIEW_TYPE; }
  getDisplayText() { return this.plugin.i18n().transTitle; }
  getIcon() { return 'message-square'; }
  async onOpen() { this.render(); }
  async onClose() {}
  render() {
    const s = this.plugin.i18n();
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: s.transTitle });
    const input = contentEl.createEl('textarea', { cls: 'wordlens-trans-input' });
    input.placeholder = s.transPlaceholder;
    input.rows = 5;
    const row = contentEl.createDiv({ cls: 'wordlens-trans-row' });
    const engineSel = document.createElement('select');
    engineSel.className = 'dropdown';
    for (const [k, v] of Object.entries(ENGINES)) engineSel.innerHTML += `<option value="${k}">${v.label}</option>`;
    engineSel.value = this.plugin.settings.selectionEngine;
    const goBtn = document.createElement('button');
    goBtn.className = 'wordlens-trans-go';
    goBtn.textContent = s.transBtn;
    row.appendChild(engineSel);
    row.appendChild(goBtn);
    contentEl.appendChild(row);
    const out = contentEl.createDiv({ cls: 'wordlens-trans-out' });
    goBtn.addEventListener('click', async () => {
      const text = input.value.trim();
      if (!text) return;
      out.textContent = s.translating;
      const engine = ENGINES[engineSel.value] || ENGINES.youdao;
      const result = await engine.cls.translate(text, 'auto', this.plugin.settings.targetLang || 'zh', this.plugin.settings);
      if (!result) { out.textContent = s.noTranslation; return; }
      out.textContent = '';
      out.createEl('div', { text: result.targetText, cls: 'wordlens-trans-result' });
      const cBtn = out.createEl('button', { text: s.transCopy, cls: 'wordlens-trans-copy' });
      cBtn.addEventListener('click', async () => { await navigator.clipboard.writeText(result.targetText); new Notice(s.transCopied); });
    });
  }
}

module.exports = { default: WordLensPlugin, ENGINES, DEFAULT_SETTINGS, I18N };
