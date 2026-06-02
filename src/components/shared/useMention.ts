/* === useMention — Shared @mention hook for all prompt nodes === */
import { useState, useCallback } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';

export interface MentionItem {
  name: string;
  url: string;
}

export function useMention(refUrls?: string[], styleImageUrl?: string | null) {
  const [showMention, setShowMention] = useState(false);
  const [mentionList, setMentionList] = useState<MentionItem[]>([]);
  const [mentionInsertPos, setMentionInsertPos] = useState(0);

  const getMentionList = useCallback((): MentionItem[] => {
    const list: MentionItem[] = [];
    if (refUrls && refUrls.length > 0) {
      const store = useCanvasStore.getState();
      refUrls.forEach(url => {
        store.nodes.forEach(node => {
          const imgUrl = (node.meta?.gen as any)?.imageUrl;
          if (imgUrl === url && !list.find(m => m.url === url)) {
            list.push({ name: node.title || 'IMAGE', url });
          }
        });
      });
    }
    if (styleImageUrl) list.push({ name: '风格参考', url: styleImageUrl });
    return list;
  }, [refUrls, styleImageUrl]);

  const detectMention = useCallback((value: string, cursorPos: number) => {
    const textBefore = value.slice(0, cursorPos);
    const atIdx = textBefore.lastIndexOf('@');
    if (atIdx >= 0) {
      const afterAt = textBefore.slice(atIdx + 1);
      if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
        const list = getMentionList();
        console.log('[Mention] @ detected, refUrls:', refUrls?.length, 'list:', list.length);
        setMentionInsertPos(atIdx);
        setShowMention(true);
        setMentionList(list);
        return;
      }
    }
    setShowMention(false);
  }, [getMentionList, refUrls]);

  const insertMention = useCallback((item: MentionItem, currentValue: string): string => {
    const before = currentValue.slice(0, mentionInsertPos);
    const afterAt = currentValue.slice(mentionInsertPos);
    const afterText = afterAt.includes(' ') ? afterAt.slice(afterAt.indexOf(' ')) : '';
    return before + '@' + item.name + ' ' + afterText.trimStart();
  }, [mentionInsertPos]);

  return {
    showMention,
    setShowMention,
    mentionList,
    detectMention,
    insertMention,
  };
}
