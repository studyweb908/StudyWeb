import React, { useMemo, useState } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/contrib/mhchem';
import { Check, Copy } from 'lucide-react';
import { normalizeStudyMarkdownMath } from '../../utils/markdownMathNormalize';

interface MarkdownMathRendererProps {
  content: string;
  isStreaming?: boolean;
  /** 'default' adapts to light/dark app theme; 'dark' forces light-on-dark typography for dark overlays */
  tone?: 'default' | 'dark';
  className?: string;
}

class MarkdownRenderErrorBoundary extends React.Component<
  { fallbackText: string; isStreaming?: boolean; tone: 'default' | 'dark'; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallbackText: string; isStreaming?: boolean; tone: 'default' | 'dark'; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: { fallbackText: string }) {
    if (prevProps.fallbackText !== this.props.fallbackText && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <p
          className={`whitespace-pre-wrap text-sm leading-relaxed ${
            this.props.tone === 'dark' ? 'text-slate-200' : 'text-slate-800 dark:text-slate-200'
          }`}
        >
          {this.props.fallbackText}
          {this.props.isStreaming && (
            <span className="inline-block w-2 h-2 ml-1 align-middle rounded-full bg-indigo-500 animate-pulse" />
          )}
        </p>
      );
    }
    return this.props.children;
  }
}

const CodeBlockWithCopy: React.FC<{ language?: string; codeText: string }> = ({ language, codeText }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400">
        <span className="uppercase tracking-wider">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs sm:text-[13px] leading-relaxed font-mono m-0">
        <code>{codeText}</code>
      </pre>
    </div>
  );
};

export default function MarkdownMathRenderer({
  content,
  isStreaming = false,
  tone = 'default',
  className = ''
}: MarkdownMathRendererProps) {
  const processedContent = useMemo(
    () => normalizeStudyMarkdownMath(content, isStreaming),
    [content, isStreaming]
  );

  const isDarkTone = tone === 'dark';

  const components = useMemo<Components>(
    () => ({
      h1: ({ children }) => (
        <h1
          className={`text-lg sm:text-xl font-extrabold tracking-tight mt-4 mb-2 first:mt-0 ${
            isDarkTone ? 'text-white' : 'text-slate-900 dark:text-white'
          }`}
        >
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2
          className={`text-base sm:text-lg font-extrabold tracking-tight mt-3.5 mb-1.5 first:mt-0 ${
            isDarkTone ? 'text-white' : 'text-slate-900 dark:text-white'
          }`}
        >
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3
          className={`text-[15px] sm:text-base font-bold tracking-tight mt-3 mb-1.5 first:mt-0 ${
            isDarkTone ? 'text-white' : 'text-slate-900 dark:text-white'
          }`}
        >
          {children}
        </h3>
      ),
      h4: ({ children }) => (
        <h4
          className={`text-sm sm:text-[15px] font-bold mt-2.5 mb-1 first:mt-0 ${
            isDarkTone ? 'text-slate-100' : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          {children}
        </h4>
      ),
      h5: ({ children }) => (
        <h5
          className={`text-sm font-bold mt-2 mb-1 first:mt-0 ${
            isDarkTone ? 'text-slate-200' : 'text-slate-800 dark:text-slate-200'
          }`}
        >
          {children}
        </h5>
      ),
      h6: ({ children }) => (
        <h6
          className={`text-xs sm:text-sm font-bold uppercase tracking-wide mt-2 mb-1 first:mt-0 ${
            isDarkTone ? 'text-slate-300' : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          {children}
        </h6>
      ),
      p: ({ children }) => (
        <p className="my-2 first:mt-0 last:mb-0 leading-relaxed">{children}</p>
      ),
      strong: ({ children }) => (
        <strong className={`font-bold ${isDarkTone ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
          {children}
        </strong>
      ),
      em: ({ children }) => <em className="italic">{children}</em>,
      del: ({ children }) => <del className="line-through opacity-75">{children}</del>,
      ul: ({ children }) => (
        <ul className="my-2 pl-5 list-disc space-y-1.5 marker:text-indigo-500 dark:marker:text-indigo-400">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="my-2 pl-5 list-decimal space-y-1.5 marker:font-semibold marker:text-indigo-600 dark:marker:text-indigo-400">
          {children}
        </ol>
      ),
      li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
      blockquote: ({ children }) => (
        <blockquote
          className={`my-3 pl-3.5 pr-3 py-2 border-l-4 border-indigo-500 rounded-r-xl text-sm ${
            isDarkTone
              ? 'bg-indigo-950/40 text-slate-200'
              : 'bg-indigo-50/60 dark:bg-indigo-950/30 text-slate-700 dark:text-slate-200'
          }`}
        >
          {children}
        </blockquote>
      ),
      hr: () => (
        <hr
          className={`my-4 border-0 border-t ${
            isDarkTone ? 'border-slate-800' : 'border-slate-200 dark:border-slate-800'
          }`}
        />
      ),
      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 dark:text-indigo-400 font-semibold underline decoration-indigo-400/50 hover:decoration-indigo-500 underline-offset-2 transition-colors break-words"
        >
          {children}
        </a>
      ),
      table: ({ children }) => (
        <div
          className={`my-3 w-full overflow-x-auto rounded-xl border ${
            isDarkTone ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
          }`}
        >
          <table className="w-full border-collapse text-left text-xs sm:text-sm">{children}</table>
        </div>
      ),
      thead: ({ children }) => (
        <thead className={isDarkTone ? 'bg-slate-800/80 text-white' : 'bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white'}>
          {children}
        </thead>
      ),
      tbody: ({ children }) => (
        <tbody className={isDarkTone ? 'divide-y divide-slate-800' : 'divide-y divide-slate-200/80 dark:divide-slate-800'}>
          {children}
        </tbody>
      ),
      tr: ({ children }) => (
        <tr className={isDarkTone ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/35 transition-colors'}>
          {children}
        </tr>
      ),
      th: ({ children }) => (
        <th
          className={`px-3 py-2 font-bold border-b whitespace-nowrap ${
            isDarkTone ? 'border-slate-700' : 'border-slate-200 dark:border-slate-700'
          }`}
        >
          {children}
        </th>
      ),
      td: ({ children }) => <td className="px-3 py-2 align-top leading-relaxed">{children}</td>,
      pre: ({ children }) => {
        const childArray = React.Children.toArray(children);
        const firstChild = childArray[0] as React.ReactElement<{ className?: string; children?: React.ReactNode }> | undefined;
        const classStr = String(firstChild?.props?.className || '');
        const langMatch = classStr.match(/language-([a-zA-Z0-9_-]+)/);
        const rawCode = (
          Array.isArray(firstChild?.props?.children)
            ? firstChild.props.children.join('')
            : String(firstChild?.props?.children ?? '')
        ).replace(/\n$/, '');
        return <CodeBlockWithCopy language={langMatch?.[1]} codeText={rawCode} />;
      },
      code: ({ className: codeClassName, children }) => {
        const isLanguageBlock = Boolean(codeClassName && /language-/.test(codeClassName));
        if (isLanguageBlock) {
          return <code className={codeClassName}>{children}</code>;
        }
        return (
          <code
            className={`px-1.5 py-0.5 rounded-md font-mono text-[0.86em] break-words ${
              isDarkTone
                ? 'bg-slate-800 text-indigo-300'
                : 'bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300'
            }`}
          >
            {children}
          </code>
        );
      }
    }),
    [isDarkTone]
  );

  return (
    <div
      className={`studyweb-markdown text-sm sm:text-[15px] leading-relaxed min-w-0 max-w-full break-words ${
        isDarkTone ? 'text-slate-200' : 'text-slate-800 dark:text-slate-200'
      } ${className}`}
    >
      <MarkdownRenderErrorBoundary fallbackText={content} isStreaming={isStreaming} tone={tone}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[
            [
              rehypeKatex,
              {
                throwOnError: false,
                strict: false,
                errorColor: 'inherit',
                trust: false
              }
            ]
          ]}
          components={components}
        >
          {processedContent}
        </ReactMarkdown>
      </MarkdownRenderErrorBoundary>
      {isStreaming && (
        <span
          className="inline-block w-2 h-2 mt-1 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse align-middle"
          aria-label="Streaming response"
        />
      )}
    </div>
  );
}
