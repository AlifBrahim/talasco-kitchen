"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

interface ETAData {
  items: Map<string, ETAItem>;
  lastUpdated: string | null;
  loading: boolean;
  error: string | null;
}

interface ETAContextType {
  etaData: ETAData;
  fetchETAs: (itemIds: string[]) => Promise<void>;
  getETA: (itemId: string) => ETAItem | null;
  refreshETAs: () => Promise<void>;
}

const ETAContext = createContext<ETAContextType | undefined>(undefined);

export function ETAProvider({ children }: { children: React.ReactNode }) {
  const [etaData, setEtaData] = useState<ETAData>({
    items: new Map(),
    lastUpdated: null,
    loading: false,
    error: null
  });

  const fetchETAs = useCallback(async (itemIds: string[]) => {
    if (itemIds.length === 0) return;

    try {
      setEtaData(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch('/api/menu-items/eta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ETAs: ${response.status}`);
      }

      const data = await response.json();
      const newItems = new Map(etaData.items);

      // Update with new ETA data
      data.items.forEach((item: ETAItem) => {
        newItems.set(item.itemId, item);
      });

      setEtaData({
        items: newItems,
        lastUpdated: data.lastUpdated,
        loading: false,
        error: null
      });
    } catch (err) {
      console.error('Error fetching ETAs:', err);
      setEtaData(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch ETAs'
      }));
    }
  }, [etaData.items]);

  const getETA = useCallback((itemId: string): ETAItem | null => {
    return etaData.items.get(itemId) || null;
  }, [etaData.items]);

  const refreshETAs = useCallback(async () => {
    const itemIds = Array.from(etaData.items.keys());
    if (itemIds.length > 0) {
      await fetchETAs(itemIds);
    }
  }, [etaData.items, fetchETAs]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshETAs, 30000);
    return () => clearInterval(interval);
  }, [refreshETAs]);

  const value: ETAContextType = {
    etaData,
    fetchETAs,
    getETA,
    refreshETAs
  };

  return (
    <ETAContext.Provider value={value}>
      {children}
    </ETAContext.Provider>
  );
}

export function useETA() {
  const context = useContext(ETAContext);
  if (context === undefined) {
    throw new Error('useETA must be used within an ETAProvider');
  }
  return context;
}
