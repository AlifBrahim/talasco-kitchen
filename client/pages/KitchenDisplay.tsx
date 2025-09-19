"use client";
import React, { useState } from 'react';
import { Clock, Plus, Check, Utensils, ChefHat } from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  name: string;
  note?: string;
}

interface Order {
  id: string;
  tableNumber: string;
  customerName: string;
  status: 'new' | 'preparing' | 'ready' | 'completed';
  items: OrderItem[];
  specialRequests?: string;
  timestamp: string;
  totalTime?: string;
}

const sampleOrders: Order[] = [
  {
    id: '001',
    tableNumber: '12',
    customerName: 'Johnson',
    status: 'new',
    timestamp: '2:04',
    items: [
      { name: 'Grilled Salmon', note: 'Medium rare' },
      { name: 'Caesar Salad' },
      { name: 'Garlic Bread', note: 'Extra garlic' }
    ],
    specialRequests: 'No onions, extra lemon on the side'
  },
  {
    id: '004',
    tableNumber: '3',
    customerName: 'Wilson',
    status: 'new',
    timestamp: '1:04',
    items: [
      { name: 'Fish Tacos' },
      { name: 'Loaded Nachos', note: 'No jalapeños' },
      { name: 'Margarita' }
    ],
    specialRequests: 'Gluten-free tortillas for tacos'
  },
  {
    id: '005',
    tableNumber: '22',
    customerName: 'Thompson',
    status: 'preparing',
    timestamp: '15:04',
    items: [
      { name: 'Lobster Bisque' },
      { name: 'Filet Mignon', note: 'Medium' },
      { name: 'Asparagus' }
    ]
  },
  {
    id: '002',
    tableNumber: '8',
    customerName: 'Martinez',
    status: 'preparing',
    timestamp: '8:04',
    items: [
      { name: 'Ribeye Steak', note: 'Well done' },
      { name: 'Mashed Potatoes' },
      { name: 'Steamed Broccoli' }
    ]
  },
  {
    id: '003',
    tableNumber: '15',
    customerName: 'Chen',
    status: 'ready',
    timestamp: '12:05',
    items: [
      { name: 'Chicken Parmesan' },
      { name: 'Spaghetti Marinara' },
      { name: 'House Salad', note: 'Dressing on the side' }
    ]
  },
  {
    id: '006',
    tableNumber: '7',
    customerName: 'Davis',
    status: 'completed',
    timestamp: '25:05',
    items: [
      { name: 'Burger & Fries' },
      { name: 'Chicken Wings', note: 'Buffalo sauce' }
    ]
  }
];

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>(sampleOrders);
  const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'preparing' | 'ready' | 'completed'>('all');

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'new': return 'bg-status-new';
      case 'preparing': return 'bg-status-preparing';
      case 'ready': return 'bg-status-ready';
      case 'completed': return 'bg-status-completed';
      default: return 'bg-neutral-400';
    }
  };

  const getStatusTextColor = (status: Order['status']) => {
    switch (status) {
      case 'completed': return 'text-neutral-600';
      default: return 'text-white';
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
    return orders.filter(order => order.status === 'new' || order.status === 'preparing').length;
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
              { key: 'new', label: 'New' },
              { key: 'preparing', label: 'Preparing' },
              { key: 'ready', label: 'Ready' },
              { key: 'completed', label: 'Completed' }
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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {getFilteredOrders().map((order) => (
            <div key={order.id} className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
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
                    {order.status === 'new' ? 'New Order' : 
                     order.status === 'preparing' ? 'Preparing' :
                     order.status === 'ready' ? 'Ready' : 'Completed'}
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
                    <div key={index} className="flex items-start space-x-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-neutral-900 text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-neutral-900">{item.name}</div>
                        {item.note && (
                          <div className="text-sm text-neutral-600 italic">Note: {item.note}</div>
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
                <div className="flex space-x-2">
                  {order.status === 'new' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="flex-1 bg-neutral-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
                    >
                      Start Preparing
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="flex-1 bg-neutral-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
                    >
                      Mark Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="flex-1 bg-neutral-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Check className="h-4 w-4" />
                      <span>Complete</span>
                    </button>
                  )}
                  {order.status === 'completed' && (
                    <div className="flex-1 text-center py-2 px-4 text-sm text-neutral-500 font-medium">
                      Order Completed
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {getFilteredOrders().length === 0 && (
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
    </div>
  );
}
