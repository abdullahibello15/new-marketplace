import { AlertTriangleIcon, RotateCwIcon } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Couldn’t load this', message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-clay/40 bg-clay-soft px-6 py-10 text-center">
      <AlertTriangleIcon className="h-8 w-8 text-clay-dark" aria-hidden="true" />
      <p className="mt-3 font-bold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      {onRetry &&
      <Button variant="outline" size="sm" icon={RotateCwIcon} onClick={onRetry} className="mt-4">
          Try again
        </Button>
      }
    </div>);

}
