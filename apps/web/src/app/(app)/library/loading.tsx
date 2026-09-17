export default function Loading() {
  return (
    <div className="px-8 py-6">
      <div className="mb-6 h-9 w-56 animate-pulse rounded bg-elevatedhover" />
      <div className="mb-6 h-11 w-80 max-w-full animate-pulse rounded bg-elevated" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded bg-elevated p-4">
            <div className="mb-3 h-24 animate-pulse rounded bg-elevatedhover" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-elevatedhover" />
          </div>
        ))}
      </div>
    </div>
  );
}
