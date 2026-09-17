export default function Loading() {
  return (
    <div className="px-8 py-6">
      <div className="mb-6 h-9 w-56 animate-pulse rounded bg-elevatedhover" />
      <div className="mb-4 h-11 w-80 max-w-full animate-pulse rounded bg-elevated" />
      <div className="mb-4 flex gap-2">
        <div className="h-8 w-32 animate-pulse rounded-full bg-elevated" />
        <div className="h-8 w-24 animate-pulse rounded-full bg-elevated" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2">
          <div className="h-4 w-4 animate-pulse rounded bg-elevatedhover" />
          <div className="h-9 w-9 animate-pulse rounded bg-elevatedhover" />
          <div className="h-3.5 w-1/3 animate-pulse rounded bg-elevatedhover" />
        </div>
      ))}
    </div>
  );
}
