/** Shimmer skeleton for an opportunity card while loading — mirrors OpportunityCard's shape */
export default function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-3">
      {/* Organizer + save */}
      <div className="flex justify-between items-center">
        <div className="skeleton-shimmer h-3 w-24 bg-slate-100 rounded" />
        <div className="skeleton-shimmer h-8 w-8 bg-slate-100 rounded-full" />
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <div className="skeleton-shimmer h-4 w-4/5 bg-slate-100 rounded" />
        <div className="skeleton-shimmer h-4 w-3/5 bg-slate-100 rounded" />
      </div>

      {/* Badges */}
      <div className="flex gap-1.5">
        <div className="skeleton-shimmer h-5 w-20 bg-slate-100 rounded-full" />
        <div className="skeleton-shimmer h-5 w-14 bg-slate-100 rounded-full" />
      </div>
      <div className="skeleton-shimmer h-3.5 w-2/5 bg-slate-100 rounded" />

      {/* Description */}
      <div className="space-y-1.5">
        <div className="skeleton-shimmer h-3.5 w-full bg-slate-100 rounded" />
        <div className="skeleton-shimmer h-3.5 w-5/6 bg-slate-100 rounded" />
      </div>

      {/* Deadline row */}
      <div className="pt-2.5 border-t border-slate-50 flex justify-between">
        <div className="skeleton-shimmer h-6 w-24 bg-slate-100 rounded-lg" />
        <div className="skeleton-shimmer h-4 w-16 bg-slate-100 rounded" />
      </div>

      {/* Meta */}
      <div className="space-y-1.5">
        <div className="skeleton-shimmer h-3 w-1/2 bg-slate-100 rounded" />
        <div className="skeleton-shimmer h-3 w-2/3 bg-slate-100 rounded" />
      </div>

      {/* Button */}
      <div className="skeleton-shimmer h-9 bg-slate-100 rounded-xl mt-1" />
    </div>
  );
}
