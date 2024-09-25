import { useRef, useEffect } from 'react';

export function useAutoScroll<T extends HTMLElement>(deps: any[] = []) {
  const ref = useRef<T>(null);

  const scrollToBottom = () => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, deps);

  return ref;
}