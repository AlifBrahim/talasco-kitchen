"use client";
import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingCart, CreditCard } from 'lucide-react';

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
  const [tableNumber, setTableNumber] = useState('');
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
      // Prepare order request for your simple API
      const orderRequest = {
        tableNumber: tableNumber || undefined,
        items: cartItems.map(item => ({
          itemId: parseInt(item.id), // Convert to integer for your schema
          quantity: item.quantity
        }))
      };

      const response = await fetch('/api/orders/place', {
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
      setTableNumber(''); // Reset table number
      onClose();
      
      // Show success message
      alert(`Order placed successfully! Order ID: ${orderData.orderId}`);
      
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
            <>
              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                  {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 bg-neutral-50 rounded-lg">
                      <div className="flex-1">
                      <h4 className="font-semibold text-neutral-900">{item.name}</h4>
                        <p className="text-sm text-neutral-600">${item.price.toFixed(2)} each</p>
                      </div>
                        <div className="flex items-center space-x-2">
                          <button
                        onClick={() => onUpdateCart(item.id, Math.max(0, item.quantity - 1))}
                        className="p-1 hover:bg-neutral-200 rounded"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateCart(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-neutral-200 rounded"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-right">
                      <p className="font-semibold text-neutral-900">${(item.price * item.quantity).toFixed(2)}</p>
                        <button
                          onClick={() => onRemoveFromCart(item.id)}
                        className="text-red-600 hover:text-red-800 mt-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

              {/* Table Number Input */}
              <div className="mb-6">
                <label className="block text-lg font-semibold text-neutral-900 mb-3">
                  Table Number
                </label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500 text-lg"
                  placeholder="Enter your table number"
                />
                <p className="text-sm text-neutral-500 mt-2">Enter the table number where you're seated</p>
              </div>

              {/* Order Summary */}
              <div className="border-t border-neutral-200 pt-6">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Subtotal</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Tax (8%)</span>
                    <span className="font-medium">${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
        </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
              <button
                onClick={onClearCart}
                    className="flex-1 px-4 py-3 border border-neutral-300 text-neutral-700 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
              >
                Clear Cart
              </button>
              <button
                onClick={handleCheckout}
                    disabled={isCheckingOut || cartItems.length === 0}
                    className="flex-2 px-6 py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                    <CreditCard className="h-5 w-5" />
                    <span>{isCheckingOut ? 'Placing Order...' : 'Place Order'}</span>
              </button>
            </div>
          </div>
            </>
        )}
        </div>
      </div>
    </div>
  );
}
