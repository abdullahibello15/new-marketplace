import { useEffect } from 'react';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string): () => void {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  const created = !el;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  const previous = el.content;
  el.content = content;
  return () => {
    if (created) el?.remove();else
    if (el) el.content = previous;
  };
}

/**
 * The page title, meta description and Open Graph title/description, in the current language. The
 * defaults for crawlers that don't run JavaScript are in index.html. Restored when the page unmounts.
 */
export function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    const restore = [
    setMeta('meta[name="description"]', 'name', 'description', description),
    setMeta('meta[property="og:title"]', 'property', 'og:title', title),
    setMeta('meta[property="og:description"]', 'property', 'og:description', description)];

    return () => {
      document.title = previousTitle;
      restore.forEach((r) => r());
    };
  }, [title, description]);
}
