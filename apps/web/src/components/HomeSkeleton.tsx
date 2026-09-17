import SkeletonRows from './SkeletonRows';

export default function HomeSkeleton() {
  return (
    <div className="px-8 py-6">
      <div className="mb-6 hidden h-9 w-48 animate-pulse rounded bg-elevatedhover sm:block" />
      <div className="mb-8 grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="h-[72px] animate-pulse rounded bg-elevated" />
        <div className="h-[72px] animate-pulse rounded bg-elevated" />
      </div>
      <div className="mb-3 h-7 w-40 animate-pulse rounded bg-elevatedhover" />
      <SkeletonRows rows={6} />
    </div>
  );
}
