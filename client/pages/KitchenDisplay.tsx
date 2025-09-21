"use client";
import React, { useState, useEffect } from 'react';
import { Clock, Plus, Check, Utensils, ChefHat, Loader2, Eye, Brain, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { GetOrdersResponse, UpdateOrderItemStatusRequest, UpdateOrderItemStatusResponse } from '@shared/api';
import OrderDetailsModal from '@/components/OrderDetailsModal';

interface OrderItem {
  id: string;
  name: string;
  note?: string;
  qty: number;
  status: 'queued' | 'firing' | 'prepping' | 'passed' | 'served' | 'cancelled';
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
  startedAt?: string;
  completedAt?: string;
  totalTime?: string;
  source: string;
}

// Default orders (fallback)
const defaultOrders: Order[] = [
  {
    id: '001',
    tableNumber: '12',
    customerName: 'Johnson',
    status: 'in_progress',
    timestamp: '2:04',
    source: 'dine_in',
    items: [
      { id: '1', name: 'Grilled Salmon', note: 'Medium rare', qty: 1, status: 'prepping' },
      { id: '2', name: 'Caesar Salad', qty: 1, status: 'queued' },
      { id: '3', name: 'Garlic Bread', note: 'Extra garlic', qty: 1, status: 'queued' }
    ],
    specialRequests: 'No onions, extra lemon on the side'
  }
];

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>(defaultOrders);
  const [activeFilter, setActiveFilter] = useState<'all' | 'in_progress' | 'ready' | 'served' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/orders/simple?status=in_progress,ready,served');
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        
        const data: GetOrdersResponse = await response.json();
        
        // Transform database orders to UI format
        const transformedOrders: Order[] = data.orders.map((dbOrder) => ({
          id: dbOrder.id,
          tableNumber: dbOrder.table_number,
          customerName: dbOrder.customer_name,
          status: dbOrder.status,
          timestamp: formatTimeAgo(dbOrder.placed_at),
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
        setError('Failed to load orders. Using sample data.');
        // Keep default orders as fallback
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    
    // Refresh orders every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

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
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? {
              ...order,
              items: order.items.map(item =>
                item.id === itemId 
                  ? { ...item, status: newStatus }
                  : item
              )
            }
          : order
      ));
    } catch (err) {
      console.error('Error updating order item status:', err);
      setError('Failed to update order item status');
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

      // If marked as completed, refresh the orders list to remove completed orders
      if (newStatus === 'completed') {
        setTimeout(() => {
          // Refresh orders by calling the fetch function
          const refreshOrders = async () => {
            try {
              const response = await fetch('/api/orders/simple?status=in_progress,ready,served');
              if (response.ok) {
                const data = await response.json();
                const transformedOrders = data.orders.map((dbOrder: any) => ({
                  id: dbOrder.id,
                  tableNumber: dbOrder.table_number,
                  customerName: dbOrder.customer_name,
                  status: dbOrder.status,
                  timestamp: formatTimeAgo(dbOrder.placed_at),
                  source: dbOrder.source,
                  items: dbOrder.order_items.map((item: any) => ({
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
                    .filter((item: any) => item.notes)
                    .map((item: any) => item.notes)
                    .join(', ')
                }));
                setOrders(transformedOrders);
              }
            } catch (error) {
              console.error('Error refreshing orders:', error);
            }
          };
          refreshOrders();
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
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFilteredOrders = () => {
    if (activeFilter === 'all') return orders;
    return orders.filter(order => order.status === activeFilter);
  };

  const getStatusCount = (status: Order['status'] | 'all') => {
    if (status === 'all') return orders.length;
    return orders.filter(order => order.status === status).length;
  };

  const getActiveOrdersCount = () => {
    return orders.filter(order => order.status === 'in_progress' || order.status === 'ready').length;
  };

  // Helper function to get all food items from orders for AI queue
  const getAllFoodItems = () => {
    const allItems: Array<{
      orderId: string;
      itemId: string;
      name: string;
      qty: number;
      note?: string;
      status: OrderItem['status'];
      predicted_prep_minutes?: number;
      order: Order;
    }> = [];

    getFilteredOrders().forEach(order => {
      order.items.forEach(item => {
        if (item.status === 'queued' || item.status === 'prepping') {
          allItems.push({
            orderId: order.id,
            itemId: item.id,
            name: item.name,
            qty: item.qty,
            note: item.note,
            status: item.status,
            predicted_prep_minutes: item.predicted_prep_minutes,
            order: order
          });
        }
      });
    });

    // Sort by predicted prep time (shortest first) for AI efficiency
    return allItems.sort((a, b) => {
      const aTime = a.predicted_prep_minutes || 999;
      const bTime = b.predicted_prep_minutes || 999;
      return aTime - bTime;
    });
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

  // Render compact food item card for AI Smart Queue
  const renderCompactFoodItemCard = (foodItem: any, priority: number) => (
    <>
      {/* Priority Badge */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-2 py-1.5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="bg-white text-purple-600 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">
              {priority}
            </span>
            <span className="text-xs font-semibold">#{foodItem.orderId}</span>
          </div>
          <span className="text-xs bg-white bg-opacity-20 px-1.5 py-0.5 rounded-full">
            T{foodItem.order.tableNumber}
          </span>
        </div>
      </div>

      {/* Food Item Details */}
      <div className="p-2">
        <div className="text-center mb-2">
          <h3 className="text-sm font-bold text-neutral-900 mb-1">{foodItem.name}</h3>
          <div className="flex items-center justify-center space-x-1.5">
            <span className="text-lg font-bold text-purple-600">x{foodItem.qty}</span>
            {foodItem.predicted_prep_minutes && (
              <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full">
                {foodItem.predicted_prep_minutes}m
              </span>
            )}
          </div>
        </div>

        {foodItem.note && (
          <div className="bg-amber-50 border border-amber-200 rounded p-1.5 mb-2">
            <div className="text-xs text-amber-800 font-medium mb-0.5">Note:</div>
            <div className="text-xs text-amber-700 truncate">{foodItem.note}</div>
          </div>
        )}

        {/* Status and Actions */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getItemStatusColor(foodItem.status)}`}>
              {foodItem.status === 'queued' ? 'Q' : 'P'}
            </span>
            <span className="text-xs text-neutral-500">
              {formatTimeAgo(foodItem.order.timestamp)}
            </span>
          </div>
          
          <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
            {foodItem.status === 'queued' && (
              <button
                onClick={() => updateOrderItemStatus(foodItem.orderId, foodItem.itemId, 'prepping')}
                className="w-full bg-purple-600 text-white py-1.5 px-2 rounded text-xs font-medium hover:bg-purple-700 transition-colors"
              >
                Start
              </button>
            )}
            {foodItem.status === 'prepping' && (
              <button
                onClick={() => updateOrderItemStatus(foodItem.orderId, foodItem.itemId, 'passed')}
                className="w-full bg-blue-600 text-white py-1.5 px-2 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            )}
          </div>
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
                 item.status === 'passed' ? 'D' : 'S'}
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
          
          {order.status === 'in_progress' && (
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
                  { key: 'cancelled', label: 'Cancelled' }
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

        {/* Two Queue Sections - Top and Bottom */}
        {!loading && (
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
                    <span className="text-xs font-medium text-neutral-700">Items:</span>
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-bold">
                      {getAllFoodItems().length}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-2 h-full">
                <div className="relative h-full">
                  <div className="flex space-x-2 overflow-x-auto pb-1 custom-scrollbar horizontal-scroll h-full">
                    {getAllFoodItems().length > 0 ? (
                      getAllFoodItems().map((foodItem, index) => (
                        <div key={`${foodItem.orderId}-${foodItem.itemId}`} className="flex-shrink-0 w-80 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5" onClick={() => openOrderModal(foodItem.order)}>
                          {renderCompactFoodItemCard(foodItem, index + 1)}
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
                  {getAllFoodItems().length > 4 && (
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
                    {getFilteredOrders().length > 0 ? (
                      getFilteredOrders().map((order) => (
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
                  {getFilteredOrders().length > 4 && (
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white shadow-md rounded-full p-1 border border-neutral-200">
                      <ArrowRight className="h-3 w-3 text-neutral-600" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
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
