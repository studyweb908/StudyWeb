const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/AITutorWorkspace.tsx', 'utf8');

const targetStr = `                  <div className="space-y-4 whitespace-pre-wrap">
                    {msg.text.split('\\n\\n').map((paragraph, idx) => {
                      if (paragraph.startsWith('###')) {
                        return <h4 key={idx} className="font-bold text-slate-900 dark:text-white pt-2">{paragraph.replace('###', '').trim()}</h4>;
                      }
                      if (paragraph.startsWith('-')) {
                        return (
                          <ul key={idx} className="list-disc pl-5 space-y-2 marker:text-slate-400">
                            {paragraph.split('\\n').map((li, liIdx) => {
                              const cleanedLi = li.replace('-', '').trim();
                              return <li key={liIdx}>{parseTextWithHighlights(cleanedLi, msg.id, msg.citations, hoveredCitation, setHoveredCitation, setActiveCitation)}</li>;
                            })}
                          </ul>
                        );
                      }
                      if (paragraph.startsWith('$$')) {
                        return <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl font-mono text-[13px] overflow-x-auto text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/50">{paragraph.replace(/\\$\\$/g, '')}</div>;
                      }
                      return <p key={idx}>{parseTextWithHighlights(paragraph, msg.id, msg.citations, hoveredCitation, setHoveredCitation, setActiveCitation)}</p>;
                    })}
                  </div>`;

const replacement = `                  <div className="space-y-4 whitespace-pre-wrap">
                    {msg.text.split(/(?=\\n\\n###|\\n\\n\`\`\`|\\n\\n- )/g).map((block, idx) => {
                      const paragraph = block.trim();
                      if (!paragraph) return null;
                      
                      if (paragraph.startsWith('\`\`\`')) {
                        const lines = paragraph.split('\\n');
                        const lang = lines[0].replace('\`\`\`', '').trim();
                        const code = lines.slice(1, -1).join('\\n') || lines.slice(1).join('\\n').replace('\`\`\`', '');
                        return (
                          <div key={idx} className="bg-slate-900 dark:bg-slate-950 rounded-xl overflow-hidden my-3 shadow-sm">
                            {lang && (
                              <div className="flex items-center justify-between px-4 py-2 bg-slate-800 dark:bg-slate-900 border-b border-slate-700 dark:border-slate-800 text-xs font-mono text-slate-400">
                                <span>{lang}</span>
                                <CopySnippetButton text={code} />
                              </div>
                            )}
                            <div className="p-4 overflow-x-auto">
                              <pre className="font-mono text-[13px] text-slate-300 leading-relaxed"><code dangerouslySetInnerHTML={{ __html: code }} /></pre>
                            </div>
                          </div>
                        );
                      }
                      
                      if (paragraph.startsWith('###')) {
                        return <h4 key={idx} className="font-bold text-slate-900 dark:text-white pt-2 text-lg tracking-tight">{paragraph.replace(/^###\\s*/, '').trim()}</h4>;
                      }
                      
                      if (paragraph.startsWith('-')) {
                        return (
                          <ul key={idx} className="list-disc pl-5 space-y-2 marker:text-indigo-400">
                            {paragraph.split('\\n').map((li, liIdx) => {
                              const cleanedLi = li.replace(/^-\\s*/, '').trim();
                              if (!cleanedLi) return null;
                              return <li key={liIdx}>{parseTextWithHighlights(cleanedLi, msg.id, msg.citations, hoveredCitation, setHoveredCitation, setActiveCitation)}</li>;
                            })}
                          </ul>
                        );
                      }
                      
                      if (paragraph.startsWith('$$')) {
                        return <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl font-mono text-[13px] overflow-x-auto text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/50 my-2">{paragraph.replace(/\\$\\$/g, '')}</div>;
                      }
                      
                      // Split by normal paragraphs
                      return (
                        <div key={idx} className="space-y-4">
                          {paragraph.split('\\n\\n').map((p, pIdx) => {
                             if (!p.trim()) return null;
                             return <p key={pIdx}>{parseTextWithHighlights(p, msg.id, msg.citations, hoveredCitation, setHoveredCitation, setActiveCitation)}</p>;
                          })}
                        </div>
                      );
                    })}
                  </div>`;

if (code.includes('msg.text.split(\'\\n\\n\').map((paragraph, idx) => {')) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/components/Dashboard/AITutorWorkspace.tsx', code);
  console.log('Patched chat parser');
} else {
  console.log('Could not find chat parser to patch');
}
