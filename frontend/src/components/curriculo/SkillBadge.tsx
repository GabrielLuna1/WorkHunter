import { cn } from "@/lib/utils"

interface SkillBadgeProps {
  skill: string
  variant?: 'default' | 'highlight'
}

export function SkillBadge({ skill, variant = 'default' }: SkillBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
        variant === 'highlight'
          ? 'bg-accent/10 text-accent border-accent/30'
          : 'bg-surface-2 text-ink-subtle border-hairline'
      )}
    >
      {skill}
    </span>
  )
}
