/* === PromptInput — Rich prompt with inline @mention thumbnails === */
import { forwardRef, useImperativeHandle, useRef, useState, useCallback, type KeyboardEvent, type ClipboardEvent } from 'react';

export interface RefItem {
  name: string;
  url: string;
}

export interface PromptInputHandle {
  insertRef: (item: RefItem) => void;
  getEditor: () => HTMLDivElement | null;
}

interface PromptInputProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  expanded?: boolean;
  pickedRefs: RefItem[];
  onPickedRefsChange: (refs: RefItem[]) => void;
  onSubmit?: () => void;
  onMentionOpen?: () => void;
}

export const PromptInput = forwardRef<PromptInputHandle, PromptInputProps>(
  function PromptInput({ value, onChange, placeholder = '', expanded = false, pickedRefs, onPickedRefsChange, onSubmit, onMentionOpen }, ref) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isEmpty, setIsEmpty] = useState(!value);
    const savedRangeRef = useRef<Range | null>(null);

    const extractText = useCallback(() => {
      const el = editorRef.current;
      if (!el) return '';
      let text = '';
      el.childNodes.forEach(n => {
        if (n.nodeType === Node.TEXT_NODE) text += n.textContent || '';
        else if (n.nodeType === Node.ELEMENT_NODE) {
          (n as HTMLElement).querySelectorAll('img').forEach(img => text += img.alt || '');
        }
      });
      return text;
    }, []);

    const insertRef = useCallback((item: RefItem) => {
      const el = editorRef.current;
      if (!el) return;
      const saved = savedRangeRef.current;
      if (!saved) return;
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(saved);
      const node = saved.startContainer;
      const off = saved.startOffset;
      const tc = node.textContent || '';
      const atIdx = tc.lastIndexOf('@', off - 1);
      if (atIdx >= 0) {
        node.textContent = tc.slice(0, atIdx) + tc.slice(off);
        saved.setStart(node, atIdx);
        saved.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(saved);
      }
      const span = document.createElement('span');
      span.contentEditable = 'false';
      span.style.cssText = 'display:inline-flex;align-items:center;gap:2px;background:rgba(255,255,255,0.08);border-radius:6px;padding:1px 6px 1px 2px;height:26px;vertical-align:middle;margin:0 2px;cursor:default;user-select:none';
      const img = document.createElement('img');
      img.src = item.url;
      img.alt = `[图:${item.name}]`;
      img.style.cssText = 'width:20px;height:20px;border-radius:3px;object-fit:cover;vertical-align:middle';
      span.appendChild(img);
      saved.insertNode(span);
      saved.setStartAfter(span);
      saved.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(saved);
      const newRefs = pickedRefs.find(r => r.url === item.url) ? pickedRefs : [...pickedRefs, item];
      onPickedRefsChange(newRefs);
      onChange(extractText());
      el.focus();
    }, [pickedRefs, onPickedRefsChange, onChange, extractText]);

    useImperativeHandle(ref, () => ({
      insertRef,
      getEditor: () => editorRef.current,
    }));

    const handleInput = useCallback(() => {
      const text = extractText();
      onChange(text);
      setIsEmpty(!text);
      const sel = window.getSelection();
      console.log('[PromptInput] onInput fired, text:', text.slice(0,50), 'sel:', !!sel);
      if (!sel?.rangeCount || !sel.anchorNode) return;
      const node = sel.anchorNode;
      const offset = sel.anchorOffset;
      const tc = node.textContent || '';
      const tb = tc.slice(0, offset);
      const atIdx = tb.lastIndexOf('@');
      console.log('[PromptInput] @ detection: atIdx=', atIdx, 'tb=', tb.slice(-10));
      if (atIdx >= 0) {
        const afterAt = tb.slice(atIdx + 1);
        if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
          savedRangeRef.current = sel.getRangeAt(0).cloneRange();
          console.log('[PromptInput] Firing onMentionOpen');
          onMentionOpen?.();
        }
      }
    }, [extractText, onChange, onMentionOpen]);

    const handlePaste = useCallback((e: ClipboardEvent) => {
      e.preventDefault();
      const t = e.clipboardData?.getData('text/plain') || '';
      document.execCommand('insertText', false, t);
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSubmit?.();
      }
    }, [onSubmit]);

    return (
      <div style={{ position: 'relative' }}>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          style={{
            width: '100%', minHeight: expanded ? '280px' : '80px',
            background: 'transparent', border: 'none',
            borderRadius: 'var(--tap-r-xl) var(--tap-r-xl) 0 0',
            padding: '12px 14px', paddingRight: '40px',
            fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-1)',
            outline: 'none', lineHeight: '26px',
            wordBreak: 'break-word', whiteSpace: 'pre-wrap', cursor: 'text',
          }}
          data-empty={isEmpty}
        />
        {isEmpty && (
          <div style={{
            position: 'absolute', top: 12, left: 14,
            color: 'var(--tap-text-4)', fontSize: 'var(--tap-fs-body)',
            pointerEvents: 'none', userSelect: 'none',
          }}>{placeholder}</div>
        )}
      </div>
    );
  }
);
