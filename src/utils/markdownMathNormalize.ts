/**
 * Preprocessing utility for StudyWeb AI Markdown + LaTeX + Chemistry text.
 * Preserves fenced code blocks and inline code spans verbatim while normalizing
 * standard LaTeX delimiters (\[...\], \(...\), \ce{...}) and closing incomplete
 * math blocks cleanly during token-by-token streaming.
 */

const MATH_CONTENT_HINT =
  /(\\[a-zA-Z]+|[_^][{a-zA-Z0-9+-]|\\frac|\\sqrt|\\sum|\\int|\\ce\{|\\rightarrow|\\rightleftharpoons|\\leftrightarrow|=)/;

/**
 * Splits text into protected code segments (fenced ``` / ~~~ blocks and inline `code`)
 * and plain text/markdown segments so code blocks are never interpreted as math.
 */
function mapOutsideCode(text: string, transform: (segment: string) => string): string {
  // Match fenced code blocks (``` or ~~~) or inline code spans (`...`)
  const codePattern = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result += transform(text.slice(lastIndex, match.index));
    }
    result += match[0];
    lastIndex = codePattern.lastIndex;
  }

  // Handle an unclosed fenced code block while streaming at the tail of the message
  const tail = text.slice(lastIndex);
  const openFenceMatch = tail.match(/(^|\n)(```|~~~)/);
  if (openFenceMatch && openFenceMatch.index !== undefined) {
    const splitAt = openFenceMatch.index + openFenceMatch[1].length;
    if (splitAt > 0) {
      result += transform(tail.slice(0, splitAt));
    }
    result += tail.slice(splitAt);
  } else {
    result += transform(tail);
  }

  return result;
}

function normalizeMathSegment(segment: string, isStreaming: boolean): string {
  let out = segment;

  // 1. Convert \[ ... \] display math to $$ ... $$ blocks
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner: string) => {
    const trimmed = inner.trim();
    return trimmed ? `\n$$\n${trimmed}\n$$\n` : '';
  });

  // 2. Convert \( ... \) inline math to $...$
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner: string) => {
    const trimmed = inner.trim();
    return trimmed ? `$${trimmed}$` : '';
  });

  // 3. Convert bare \ce{...} not already inside $...$ into $\ce{...}$
  // First protect existing $...$ and $$...$$ spans temporarily
  const mathTokens: string[] = [];
  out = out.replace(/(\$\$[\s\S]*?\$\$|\$[^\n$]+?\$)/g, (m) => {
    const idx = mathTokens.length;
    mathTokens.push(m);
    return `\uE000MATH_${idx}\uE001`;
  });

  out = out.replace(/\\ce\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, (m) => {
    const idx = mathTokens.length;
    mathTokens.push(`$${m}$`);
    return `\uE000MATH_${idx}\uE001`;
  });

  out = out.replace(/\uE000MATH_(\d+)\uE001/g, (_m, i) => mathTokens[Number(i)] || '');

  // 4. Trim edge whitespace inside $ math $ when interior looks like LaTeX/chemistry
  // (avoids touching currency expressions like "$5 and $10")
  out = out.replace(/\$([^\n$]+?)\$/g, (full, inner: string) => {
    const trimmed = inner.trim();
    if (!trimmed) return full;
    if (inner !== trimmed && MATH_CONTENT_HINT.test(trimmed)) {
      return `$${trimmed}$`;
    }
    return full;
  });

  // 5. During streaming, close any trailing unclosed $$ or \[ display math block
  if (isStreaming) {
    // Handle unclosed \[ at tail
    const lastOpenBracket = out.lastIndexOf('\\[');
    if (lastOpenBracket !== -1 && out.indexOf('\\]', lastOpenBracket) === -1) {
      out = `${out.slice(0, lastOpenBracket)}\n$$\n${out.slice(lastOpenBracket + 2).trim()}\n$$`;
    }

    // Count $$ delimiters
    const blockMatches = out.match(/\$\$/g);
    if (blockMatches && blockMatches.length % 2 === 1) {
      out = `${out}\n$$`;
    }
  }

  return out;
}

export function normalizeStudyMarkdownMath(rawText: string, isStreaming = false): string {
  const normalizedNewlines = String(rawText || '').replace(/\r\n/g, '\n');
  if (!normalizedNewlines) return '';
  return mapOutsideCode(normalizedNewlines, (seg) => normalizeMathSegment(seg, isStreaming));
}
