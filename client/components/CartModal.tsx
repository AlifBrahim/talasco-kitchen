"use client";
import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingCart, CreditCard, User, MapPin, Clock } from 'lucide-react';
import { CreateOrderRequest } from '@shared/api';

interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
  modifiers?: string[];
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: { [key: string]: number };
  menuItems: any[];
  onUpdateCart: (itemId: string, quantity: number) => void;
  onRemoveFromCart: (itemId: string) => void;
  onClearCart: () => void;
}

export default function CartModal({ 
  isOpen, 
  onClose, 
  cart, 
  menuItems, 
  onUpdateCart, 
  onRemoveFromCart, 
  onClearCart 
}: CartModalProps) {
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    tableNumber: '',
    phone: '',
    specialRequests: ''
  });
  const [orderType, setOrderType] = useState<'dine_in' | 'pickup' | 'delivery'>('dine_in');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  if (!isOpen) return null;

  // Get cart items with full details
  const cartItems: CartItem[] = Object.entries(cart)
    .filter(([_, quantity]) => quantity > 0)
    .map(([itemId, quantity]) => {
      const menuItem = menuItems.find(item => item.id === itemId);
      return {
        id: itemId,
        menuItemId: menuItem?.id ?? itemId,
        name: menuItem?.name || 'Unknown Item',
        price: menuItem?.price || 0,
        quantity,
        specialInstructions: '',
        modifiers: []
      };
    });

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    setIsCheckingOut(true);
    try {
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const invalidItem = cartItems.find(item => !uuidPattern.test(item.menuItemId));
      if (invalidItem) {
        alert('Menu was refreshed. Please re-add items to your cart.');
        setIsCheckingOut(false);
        return;
      }

      const orderRequest: CreateOrderRequest = {
        location_id: 'loc-1', // Default location - in real app, get from context
        source: orderType,
        table_number: orderType === 'dine_in' ? customerInfo.tableNumber : undefined,
        customer_name: customerInfo.name || undefined,
        items: cartItems.map(item => ({
          menu_item_id: item.menuItemId,
          qty: item.quantity,
          notes: item.specialInstructions || customerInfo.specialRequests || undefined
        }))
      };

      const response = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderRequest),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const orderData = await response.json();
      console.log('Order created:', orderData);
      
      // Clear cart and close modal
      onClearCart();
      onClose();
      
      // Show success message
      alert('Order placed successfully!');
      
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShoppingCart className="h-6 w-6 text-neutral-600" />
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Your Cart</h2>
                <p className="text-sm text-neutral-600">{cartItems.length} items</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-200 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Your cart is empty</h3>
              <p className="text-neutral-600">Add some delicious items to get started!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Order Type */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Order Type</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'dine_in', label: 'Dine In', icon: <MapPin className="h-4 w-4" /> },
                    { value: 'pickup', label: 'Pickup', icon: <ShoppingCart className="h-4 w-4" /> },
                    { value: 'delivery', label: 'Delivery', icon: <Clock className="h-4 w-4" /> }
                  ].map(({ value, label, icon }) => (
                    <button
                      key={value}
                      onClick={() => setOrderType(value as any)}
                      className={`p-3 rounded-lg border-2 flex items-center justify-center space-x-2 transition-colors ${
                        orderType === value
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      {icon}
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                      placeholder="Enter your name"
                    />
                  </div>
                  {orderType === 'dine_in' && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">Table Number</label>
                      <input
                        type="text"
                        value={customerInfo.tableNumber}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, tableNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                        placeholder="Table number"
                      />
                    </div>
                  )}
                  {orderType === 'delivery' && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                        placeholder="Phone number"
                      />
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Special Requests</label>
                  <textarea
                    value={customerInfo.specialRequests}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, specialRequests: e.target.value }))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500 resize-none"
                    rows={3}
                    placeholder="Any special requests or dietary restrictions?"
                  />
                </div>
              </div>

              {/* Cart Items */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Order Items</h3>
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-neutral-900">{item.name}</h4>
                        <p className="text-sm text-neutral-600">${item.price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onUpdateCart(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateCart(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-neutral-900">
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                        <button
                          onClick={() => onRemoveFromCart(item.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-neutral-50 rounded-lg p-4">
                <h3 className="font-medium text-neutral-900 mb-3">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (8%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-neutral-200 pt-2">
                    <div className="flex justify-between font-medium text-lg">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-200 rounded-b-lg">
            <div className="flex items-center justify-between">
              <button
                onClick={onClearCart}
                className="text-neutral-600 hover:text-neutral-800 text-sm"
              >
                Clear Cart
              </button>
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <CreditCard className="h-4 w-4" />
                <span>{isCheckingOut ? 'Processing...' : 'Place Order'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
