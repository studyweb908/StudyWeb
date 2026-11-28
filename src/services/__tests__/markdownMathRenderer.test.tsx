import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MarkdownMathRenderer from '../../components/Dashboard/MarkdownMathRenderer';
import { normalizeStudyMarkdownMath } from '../../utils/markdownMathNormalize';

console.log('==========================================================');
console.log('STUDYWEB — MARKDOWN, LATEX & CHEMISTRY RENDERER TEST SUITE');
console.log('==========================================================\n');

const tests: Array<{ name: string; fn: () => void }> = [];
function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

test('1. Headings (#, ##, ###, ####) render as semantic HTML headings without raw # symbols', () => {
  const md = '# Main Title\n## Section\n### Subsection\n#### Detail';
  const html = renderToStaticMarkup(<MarkdownMathRenderer content={md} />);
  assert.ok(html.includes('<h1'), 'Expected <h1>');
  assert.ok(html.includes('<h2'), 'Expected <h2>');
  assert.ok(html.includes('<h3'), 'Expected <h3>');
  assert.ok(html.includes('<h4'), 'Expected <h4>');
  assert.ok(!html.includes('### Subsection'), 'Raw ### should not remain in HTML');
});

test('2. Bold, italic, lists, blockquotes, and GFM tables render properly', () => {
  const md = [
    '**Important Law:** *Energy is conserved.*',
    '',
    '- Point A',
    '- Point B',
    '',
    '1. Step One',
    '2. Step Two',
    '',
    '> Key Exam Tip: Always check SI units.',
    '',
    '| Quantity | Symbol | Unit |',
    '| :--- | :---: | ---: |',
    '| Force | $F$ | $\\text{N}$ |',
    '| Energy | $E$ | $\\text{J}$ |'
  ].join('\n');

  const html = renderToStaticMarkup(<MarkdownMathRenderer content={md} />);
  assert.ok(html.includes('<strong'), 'Expected <strong> for bold text');
  assert.ok(html.includes('<em'), 'Expected <em> for italic text');
  assert.ok(html.includes('<ul'), 'Expected <ul>');
  assert.ok(html.includes('<ol'), 'Expected <ol>');
  assert.ok(html.includes('<blockquote'), 'Expected <blockquote>');
  assert.ok(html.includes('<table'), 'Expected <table>');
  assert.ok(html.includes('<th'), 'Expected <th>');
  assert.ok(html.includes('<td'), 'Expected <td>');
  assert.ok(!html.includes('**Important Law:**'), 'Raw ** should not remain');
});

test('3. Inline and block LaTeX equations ($...$, $$...$$, \\(...\\), \\[...\\]) render with KaTeX', () => {
  const md = [
    'Water is $H_2O$ and kinetic energy is $K = \\frac{1}{2}mv^2$.',
    '',
    'Also via \\(a^2 + b^2 = c^2\\).',
    '',
    '\\[',
    'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    '\\]'
  ].join('\n');

  const html = renderToStaticMarkup(<MarkdownMathRenderer content={md} />);
  assert.ok(html.includes('class="katex"'), 'Expected KaTeX inline output');
  assert.ok(html.includes('class="katex-display"'), 'Expected KaTeX display block output');
  assert.ok(!html.includes('\\frac{1}{2}'), 'Raw \\frac should not appear outside mathml annotation');
  assert.ok(!html.includes('\\['), 'Raw \\[ delimiter should not appear');
});

test('4. Chemical formulas & reactions (mhchem \\ce, subscripts, superscripts, arrows) render cleanly', () => {
  const md = [
    'Combustion: $\\ce{2H2 + O2 -> 2H2O}$',
    '',
    'Bare mhchem: \\ce{Fe^{2+} + 2OH^- -> Fe(OH)2 v}',
    '',
    'Equilibrium: $$\\ce{N2(g) + 3H2(g) <=> 2NH3(g)}$$'
  ].join('\n');

  const html = renderToStaticMarkup(<MarkdownMathRenderer content={md} />);
  assert.ok(html.includes('class="katex"'), 'Expected KaTeX output for chemical formulas');
  assert.ok(html.includes('class="katex-display"'), 'Expected display block for equilibrium');
  assert.ok(!html.includes('katex-error'), `Did not expect KaTeX error in chemical equations: ${html}`);
});

test('5. Fenced code blocks & inline code remain code blocks and are NOT interpreted as LaTeX', () => {
  const md = [
    'Use `$H_2O$` inline literally.',
    '',
    '```python',
    'formula = "$\\\\frac{1}{2} * m * v^2$"',
    'water = "$H_2O$"',
    'print(formula, water)',
    '```'
  ].join('\n');

  const html = renderToStaticMarkup(<MarkdownMathRenderer content={md} />);
  assert.ok(html.includes('<pre'), 'Expected <pre> code block');
  assert.ok(html.includes('$H_2O$'), 'Code block/inline code must preserve literal $H_2O$');
  assert.ok(!html.includes('class="katex"'), 'Code blocks must NOT render KaTeX math');
});

test('6. Streaming incomplete LaTeX and malformed LaTeX degrade gracefully without throwing', () => {
  const streamingIncomplete = '### Step 1\nSolving: $$\n\\frac{1}{2';
  const normalized = normalizeStudyMarkdownMath(streamingIncomplete, true);
  assert.ok(normalized.endsWith('$$'), 'Unclosed streaming block math should be safely closed');

  const streamingHtml = renderToStaticMarkup(<MarkdownMathRenderer content={streamingIncomplete} isStreaming />);
  assert.ok(streamingHtml.includes('Step 1'), 'Surrounding content should render during streaming');
  assert.ok(streamingHtml.includes('Streaming response'), 'Expected streaming indicator');

  const malformed = 'Here is broken LaTeX: $\\frac{1}{ and normal **bold text**.';
  const malformedHtml = renderToStaticMarkup(<MarkdownMathRenderer content={malformed} />);
  assert.ok(malformedHtml.includes('<strong'), 'Bold text after malformed LaTeX must still render');
  assert.ok(malformedHtml.includes('Here is broken LaTeX'), 'Text before malformed LaTeX must still render');
});

test('7. Untrusted raw HTML and scripts are blocked and never executed', () => {
  const malicious = 'Hello <script>window.__xss=1</script><img src="x" onerror="alert(1)" /> **Safe**';
  const html = renderToStaticMarkup(<MarkdownMathRenderer content={malicious} />);
  assert.ok(!html.includes('<script'), 'Script tag must not be emitted');
  assert.ok(!html.includes('<img'), 'Raw HTML img tag must not be emitted');
  assert.ok(!html.includes('onerror='), 'Event handler attribute must not be emitted');
  assert.ok(html.includes('<strong>Safe</strong>') || html.includes('Safe</strong>'), 'Safe Markdown still renders');
});

test('8. Currency amounts ($5 and $10) stay plain text rather than broken math', () => {
  const md = 'The notebook costs $5 and the textbook costs $10.';
  const html = renderToStaticMarkup(<MarkdownMathRenderer content={md} />);
  assert.ok(html.includes('$5 and the textbook costs $10.'), 'Currency amounts should stay intact');
});

let passed = 0;
for (const t of tests) {
  try {
    t.fn();
    console.log(`✅ PASS: ${t.name}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ FAIL: ${t.name} -> ${err?.message || err}`);
    process.exitCode = 1;
  }
}

console.log(`\nResult: ${passed}/${tests.length} tests passed.`);
