export default function LoadingSkeleton({ rows = 5, cols = 4 }) {
    return (
        <div className="animate-pulse">
            <div className="space-y-3">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                        {Array.from({ length: cols }).map((_, j) => (
                            <div
                                key={j}
                                className="h-4 bg-slate-200 rounded flex-1"
                                style={{ opacity: 1 - i * 0.1 }}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

export function CardSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-200" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-24" />
                    <div className="h-6 bg-slate-200 rounded w-16" />
                </div>
            </div>
        </div>
    )
}
