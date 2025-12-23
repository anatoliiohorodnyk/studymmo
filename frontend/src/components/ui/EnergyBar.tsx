'use client';

interface EnergyBarProps {
  current: number;
  max: number;
  label: string;
  color?: 'blue' | 'purple' | 'green';
}

export function EnergyBar({
  current,
  max,
  label,
  color = 'blue',
}: EnergyBarProps) {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));

  const colors = {
    blue: 'from-blue-400 to-blue-600',
    purple: 'from-purple-400 to-purple-600',
    green: 'from-green-400 to-green-600',
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-600 w-24">{label}</span>
      <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${colors[color]} transition-all duration-300 rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-700 w-16 text-right">
        {current}/{max}
      </span>
    </div>
  );
}
