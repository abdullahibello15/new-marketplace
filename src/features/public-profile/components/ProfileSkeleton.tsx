/** Page-shaped placeholder while the profile loads. */
export function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading vendor profile">
      <div className="bg-pine">
        <div className="mx-auto flex max-w-6xl gap-4 px-5 pb-8 pt-12 lg:px-10">
          <div className="h-20 w-20 shrink-0 animate-pulse rounded-2xl bg-white/15 lg:h-28 lg:w-28" />
          <div className="flex-1 space-y-3 pt-1">
            <div className="h-6 w-2/3 animate-pulse rounded bg-white/15" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-white/15" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-white/15" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-4 px-5 py-6 lg:px-10" aria-hidden="true">
        <div className="h-40 animate-pulse rounded-2xl bg-sand" />
        <div className="h-56 animate-pulse rounded-2xl bg-sand" />
      </div>
    </div>);

}
