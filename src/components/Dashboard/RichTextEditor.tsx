import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Highlighter, 
  Eraser,
  Image,
  Upload,
  Link,
  Sparkles,
  X,
  Code,
  PenTool
} from 'lucide-react';

interface RichTextEditorProps {
  initialValue: string;
  onChange: (val: string) => void;
  noteId: string;
  placeholder?: string;
}

export default function RichTextEditor({ initialValue, onChange, noteId, placeholder = "Start drafting your study note here..." }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    heading1: false,
    heading2: false,
    bulletList: false,
    orderedList: false,
    code: false,
    handwritten: false,
  });

  const [floatingToolbar, setFloatingToolbar] = useState<{
    show: boolean;
    top: number;
    left: number;
  }>({ show: false, top: 0, left: 0 });

  const [showImageMenu, setShowImageMenu] = useState(false);
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Sync state initially and on note change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialValue || '';
    }
    setFloatingToolbar({ show: false, top: 0, left: 0 });
  }, [noteId]);

  // Sync changes from outside when NOT active/typing (e.g., AI Summarize triggers)
  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = initialValue || '';
    }
  }, [initialValue]);

  // Handle selection updates to position floating toolbar
  const updateFloatingToolbar = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !editorRef.current || !containerRef.current) {
      setFloatingToolbar(prev => ({ ...prev, show: false }));
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      
      // Ensure the selection range is within the editor content
      if (!editorRef.current.contains(range.commonAncestorContainer)) {
        setFloatingToolbar(prev => ({ ...prev, show: false }));
        return;
      }

      // Ignore empty selection spaces
      if (selection.toString().trim() === '') {
        setFloatingToolbar(prev => ({ ...prev, show: false }));
        return;
      }

      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      // Center horizontally and offset vertically above selection
      const top = rect.top - containerRect.top - 50; 
      const left = rect.left - containerRect.left + (rect.width / 2);

      setFloatingToolbar({
        show: true,
        top: Math.max(8, top), // clamp to stay visible
        left: left
      });
    } catch (e) {
      setFloatingToolbar(prev => ({ ...prev, show: false }));
    }
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      setTimeout(updateFloatingToolbar, 10);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // Handle typing inside editor
  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      checkActiveFormats();
    }
  };

  // Check which formatting states are active at current caret position
  const checkActiveFormats = () => {
    let isCode = false;
    let isHandwritten = false;
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current) {
      let node = selection.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeName === 'CODE' || node.nodeName === 'PRE') {
          isCode = true;
        }
        if (node.nodeName === 'SPAN' && (node as HTMLElement).style?.fontFamily?.includes('Caveat')) {
          isHandwritten = true;
        }
        if (node.nodeName === 'SPAN' && (node as HTMLElement).classList?.contains('handwritten')) {
            isHandwritten = true;
        }
        node = node.parentNode;
      }
    }

    const formatBlockVal = (document.queryCommandValue('formatBlock') || '').toLowerCase();
    const isH1 = formatBlockVal === 'h1' || formatBlockVal === 'heading 1';
    const isH2 = formatBlockVal === 'h2' || formatBlockVal === 'heading 2';

    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      heading1: isH1,
      heading2: isH2,
      bulletList: document.queryCommandState('insertUnorderedList'),
      orderedList: document.queryCommandState('insertOrderedList'),
      code: isCode,
      handwritten: isHandwritten
    });
  };

  // Run document formatting command
  const executeCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  const toggleFormat = (tagName: string, className?: string, style?: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    let node = selection.anchorNode;
    let hasFormat = false;
    let formatNode = null;
    while (node && node !== editorRef.current) {
      if (node.nodeName === tagName.toUpperCase()) {
         if (!className || (node as HTMLElement).classList.contains(className)) {
             hasFormat = true;
             formatNode = node;
             break;
         }
      }
      node = node.parentNode;
    }

    if (hasFormat) {
       // Ideally we unwrap, but execCommand removeFormat works on selections
       document.execCommand('removeFormat');
    } else {
       const text = selection.toString();
       let html = `<${tagName}`;
       if (className) html += ` class="${className}"`;
       if (style) html += ` style="${style}"`;
       html += `>${text}</${tagName}>`;
       document.execCommand('insertHTML', false, html);
    }
  };

  const toggleCode = () => toggleFormat('code', 'rich-code');
  const toggleHandwritten = () => toggleFormat('span', 'handwritten', "font-family: 'Caveat', cursive;");

  const toggleHeading = (headingTag: 'h1' | 'h2') => {
    const currentBlock = (document.queryCommandValue('formatBlock') || '').toLowerCase();
    const isCurrentlyTarget = currentBlock === headingTag || currentBlock === `heading ${headingTag.slice(1)}`;
    if (isCurrentlyTarget) {
      executeCommand('formatBlock', '<p>');
    } else {
      executeCommand('formatBlock', `<${headingTag}>`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          if (editorRef.current) {
            editorRef.current.focus();
          }
          executeCommand('insertImage', result);
          setShowImageMenu(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          if (editorRef.current) {
            editorRef.current.focus();
          }
          executeCommand('insertImage', result);
          setShowImageMenu(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (imageUrl.trim()) {
      if (editorRef.current) {
        editorRef.current.focus();
      }
      executeCommand('insertImage', imageUrl.trim());
      setImageUrl('');
      setShowImageMenu(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex flex-col h-full border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-950/20">
      {/* Floating Rich Text Toolbar */}
      <AnimatePresence>
        {floatingToolbar.show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, y: 8, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{ 
              position: 'absolute',
              top: `${floatingToolbar.top}px`, 
              left: `${floatingToolbar.left}px` 
            }}
            className="absolute z-50 flex items-center gap-1 p-1 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-sm border border-slate-800 dark:border-slate-800/80 rounded-xl shadow-xl text-white select-none pointer-events-auto"
          >
            {/* Bold */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('bold');
              }}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                activeFormats.bold 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            {/* Italic */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('italic');
              }}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                activeFormats.italic 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            {/* Code */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                toggleCode();
              }}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                activeFormats.code 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Code Snippet"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            {/* Handwritten */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                toggleHandwritten();
              }}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                activeFormats.handwritten 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Handwritten Note"
            >
              <PenTool className="w-3.5 h-3.5" />
            </button>

            {/* Heading 2 */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                toggleHeading('h2');
              }}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                activeFormats.heading2 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Heading 2"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>

            {/* Bullet List */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('insertUnorderedList');
              }}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                activeFormats.bulletList 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Bullet List"
            >
              <List className="w-3.5 h-3.5" />
            </button>

            {/* Highlight */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                const hasHighlight = document.queryCommandValue('hiliteColor');
                if (hasHighlight && hasHighlight !== 'transparent' && hasHighlight !== 'rgba(0, 0, 0, 0)') {
                  executeCommand('hiliteColor', 'transparent');
                } else {
                  executeCommand('hiliteColor', '#fef08a');
                }
              }}
              className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg cursor-pointer transition-colors"
              title="Highlight Text"
            >
              <Highlighter className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

            {/* Clear Formatting */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('removeFormat');
                executeCommand('formatBlock', '<p>');
              }}
              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors"
              title="Clear Formatting"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rich Text Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 select-none rounded-t-xl">
        {/* Bold */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('bold');
          }}
          className={`p-2 rounded-lg cursor-pointer transition-colors ${
            activeFormats.bold 
              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold' 
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        {/* Italic */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('italic');
          }}
          className={`p-2 rounded-lg cursor-pointer transition-colors ${
            activeFormats.italic 
              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 italic' 
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        {/* Code */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            toggleCode();
          }}
          className={`p-2 rounded-lg cursor-pointer transition-colors ${
            activeFormats.code 
              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Code Block"
        >
          <Code className="w-4 h-4" />
        </button>
        {/* Handwritten */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            toggleHandwritten();
          }}
          className={`p-2 rounded-lg cursor-pointer transition-colors ${
            activeFormats.handwritten 
              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Handwritten Note"
        >
          <PenTool className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Heading 1 */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            toggleHeading('h1');
          }}
          className={`p-2 rounded-lg cursor-pointer transition-colors ${
            activeFormats.heading1 
              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black' 
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>

        {/* Heading 2 */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            toggleHeading('h2');
          }}
          className={`p-2 rounded-lg cursor-pointer transition-colors ${
            activeFormats.heading2 
              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold' 
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Bullet List */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('insertUnorderedList');
          }}
          className={`p-2 rounded-lg cursor-pointer transition-colors ${
            activeFormats.bulletList 
              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>

        {/* Ordered List */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('insertOrderedList');
          }}
          className={`p-2 rounded-lg cursor-pointer transition-colors ${
            activeFormats.orderedList 
              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Yellow Highlight */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            const hasHighlight = document.queryCommandValue('hiliteColor');
            // Toggle highlight
            if (hasHighlight && hasHighlight !== 'transparent' && hasHighlight !== 'rgba(0, 0, 0, 0)') {
              executeCommand('hiliteColor', 'transparent');
            } else {
              executeCommand('hiliteColor', '#fef08a'); // soft yellow highlight
            }
          }}
          className="p-2 text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 rounded-lg cursor-pointer transition-colors"
          title="Highlight Text"
        >
          <Highlighter className="w-4 h-4" />
        </button>

        {/* Image insertion */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setShowImageMenu(!showImageMenu);
          }}
          className={`p-2 rounded-lg cursor-pointer transition-colors ${
            showImageMenu
              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Insert Image"
        >
          <Image className="w-4 h-4" />
        </button>

        {/* Reset / Clear Format */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('removeFormat');
            executeCommand('formatBlock', '<p>');
          }}
          className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors ml-auto"
          title="Clear Formatting"
        >
          <Eraser className="w-4 h-4" />
        </button>
      </div>

      {/* Image Insert Popover/Modal */}
      <AnimatePresence>
        {showImageMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute top-14 right-4 z-40 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 text-left"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-3">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-indigo-500" />
                Insert Image Asset
              </span>
              <button 
                type="button"
                onClick={() => setShowImageMenu(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-center focus:outline-none"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100/80 dark:bg-slate-950/40 p-1 rounded-xl mb-4 text-xs">
              <button
                type="button"
                onClick={() => setImageTab('upload')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  imageTab === 'upload'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setImageTab('url')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  imageTab === 'url'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                Web Address (URL)
              </button>
            </div>

            {/* Tab: Upload */}
            {imageTab === 'upload' && (
              <div className="space-y-3">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-2 ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-500/5'
                      : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="w-9 h-9 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                    <Upload className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Drag & drop image here</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">or click to browse from device</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: URL */}
            {imageTab === 'url' && (
              <form onSubmit={handleImageUrlSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Image Address</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/diagram.png"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-950/40 px-3 py-2 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 border border-slate-200/60 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-medium"
                      required
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition-all cursor-pointer shrink-0"
                    >
                      Insert
                    </button>
                  </div>
                </div>

                {/* Study Presets */}
                <div className="space-y-1.5 pt-1.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Generated & Study-Aesthetic Presets
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { name: '🧬 DNA Double Helix', url: 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=600&auto=format&fit=crop&q=60' },
                      { name: '📐 Math Equations', url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=60' },
                      { name: '🧪 Chemistry Flask', url: 'https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?w=600&auto=format&fit=crop&q=60' },
                      { name: '📖 Brain Mapping', url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&auto=format&fit=crop&q=60' }
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          if (editorRef.current) {
                            editorRef.current.focus();
                          }
                          executeCommand('insertImage', preset.url);
                          setShowImageMenu(false);
                        }}
                        className="text-[10px] text-left px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:border-indigo-300 dark:hover:border-indigo-900/60 hover:bg-indigo-50/10 text-slate-600 dark:text-slate-300 font-bold transition-all truncate cursor-pointer"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Content Area */}
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyUp={checkActiveFormats}
        onMouseUp={checkActiveFormats}
        onFocus={checkActiveFormats}
        placeholder={placeholder}
        className="rich-editor-content flex-1 w-full text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900/50 p-4 leading-relaxed focus:outline-none overflow-y-auto custom-scrollbar text-left min-h-[250px] rounded-b-xl"
      />
    </div>
  );
}
