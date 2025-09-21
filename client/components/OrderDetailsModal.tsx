"use client";
import React, { useState } from 'react';
import { X, Clock, User, MapPin, Phone, ChefHat, AlertCircle, CheckCircle } from 'lucide-react';

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
  source: string;
}

interface OrderDetailsModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onUpdateItemStatus: (orderId: string, itemId: string, status: OrderItem['status']) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
}

export default function OrderDetailsModal({ 
  order, 
  isOpen, 
  onClose, 
  onUpdateItemStatus, 
  onUpdateOrderStatus 
}: OrderDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'items' | 'timeline' | 'notes'>('items');

  if (!isOpen) return null;

  const getStatusColor = (status: OrderItem['status']) => {
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

  const getOrderStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'open': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'ready': return 'bg-green-500';
      case 'served': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Not started';
    return new Date(timeString).toLocaleTimeString();
  };

  const getElapsedTime = (startTime?: string) => {
    if (!startTime) return null;
    const now = new Date();
    const start = new Date(startTime);
    const diffInMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
    return `${diffInMinutes}m`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">Order #{order.id}</h2>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-sm text-neutral-600">
                  {order.tableNumber ? `Table ${order.tableNumber}` : 'Takeout'}
                </span>
                <span className="text-sm text-neutral-600">
                  {order.customerName || 'Walk-in Customer'}
                </span>
                <span className="text-sm text-neutral-600">
                  {order.source.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getOrderStatusColor(order.status)}`}>
                {order.status.replace('_', ' ').toUpperCase()}
              </span>
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-200 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'items', label: 'Order Items', icon: <ChefHat className="h-4 w-4" /> },
              { key: 'timeline', label: 'Timeline', icon: <Clock className="h-4 w-4" /> },
              { key: 'notes', label: 'Notes', icon: <AlertCircle className="h-4 w-4" /> }
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === key
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'items' && (
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={item.id} className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 bg-neutral-900 text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="font-medium text-neutral-900">
                          {item.name} {item.qty > 1 && `(x${item.qty})`}
                        </h3>
                        {item.note && (
                          <p className="text-sm text-neutral-600 italic">Note: {item.note}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                      {item.predicted_prep_minutes && (
                        <span className="text-xs text-neutral-500">
                          Est. {item.predicted_prep_minutes}min
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Item Actions */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-neutral-500">
                      {item.started_at && (
                        <span>Started: {formatTime(item.started_at)}</span>
                      )}
                      {item.completed_at && (
                        <span className="ml-4">Completed: {formatTime(item.completed_at)}</span>
                      )}
                      {item.started_at && !item.completed_at && (
                        <span className="ml-4 text-orange-600">
                          Elapsed: {getElapsedTime(item.started_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {item.status === 'queued' && (
                        <button
                          onClick={() => onUpdateItemStatus(order.id, item.id, 'prepping')}
                          className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200"
                        >
                          Start
                        </button>
                      )}
                      {item.status === 'prepping' && (
                        <button
                          onClick={() => onUpdateItemStatus(order.id, item.id, 'passed')}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
                        >
                          Pass
                        </button>
                      )}
                      {item.status === 'passed' && (
                        <button
                          onClick={() => onUpdateItemStatus(order.id, item.id, 'served')}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200"
                        >
                          Serve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Order Actions */}
              <div className="mt-6 p-4 bg-neutral-50 rounded-lg">
                <h3 className="font-medium text-neutral-900 mb-3">Order Actions</h3>
                <div className="flex space-x-3">
                  {order.status === 'open' && (
                    <button
                      onClick={() => onUpdateOrderStatus(order.id, 'in_progress')}
                      className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
                    >
                      Start Order
                    </button>
                  )}
                  {order.status === 'in_progress' && (
                    <button
                      onClick={() => onUpdateOrderStatus(order.id, 'ready')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Mark Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => onUpdateOrderStatus(order.id, 'served')}
                      className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
                    >
                      Mark Served
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Order Placed</p>
                  <p className="text-sm text-blue-700">{order.timestamp}</p>
                </div>
              </div>
              
              {order.items.map((item, index) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center space-x-3 p-3 bg-neutral-50 rounded-lg">
                    <ChefHat className="h-5 w-5 text-neutral-600" />
                    <div>
                      <p className="font-medium text-neutral-900">{item.name}</p>
                      <p className="text-sm text-neutral-600">
                        Status: {item.status} • 
                        {item.started_at ? ` Started: ${formatTime(item.started_at)}` : ' Not started'}
                        {item.completed_at ? ` • Completed: ${formatTime(item.completed_at)}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              {order.specialRequests && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h3 className="font-medium text-amber-800 mb-2">Special Requests</h3>
                  <p className="text-amber-700">{order.specialRequests}</p>
                </div>
              )}
              
              <div className="p-4 bg-neutral-50 rounded-lg">
                <h3 className="font-medium text-neutral-900 mb-2">Order Notes</h3>
                <textarea
                  placeholder="Add notes about this order..."
                  className="w-full p-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500 resize-none"
                  rows={4}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
