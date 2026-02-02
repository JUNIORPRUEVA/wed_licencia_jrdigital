export default function LoadingProduct() {
  return (
    <div className="min-h-dvh bg-[#F7F7F7]">
      <div className="h-20 border-b border-black/10 bg-gradient-to-r from-[#1E88E5] via-[#1976D2] to-[#1E88E5]" />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-xl sm:p-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="h-4 w-24 animate-pulse rounded bg-black/5" />
              <div className="h-9 w-3/4 animate-pulse rounded bg-black/5" />
              <div className="h-5 w-full animate-pulse rounded bg-black/5" />
              <div className="h-5 w-5/6 animate-pulse rounded bg-black/5" />
              <div className="mt-6 flex gap-2">
                <div className="h-9 w-28 animate-pulse rounded-full bg-black/5" />
                <div className="h-9 w-36 animate-pulse rounded-full bg-black/5" />
              </div>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-5 animate-pulse rounded bg-black/5" />
                ))}
              </div>
            </div>
            <div className="aspect-[4/3] animate-pulse rounded-3xl bg-black/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
