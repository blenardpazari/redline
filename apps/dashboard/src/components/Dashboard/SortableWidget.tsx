import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { WidgetId } from '../../hooks/useDashboardLayout'
import { WIDGET_LABELS } from '../../hooks/useDashboardLayout'

interface Props {
  id: WidgetId
  children: React.ReactNode
  className?: string
}

function IconGrip() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-dim">
      <circle cx="9"  cy="5"  r="1.5" />
      <circle cx="15" cy="5"  r="1.5" />
      <circle cx="9"  cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9"  cy="19" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  )
}

export default function SortableWidget({ id, children, className }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className={className}>
      <div className="group rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-sm font-medium text-fg">{WIDGET_LABELS[id]}</span>
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
            title="Drag to reorder"
          >
            <IconGrip />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}
