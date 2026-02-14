import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface TrendBadgeProps {
  value: number
  suffix?: string
  className?: string
}

export function TrendBadge({ value, suffix = '%', className }: TrendBadgeProps) {
  const isPositive = value >= 0
  const Icon = isPositive ? TrendingUp : TrendingDown

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        isPositive
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400',
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {isPositive ? '+' : ''}{value}{suffix}
    </span>
  )
}
