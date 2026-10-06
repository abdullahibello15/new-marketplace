import { useState } from 'react';
import { PackageIcon } from 'lucide-react';

/** Small square product photo, with a neutral tile when there's no photo or the link is broken. */
export function ItemThumb({ src, className = 'h-14 w-14' }: {src: string | null;className?: string;}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className={`flex shrink-0 items-center justify-center rounded-xl bg-sand text-muted ${className}`}>
        <PackageIcon className="h-5 w-5" aria-hidden="true" />
      </span>);

  }
  return <img src={src} alt="" onError={() => setFailed(true)} className={`shrink-0 rounded-xl object-cover ${className}`} />;
}
