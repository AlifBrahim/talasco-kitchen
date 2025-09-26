"use client";
import React, { useState, useEffect } from 'react';
import { Clock, Check, Utensils, ChefHat, Loader2, Eye, ArrowRight, Brain } from 'lucide-react';
import Link from 'next/link';
import { GetOrdersResponse, UpdateOrderItemStatusRequest, UpdateOrderItemStatusResponse } from '@shared/api';
import OrderDetailsModal from '@/components/OrderDetailsModal';

// Kitchen Queue Agent integration per docs/KitchenQueueAgent.md

type AgentRecommendation = {
  action: string;
  reason: string;
  risks?: string | null;
  payload?: {
    orderid?: number;
    itemid?: number;
    score?: number;
  } | null;
};

type QueueItem = {
  orderid: number;
  tablenumber?: number | null;
  itemid: number;
  itemname: string;
  category: string;
  orderdate: string;
  promisedat?: string | null;
  status: 'queued' | 'firing' | 'prepping' | 'passed' | 'served' | 'cancelled' | string;
  quantity?: number;
  est_prep_minutes?: number | null;
  remaining_items?: number | null;
  wait_minutes?: number | null;
  sla_overdue?: boolean | null;
};

interface OrderItem {
  id: string;
  name: string;
  note?: string;
  qty: number;
  status: 'queued' | 'firing' | 'prepping' | 'passed' | 'served' | 'cancelled' | 'completed';
  predicted_prep_minutes?: number;
  started_at?: string;
  completed_at?: string;
}

interface Order {
  id: string;
  tableNumber?: string;
  customerName?: string;
  status: 'open' | 'in_progress' | 'ready' | 'served' | 'cancelled' | 'completed';
  items: OrderItem[];
  specialRequests?: string;
  timestamp: string;
  placedAt?: string; // raw ISO for wait calculations
  startedAt?: string;
  completedAt?: string;
  totalTime?: string;
  source: string;
}

type SmartQueueFoodItem = {
  order: Order;
  orderId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  note?: string;
  status: OrderItem['status'];
  score?: number | null;
  recommendation?: AgentRecommendation;
  queueInfo?: QueueItem;
  predictedPrepMinutes?: number | null;
  startedAt?: string;
};

// Removed hardcoded fallback orders; start with empty and rely on API

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'in_progress' | 'ready' | 'served' | 'cancelled' | 'history'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  // Agent dispatcher + contextual queue
  const [recs, setRecs] = useState<AgentRecommendation[]>([]);
  const [recsError, setRecsError] = useState<string | null>(null);
  const [queueCtx, setQueueCtx] = useState<QueueItem[]>([]);
  const CATEGORY = 'Food';
  const DISPATCHER_LIMIT = 8;
  const QUEUE_LIMIT = 10;
  // Keep the Smart Queue UI panel but disable its data fetching
  const SMART_QUEUE_ENABLED = true;
  // Use local Next.js API routes instead of external service
  const AGENTS_API_BASE = '';

  // Smart Queue consolidation state
  type SmartCardStatus = 'Queuing' | 'Locked';
  type SmartCardEntry = { orderId: string; itemId: string; qty: number; note?: string | null; itemName: string; category?: string };
  type SmartCard = {
    key: string;
    itemName: string;
    note?: string | null;
    source?: string | null;
    category?: string;
    quantity: number;
    status: SmartCardStatus;
    colorClass: string;
    bgStart?: string; // light gradient start
    bgEnd?: string;   // light gradient end
    borderHex?: string; // light border color
    isLead: boolean; // first card in group controls timer
    createdAt: number;
    openUntil: number; // +3m (deprecated, kept for compatibility)
    lockAt: number; // +3m (when chef starts cooking)
    entries: SmartCardEntry[];
    capacity: number;
  };
  const [smartCards, setSmartCards] = useState<SmartCard[]>([]);
  const cardMetaRef = React.useRef<Map<string, { createdAt: number }>>(new Map());
  const STORAGE_KEY = 'smartQueueCardMeta_v1';

  // Section colors and menu item mappings
  const [sections, setSections] = useState<Array<{sectionid: number, sectionname: string, max_capacity: number, color: {bgStart: string, bgEnd: string, border: string}}>>([]);
  const [menuItemSections, setMenuItemSections] = useState<Map<string, {sectionid: number, sectionname: string, max_capacity: number}>>(new Map());

  // Load persisted smart card metadata (createdAt) so timers don't reset on refresh
  // BUT only if the timestamps are still valid (not expired)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, { createdAt: number }>;
        const map = new Map<string, { createdAt: number }>();
        const now = Date.now();
        const THREE_MINUTES = 180_000; // 3 minutes in ms
        let hasValidCards = false;
        
        Object.entries(parsed).forEach(([k, v]) => {
          if (v && typeof v.createdAt === 'number') {
            // Only restore if the card is still within its merge window
            const isStillValid = (now - v.createdAt) < THREE_MINUTES;
            if (isStillValid) {
              map.set(k, { createdAt: v.createdAt });
              hasValidCards = true;
              console.log(`Restored valid card ${k} with createdAt=${v.createdAt}`);
            } else {
              console.log(`Expired card ${k} not restored, createdAt=${v.createdAt} is too old`);
            }
          }
        });
        
        cardMetaRef.current = map;
        
        // If no valid cards, clear localStorage to prevent future issues
        if (!hasValidCards) {
          localStorage.removeItem(STORAGE_KEY);
          console.log('Cleared localStorage - no valid cards found');
        }
      }
    } catch {
      // ignore corruption
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Fetch sections and menu item mappings
  useEffect(() => {
    const fetchSectionsAndMappings = async () => {
      try {
        const [sectionsRes, mappingsRes] = await Promise.all([
          fetch('/api/sections'),
          fetch('/api/menu-items/sections')
        ]);

        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          setSections(sectionsData.sections || []);
        }

        if (mappingsRes.ok) {
          const mappingsData = await mappingsRes.json();
          console.log('Menu item sections API response:', mappingsData);
          const mappingsMap = new Map<string, {sectionid: number, sectionname: string, max_capacity: number}>();
          mappingsData.menuItems?.forEach((item: any) => {
            if (item.section) {
              mappingsMap.set(item.itemname, item.section);
              console.log(`Mapped ${item.itemname} to section ${item.section.sectionname}`);
            } else {
              console.warn(`No section for item: ${item.itemname}`);
            }
          });
          setMenuItemSections(mappingsMap);
          console.log('Final menu item sections map:', Array.from(mappingsMap.entries()));
        } else {
          console.error('Failed to fetch menu item sections:', mappingsRes.status);
        }
      } catch (error) {
        console.error('Error fetching sections and mappings:', error);
      }
    };

    fetchSectionsAndMappings();
  }, []);

  // Get section colors for a menu item - NO FALLBACKS
  const getSectionColorsForItem = (itemName: string) => {
    const section = menuItemSections.get(itemName);
    if (!section) {
      console.warn(`No section mapping found for item: ${itemName}`);
      console.log('Available menu item sections:', Array.from(menuItemSections.keys()));
      return { bgStart: '#f3f4f6', bgEnd: '#e5e7eb', border: '#d1d5db' }; // Gray fallback
    }
    
    const sectionWithColor = sections.find(s => s.sectionid === section.sectionid);
    if (!sectionWithColor) {
      console.warn(`No section color found for item: ${itemName}, section: ${section.sectionname}`);
      console.log('Available sections:', sections.map(s => `${s.sectionname} (${s.sectionid})`));
      return { bgStart: '#f3f4f6', bgEnd: '#e5e7eb', border: '#d1d5db' }; // Gray fallback
    }
    
    console.log(`Colors for ${itemName}:`, sectionWithColor.color);
    return sectionWithColor.color;
  };

  const getCapacityForItem = (itemName: string) => {
    // Get the section for this item and return its max_capacity
    const section = menuItemSections.get(itemName);
    if (section) {
      return section.max_capacity;
    }
    
    // Fallback: find from sections array if item mapping is not loaded yet
    const sectionFromArray = sections.find(s => 
      menuItemSections.get(itemName)?.sectionid === s.sectionid
    );
    if (sectionFromArray) {
      return sectionFromArray.max_capacity;
    }
    
    // Ultimate fallback - should not happen with proper DB setup
    return 5;
  };

  const buildGroupKey = (order: Order, item: OrderItem) => {
    const src = order.source || 'dine_in';
    const noteKey = item.note ? item.note.trim() : '';
    return `${item.name}|${noteKey}|${src}`;
  };

  const recomputeSmartQueue = React.useCallback(() => {
    const now = Date.now();
    const baseItems: { key: string; order: Order; item: OrderItem; orderTime: number }[] = [];
    
    // Add error handling and consistent time parsing
    orders.forEach(order => {
      order.items.forEach(item => {
        if (['queued', 'prepping'].includes(item.status)) {
          try {
            // Use consistent time parsing - prefer placedAt (ISO string)
            const orderTime = order.placedAt 
              ? new Date(order.placedAt).getTime()
              : order.timestamp 
                ? new Date(order.timestamp).getTime()
                : now; // fallback to current time
            
            // Validate time is reasonable (not in future, not too old)
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            const validOrderTime = orderTime > now - maxAge && orderTime <= now 
              ? orderTime 
              : now;
            
            baseItems.push({ 
              key: buildGroupKey(order, item), 
              order, 
              item,
              orderTime: validOrderTime
            });
          } catch (error) {
            console.error('Error parsing order time:', error, order);
            // Fallback to current time
            baseItems.push({ 
              key: buildGroupKey(order, item), 
              order, 
              item,
              orderTime: now
            });
          }
        }
      });
    });

    // Group by item type (name + note + source)
    const grouped = new Map<string, { 
      itemName: string; 
      note?: string | null; 
      source?: string | null; 
      category?: string; 
      capacity: number;
      items: { order: Order; item: OrderItem; orderTime: number }[]
    }>();

    baseItems.forEach(({ key, order, item, orderTime }) => {
      if (!grouped.has(key)) {
        grouped.set(key, { 
          itemName: item.name, 
          note: item.note, 
          source: order.source, 
          category: undefined, 
          capacity: getCapacityForItem(item.name),
          items: []
        });
      }
      grouped.get(key)!.items.push({ order, item, orderTime });
    });

    const nextCards: SmartCard[] = [];
    let metaChanged = false;

    for (const [key, g] of grouped.entries()) {
      // Sort items by order time (FIFO)
      g.items.sort((a, b) => a.orderTime - b.orderTime);

      // Create cards based on capacity and merge window
      let processedItems = [...g.items];
      let cardIndex = 0;

      while (processedItems.length > 0) {
        // Initialize card metadata if this is a new card type
        const cardKey = `${key}#${cardIndex}`;
        if (!cardMetaRef.current.has(cardKey)) {
          // Set the card creation time to NOW when the first item is added
          cardMetaRef.current.set(cardKey, { createdAt: now });
          metaChanged = true;
        }

        const createdAt = cardMetaRef.current.get(cardKey)!.createdAt;
        const lockAt = createdAt + 180_000; // 3 minutes until chef starts cooking
        const isQueuing = now < lockAt;
        const status: SmartCardStatus = isQueuing ? 'Queuing' : 'Locked';

        // Fill card up to capacity, respecting merge window
        const entries: SmartCardEntry[] = [];
        let totalQty = 0;
        const itemsToRemove: number[] = [];

        for (let i = 0; i < processedItems.length && totalQty < g.capacity; i++) {
          const currentItem = processedItems[i];
          const itemQty = currentItem.item.qty || 1;
          
          // Merge items that are still queuing (within 3-minute window)
          if (isQueuing) {
            const remainingCapacity = g.capacity - totalQty;
            const useQty = Math.min(itemQty, remainingCapacity);
            
            entries.push({
              orderId: currentItem.order.id,
              itemId: currentItem.item.id,
              qty: useQty,
              note: currentItem.item.note,
              itemName: currentItem.item.name
            });
            
            totalQty += useQty;
            
            // Remove item if fully used
            if (useQty >= itemQty) {
              itemsToRemove.push(i);
            } else {
              // Partially used - update remaining quantity
              processedItems[i] = {
                ...currentItem,
                item: { ...currentItem.item, qty: itemQty - useQty }
              };
              break;
            }
          } else {
            // Merge window closed - only take the first item if this is a new card
            if (i === 0) {
              const remainingCapacity = g.capacity - totalQty;
              const useQty = Math.min(itemQty, remainingCapacity);
              
              entries.push({
                orderId: currentItem.order.id,
                itemId: currentItem.item.id,
                qty: useQty,
                note: currentItem.item.note,
                itemName: currentItem.item.name
              });
              
              totalQty += useQty;
              
              // Remove item if fully used
              if (useQty >= itemQty) {
                itemsToRemove.push(i);
              } else {
                // Partially used - update remaining quantity
                processedItems[i] = {
                  ...currentItem,
                  item: { ...currentItem.item, qty: itemQty - useQty }
                };
              }
            }
            break;
          }
        }

        // Remove processed items (in reverse order to maintain indices)
        itemsToRemove.reverse().forEach(idx => processedItems.splice(idx, 1));

        if (entries.length > 0) {
          const { bgStart: start, bgEnd: end, border } = getSectionColorsForItem(g.itemName);
          // If card is full, immediately mark as Cooking (Locked)
          const isFull = totalQty >= g.capacity;
          const effectiveStatus: SmartCardStatus = isFull ? 'Locked' : status;
          nextCards.push({
            key: cardKey,
            itemName: g.itemName,
            note: g.note,
            source: g.source,
            category: g.category,
            quantity: totalQty,
            status: effectiveStatus,
            colorClass: '',
            bgStart: start,
            bgEnd: end,
            borderHex: border,
            isLead: cardIndex === 0, // first card in this group
            createdAt,
            openUntil: lockAt, // Keep for compatibility
            lockAt: lockAt,
            entries,
            capacity: g.capacity,
          });
        }

        cardIndex++;
      }
    }

    // Sort by creation time only - keep cards in their original order regardless of status
    nextCards.sort((a, b) => a.createdAt - b.createdAt);
    setSmartCards(nextCards);

    // Persist meta if changed
    if (metaChanged) {
      try {
        const obj: Record<string, { createdAt: number }> = {};
        cardMetaRef.current.forEach((v, k) => {
          obj[k] = { createdAt: v.createdAt };
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      } catch {
        // ignore storage errors
      }
    }
  }, [orders]);

  // Recompute smart queue on orders change and every second to update timers
  useEffect(() => {
    recomputeSmartQueue();
    const id = setInterval(() => recomputeSmartQueue(), 1000);
    return () => clearInterval(id);
  }, [recomputeSmartQueue]);

  const completeSmartCard = async (card: SmartCard) => {
    try {
      // Complete all entries in the card with error handling
      const updatePromises = card.entries.map(async (entry) => {
        try {
          return await updateOrderItemStatus(entry.orderId, entry.itemId, 'completed');
        } catch (error) {
          console.error(`Failed to complete item ${entry.itemId} in order ${entry.orderId}:`, error);
          return false;
        }
      });
      
      const results = await Promise.all(updatePromises);
      const successCount = results.filter(r => r === true).length;
      
      if (successCount !== card.entries.length) {
        console.warn(`Only ${successCount}/${card.entries.length} items completed successfully`);
      }
      
      // Remove the card metadata so new orders of the same type get fresh timers
      cardMetaRef.current.delete(card.key);
      
      // Update localStorage to remove this card's metadata
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, { createdAt: number }>;
          delete parsed[card.key];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          console.log(`Removed completed card ${card.key} from localStorage`);
        }
      } catch (error) {
        console.error('Error updating localStorage:', error);
        // Clear corrupted localStorage
        localStorage.removeItem(STORAGE_KEY);
      }
      
      // Refresh with error handling
      setTimeout(() => {
        fetchOrders().catch(err => console.error('Failed to refresh orders:', err));
        fetchHistoryOrders().catch(err => console.error('Failed to refresh history:', err));
      }, 500);
      
    } catch (error) {
      console.error('Error completing smart card:', error);
      // Still try to refresh to get latest state
      setTimeout(() => {
        fetchOrders().catch(err => console.error('Failed to refresh orders:', err));
        fetchHistoryOrders().catch(err => console.error('Failed to refresh history:', err));
      }, 500);
    }
  };

  // Fetch active orders from API
  type SimpleGetOrdersResponse = {
    orders: Array<{
      id: string;
      table_number?: string | null;
      customer_name?: string | null;
      status: 'open' | 'in_progress' | 'ready' | 'served' | 'cancelled' | 'completed';
      placed_at: string;
      started_at?: string | null;
      completed_at?: string | null;
      source: string;
      order_items: Array<{
        id: string;
        qty: number;
        notes?: string | null;
        status: OrderItem['status'];
        predicted_prep_minutes?: number | null;
        started_at?: string | null;
        completed_at?: string | null;
        menu_item: { id: string; name: string };
      }>;
    }>;
  };
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/orders/simple?status=open,in_progress,ready,served');
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        
        const data: SimpleGetOrdersResponse = await response.json();
        
        // Transform database orders to UI format
        const transformedOrders: Order[] = data.orders.map((dbOrder) => ({
          id: dbOrder.id,
          tableNumber: dbOrder.table_number,
          customerName: dbOrder.customer_name,
          status: dbOrder.status,
          timestamp: formatTimeAgo(dbOrder.placed_at),
          placedAt: dbOrder.placed_at,
          startedAt: dbOrder.started_at,
          completedAt: dbOrder.completed_at,
          source: dbOrder.source,
          items: dbOrder.order_items.map((item) => ({
            id: item.id,
            name: item.menu_item.name,
            note: item.notes,
            qty: item.qty,
            status: item.status,
            predicted_prep_minutes: item.predicted_prep_minutes,
            started_at: item.started_at,
            completed_at: item.completed_at
          })),
          specialRequests: dbOrder.order_items
            .filter(item => item.notes)
            .map(item => item.notes)
            .join(', ')
        }));
        
        setOrders(transformedOrders);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders.');
      } finally {
        setLoading(false);
      }
    };

  // Fetch completed orders for history
  const fetchHistoryOrders = async () => {
    try {
      const response = await fetch('/api/orders/simple?status=completed');
      if (!response.ok) {
        throw new Error('Failed to fetch history orders');
      }
      
      const data: GetOrdersResponse = await response.json();
      
      // Transform database orders to UI format
      const transformedHistoryOrders: Order[] = data.orders.map((dbOrder) => ({
        id: dbOrder.id,
        tableNumber: dbOrder.table_number,
        customerName: dbOrder.customer_name,
        status: dbOrder.status,
        timestamp: formatTimeAgo(dbOrder.placed_at),
        startedAt: dbOrder.started_at,
        completedAt: dbOrder.completed_at,
        totalTime: dbOrder.completed_at && dbOrder.started_at 
          ? getElapsedTime(dbOrder.started_at, dbOrder.completed_at)
          : undefined,
        source: dbOrder.source,
        items: dbOrder.order_items.map((item) => ({
          id: item.id,
          name: item.menu_item.name,
          note: item.notes,
          qty: item.qty,
          status: item.status,
          predicted_prep_minutes: item.predicted_prep_minutes,
          started_at: item.started_at,
          completed_at: item.completed_at
        })),
        specialRequests: dbOrder.order_items
          .filter(item => item.notes)
          .map(item => item.notes)
          .join(', ')
      }));
      
      setHistoryOrders(transformedHistoryOrders);
    } catch (err) {
      console.error('Error fetching history orders:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchHistoryOrders();
    
    // Refresh orders every 30 seconds
    const interval = setInterval(() => {
      fetchOrders();
      fetchHistoryOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Kitchen Agents: Station Dispatcher (prioritization) + contextual queue
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setRecsError(null);
        // Disabled: keep placeholder UI without fetching data
        if (!SMART_QUEUE_ENABLED) {
          if (!mounted) return;
          setRecs([]);
          setQueueCtx([]);
          return;
        }
        const dispatcherUrl = `/api/kitchen-agents/station-dispatcher?category=${encodeURIComponent(CATEGORY)}&limit=${encodeURIComponent(String(DISPATCHER_LIMIT))}`;
        const queueUrl = `/api/kitchen-agents/queue?category=${encodeURIComponent(CATEGORY)}&limit=${encodeURIComponent(String(QUEUE_LIMIT))}`;
        const [dispatcherRes, queueRes] = await Promise.all([
          fetch(dispatcherUrl, { cache: 'no-store' }),
          fetch(queueUrl, { cache: 'no-store' }),
        ]);

        if (!mounted) return;

        let fetchedRecs: AgentRecommendation[] = [];
        if (dispatcherRes.ok) {
          const rawRecs = await dispatcherRes.json();
          fetchedRecs = Array.isArray(rawRecs) ? rawRecs : [];
        } else {
          throw new Error(`Dispatcher responded with ${dispatcherRes.status}`);
        }

        let fetchedQueue: QueueItem[] = [];
        if (queueRes.ok) {
          const rawQueue = await queueRes.json();
          fetchedQueue = Array.isArray(rawQueue) ? rawQueue : [];
        }

        setRecs(fetchedRecs);
        setQueueCtx(fetchedQueue);
      } catch (e) {
        if (!mounted) return;
        console.error('Station dispatcher load failed:', e);
        setRecs([]);
        setQueueCtx([]);
        setRecsError('Failed to load station dispatcher');
      }
    };
    load();
    // Skip polling when disabled
    if (!SMART_QUEUE_ENABLED) return () => { mounted = false; };
    const id = setInterval(load, 10000); // ~10s
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [AGENTS_API_BASE, CATEGORY, SMART_QUEUE_ENABLED]);

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const orderTime = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  // Calculate elapsed time from start to now (or completion)
  const getElapsedTime = (startedAt: string | null, completedAt?: string | null): string => {
    if (!startedAt) return '0m';
    
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const diffInMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const updateOrderItemStatus = async (orderId: string, itemId: string, newStatus: OrderItem['status']) => {
    try {
      const request: UpdateOrderItemStatusRequest = {
        order_item_id: itemId,
        status: newStatus
      };

      const response = await fetch(`/api/orders/${orderId}/items/${itemId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to update order item status');
      }

      const data: UpdateOrderItemStatusResponse = await response.json();
      const updatedFromServer = data.orderItem ?? data.order_item ?? null;

      // Update local state
      setOrders(prev => prev.map(order => {
        if (order.id !== orderId) return order;
        const updatedItems = order.items.map(item => {
          const matchesItem = item.id === itemId || (item.id.includes('-') && item.id.split('-')[1] === itemId);
          if (!matchesItem) return item;
          return {
            ...item,
            status: (updatedFromServer?.status as OrderItem['status']) ?? newStatus,
            started_at: updatedFromServer?.started_at ?? item.started_at,
            completed_at: updatedFromServer?.completed_at ?? item.completed_at,
          };
        });
        const allCompleted = updatedItems.length > 0 && updatedItems.every(item => item.status === 'completed');
        return {
          ...order,
          items: updatedItems,
          status: ((updatedFromServer?.status as OrderItem['status']) ?? newStatus) === 'completed' && allCompleted
            ? 'completed'
            : order.status,
        };
      }));

      return true;
    } catch (err) {
      console.error('Error updating order item status:', err);
      setError('Failed to update order item status');
      return false;
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      console.log('Updating order status:', { orderId, newStatus });
      
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update order status');
      }

      const data = await response.json();
      console.log('Order status updated successfully:', data);

      // Update local state
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));

      // If marked as completed, refresh both active orders and history
      if (newStatus === 'completed') {
        setTimeout(() => {
          fetchOrders();
          fetchHistoryOrders();
        }, 1000);
      }

    } catch (error) {
      console.error('Error updating order status:', error);
      alert(`Failed to update order status: ${error.message}`);
    }
  };

  const openOrderModal = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const closeOrderModal = () => {
    setShowOrderModal(false);
    setSelectedOrder(null);
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'open': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'ready': return 'bg-green-500';
      case 'served': return 'bg-gray-500';
      case 'completed': return 'bg-purple-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-neutral-400';
    }
  };

  const getStatusTextColor = (status: Order['status']) => {
    switch (status) {
      case 'served': return 'text-white';
      default: return 'text-white';
    }
  };

  const getItemStatusColor = (status: OrderItem['status']) => {
    switch (status) {
      case 'queued': return 'bg-gray-100 text-gray-800';
      case 'firing': return 'bg-orange-100 text-orange-800';
      case 'prepping': return 'bg-yellow-100 text-yellow-800';
      case 'passed': return 'bg-blue-100 text-blue-800';
      case 'served': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFilteredOrders = () => {
    if (activeFilter === 'history') return historyOrders;
    if (activeFilter === 'all') return orders;
    return orders.filter(order => order.status === activeFilter);
  };

  const getStatusCount = (status: Order['status'] | 'all' | 'history') => {
    if (status === 'history') return historyOrders.length;
    if (status === 'all') return orders.length;
    return orders.filter(order => order.status === status).length;
  };

  const getActiveOrdersCount = () => {
    return orders.filter(order => order.status === 'in_progress' || order.status === 'ready').length;
  };

  // Oldest first for Traditional Queue (leftmost is the oldest)
  const getTraditionalOrdersSorted = () => {
    const list = getFilteredOrders();
    return [...list].sort((a, b) => {
      const aTime = a.placedAt ? new Date(a.placedAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.placedAt ? new Date(b.placedAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime; // ascending → oldest first (leftmost)
    });
  };

  const formatScore = (score?: number | null) => {
    if (typeof score !== 'number' || Number.isNaN(score)) return null;
    return score >= 1 ? score.toFixed(1) : score.toFixed(3);
  };

  // Map agent payload IDs to local dataset (string compare)
  const findOrderByPayload = (payload?: AgentRecommendation['payload']) => {
    if (!payload?.orderid) return undefined;
    return orders.find(o => o.id === String(payload.orderid));
  };

  const findItemByPayload = (order: Order | undefined, payload?: AgentRecommendation['payload']) => {
    if (!order || !payload?.itemid) return undefined;
    const targetId = String(payload.itemid);
    return order.items.find(i => {
      if (i.id === targetId) return true;
      if (i.id.includes('-')) {
        const [, suffix] = i.id.split('-');
        if (suffix === targetId) return true;
      }
      return false;
    });
  };

  const getAllFoodItems = (): SmartQueueFoodItem[] => {
    const seen = new Set<string>();
    const items: SmartQueueFoodItem[] = [];

    recs.forEach(rec => {
      if (!rec.payload) return;
      const order = findOrderByPayload(rec.payload);
      const item = findItemByPayload(order, rec.payload);
      if (!order || !item) return;

      const key = `${order.id}|${item.id}`;
      if (seen.has(key)) return;
      seen.add(key);

      const rawScore = rec.payload?.score;
      const parsedScore = typeof rawScore === 'number'
        ? rawScore
        : typeof rawScore === 'string'
          ? Number(rawScore)
          : undefined;

      items.push({
        order,
        orderId: order.id,
        itemId: item.id,
        itemName: item.name,
        quantity: item.qty,
        note: item.note,
        status: item.status,
        score: parsedScore !== undefined && !Number.isNaN(parsedScore) ? parsedScore : null,
        recommendation: rec,
        predictedPrepMinutes: item.predicted_prep_minutes ?? null,
        startedAt: item.started_at ?? undefined,
      });
    });

    queueCtx.forEach(queueItem => {
      const orderId = String(queueItem.orderid);
      const order = orders.find(o => o.id === orderId);
      const normalizedItemId = String(queueItem.itemid);
      const item = order?.items.find(orderItem => {
        if (orderItem.id === normalizedItemId) return true;
        if (orderItem.id.includes('-')) {
          const [, suffix] = orderItem.id.split('-');
          return suffix === normalizedItemId;
        }
        return false;
      });

      if (!order || !item) return;

      const key = `${order.id}|${item.id}`;
      if (seen.has(key)) return;
      seen.add(key);

      items.push({
        order,
        orderId: order.id,
        itemId: item.id,
        itemName: queueItem.itemname || item.name,
        quantity: queueItem.quantity ?? item.qty,
        note: item.note,
        status: (queueItem.status as OrderItem['status']) ?? item.status,
        queueInfo: queueItem,
        predictedPrepMinutes: item.predicted_prep_minutes ?? queueItem.est_prep_minutes ?? null,
        startedAt: item.started_at ?? undefined,
      });
    });

    return items;
  };

  const handleCompleteFromAgent = async (payload?: AgentRecommendation['payload']) => {
    if (!payload?.orderid || !payload?.itemid) return;
    const order = findOrderByPayload(payload);
    const item = findItemByPayload(order, payload);
    const orderId = order?.id ?? String(payload.orderid);
    const itemId = item?.id ?? String(payload.itemid);
    const success = await updateOrderItemStatus(orderId, itemId, 'completed');
    if (!success) return;
    setRecs(prev => prev.filter(r => r.payload?.orderid !== payload.orderid || r.payload?.itemid !== payload.itemid));
    setQueueCtx(prev => prev.filter(q => q.orderid !== payload.orderid || q.itemid !== payload.itemid));
  };

  const renderOrderCard = (order: Order) => (
    <>
              {/* Order Header */}
              <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-bold text-neutral-900">#{order.id}</span>
                    <span className="text-sm text-neutral-600">Table {order.tableNumber}</span>
                    <span className="flex items-center text-sm text-neutral-500">
                      <Clock className="h-4 w-4 mr-1" />
                      {order.timestamp}
                    </span>
            {order.startedAt && (
              <span className="flex items-center text-sm font-medium text-blue-600">
                <Clock className="h-4 w-4 mr-1" />
                {getElapsedTime(order.startedAt, order.completedAt)}
              </span>
            )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)} ${getStatusTextColor(order.status)}`}>
                    {order.status === 'open' ? 'New Order' : 
                     order.status === 'in_progress' ? 'In Progress' :
                     order.status === 'ready' ? 'Ready' : 
             order.status === 'served' ? 'Served' : 
             order.status === 'completed' ? 'Completed' : 'Cancelled'}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-sm text-neutral-600">{order.customerName}</span>
                </div>
              </div>

              {/* Order Items */}
              <div className="p-4">
                <div className="space-y-2 mb-4">
                  {order.items.map((item, index) => (
                    <div key={item.id} className="flex items-start space-x-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-neutral-900 text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-neutral-900">
                            {item.name} {item.qty > 1 && `(x${item.qty})`}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getItemStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                        {item.note && (
                          <div className="text-sm text-neutral-600 italic">Note: {item.note}</div>
                        )}
                        {item.predicted_prep_minutes && (
                          <div className="text-xs text-neutral-500">
                            Est. {item.predicted_prep_minutes} min
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {order.specialRequests && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <div className="text-sm font-medium text-amber-800 mb-1">Special Requests:</div>
                    <div className="text-sm text-amber-700">{order.specialRequests}</div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex space-x-2 mb-2">
                    <button
                      onClick={() => openOrderModal(order)}
                      className="flex-1 bg-neutral-100 text-neutral-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-neutral-200 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Details</span>
                    </button>
                  </div>
                  
                  {order.status === 'in_progress' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      Mark Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'served')}
                      className="w-full bg-neutral-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Check className="h-4 w-4" />
                      <span>Mark Served</span>
                    </button>
                  )}
                  {order.status === 'served' && (
            <button
              onClick={() => updateOrderStatus(order.id, 'completed')}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Check className="h-4 w-4" />
              <span>Complete Order</span>
            </button>
                  )}
                  
                  {/* Individual Item Actions */}
                  {order.status === 'in_progress' && (
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs">
                          <span className="text-neutral-600">{item.name}</span>
                          <div className="flex space-x-1">
                            {item.status === 'queued' && (
                              <button
                                onClick={() => updateOrderItemStatus(order.id, item.id, 'prepping')}
                                className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                              >
                                Start
                              </button>
                            )}
                            {item.status === 'prepping' && (
                              <button
                                onClick={() => updateOrderItemStatus(order.id, item.id, 'passed')}
                                className="px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                              >
                                Pass
                              </button>
                            )}
                            {item.status === 'passed' && (
                              <button
                                onClick={() => updateOrderItemStatus(order.id, item.id, 'served')}
                                className="px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                              >
                                Serve
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
    </>
  );

  const renderCompactFoodItemCard = (foodItem: SmartQueueFoodItem, position: number) => {
    const waitMinutes = typeof foodItem.queueInfo?.wait_minutes === 'number'
      ? Math.max(0, Math.round(foodItem.queueInfo.wait_minutes))
      : null;
    const remainingItems = typeof foodItem.queueInfo?.remaining_items === 'number'
      ? Math.max(0, foodItem.queueInfo.remaining_items)
      : null;
    const estPrepMinutes = typeof foodItem.predictedPrepMinutes === 'number'
      ? Math.max(0, Math.round(foodItem.predictedPrepMinutes))
      : null;
    const placementText = foodItem.order.placedAt
      ? formatTimeAgo(foodItem.order.placedAt)
      : foodItem.order.timestamp;
    const payload = foodItem.recommendation?.payload;
    const showCompleteButton = Boolean(payload?.orderid && payload?.itemid);
    const formattedScore = formatScore(foodItem.score);

    return (
      <>
        <div className="bg-white px-3 py-2 border-b border-purple-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                {position}
              </span>
              <div>
                <div className="text-sm font-semibold text-neutral-900 truncate">
                  {foodItem.itemName}
                </div>
                <div className="text-xs text-neutral-600">
                  Order #{foodItem.orderId}
                  {foodItem.order.tableNumber && (
                    <span className="ml-1">· T{foodItem.order.tableNumber}</span>
                  )}
                </div>
              </div>
            </div>
            {formattedScore && (
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                Score {formattedScore}
              </span>
            )}
          </div>
        </div>
        <div className="p-3 space-y-2 bg-white">
          <div className="flex items-center justify-between text-xs text-neutral-600">
            <div className="flex items-center space-x-1">
              <Utensils className="h-3 w-3" />
              <span>
                {foodItem.quantity} item{foodItem.quantity !== 1 ? 's' : ''}
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getItemStatusColor(foodItem.status)}`}>
              {foodItem.status}
            </span>
          </div>

          {foodItem.note && (
            <div className="bg-purple-50 border border-purple-200 text-xs text-purple-800 rounded px-2 py-1">
              {foodItem.note}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600">
            {waitMinutes !== null && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Waiting {waitMinutes}m</span>
              </div>
            )}
            {estPrepMinutes !== null && (
              <div className="text-right">
                Est. prep {estPrepMinutes}m
              </div>
            )}
            {remainingItems !== null && (
              <div className="col-span-2 text-neutral-600">
                {remainingItems} item{remainingItems !== 1 ? 's' : ''} remain in order queue
              </div>
            )}
            {foodItem.queueInfo?.sla_overdue && (
              <div className="col-span-2 text-xs font-semibold text-red-600">
                SLA overdue - expedite!
              </div>
            )}
          </div>

          {foodItem.recommendation?.reason && (
            <div className="text-xs text-neutral-600 italic overflow-hidden text-ellipsis">
              {foodItem.recommendation.reason}
            </div>
          )}

          <div
            className="flex items-center justify-between pt-2 border-t border-purple-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-xs text-neutral-500">
              Placed {placementText}
            </div>
            {showCompleteButton && (
              <button
                type="button"
                onClick={() => handleCompleteFromAgent(payload)}
                className="bg-purple-600 text-white text-xs font-medium px-2 py-1 rounded hover:bg-purple-700 transition-colors"
              >
                Complete Item
              </button>
            )}
          </div>
        </div>
      </>
    );
  };


  // Render history order card with completion details
  const renderHistoryOrderCard = (order: Order) => (
    <>
      {/* Order Header */}
      <div className="bg-purple-50 px-2 py-1.5 border-b border-purple-200">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-neutral-900">#{order.id}</span>
          <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-500 text-white">
            Completed
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-neutral-600">
          <span>T{order.tableNumber}</span>
          <div className="flex flex-col items-end">
            <span className="flex items-center">
              <Clock className="h-3 w-3 mr-0.5" />
              {order.timestamp}
            </span>
            {order.totalTime && (
              <span className="text-xs font-medium text-purple-600">
                Total: {order.totalTime}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="p-2">
        <div className="space-y-1 mb-2">
          {order.items.slice(0, 3).map((item, index) => (
            <div key={item.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {index + 1}
                </span>
                <span className="font-medium truncate">{item.name}</span>
                {item.qty > 1 && <span className="text-neutral-500">x{item.qty}</span>}
              </div>
              <span className="px-1 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✓
              </span>
            </div>
          ))}
          {order.items.length > 3 && (
            <div className="text-xs text-neutral-500 text-center">
              +{order.items.length - 3} more
            </div>
          )}
        </div>

        {order.specialRequests && (
          <div className="bg-purple-50 border border-purple-200 rounded p-1 mb-2">
            <div className="text-xs text-purple-800 font-medium mb-0.5">Special Requests:</div>
            <div className="text-xs text-purple-700 truncate">{order.specialRequests}</div>
          </div>
        )}

        {/* View Details Button */}
        <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openOrderModal(order)}
            className="w-full bg-purple-100 text-purple-700 py-1 px-2 rounded text-xs font-medium hover:bg-purple-200 transition-colors flex items-center justify-center space-x-1"
          >
            <Eye className="h-3 w-3" />
            <span>View Details</span>
          </button>
        </div>
      </div>
    </>
  );

  // Render mini order card for Traditional Queue
  const renderMiniOrderCard = (order: Order) => (
    <>
      {/* Order Header */}
      <div className="bg-neutral-50 px-2 py-1.5 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-neutral-900">#{order.id}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)} ${getStatusTextColor(order.status)}`}>
            {order.status === 'open' ? 'New' : 
             order.status === 'in_progress' ? 'Active' :
             order.status === 'ready' ? 'Ready' : 
             order.status === 'served' ? 'Served' : 
             order.status === 'completed' ? 'Done' : 'Cancelled'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-neutral-600">
          <span>T{order.tableNumber}</span>
          <div className="flex flex-col items-end">
            <span className="flex items-center">
              <Clock className="h-3 w-3 mr-0.5" />
              {order.timestamp}
            </span>
            {order.startedAt && (
              <span className="text-xs font-medium text-blue-600">
                {getElapsedTime(order.startedAt, order.completedAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Order Items - Mini */}
      <div className="p-2">
        <div className="space-y-1 mb-2">
          {order.items.slice(0, 2).map((item, index) => (
            <div key={item.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-neutral-900 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {index + 1}
                </span>
                <span className="font-medium truncate">{item.name}</span>
                {item.qty > 1 && <span className="text-neutral-500">x{item.qty}</span>}
              </div>
              <span className={`px-1 py-0.5 rounded-full text-xs font-medium ${getItemStatusColor(item.status)}`}>
                {item.status === 'queued' ? 'Q' :
                 item.status === 'prepping' ? 'P' :
                 item.status === 'passed' ? 'D' :
                 item.status === 'served' ? 'S' :
                 item.status === 'completed' ? 'C' : '•'}
              </span>
            </div>
          ))}
          {order.items.length > 2 && (
            <div className="text-xs text-neutral-500 text-center">
              +{order.items.length - 2} more
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openOrderModal(order)}
            className="w-full bg-neutral-100 text-neutral-700 py-1 px-2 rounded text-xs font-medium hover:bg-neutral-200 transition-colors flex items-center justify-center space-x-1"
          >
            <Eye className="h-3 w-3" />
            <span>View</span>
          </button>
          
          {(order.status === 'in_progress' || order.status === 'open') && (
            <button
              onClick={() => updateOrderStatus(order.id, 'ready')}
              className="w-full bg-green-600 text-white py-1 px-2 rounded text-xs font-medium hover:bg-green-700 transition-colors"
            >
              Ready
            </button>
          )}
          {order.status === 'ready' && (
            <button
              onClick={() => updateOrderStatus(order.id, 'served')}
              className="w-full bg-neutral-900 text-white py-1 px-2 rounded text-xs font-medium hover:bg-neutral-800 transition-colors flex items-center justify-center space-x-1"
            >
              <Check className="h-3 w-3" />
              <span>Serve</span>
            </button>
          )}
          {order.status === 'served' && (
            <button
              onClick={() => updateOrderStatus(order.id, 'completed')}
              className="w-full bg-purple-600 text-white py-1 px-2 rounded text-xs font-medium hover:bg-purple-700 transition-colors flex items-center justify-center space-x-1"
            >
              <Check className="h-3 w-3" />
              <span>Complete</span>
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-neutral-900">Kitchen Display System</h1>
              <nav className="hidden md:flex items-center space-x-6">
                <Link
                  href="/"
                  className="flex items-center space-x-1 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  <Utensils className="h-4 w-4" />
                  <span>Menu</span>
                </Link>
                <Link
                  href="/manager"
                  className="flex items-center space-x-1 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  <ChefHat className="h-4 w-4" />
                  <span>Kitchen Manager</span>
                </Link>
              </nav>
            </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-neutral-600">
                  Manage and track restaurant orders in real-time
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-neutral-700">Active Orders:</span>
                  <span className="bg-status-new text-white px-2 py-1 rounded text-sm font-bold">
                    {getActiveOrdersCount()}
                  </span>
                </div>
              </div>
          </div>
        </div>
      </header>

      {/* Queue Type Selector */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-neutral-900">Kitchen Queues</h2>
              <div className="flex space-x-1">
                {[
                  { key: 'all', label: 'All Orders' },
                  { key: 'in_progress', label: 'In Progress' },
                  { key: 'ready', label: 'Ready' },
                  { key: 'served', label: 'Served' },
                  { key: 'cancelled', label: 'Cancelled' },
                  { key: 'history', label: 'History' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveFilter(key as any)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                      activeFilter === key
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      activeFilter === key ? 'bg-white text-neutral-900' : 'bg-white text-neutral-600'
                    }`}>
                      {getStatusCount(key as any)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Two Queue Sections */}
      <main className="flex-1 bg-neutral-100" style={{ height: 'calc(100vh - 140px)' }}>
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mx-4 mt-4">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm text-red-800">{error}</div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-600" />
              <span className="text-neutral-600">Loading orders...</span>
            </div>
          </div>
        )}

        {/* Content Based on Active Filter */}
        {!loading && (
          <>
            {/* History View */}
            {activeFilter === 'history' ? (
              <div className="p-3 h-full">
                <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden h-full">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-2 border-b border-neutral-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-purple-600" />
                        <div>
                          <h3 className="text-sm font-semibold text-neutral-900">Order History</h3>
                          <p className="text-xs text-neutral-600">Recently completed orders</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-neutral-700">Completed:</span>
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-bold">
                          {historyOrders.length}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2 h-full">
                    <div className="relative h-full">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 overflow-y-auto pb-1 custom-scrollbar h-full">
                        {historyOrders.length > 0 ? (
                          historyOrders.map((order) => (
                            <div key={order.id} className="bg-white rounded-lg border border-purple-200 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5" onClick={() => openOrderModal(order)}>
                              {renderHistoryOrderCard(order)}
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-8">
                            <div className="text-neutral-400 mb-2">
                              <Clock className="h-8 w-8 mx-auto" />
                            </div>
                            <h3 className="text-sm font-semibold text-neutral-900 mb-1">No Completed Orders</h3>
                            <p className="text-sm text-neutral-600">Completed orders will appear here</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Active Orders View - Two Queue Sections */
              <div className="flex flex-col gap-3 p-3 h-full">
                {/* AI Smart Queue Section - Top Half */}
                <div className="flex-1 bg-white rounded-lg border border-neutral-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-2 border-b border-neutral-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Brain className="h-4 w-4 text-purple-600" />
                        <div>
                          <h3 className="text-sm font-semibold text-neutral-900">AI Smart Queue</h3>
                          <p className="text-xs text-neutral-600">Cook these items first for efficiency</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-neutral-700">Cards:</span>
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-bold">
                          {smartCards.length}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2 h-full">
                    <div className="relative h-full">
                      <div className="flex space-x-2 overflow-x-auto pb-1 custom-scrollbar horizontal-scroll h-full">
                        {smartCards.length > 0 ? (
                          smartCards.map((card, index) => (
                          <div
                            key={card.key}
                            className={`flex-shrink-0 w-80 rounded-lg border overflow-hidden hover:shadow-md transition-all duration-200`}
                            style={{
                              backgroundImage: `linear-gradient(135deg, ${card.bgStart || '#fafafa'}, ${card.bgEnd || '#f5f5f5'})`,
                              borderColor: card.borderHex || '#e5e7eb'
                            }}
                          >
                              <div className="px-3 py-2 border-b border-white/30 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-6 h-6 rounded-full bg-white/90 text-gray-800 text-xs font-bold flex items-center justify-center shadow-sm border border-white/50">{index + 1}</span>
                                    <div>
                                      <div className="text-sm font-bold text-gray-900 truncate drop-shadow-sm">{card.itemName}</div>
                                      <div className="text-xs text-gray-700 font-medium">Qty {card.quantity} · Cap {card.capacity}</div>
                                    </div>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm ${card.status === 'Queuing' ? 'bg-blue-500/20 text-blue-800 border border-blue-400/30' : 'bg-orange-500/20 text-orange-800 border border-orange-400/30'}`}>
                                    {card.status === 'Queuing' ? (card.isLead ? 'Queuing' : 'Queued') : 'Cooking'}
                                  </span>
                                </div>
                              </div>
                              <div className="p-3 space-y-2">
                                {card.note && (
                                  <div className="bg-white/80 backdrop-blur-sm border border-white/50 text-xs text-gray-800 rounded-lg px-2 py-1.5 font-medium shadow-sm">{card.note}</div>
                                )}
                                {card.status === 'Queuing' && card.isLead && (
                                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-3 w-3 text-gray-600" />
                                      <span className="font-medium">
                                        {(() => {
                                          const now = Date.now();
                                          const timeLeft = Math.max(0, Math.ceil((card.lockAt - now)/1000));
                                          return `Queuing ${timeLeft}s`;
                                        })()}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center justify-between pt-2 border-t border-white/30" onClick={e => e.stopPropagation()}>
                                  <div className="text-xs text-gray-600 font-medium">{card.entries.length} order(s)</div>
                                  <button
                                    type="button"
                                    onClick={() => completeSmartCard(card)}
                                    className="bg-white/90 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white transition-all duration-200 shadow-sm border border-white/50 backdrop-blur-sm"
                                  >
                                    Done
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex-1 text-center py-4">
                            <div className="text-neutral-400 mb-2">
                              <Brain className="h-6 w-6 mx-auto" />
                            </div>
                            <h3 className="text-xs font-semibold text-neutral-900 mb-1">No Items to Cook</h3>
                            <p className="text-xs text-neutral-600">AI queue is ready for new orders</p>
                          </div>
                        )}
                      </div>
                      {/* Scroll indicator */}
                      {smartCards.length > 4 && (
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white shadow-md rounded-full p-1 border border-neutral-200">
                          <ArrowRight className="h-3 w-3 text-neutral-600" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Traditional Queue Section - Bottom Half */}
                <div className="flex-1 bg-white rounded-lg border border-neutral-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 border-b border-neutral-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ChefHat className="h-4 w-4 text-green-600" />
                        <div>
                          <h3 className="text-sm font-semibold text-neutral-900">Traditional Queue</h3>
                          <p className="text-xs text-neutral-600">Complete orders by table</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-neutral-700">Orders:</span>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                          {getFilteredOrders().length}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2 h-full">
                    <div className="relative h-full">
                      <div className="flex space-x-2 overflow-x-auto pb-1 custom-scrollbar horizontal-scroll h-full">
                        {getTraditionalOrdersSorted().length > 0 ? (
                          getTraditionalOrdersSorted().map((order) => (
                            <div key={order.id} className="flex-shrink-0 w-80 bg-white rounded-lg border border-neutral-200 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5" onClick={() => openOrderModal(order)}>
                              {renderMiniOrderCard(order)}
                            </div>
                          ))
                        ) : (
                          <div className="flex-1 text-center py-4">
                            <div className="text-neutral-400 mb-2">
                              <ChefHat className="h-6 w-6 mx-auto" />
            </div>
                            <h3 className="text-xs font-semibold text-neutral-900 mb-1">No Orders Found</h3>
                            <p className="text-xs text-neutral-600">
              {activeFilter === 'all' 
                ? "No orders in the system yet."
                : `No orders with status "${activeFilter}" found.`
              }
            </p>
          </div>
                        )}
                      </div>
                      {/* Scroll indicator */}
                      {getTraditionalOrdersSorted().length > 4 && (
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white shadow-md rounded-full p-1 border border-neutral-200">
                          <ArrowRight className="h-3 w-3 text-neutral-600" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={showOrderModal}
          onClose={closeOrderModal}
          onUpdateItemStatus={updateOrderItemStatus}
          onUpdateOrderStatus={updateOrderStatus}
        />
      )}
    </div>
  );
}
