const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200/70 rounded ${className}`} />
);

export const StatCardSkeleton = () => (
  <div className="glass rounded-2xl p-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="w-12 h-12 rounded-xl" />
    </div>
  </div>
);

export const StatRowSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => <StatCardSkeleton key={i} />)}
  </div>
);

export default Skeleton;
