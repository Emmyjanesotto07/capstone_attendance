export default function PageSkeleton({ dark = false, type = "auth" }) {
  const wrapperClass = dark
    ? "min-h-screen p-4 md:p-6 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900"
    : "min-h-screen p-4 md:p-6 bg-gradient-to-br from-emerald-50 via-white to-amber-50";

  if (type === "dashboard") {
    return (
      <div className={wrapperClass}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 animate-pulse">
          <div className={`hidden md:block rounded-2xl border p-5 space-y-3 ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className={`h-5 w-28 rounded ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
            <div className={`h-10 w-full rounded-lg ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
            <div className={`h-10 w-full rounded-lg ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
            <div className={`h-10 w-full rounded-lg ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
          </div>
          <div className={`rounded-2xl border p-6 md:p-8 space-y-5 ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className={`h-10 w-44 rounded ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
            <div className={`h-5 w-72 rounded ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`h-24 rounded-xl ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
              <div className={`h-24 rounded-xl md:col-span-2 ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
            </div>
            <div className={`h-24 rounded-xl ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "settings") {
    return (
      <div className={wrapperClass}>
        <div className={`max-w-5xl mx-auto rounded-2xl border p-6 md:p-8 animate-pulse ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
          <div className={`h-7 w-56 rounded mb-6 ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-xl border p-5 space-y-3 ${dark ? "bg-slate-700/30 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
              <div className={`h-6 w-36 rounded ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
              <div className={`h-10 w-full rounded ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
              <div className={`h-10 w-full rounded ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
              <div className={`h-10 w-full rounded ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
              <div className={`h-10 w-full rounded ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
            </div>
            <div className={`rounded-xl border p-5 space-y-3 ${dark ? "bg-slate-700/30 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
              <div className={`h-6 w-36 rounded ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
              <div className={`h-10 w-full rounded ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
              <div className={`h-10 w-full rounded ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
              <div className={`h-10 w-full rounded ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div className={`max-w-md mx-auto rounded-2xl border p-8 md:p-10 animate-pulse ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
        <div className={`h-8 w-44 rounded mb-3 mx-auto ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
        <div className={`h-4 w-56 rounded mb-8 mx-auto ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
        <div className="space-y-4">
          <div className={`h-12 w-full rounded-lg ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
          <div className={`h-12 w-full rounded-lg ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
          <div className={`h-12 w-full rounded-lg ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
          <div className={`h-12 w-full rounded-lg ${dark ? "bg-slate-700" : "bg-slate-200"}`}></div>
        </div>
      </div>
    </div>
  );
}
