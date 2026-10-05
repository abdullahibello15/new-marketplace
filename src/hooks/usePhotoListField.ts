import { useEffect, useRef, useState } from 'react';
import { checkFiles } from './usePhotoDraft';

/**
 * Photo picking for a form-controlled list of photo URLs. Uses the same JPG/PNG and 5 MB rules as
 * the rest of the app. Previews created here and never saved are freed on remove or unmount.
 */
export function usePhotoListField(value: string[], onChange: (next: string[]) => void, saved: string[], max: number) {
  const [problems, setProblems] = useState<string[]>([]);
  const created = useRef(new Set<string>());
  const savedRef = useRef(saved);
  savedRef.current = saved;

  useEffect(() => {
    const urls = created.current;
    return () => urls.forEach((url) => !savedRef.current.includes(url) && URL.revokeObjectURL(url));
  }, []);

  function addFiles(files: File[]) {
    const result = checkFiles(files, max - value.length, max);
    result.urls.forEach((url) => created.current.add(url));
    if (result.urls.length) onChange([...value, ...result.urls]);
    setProblems(result.problems);
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
    setProblems([]);
    if (created.current.has(url) && !saved.includes(url)) {
      URL.revokeObjectURL(url);
      created.current.delete(url);
    }
  }

  return { problems, addFiles, remove, isUnsaved: (url: string) => !saved.includes(url) };
}
