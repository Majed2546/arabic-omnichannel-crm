type LoadingSkeletonProps = {
  rows?: number
}

export function LoadingSkeleton({ rows = 4 }: LoadingSkeletonProps) {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton-row">
          <span />
          <strong />
          <small />
        </div>
      ))}
    </div>
  )
}
