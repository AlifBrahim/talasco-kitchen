"use client";
import React, { useState, useEffect } from 'react';
import { Clock, Plus, Check, Utensils, ChefHat, Loader2, Eye } from 'lucide-react';
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
  status: 'open' | 'in_progress' | 'ready' | 'served' | 'cancelled';
  items: OrderItem[];
  specialRequests?: string;
  timestamp: string;
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
        
        const response = await fetch('/api/orders?status=in_progress,ready');
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

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
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
    return orders.filter(order => order.status === 'open' || order.status === 'in_progress').length;
  };

  return (
    <div className="min-h-screen bg-neutral-100">
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
              <button className="bg-neutral-900 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-neutral-800 transition-colors">
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">Add Test Order</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Status Filter */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 py-4">
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
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
          </nav>
        </div>
      </div>

      {/* Orders Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
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

        {/* Orders Grid */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {getFilteredOrders().map((order) => (
            <div key={order.id} className="bg-white rounded-lg border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => openOrderModal(order)}>
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
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)} ${getStatusTextColor(order.status)}`}>
                    {order.status === 'open' ? 'New Order' : 
                     order.status === 'in_progress' ? 'In Progress' :
                     order.status === 'ready' ? 'Ready' : 
                     order.status === 'served' ? 'Served' : 'Cancelled'}
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
                  
                  {order.status === 'open' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'in_progress')}
                      className="w-full bg-neutral-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
                    >
                      Start Order
                    </button>
                  )}
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
                    <div className="w-full text-center py-2 px-4 text-sm text-neutral-500 font-medium">
                      Order Served
                    </div>
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
            </div>
          ))}
          </div>
        )}

        {!loading && getFilteredOrders().length === 0 && (
          <div className="text-center py-12">
            <div className="text-neutral-400 mb-4">
              <Clock className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Orders Found</h3>
            <p className="text-neutral-600">
              {activeFilter === 'all' 
                ? "No orders in the system yet."
                : `No orders with status "${activeFilter}" found.`
              }
            </p>
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
