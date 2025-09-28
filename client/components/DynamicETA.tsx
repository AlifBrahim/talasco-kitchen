"use client";
import React, { useState, useEffect } from 'react';
import { Clock, Timer, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useETA } from '@/contexts/ETAContext';

interface ETAItem {
  itemId: string;
  itemName: string;
  basePrepTime: number;
  estimatedETA: number;
  queuePosition: number;
  stationLoad: number;
  confidence: 'high' | 'medium' | 'low';
  factors: {
    baseTime: number;
    queueDelay: number;
    stationLoadMultiplier: number;
    slaRisk: number;
  };
}

interface DynamicETAProps {
  itemId: string;
  itemName: string;
  basePrepTime?: number;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  showIcon?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}

export default function DynamicETA({ 
  itemId,
  itemName,
  basePrepTime = 15,
  className = '', 
  variant = 'default',
  showIcon = true,
  autoRefresh = true,
  refreshInterval = 30
}: DynamicETAProps) {
  const { etaData, fetchETAs, getETA } = useETA();
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchETA = async () => {
    try {
      setLocalLoading(true);
      setError(null);
      
      await fetchETAs([itemId]);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching ETA:', err);
      setError('Unable to calculate ETA');
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if not already in context
    const existingETA = getETA(itemId);
    if (!existingETA) {
      fetchETA();
    }
  }, [itemId, getETA]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchETA, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, itemId, fetchETA]);

  // Get ETA data from context
  const etaItem = getETA(itemId);

  if ((etaData.loading || localLoading) && !etaItem) {
    return (
      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Calculating...</span>
      </div>
    );
  }

  if (!etaItem) {
    return (
      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600 border border-red-200 ${className}`}>
        <AlertTriangle className="h-3 w-3" />
        <span>No ETA data</span>
      </div>
    );
  }

  // Format time display
  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.round(minutes % 60);
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  };

  // Get color and icon based on ETA and confidence
  const getDisplayProps = () => {
    const { estimatedETA, confidence, queuePosition, stationLoad } = etaItem;
    
    // Determine urgency based on ETA and queue
    if (estimatedETA <= 10 && confidence === 'high') {
      return {
        color: 'text-green-600 bg-green-50 border-green-200',
        icon: <CheckCircle className="h-3 w-3" />,
        urgency: 'fast'
      };
    }
    
    if (estimatedETA <= 20 && confidence !== 'low') {
      return {
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        icon: <Timer className="h-3 w-3" />,
        urgency: 'normal'
      };
    }
    
    if (estimatedETA <= 35) {
      return {
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        icon: <Clock className="h-3 w-3" />,
        urgency: 'slow'
      };
    }
    
    return {
      color: 'text-red-600 bg-red-50 border-red-200',
      icon: <AlertTriangle className="h-3 w-3" />,
      urgency: 'very-slow'
    };
  };

  const displayProps = getDisplayProps();
  const formattedTime = formatTime(etaItem.estimatedETA);

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${displayProps.color} ${className}`}>
        {showIcon && displayProps.icon}
        <span>{formattedTime}</span>
        {etaItem.confidence === 'low' && (
          <span className="text-xs opacity-75">~</span>
        )}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`flex items-center space-x-2 p-3 rounded-lg border ${displayProps.color} ${className}`}>
        <div className="flex items-center space-x-2">
          {showIcon && displayProps.icon}
          <div>
            <div className="text-sm font-medium">Estimated Time</div>
            <div className="text-lg font-bold">{formattedTime}</div>
            {etaItem.queuePosition > 0 && (
              <div className="text-xs opacity-75">
                {etaItem.queuePosition} in queue
              </div>
            )}
            {etaItem.stationLoad > 80 && (
              <div className="text-xs opacity-75">
                Kitchen busy ({Math.round(etaItem.stationLoad)}% load)
              </div>
            )}
          </div>
        </div>
        {lastUpdated && (
          <div className="text-xs opacity-50 ml-auto">
            Updated {Math.round((Date.now() - lastUpdated.getTime()) / 1000)}s ago
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${displayProps.color} ${className}`}>
      {showIcon && displayProps.icon}
      <span>{formattedTime}</span>
      {etaItem.confidence === 'low' && (
        <span className="text-xs opacity-75">~</span>
      )}
      {error && (
        <span className="text-xs opacity-75" title="Using estimated time">!</span>
      )}
    </div>
  );
}
