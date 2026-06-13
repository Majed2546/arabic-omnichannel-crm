type StatCardProps = {
  label: string
  value: string | number
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="stat-card card-safe">
      <h3 className="text-safe">{value}</h3>
      <p className="text-safe">{label}</p>
    </article>
  )
}
