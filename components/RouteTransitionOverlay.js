export default function RouteTransitionOverlay({ isVisible }) {
  return (
    <div
      aria-hidden={!isVisible}
      className={`fixed inset-0 z-[70] transition-opacity duration-180 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${
        isVisible ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <div className="absolute inset-0 bg-[rgba(247,246,242,0.86)] backdrop-blur-sm dark:bg-[rgba(16,16,15,0.84)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1120px] flex-col px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <div className="h-10 w-32 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
        <div className="mt-14 max-w-[780px]">
          <div className="h-3 w-28 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
          <div className="mt-6 h-14 w-3/4 animate-pulse rounded-[1.5rem] bg-black/[0.06] dark:bg-white/[0.08]" />
          <div className="mt-4 h-5 w-full animate-pulse rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
          <div className="mt-3 h-5 w-5/6 animate-pulse rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />

          <div className="mt-14 space-y-6 border-t border-black/8 pt-8 dark:border-white/10">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="space-y-3">
                <div className="h-8 w-2/3 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
                <div className="h-4 w-full animate-pulse rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
                <div className="h-4 w-4/5 animate-pulse rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
