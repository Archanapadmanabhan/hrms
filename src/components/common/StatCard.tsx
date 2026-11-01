import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: 'emerald' | 'amber' | 'rose' | 'blue' | 'indigo' | 'slate';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = 'slate',
  onClick
}) => {
  const getBadgeClass = () => {
    switch (badgeColor) {
      case 'emerald':
        return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
      case 'amber':
        return 'text-amber-700 bg-amber-50 border border-amber-200';
      case 'rose':
        return 'text-rose-700 bg-rose-50 border border-rose-200';
      case 'blue':
        return 'text-blue-700 bg-blue-50 border border-blue-200';
      case 'indigo':
        return 'text-indigo-700 bg-indigo-50 border border-indigo-200';
      default:
        return 'text-slate-600 bg-slate-100 border border-slate-200';
    }
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-all group ${
        onClick
          ? 'cursor-pointer hover:border-indigo-400 hover:shadow-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500'
          : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500 group-hover:text-indigo-700 transition-colors">
            {title}
          </span>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        <div className="rounded-lg bg-slate-50 p-2.5 text-slate-700 border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {badge && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${getBadgeClass()}`}>
            {badge}
          </span>
          {onClick && (
            <span className="text-[11px] font-semibold text-indigo-600 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
              View Details &rarr;
            </span>
          )}
        </div>
      )}
    </div>
  );
};

