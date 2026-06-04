import type { ReactNode } from 'react'

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="table-card">
      <div className="table-scroll">
        <table>{children}</table>
      </div>
    </div>
  )
}
