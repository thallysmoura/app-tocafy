import SkeletonRows from './SkeletonRows';

export default function TrackListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="px-8 py-6">
      <div className="mb-6 h-9 w-52 animate-pulse rounded bg-elevatedhover" />
      <SkeletonRows rows={rows} />
    </div>
  );
}
