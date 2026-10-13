import React from 'react';
import { cn } from '../../lib/utils';

interface CircularGaugeProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  sublabel?: string;
  showPercentSymbol?: boolean;
  className?: string;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  percent,
  size = 140,
  strokeWidth = 12,
  sublabel = 'Load %',
  showPercentSymbol = true,
  className,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Standard gauge spans 240 degrees (leaving 120 open at bottom)
  const angleSpan = 240;
  const dashOffsetTotal = (angleSpan / 360) * circumference;
  
  // Clamped percent for arc representation: 0% to 130%
  const clamped = Math.max(0, Math.min(percent, 130));
  const progressRatio = clamped / 100;
  const progressOffset = dashOffsetTotal - (dashOffsetTotal * Math.min(progressRatio, 1.25));

  // Determine color scheme based on specifications:
  // green < 90%, amber 90–100%, red > 100%
  let strokeColor = '#10b981'; // safe green
  let textColor = 'text-emerald-600 dark:text-emerald-400';
  let isOverloaded = false;

  if (percent > 100) {
    strokeColor = '#ef4444'; // overload red
    textColor = 'text-red-600 dark:text-red-400';
    isOverloaded = true;
  } else if (percent >= 90) {
    strokeColor = '#f59e0b'; // warning amber
    textColor = 'text-amber-600 dark:text-amber-400';
  }

  return (
    <div className={cn('relative flex flex-col items-center justify-center select-none', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-[210deg] transition-all duration-500"
      >
        {/* Background Track Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={`${dashOffsetTotal} ${circumference}`}
          strokeLinecap="round"
          className="text-slate-200 dark:text-slate-800"
        />

        {/* 90% Warning Tick Marker */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(245, 158, 11, 0.4)"
          strokeWidth={strokeWidth + 2}
          strokeDasharray={`4 ${circumference}`}
          strokeDashoffset={dashOffsetTotal - (dashOffsetTotal * 0.9)}
          className="opacity-75"
        />

        {/* 100% Threshold Tick Marker */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(239, 68, 68, 0.5)"
          strokeWidth={strokeWidth + 4}
          strokeDasharray={`6 ${circumference}`}
          strokeDashoffset={0}
          className="opacity-80"
        />

        {/* Active Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dashOffsetTotal} ${circumference}`}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Center Label Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pt-2">
        <span
          className={cn(
            'font-extrabold tracking-tight font-mono transition-colors duration-300',
            textColor,
            size >= 160 ? 'text-3xl' : size >= 130 ? 'text-2xl' : 'text-xl',
            isOverloaded && 'animate-pulse'
          )}
        >
          {percent.toFixed(1)}
          {showPercentSymbol && <span className="text-xs font-semibold ml-0.5">%</span>}
        </span>
        {sublabel && (
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};
