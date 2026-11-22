import type { ReactNode } from "react"

export function PageHeader({
  title,
  lead,
  actions,
}: {
  eyebrow?: string
  title: string
  lead?: string
  actions?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div className="page-heading__copy">
        <h1>{title}</h1>
        {lead && <p>{lead}</p>}
      </div>
      {actions && <div className="page-heading__actions">{actions}</div>}
    </div>
  )
}
