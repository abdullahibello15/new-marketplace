import { Link } from 'react-router-dom';

export function NotFound({ message = "This page doesn't exist." }: {message?: string;}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-24 text-center">
      <p className="text-lg font-bold text-ink">{message}</p>
      <Link to="/" className="mt-4 rounded-xl bg-pine px-5 py-3 text-sm font-bold text-white hover:bg-pine-deep">
        Back to home
      </Link>
    </div>);

}