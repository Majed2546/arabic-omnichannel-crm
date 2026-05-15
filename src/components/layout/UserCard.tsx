type UserCardProps = {
  name: string
  roleLabel: string
}

export function UserCard({ name, roleLabel }: UserCardProps) {
  return (
    <div className="topbar-control profile-chip control-safe card-safe">
      <span>{name.charAt(0) || 'م'}</span>
      <div className="profile-chip-text">
        <strong className="text-safe">{name}</strong>
        <small className="text-safe">{roleLabel}</small>
      </div>
    </div>
  )
}
