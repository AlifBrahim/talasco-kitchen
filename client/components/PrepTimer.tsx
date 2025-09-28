"use client";
import React from 'react';
import { Clock, Timer } from 'lucide-react';

interface PrepTimerProps {
  prepTimeMinutes?: number;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  showIcon?: boolean;
}

export default function PrepTimer({ 
  prepTimeMinutes, 
  className = '', 
  variant = 'default',
  showIcon = true 
}: PrepTimerProps) {
  if (!prepTimeMinutes || prepTimeMinutes <= 0) {
    return null;
  }

  // Format time display
  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  };

  // Get color based on prep time
  const getTimeColor = (minutes: number) => {
    if (minutes <= 5) return 'text-green-600 bg-green-50 border-green-200';
    if (minutes <= 15) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (minutes <= 30) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  // Get appropriate icon
  const getIcon = () => {
    if (prepTimeMinutes <= 5) return <Timer className="h-3 w-3" />;
    return <Clock className="h-3 w-3" />;
  };

  const timeColor = getTimeColor(prepTimeMinutes);
  const formattedTime = formatTime(prepTimeMinutes);

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${timeColor} ${className}`}>
        {showIcon && getIcon()}
        <span>{formattedTime}</span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`flex items-center space-x-2 p-3 rounded-lg border ${timeColor} ${className}`}>
        <div className="flex items-center space-x-2">
          {showIcon && getIcon()}
          <div>
            <div className="text-sm font-medium">Prep Time</div>
            <div className="text-lg font-bold">{formattedTime}</div>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${timeColor} ${className}`}>
      {showIcon && getIcon()}
      <span>{formattedTime}</span>
    </div>
  );
}
