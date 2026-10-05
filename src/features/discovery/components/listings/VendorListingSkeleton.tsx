/** Placeholder shaped like a VendorListingCard while results load. */
export function VendorListingSkeleton() {
  return (
    <div aria-hidden="true" className="flex gap-4 rounded-2xl border border-line bg-white p-4">
      <div className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-sand" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 w-3/4 animate-pulse rounded bg-sand" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-sand" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-sand" />
        <div className="flex gap-1.5 pt-1">
          <div className="h-5 w-16 animate-pulse rounded-md bg-sand" />
          <div className="h-5 w-24 animate-pulse rounded-md bg-sand" />
        </div>
      </div>
    </div>);

}
