import { useRef, useEffect } from 'react';

export function useAutoScroll<T extends HTMLElement>(deps: any[] = []) {
  const ref = useRef<T>(null);

  const scrollToLastNonUserMessage = () => {
    if (ref.current) {
      const messages = ref.current.querySelectorAll('[data-message-type]');
      const lastNonUserMessage = Array.from(messages).reverse().find(
        (msg) => msg.getAttribute('data-message-type') !== 'user'
      );

      if (lastNonUserMessage) {
        lastNonUserMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  useEffect(() => {
    scrollToLastNonUserMessage();
  }, deps);

  return { ref, scrollToLastNonUserMessage };
}