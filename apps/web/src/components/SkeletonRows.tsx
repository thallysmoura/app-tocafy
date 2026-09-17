export default function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded px-2 py-2 sm:px-4">
          <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded bg-elevatedhover" />
          <div className="flex-1">
            <div className="mb-2 h-3.5 w-2/5 animate-pulse rounded bg-elevatedhover" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-elevatedhover" />
          </div>
          <div className="hidden h-3 w-16 animate-pulse rounded bg-elevatedhover sm:block" />
        </div>
      ))}
    </div>
  );
}
