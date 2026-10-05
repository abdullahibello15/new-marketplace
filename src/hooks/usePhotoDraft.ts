import { useEffect, useRef, useState } from 'react';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

const isBlob = (url: string) => url.startsWith('blob:');

/**
 * Checks picked files (type, size, slots left) and creates preview URLs for the ones that pass.
 * Exported so every photo field applies the same upload rules.
 */
export function checkFiles(files: File[], slotsLeft: number, max: number): {urls: string[];problems: string[];} {
  const urls: string[] = [];
  const problems: string[] = [];
  let overflow = 0;
  for (const file of files) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      problems.push(`${file.name} isn't a JPG or PNG.`);
    } else if (file.size > MAX_FILE_BYTES) {
      problems.push(`${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. Photos must be 5 MB or smaller.`);
    } else if (urls.length >= slotsLeft) {
      overflow += 1;
    } else {
      urls.push(URL.createObjectURL(file));
    }
  }
  if (overflow) {
    problems.push(`You can add up to ${max} photos, so ${overflow} ${overflow === 1 ? 'photo was' : 'photos were'} not added.`);
  }
  return { urls, problems };
}

/**
 * Draft list of photos picked in the browser (JPG/PNG, ≤5 MB, up to `max`), shown as previews until the caller saves.
 * Object URLs for picks that are never saved are freed when removed or when the component unmounts.
 */
export function usePhotoDraft(saved: string[], max: number) {
  const [photos, setPhotos] = useState<string[]>(saved);
  const [problems, setProblems] = useState<string[]>([]);
  const committed = useRef<string[]>([]);

  const latest = useRef({ photos, saved });
  latest.current = { photos, saved };
  useEffect(
    () => () => {
      const { photos: current, saved: kept } = latest.current;
      current.
      filter((url) => isBlob(url) && !kept.includes(url) && !committed.current.includes(url)).
      forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  /** Returns true if at least one photo was added. */
  function addFiles(files: File[]): boolean {
    const { urls, problems: found } = checkFiles(files, max - photos.length, max);
    setPhotos((prev) => [...prev, ...urls]);
    setProblems(found);
    return urls.length > 0;
  }

  function remove(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url));
    setProblems([]);
    // An unsaved pick isn't referenced anywhere else, so free it now.
    if (isBlob(url) && !saved.includes(url)) URL.revokeObjectURL(url);
  }

  /** Call when saving. Frees saved uploads the vendor removed and returns the list to store. */
  function commit(): string[] {
    saved.filter((url) => isBlob(url) && !photos.includes(url)).forEach((url) => URL.revokeObjectURL(url));
    committed.current = photos;
    setProblems([]);
    return photos;
  }

  return { photos, problems, addFiles, remove, commit, isUnsaved: (url: string) => !saved.includes(url) };
}
