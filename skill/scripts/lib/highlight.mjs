// Syntax highlighter for makeCodeBlock
// Supports: JavaScript/TypeScript (default), Python (lang: "py"/"python")
// Returns: { text, type, line, col }[] — adjacent same-type tokens pre-merged

const _JS_KEYWORDS = new Set([
  'abstract','await','boolean','break','case','catch','class','const',
  'continue','debugger','default','delete','do','else','enum','eval',
  'export','extends','false','finally','for','function','if','implements',
  'import','in','instanceof','interface','let','new','null','of','package',
  'private','protected','public','return','static','super','switch','this',
  'throw','true','try','typeof','undefined','var','void','while','with',
  'yield','from','as','async','get','set','type','declare','namespace','require',
]);

const _PY_KEYWORDS = new Set([
  'False','None','True','and','as','assert','async','await','break','class',
  'continue','def','del','elif','else','except','finally','for','from',
  'global','if','import','in','is','lambda','nonlocal','not','or','pass',
  'raise','return','try','while','with','yield','self','cls',
]);

export function tokenize(code, lang) {
  const isPy     = lang === 'python' || lang === 'py';
  const keywords = isPy ? _PY_KEYWORDS : _JS_KEYWORDS;
  const tokens   = [];

  for (const [li, line] of code.split('\n').entries()) {
    let ci = 0;
    while (ci < line.length) {
      const ch = line[ci];

      // Comment
      if ((!isPy && ch === '/' && line[ci + 1] === '/') || (isPy && ch === '#')) {
        tokens.push({ text: line.slice(ci), type: 'comment', line: li, col: ci });
        break;
      }

      // String
      if (ch === '"' || ch === "'" || ch === '`') {
        let j = ci + 1;
        while (j < line.length && line[j] !== ch) { if (line[j] === '\\') j++; j++; }
        tokens.push({ text: line.slice(ci, j + 1), type: 'string', line: li, col: ci });
        ci = j + 1; continue;
      }

      // Number
      if (/[0-9]/.test(ch)) {
        let j = ci;
        while (j < line.length && /[0-9._xXbBoOeE]/.test(line[j])) j++;
        tokens.push({ text: line.slice(ci, j), type: 'number', line: li, col: ci });
        ci = j; continue;
      }

      // Word (keyword / function call / identifier)
      if (/[a-zA-Z_$]/.test(ch)) {
        let j = ci;
        while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
        const word = line.slice(ci, j);
        let m = j; while (m < line.length && line[m] === ' ') m++;
        const type = keywords.has(word) ? 'keyword'
          : line[m] === '(' ? 'function'
          : 'identifier';
        tokens.push({ text: word, type, line: li, col: ci });
        ci = j; continue;
      }

      // Punctuation / operators
      if (/[{}()[\].,;:=<>!+\-*/%&|^~?@]/.test(ch)) {
        tokens.push({ text: ch, type: 'punct', line: li, col: ci });
        ci++; continue;
      }

      ci++; // whitespace — advance only
    }
  }

  // Merge adjacent same-type tokens on the same line
  const merged = [];
  let cur = null;
  for (const tok of tokens) {
    if (cur && cur.type === tok.type && cur.line === tok.line
        && cur.col + cur.text.length === tok.col) {
      cur = { ...cur, text: cur.text + tok.text };
    } else {
      if (cur) merged.push(cur);
      cur = { ...tok };
    }
  }
  if (cur) merged.push(cur);
  return merged;
}

// Default token color palette
// Override per-token via makeCodeBlock's hlColors param
export const HL_COLORS = {
  keyword:    "#c084fc",  // violet
  string:     "#4ade80",  // green
  comment:    "#6b7280",  // gray
  number:     "#fb923c",  // orange
  function:   "#60a5fa",  // blue
  identifier: "#e2e8f0",  // default white
  punct:      "#94a3b8",  // dim blue-gray
};
