import type { DisasterStatus } from '../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'status' | 'tag' | 'role' | 'resource';
  status?: DisasterStatus;
  className?: string;
}

export function Badge({ children, variant = 'tag', status, className = '' }: BadgeProps) {
  let classes = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ';

  if (variant === 'status' && status) {
    classes += status === 'ACTIVE'
      ? 'bg-red-900/50 text-red-300 border border-red-700'
      : 'bg-green-900/50 text-green-300 border border-green-700';
  } else if (variant === 'role') {
    classes += children === 'ADMIN'
      ? 'bg-purple-900/50 text-purple-300 border border-purple-700'
      : 'bg-blue-900/50 text-blue-300 border border-blue-700';
  } else if (variant === 'resource') {
    const resourceColors: Record<string, string> = {
      SHELTER: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700',
      HOSPITAL: 'bg-red-900/50 text-red-300 border border-red-700',
      FOOD: 'bg-orange-900/50 text-orange-300 border border-orange-700',
      WATER: 'bg-blue-900/50 text-blue-300 border border-blue-700',
      RESCUE: 'bg-purple-900/50 text-purple-300 border border-purple-700',
    };
    classes += resourceColors[children as string] ?? 'bg-gray-700 text-gray-300';
  } else {
    classes += 'bg-gray-700/50 text-gray-300 border border-gray-600';
  }

  return <span className={`${classes} ${className}`}>{children}</span>;
}
