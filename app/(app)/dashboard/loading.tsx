/**
 * Skeleton de loading do dashboard.
 *
 * Aparece automaticamente enquanto a query do Server Component carrega
 * (Next.js convention: app/(app)/dashboard/loading.tsx). Usa as classes
 * `sobra-skeleton` definidas em globals.css.
 */
export default function DashboardLoading() {
  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <div className="sobra-skeleton h-7 w-32" />
          <div className="sobra-skeleton h-4 w-24 mt-2" />
        </div>
        <div className="sobra-skeleton h-9 w-56 rounded-control" />
      </div>

      {/* Hero card skeleton */}
      <div className="rounded-card-lg bg-sobra-green/10 p-7 h-44 relative overflow-hidden">
        <div className="sobra-skeleton h-3 w-32 bg-white/30" />
        <div className="sobra-skeleton h-12 w-56 mt-3 bg-white/40" />
        <div className="sobra-skeleton h-4 w-72 mt-3 bg-white/30" />
      </div>

      {/* Insights skeleton */}
      <div className="mt-6">
        <div className="sobra-skeleton h-6 w-40 mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white border border-sobra-line rounded-card p-4 h-24">
              <div className="flex gap-3">
                <div className="sobra-skeleton w-9 h-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="sobra-skeleton h-4 w-3/4" />
                  <div className="sobra-skeleton h-3 w-full" />
                  <div className="sobra-skeleton h-3 w-5/6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-sobra-line rounded-card p-5 h-24">
            <div className="sobra-skeleton h-3 w-20" />
            <div className="sobra-skeleton h-7 w-32 mt-2" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="bg-white border border-sobra-line rounded-card p-5 mt-6 h-64">
        <div className="sobra-skeleton h-5 w-40" />
        <div className="sobra-skeleton h-3 w-56 mt-2" />
        <div className="flex items-end gap-3 mt-8 h-32">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-1 flex gap-1 items-end h-full">
              <div className="sobra-skeleton w-3 rounded-t" style={{ height: `${30 + Math.random() * 60}%` }} />
              <div className="sobra-skeleton w-3 rounded-t" style={{ height: `${30 + Math.random() * 60}%` }} />
            </div>
          ))}
        </div>
      </div>

      {/* List skeleton */}
      <div className="bg-white border border-sobra-line rounded-card mt-6 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="sobra-skeleton h-5 w-48" />
        </div>
        <div className="divide-y divide-sobra-line-soft">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-3.5">
              <div className="sobra-skeleton w-9 h-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="sobra-skeleton h-4 w-2/3" />
                <div className="sobra-skeleton h-3 w-1/2" />
              </div>
              <div className="sobra-skeleton h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
