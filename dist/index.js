var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/.pnpm/sisteransi@1.0.5/node_modules/sisteransi/src/index.js
var require_src = __commonJS({
  "node_modules/.pnpm/sisteransi@1.0.5/node_modules/sisteransi/src/index.js"(exports, module) {
    "use strict";
    var ESC2 = "\x1B";
    var CSI2 = `${ESC2}[`;
    var beep = "\x07";
    var cursor = {
      to(x3, y) {
        if (!y) return `${CSI2}${x3 + 1}G`;
        return `${CSI2}${y + 1};${x3 + 1}H`;
      },
      move(x3, y) {
        let ret = "";
        if (x3 < 0) ret += `${CSI2}${-x3}D`;
        else if (x3 > 0) ret += `${CSI2}${x3}C`;
        if (y < 0) ret += `${CSI2}${-y}A`;
        else if (y > 0) ret += `${CSI2}${y}B`;
        return ret;
      },
      up: (count = 1) => `${CSI2}${count}A`,
      down: (count = 1) => `${CSI2}${count}B`,
      forward: (count = 1) => `${CSI2}${count}C`,
      backward: (count = 1) => `${CSI2}${count}D`,
      nextLine: (count = 1) => `${CSI2}E`.repeat(count),
      prevLine: (count = 1) => `${CSI2}F`.repeat(count),
      left: `${CSI2}G`,
      hide: `${CSI2}?25l`,
      show: `${CSI2}?25h`,
      save: `${ESC2}7`,
      restore: `${ESC2}8`
    };
    var scroll = {
      up: (count = 1) => `${CSI2}S`.repeat(count),
      down: (count = 1) => `${CSI2}T`.repeat(count)
    };
    var erase = {
      screen: `${CSI2}2J`,
      up: (count = 1) => `${CSI2}1J`.repeat(count),
      down: (count = 1) => `${CSI2}J`.repeat(count),
      line: `${CSI2}2K`,
      lineEnd: `${CSI2}K`,
      lineStart: `${CSI2}1K`,
      lines(count) {
        let clear = "";
        for (let i = 0; i < count; i++)
          clear += this.line + (i < count - 1 ? cursor.up() : "");
        if (count)
          clear += cursor.left;
        return clear;
      }
    };
    module.exports = { cursor, scroll, erase, beep };
  }
});

// node_modules/.pnpm/@clack+core@1.3.1/node_modules/@clack/core/dist/index.mjs
import { styleText as v } from "node:util";
import { stdout as x, stdin as D } from "node:process";
import E from "node:readline";

// node_modules/.pnpm/fast-string-truncated-width@3.0.3/node_modules/fast-string-truncated-width/dist/utils.js
var getCodePointsLength = /* @__PURE__ */ (() => {
  const SURROGATE_PAIR_RE = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
  return (input) => {
    let surrogatePairsNr = 0;
    SURROGATE_PAIR_RE.lastIndex = 0;
    while (SURROGATE_PAIR_RE.test(input)) {
      surrogatePairsNr += 1;
    }
    return input.length - surrogatePairsNr;
  };
})();
var isFullWidth = (x3) => {
  return x3 === 12288 || x3 >= 65281 && x3 <= 65376 || x3 >= 65504 && x3 <= 65510;
};
var isWideNotCJKTNotEmoji = (x3) => {
  return x3 === 8987 || x3 === 9001 || x3 >= 12272 && x3 <= 12287 || x3 >= 12289 && x3 <= 12350 || x3 >= 12441 && x3 <= 12543 || x3 >= 12549 && x3 <= 12591 || x3 >= 12593 && x3 <= 12686 || x3 >= 12688 && x3 <= 12771 || x3 >= 12783 && x3 <= 12830 || x3 >= 12832 && x3 <= 12871 || x3 >= 12880 && x3 <= 19903 || x3 >= 65040 && x3 <= 65049 || x3 >= 65072 && x3 <= 65106 || x3 >= 65108 && x3 <= 65126 || x3 >= 65128 && x3 <= 65131 || x3 >= 127488 && x3 <= 127490 || x3 >= 127504 && x3 <= 127547 || x3 >= 127552 && x3 <= 127560 || x3 >= 131072 && x3 <= 196605 || x3 >= 196608 && x3 <= 262141;
};

// node_modules/.pnpm/fast-string-truncated-width@3.0.3/node_modules/fast-string-truncated-width/dist/index.js
var ANSI_RE = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]|\u001b\]8;[^;]*;.*?(?:\u0007|\u001b\u005c)/y;
var CONTROL_RE = /[\x00-\x08\x0A-\x1F\x7F-\x9F]{1,1000}/y;
var CJKT_WIDE_RE = /(?:(?![\uFF61-\uFF9F\uFF00-\uFFEF])[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Tangut}]){1,1000}/yu;
var TAB_RE = /\t{1,1000}/y;
var EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}]{2}|\u{1F3F4}[\u{E0061}-\u{E007A}]{2}[\u{E0030}-\u{E0039}\u{E0061}-\u{E007A}]{1,3}\u{E007F}|(?:\p{Emoji}\uFE0F\u20E3?|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation})(?:\u200D(?:\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F\u20E3?))*/yu;
var LATIN_RE = /(?:[\x20-\x7E\xA0-\xFF](?!\uFE0F)){1,1000}/y;
var MODIFIER_RE = /\p{M}+/gu;
var NO_TRUNCATION = { limit: Infinity, ellipsis: "" };
var getStringTruncatedWidth = (input, truncationOptions = {}, widthOptions = {}) => {
  const LIMIT = truncationOptions.limit ?? Infinity;
  const ELLIPSIS = truncationOptions.ellipsis ?? "";
  const ELLIPSIS_WIDTH = truncationOptions?.ellipsisWidth ?? (ELLIPSIS ? getStringTruncatedWidth(ELLIPSIS, NO_TRUNCATION, widthOptions).width : 0);
  const ANSI_WIDTH = 0;
  const CONTROL_WIDTH = widthOptions.controlWidth ?? 0;
  const TAB_WIDTH = widthOptions.tabWidth ?? 8;
  const EMOJI_WIDTH = widthOptions.emojiWidth ?? 2;
  const FULL_WIDTH_WIDTH = 2;
  const REGULAR_WIDTH = widthOptions.regularWidth ?? 1;
  const WIDE_WIDTH = widthOptions.wideWidth ?? FULL_WIDTH_WIDTH;
  const PARSE_BLOCKS = [
    [LATIN_RE, REGULAR_WIDTH],
    [ANSI_RE, ANSI_WIDTH],
    [CONTROL_RE, CONTROL_WIDTH],
    [TAB_RE, TAB_WIDTH],
    [EMOJI_RE, EMOJI_WIDTH],
    [CJKT_WIDE_RE, WIDE_WIDTH]
  ];
  let indexPrev = 0;
  let index = 0;
  let length = input.length;
  let lengthExtra = 0;
  let truncationEnabled = false;
  let truncationIndex = length;
  let truncationLimit = Math.max(0, LIMIT - ELLIPSIS_WIDTH);
  let unmatchedStart = 0;
  let unmatchedEnd = 0;
  let width = 0;
  let widthExtra = 0;
  outer: while (true) {
    if (unmatchedEnd > unmatchedStart || index >= length && index > indexPrev) {
      const unmatched = input.slice(unmatchedStart, unmatchedEnd) || input.slice(indexPrev, index);
      lengthExtra = 0;
      for (const char of unmatched.replaceAll(MODIFIER_RE, "")) {
        const codePoint = char.codePointAt(0) || 0;
        if (isFullWidth(codePoint)) {
          widthExtra = FULL_WIDTH_WIDTH;
        } else if (isWideNotCJKTNotEmoji(codePoint)) {
          widthExtra = WIDE_WIDTH;
        } else {
          widthExtra = REGULAR_WIDTH;
        }
        if (width + widthExtra > truncationLimit) {
          truncationIndex = Math.min(truncationIndex, Math.max(unmatchedStart, indexPrev) + lengthExtra);
        }
        if (width + widthExtra > LIMIT) {
          truncationEnabled = true;
          break outer;
        }
        lengthExtra += char.length;
        width += widthExtra;
      }
      unmatchedStart = unmatchedEnd = 0;
    }
    if (index >= length) {
      break outer;
    }
    for (let i = 0, l = PARSE_BLOCKS.length; i < l; i++) {
      const [BLOCK_RE, BLOCK_WIDTH] = PARSE_BLOCKS[i];
      BLOCK_RE.lastIndex = index;
      if (BLOCK_RE.test(input)) {
        lengthExtra = BLOCK_RE === CJKT_WIDE_RE ? getCodePointsLength(input.slice(index, BLOCK_RE.lastIndex)) : BLOCK_RE === EMOJI_RE ? 1 : BLOCK_RE.lastIndex - index;
        widthExtra = lengthExtra * BLOCK_WIDTH;
        if (width + widthExtra > truncationLimit) {
          truncationIndex = Math.min(truncationIndex, index + Math.floor((truncationLimit - width) / BLOCK_WIDTH));
        }
        if (width + widthExtra > LIMIT) {
          truncationEnabled = true;
          break outer;
        }
        width += widthExtra;
        unmatchedStart = indexPrev;
        unmatchedEnd = index;
        index = indexPrev = BLOCK_RE.lastIndex;
        continue outer;
      }
    }
    index += 1;
  }
  return {
    width: truncationEnabled ? truncationLimit : width,
    index: truncationEnabled ? truncationIndex : length,
    truncated: truncationEnabled,
    ellipsed: truncationEnabled && LIMIT >= ELLIPSIS_WIDTH
  };
};
var dist_default = getStringTruncatedWidth;

// node_modules/.pnpm/fast-string-width@3.0.2/node_modules/fast-string-width/dist/index.js
var NO_TRUNCATION2 = {
  limit: Infinity,
  ellipsis: "",
  ellipsisWidth: 0
};
var fastStringWidth = (input, options = {}) => {
  return dist_default(input, NO_TRUNCATION2, options).width;
};
var dist_default2 = fastStringWidth;

// node_modules/.pnpm/fast-wrap-ansi@0.2.2/node_modules/fast-wrap-ansi/lib/main.js
var ESC = "\x1B";
var CSI = "\x9B";
var END_CODE = 39;
var ANSI_ESCAPE_BELL = "\x07";
var ANSI_CSI = "[";
var ANSI_OSC = "]";
var ANSI_SGR_TERMINATOR = "m";
var ANSI_ESCAPE_LINK = `${ANSI_OSC}8;;`;
var GROUP_REGEX = new RegExp(`(?:\\${ANSI_CSI}(?<code>\\d+)m|\\${ANSI_ESCAPE_LINK}(?<uri>.*)${ANSI_ESCAPE_BELL})`, "y");
var getClosingCode = (openingCode) => {
  if (openingCode >= 30 && openingCode <= 37)
    return 39;
  if (openingCode >= 90 && openingCode <= 97)
    return 39;
  if (openingCode >= 40 && openingCode <= 47)
    return 49;
  if (openingCode >= 100 && openingCode <= 107)
    return 49;
  if (openingCode === 1 || openingCode === 2)
    return 22;
  if (openingCode === 3)
    return 23;
  if (openingCode === 4)
    return 24;
  if (openingCode === 7)
    return 27;
  if (openingCode === 8)
    return 28;
  if (openingCode === 9)
    return 29;
  if (openingCode === 0)
    return 0;
  return void 0;
};
var wrapAnsiCode = (code) => `${ESC}${ANSI_CSI}${code}${ANSI_SGR_TERMINATOR}`;
var wrapAnsiHyperlink = (url) => `${ESC}${ANSI_ESCAPE_LINK}${url}${ANSI_ESCAPE_BELL}`;
var wrapWord = (rows, word, columns) => {
  const characters = word[Symbol.iterator]();
  let isInsideEscape = false;
  let isInsideLinkEscape = false;
  let lastRow = rows.at(-1);
  let visible = lastRow === void 0 ? 0 : dist_default2(lastRow);
  let currentCharacter = characters.next();
  let nextCharacter = characters.next();
  let rawCharacterIndex = 0;
  while (!currentCharacter.done) {
    const character = currentCharacter.value;
    const characterLength = dist_default2(character);
    if (visible + characterLength <= columns) {
      rows[rows.length - 1] += character;
    } else {
      rows.push(character);
      visible = 0;
    }
    if (character === ESC || character === CSI) {
      isInsideEscape = true;
      isInsideLinkEscape = word.startsWith(ANSI_ESCAPE_LINK, rawCharacterIndex + 1);
    }
    if (isInsideEscape) {
      if (isInsideLinkEscape) {
        if (character === ANSI_ESCAPE_BELL) {
          isInsideEscape = false;
          isInsideLinkEscape = false;
        }
      } else if (character === ANSI_SGR_TERMINATOR) {
        isInsideEscape = false;
      }
    } else {
      visible += characterLength;
      if (visible === columns && !nextCharacter.done) {
        rows.push("");
        visible = 0;
      }
    }
    currentCharacter = nextCharacter;
    nextCharacter = characters.next();
    rawCharacterIndex += character.length;
  }
  lastRow = rows.at(-1);
  if (!visible && lastRow !== void 0 && lastRow.length && rows.length > 1) {
    rows[rows.length - 2] += rows.pop();
  }
};
var stringVisibleTrimSpacesRight = (string) => {
  const words = string.split(" ");
  let last = words.length;
  while (last) {
    if (dist_default2(words[last - 1])) {
      break;
    }
    last--;
  }
  if (last === words.length) {
    return string;
  }
  return words.slice(0, last).join(" ") + words.slice(last).join("");
};
var exec = (string, columns, options = {}) => {
  if (options.trim !== false && string.trim() === "") {
    return "";
  }
  let returnValue = "";
  let escapeCode;
  let escapeUrl;
  const words = string.split(" ");
  let rows = [""];
  let rowLength = 0;
  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    if (options.trim !== false) {
      const row = rows.at(-1) ?? "";
      const trimmed = row.trimStart();
      if (row.length !== trimmed.length) {
        rows[rows.length - 1] = trimmed;
        rowLength = dist_default2(trimmed);
      }
    }
    if (index !== 0) {
      if (rowLength >= columns && (options.wordWrap === false || options.trim === false)) {
        rows.push("");
        rowLength = 0;
      }
      if (rowLength || options.trim === false) {
        rows[rows.length - 1] += " ";
        rowLength++;
      }
    }
    const wordLength = dist_default2(word);
    if (options.hard && wordLength > columns) {
      const remainingColumns = columns - rowLength;
      const breaksStartingThisLine = 1 + Math.floor((wordLength - remainingColumns - 1) / columns);
      const breaksStartingNextLine = Math.floor((wordLength - 1) / columns);
      if (breaksStartingNextLine < breaksStartingThisLine) {
        rows.push("");
      }
      wrapWord(rows, word, columns);
      rowLength = dist_default2(rows.at(-1) ?? "");
      continue;
    }
    if (rowLength + wordLength > columns && rowLength && wordLength) {
      if (options.wordWrap === false && rowLength < columns) {
        wrapWord(rows, word, columns);
        rowLength = dist_default2(rows.at(-1) ?? "");
        continue;
      }
      rows.push("");
      rowLength = 0;
    }
    if (rowLength + wordLength > columns && options.wordWrap === false) {
      wrapWord(rows, word, columns);
      rowLength = dist_default2(rows.at(-1) ?? "");
      continue;
    }
    rows[rows.length - 1] += word;
    rowLength += wordLength;
  }
  if (options.trim !== false) {
    rows = rows.map((row) => stringVisibleTrimSpacesRight(row));
  }
  const preString = rows.join("\n");
  let inSurrogate = false;
  for (let i = 0; i < preString.length; i++) {
    const character = preString[i];
    returnValue += character;
    if (!inSurrogate) {
      inSurrogate = character >= "\uD800" && character <= "\uDBFF";
      if (inSurrogate) {
        continue;
      }
    } else {
      inSurrogate = false;
    }
    if (character === ESC || character === CSI) {
      GROUP_REGEX.lastIndex = i + 1;
      const groupsResult = GROUP_REGEX.exec(preString);
      const groups = groupsResult?.groups;
      if (groups?.code !== void 0) {
        const code = Number.parseFloat(groups.code);
        escapeCode = code === END_CODE ? void 0 : code;
      } else if (groups?.uri !== void 0) {
        escapeUrl = groups.uri.length === 0 ? void 0 : groups.uri;
      }
    }
    if (preString[i + 1] === "\n") {
      if (escapeUrl) {
        returnValue += wrapAnsiHyperlink("");
      }
      const closingCode = escapeCode ? getClosingCode(escapeCode) : void 0;
      if (escapeCode && closingCode) {
        returnValue += wrapAnsiCode(closingCode);
      }
    } else if (character === "\n") {
      if (escapeCode && getClosingCode(escapeCode)) {
        returnValue += wrapAnsiCode(escapeCode);
      }
      if (escapeUrl) {
        returnValue += wrapAnsiHyperlink(escapeUrl);
      }
    }
  }
  return returnValue;
};
var CRLF_OR_LF = /\r?\n/;
function wrapAnsi(string, columns, options) {
  return String(string).normalize().split(CRLF_OR_LF).map((line) => exec(line, columns, options)).join("\n");
}

// node_modules/.pnpm/@clack+core@1.3.1/node_modules/@clack/core/dist/index.mjs
var import_sisteransi = __toESM(require_src(), 1);
var G = ["up", "down", "left", "right", "space", "enter", "cancel"];
var K = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var h = { actions: new Set(G), aliases: /* @__PURE__ */ new Map([["k", "up"], ["j", "down"], ["h", "left"], ["l", "right"], ["", "cancel"], ["escape", "cancel"]]), messages: { cancel: "Canceled", error: "Something went wrong" }, withGuide: true, date: { monthNames: [...K], messages: { required: "Please enter a valid date", invalidMonth: "There are only 12 months in a year", invalidDay: (r, t) => `There are only ${r} days in ${t}`, afterMin: (r) => `Date must be on or after ${r.toISOString().slice(0, 10)}`, beforeMax: (r) => `Date must be on or before ${r.toISOString().slice(0, 10)}` } } };
function C(r, t) {
  if (typeof r == "string") return h.aliases.get(r) === t;
  for (const s of r) if (s !== void 0 && C(s, t)) return true;
  return false;
}
function z(r, t) {
  if (r === t) return;
  const s = r.split(`
`), e2 = t.split(`
`), i = Math.max(s.length, e2.length), n = [];
  for (let o = 0; o < i; o++) s[o] !== e2[o] && n.push(o);
  return { lines: n, numLinesBefore: s.length, numLinesAfter: e2.length, numLines: i };
}
var Y = globalThis.process.platform.startsWith("win");
var k = /* @__PURE__ */ Symbol("clack:cancel");
function q(r) {
  return r === k;
}
function w(r, t) {
  const s = r;
  s.isTTY && s.setRawMode(t);
}
var L = (r) => "rows" in r && typeof r.rows == "number" ? r.rows : 20;
var m = class {
  input;
  output;
  _abortSignal;
  rl;
  opts;
  _render;
  _track = false;
  _prevFrame = "";
  _subscribers = /* @__PURE__ */ new Map();
  _cursor = 0;
  state = "initial";
  error = "";
  value;
  userInput = "";
  constructor(t, s = true) {
    const { input: e2 = D, output: i = x, render: n, signal: o, ...u } = t;
    this.opts = u, this.onKeypress = this.onKeypress.bind(this), this.close = this.close.bind(this), this.render = this.render.bind(this), this._render = n.bind(this), this._track = s, this._abortSignal = o, this.input = e2, this.output = i;
  }
  unsubscribe() {
    this._subscribers.clear();
  }
  setSubscriber(t, s) {
    const e2 = this._subscribers.get(t) ?? [];
    e2.push(s), this._subscribers.set(t, e2);
  }
  on(t, s) {
    this.setSubscriber(t, { cb: s });
  }
  once(t, s) {
    this.setSubscriber(t, { cb: s, once: true });
  }
  emit(t, ...s) {
    const e2 = this._subscribers.get(t) ?? [], i = [];
    for (const n of e2) n.cb(...s), n.once && i.push(() => e2.splice(e2.indexOf(n), 1));
    for (const n of i) n();
  }
  prompt() {
    return new Promise((t) => {
      if (this._abortSignal) {
        if (this._abortSignal.aborted) return this.state = "cancel", this.close(), t(k);
        this._abortSignal.addEventListener("abort", () => {
          this.state = "cancel", this.close();
        }, { once: true });
      }
      this.rl = E.createInterface({ input: this.input, tabSize: 2, prompt: "", escapeCodeTimeout: 50, terminal: true }), this.rl.prompt(), this.opts.initialUserInput !== void 0 && this._setUserInput(this.opts.initialUserInput, true), this.input.on("keypress", this.onKeypress), w(this.input, true), this.output.on("resize", this.render), this.render(), this.once("submit", () => {
        this.output.write(import_sisteransi.cursor.show), this.output.off("resize", this.render), w(this.input, false), t(this.value);
      }), this.once("cancel", () => {
        this.output.write(import_sisteransi.cursor.show), this.output.off("resize", this.render), w(this.input, false), t(k);
      });
    });
  }
  _isActionKey(t, s) {
    return t === "	";
  }
  _shouldSubmit(t, s) {
    return true;
  }
  _setValue(t) {
    this.value = t, this.emit("value", this.value);
  }
  _setUserInput(t, s) {
    this.userInput = t ?? "", this.emit("userInput", this.userInput), s && this._track && this.rl && (this.rl.write(this.userInput), this._cursor = this.rl.cursor);
  }
  _clearUserInput() {
    this.rl?.write(null, { ctrl: true, name: "u" }), this._setUserInput("");
  }
  onKeypress(t, s) {
    if (this._track && s.name !== "return" && (s.name && this._isActionKey(t, s) && this.rl?.write(null, { ctrl: true, name: "h" }), this._cursor = this.rl?.cursor ?? 0, this._setUserInput(this.rl?.line)), this.state === "error" && (this.state = "active"), s?.name && (!this._track && h.aliases.has(s.name) && this.emit("cursor", h.aliases.get(s.name)), h.actions.has(s.name) && this.emit("cursor", s.name)), t && (t.toLowerCase() === "y" || t.toLowerCase() === "n") && this.emit("confirm", t.toLowerCase() === "y"), this.emit("key", t?.toLowerCase(), s), s?.name === "return" && this._shouldSubmit(t, s)) {
      if (this.opts.validate) {
        const e2 = this.opts.validate(this.value);
        e2 && (this.error = e2 instanceof Error ? e2.message : e2, this.state = "error", this.rl?.write(this.userInput));
      }
      this.state !== "error" && (this.state = "submit");
    }
    C([t, s?.name, s?.sequence], "cancel") && (this.state = "cancel"), (this.state === "submit" || this.state === "cancel") && this.emit("finalize"), this.render(), (this.state === "submit" || this.state === "cancel") && this.close();
  }
  close() {
    this.input.unpipe(), this.input.removeListener("keypress", this.onKeypress), this.output.write(`
`), w(this.input, false), this.rl?.close(), this.rl = void 0, this.emit(`${this.state}`, this.value), this.unsubscribe();
  }
  restoreCursor() {
    const t = wrapAnsi(this._prevFrame, process.stdout.columns, { hard: true, trim: false }).split(`
`).length - 1;
    this.output.write(import_sisteransi.cursor.move(-999, t * -1));
  }
  render() {
    const t = wrapAnsi(this._render(this) ?? "", process.stdout.columns, { hard: true, trim: false });
    if (t !== this._prevFrame) {
      if (this.state === "initial") this.output.write(import_sisteransi.cursor.hide);
      else {
        const s = z(this._prevFrame, t), e2 = L(this.output);
        if (this.restoreCursor(), s) {
          const i = Math.max(0, s.numLinesAfter - e2), n = Math.max(0, s.numLinesBefore - e2);
          let o = s.lines.find((u) => u >= i);
          if (o === void 0) {
            this._prevFrame = t;
            return;
          }
          if (s.lines.length === 1) {
            this.output.write(import_sisteransi.cursor.move(0, o - n)), this.output.write(import_sisteransi.erase.lines(1));
            const u = t.split(`
`);
            this.output.write(u[o]), this._prevFrame = t, this.output.write(import_sisteransi.cursor.move(0, u.length - o - 1));
            return;
          } else if (s.lines.length > 1) {
            if (i < n) o = i;
            else {
              const a = o - n;
              a > 0 && this.output.write(import_sisteransi.cursor.move(0, a));
            }
            this.output.write(import_sisteransi.erase.down());
            const u = t.split(`
`).slice(o);
            this.output.write(u.join(`
`)), this._prevFrame = t;
            return;
          }
        }
        this.output.write(import_sisteransi.erase.down());
      }
      this.output.write(t), this.state === "initial" && (this.state = "active"), this._prevFrame = t;
    }
  }
};
var ht = class extends m {
  get userInputWithCursor() {
    if (this.state === "submit") return this.userInput;
    const t = this.userInput;
    if (this.cursor >= t.length) return `${this.userInput}\u2588`;
    const s = t.slice(0, this.cursor), [e2, ...i] = t.slice(this.cursor);
    return `${s}${v("inverse", e2)}${i.join("")}`;
  }
  get cursor() {
    return this._cursor;
  }
  constructor(t) {
    super({ ...t, initialUserInput: t.initialUserInput ?? t.initialValue }), this.on("userInput", (s) => {
      this._setValue(s);
    }), this.on("finalize", () => {
      this.value || (this.value = t.defaultValue), this.value === void 0 && (this.value = "");
    });
  }
};

// node_modules/.pnpm/@clack+prompts@1.4.0/node_modules/@clack/prompts/dist/index.mjs
import { styleText as e, stripVTControlCharacters as nt2 } from "node:util";
import V2 from "node:process";
var import_sisteransi2 = __toESM(require_src(), 1);
function ee() {
  return V2.platform !== "win32" ? V2.env.TERM !== "linux" : !!V2.env.CI || !!V2.env.WT_SESSION || !!V2.env.TERMINUS_SUBLIME || V2.env.ConEmuTask === "{cmd::Cmder}" || V2.env.TERM_PROGRAM === "Terminus-Sublime" || V2.env.TERM_PROGRAM === "vscode" || V2.env.TERM === "xterm-256color" || V2.env.TERM === "alacritty" || V2.env.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}
var tt = ee();
var w2 = (t, i) => tt ? t : i;
var Tt = w2("\u25C6", "*");
var at2 = w2("\u25A0", "x");
var ut2 = w2("\u25B2", "x");
var H = w2("\u25C7", "o");
var lt = w2("\u250C", "T");
var $ = w2("\u2502", "|");
var x2 = w2("\u2514", "\u2014");
var _t = w2("\u2510", "T");
var xt = w2("\u2518", "\u2014");
var z2 = w2("\u25CF", ">");
var U = w2("\u25CB", " ");
var et2 = w2("\u25FB", "[\u2022]");
var K2 = w2("\u25FC", "[+]");
var Y2 = w2("\u25FB", "[ ]");
var Et = w2("\u25AA", "\u2022");
var st = w2("\u2500", "-");
var ct = w2("\u256E", "+");
var Gt = w2("\u251C", "+");
var $t = w2("\u256F", "+");
var dt = w2("\u2570", "+");
var Mt = w2("\u256D", "+");
var ht2 = w2("\u25CF", "\u2022");
var pt = w2("\u25C6", "*");
var mt = w2("\u25B2", "!");
var gt = w2("\u25A0", "x");
var P = (t) => {
  switch (t) {
    case "initial":
    case "active":
      return e("cyan", Tt);
    case "cancel":
      return e("red", at2);
    case "error":
      return e("yellow", ut2);
    case "submit":
      return e("green", H);
  }
};
var me = (t = "", i) => {
  const s = i?.output ?? process.stdout, r = i?.withGuide ?? h.withGuide ? `${e("gray", x2)}  ` : "";
  s.write(`${r}${e("red", t)}

`);
};
var ge = (t = "", i) => {
  const s = i?.output ?? process.stdout, r = i?.withGuide ?? h.withGuide ? `${e("gray", lt)}  ` : "";
  s.write(`${r}${t}
`);
};
var jt = { light: w2("\u2500", "-"), heavy: w2("\u2501", "="), block: w2("\u2588", "#") };
var Nt = `${e("gray", $)}  `;
var Pe = (t) => new ht({ validate: t.validate, placeholder: t.placeholder, defaultValue: t.defaultValue, initialValue: t.initialValue, output: t.output, signal: t.signal, input: t.input, render() {
  const i = t?.withGuide ?? h.withGuide, s = `${`${i ? `${e("gray", $)}
` : ""}${P(this.state)}  `}${t.message}
`, r = t.placeholder ? e("inverse", t.placeholder[0]) + e("dim", t.placeholder.slice(1)) : e(["inverse", "hidden"], "_"), u = this.userInput ? this.userInputWithCursor : r, n = this.value ?? "";
  switch (this.state) {
    case "error": {
      const a = this.error ? `  ${e("yellow", this.error)}` : "", c = i ? `${e("yellow", $)}  ` : "", o = i ? e("yellow", x2) : "";
      return `${s.trim()}
${c}${u}
${o}${a}
`;
    }
    case "submit": {
      const a = n ? `  ${e("dim", n)}` : "", c = i ? e("gray", $) : "";
      return `${s}${c}${a}`;
    }
    case "cancel": {
      const a = n ? `  ${e(["strikethrough", "dim"], n)}` : "", c = i ? e("gray", $) : "";
      return `${s}${c}${a}${n.trim() ? `
${c}` : ""}`;
    }
    default: {
      const a = i ? `${e("cyan", $)}  ` : "", c = i ? e("cyan", x2) : "";
      return `${s}${a}${u}
${c}
`;
    }
  }
} }).prompt();

// src/ClackRenderer.ts
import { styleText } from "node:util";
var ClackRenderer = class {
  /**
   * Creates a new ClackRenderer and immediately displays the intro label.
   */
  constructor(introLabel) {
    ge(styleText("inverse", introLabel));
  }
  /**
   * Renders a question to the terminal and returns the user's answer.
   */
  async render(question) {
    let value;
    try {
      value = await this.#promptForQuestion(question);
    } catch (err) {
      me(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
    if (q(value)) {
      me(this.onCancel());
      process.exit(0);
    }
    return { questionId: question.id, value };
  }
  /**
   * Returns the message displayed when the user cancels the prompt session.
   */
  onCancel() {
    return "Operation cancelled.";
  }
  /**
   * Maps a question's type to its corresponding Clack prompt and invokes it.
   */
  async #promptForQuestion(question) {
    const promptMap = {
      text: (q2) => Pe({ message: q2.text })
    };
    const prompt = promptMap[question.type];
    if (!prompt) {
      throw new Error(`Unsupported question type: "${question.type}"`);
    }
    return prompt(question);
  }
};

// src/FlagParser.ts
import { parseArgs } from "node:util";
var FlagParser = class {
  #flags;
  /**
   * Creates a new FlagParser with the given flag definitions.
   *
   * @param flags - A map of flag names to their type and default value.
   */
  constructor(flags) {
    this.#flags = flags;
  }
  /**
   * Parses the provided argument list and returns the resolved flag values.
   *
   * @param args - The raw argument list to parse (e.g. `process.argv.slice(2)`).
   */
  parse(args) {
    const options = {};
    const definedNames = Object.keys(this.#flags);
    for (const [name, config] of Object.entries(this.#flags)) {
      options[name] = { type: config.type, default: config.default };
    }
    const { values } = parseArgs({
      args,
      options,
      allowPositionals: true,
      strict: false
    });
    const result = {};
    for (const name of definedNames) {
      result[name] = values[name] ?? this.#flags[name].default;
    }
    return result;
  }
};

// src/Orchestrator.ts
var Orchestrator = class {
  #repository;
  #renderer;
  /**
   * Creates a new Orchestrator with the given repository and renderer.
   */
  constructor(repository, renderer) {
    this.#repository = repository;
    this.#renderer = renderer;
  }
  /**
   * Iterates all questions in the repository, renders each one, and returns the collected answers.
   */
  async run() {
    const answers = [];
    let index = 0;
    while (true) {
      const question = this.#repository.getByIndex(index);
      if (question === null) break;
      const answer = await this.#renderer.render(question);
      answers.push(answer);
      index++;
    }
    return answers;
  }
};

// src/QuestionRepository.ts
var QuestionRepository = class {
  #questions;
  /**
   * Creates a new QuestionRepository with the given questions.
   */
  constructor(questions) {
    this.#questions = [...questions];
  }
  /**
   * Returns the question at the given index, or null if the index is out of bounds.
   */
  getByIndex(index) {
    return this.#questions[index] ?? null;
  }
};

// src/index.ts
var flagParser = new FlagParser({
  verify: { type: "boolean", default: false }
});
var licenseQuestion = {
  id: "license",
  text: "License?",
  type: "text"
};
var LicenseWizard = class {
  #orchestrator;
  /**
   * Creates a new LicenseWizard instance and parses the provided CLI arguments.
   *
   * @param args - The raw argument list (e.g. `process.argv.slice(2)`).
   */
  constructor(args) {
    flagParser.parse(args);
    const renderer = new ClackRenderer("license-wizard");
    const repository = new QuestionRepository([licenseQuestion]);
    this.#orchestrator = new Orchestrator(repository, renderer);
  }
  /**
   * Runs the interactive wizard and returns the collected answers.
   */
  async run() {
    return this.#orchestrator.run();
  }
};
export {
  LicenseWizard
};
