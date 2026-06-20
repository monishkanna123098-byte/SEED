/**
 * TabPlaceholder — displayed for tabs 2–5 until their content
 * is built in Stage 4B-3 and beyond.
 */

interface TabPlaceholderProps {
  tabName:     string
  icon:        string
  description: string
}

export function TabPlaceholder({ tabName, icon, description }: TabPlaceholderProps) {
  return (
    <div className="seed-card py-14 text-center max-w-md mx-auto">
      <p className="text-4xl mb-3">{icon}</p>
      <h3 className="font-bold text-seed-dark mb-1">{tabName}</h3>
      <p className="text-sm text-seed-muted">{description}</p>
      <p className="text-xs text-slate-400 mt-3">Coming in Stage 4B-3</p>
    </div>
  )
}
