export default function LoadingProducts() {
  return (
    <div className="min-h-dvh bg-[#F7F7F7]">
      <div className="h-20 border-b border-black/10 bg-gradient-to-r from-[#1E88E5] via-[#1976D2] to-[#1E88E5]" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-32 w-full animate-pulse rounded-3xl bg-black/5" />
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-xl">
              <div className="aspect-[16/9] animate-pulse bg-black/5" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-2/3 animate-pulse rounded bg-black/5" />
                <div className="h-4 w-full animate-pulse rounded bg-black/5" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-black/5" />
                <div className="mt-2 flex gap-2">
                  <div className="h-6 w-20 animate-pulse rounded-full bg-black/5" />
                  <div className="h-6 w-24 animate-pulse rounded-full bg-black/5" />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="h-6 w-28 animate-pulse rounded bg-black/5" />
                  <div className="h-10 w-28 animate-pulse rounded-full bg-black/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
