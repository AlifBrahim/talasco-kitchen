"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { X, Clock, Users, ChefHat, Plus, Minus, ShoppingCart } from 'lucide-react';
import { MenuItem as DBMenuItem } from '@shared/api';

interface MenuItemModalProps {
  item: {
    id: string;
    name: string;
    description: string;
    price: number;
    image: any;
    category: string;
    avg_prep_minutes?: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (itemId: string, quantity: number, specialInstructions?: string) => void;
}

export default function MenuItemModal({ item, isOpen, onClose, onAddToCart }: MenuItemModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleAddToCart = () => {
    onAddToCart(item.id, quantity, specialInstructions);
    onClose();
    setQuantity(1);
    setSpecialInstructions('');
    setSelectedModifiers([]);
  };

  const modifiers = [
    { id: 'extra-cheese', name: 'Extra Cheese', price: 2.00 },
    { id: 'gluten-free', name: 'Gluten Free', price: 1.50 },
    { id: 'spicy', name: 'Make it Spicy', price: 0.00 },
    { id: 'no-onions', name: 'No Onions', price: 0.00 },
  ];

  const toggleModifier = (modifierId: string) => {
    setSelectedModifiers(prev => 
      prev.includes(modifierId) 
        ? prev.filter(id => id !== modifierId)
        : [...prev, modifierId]
    );
  };

  const calculateTotal = () => {
    const basePrice = item.price * quantity;
    const modifierPrice = selectedModifiers.reduce((total, modifierId) => {
      const modifier = modifiers.find(m => m.id === modifierId);
      return total + (modifier ? modifier.price : 0);
    }, 0);
    return basePrice + modifierPrice;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative">
          <Image
            src={item.image}
            alt={item.name}
            width={800}
            height={400}
            className="w-full h-64 object-cover rounded-t-lg"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Title and Basic Info */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">{item.name}</h2>
            <p className="text-neutral-600 mb-4">{item.description}</p>
            
            <div className="flex items-center space-x-6 text-sm text-neutral-500">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{item.avg_prep_minutes || 15} min prep time</span>
              </div>
              <div className="flex items-center space-x-1">
                <ChefHat className="h-4 w-4" />
                <span>{item.category}</span>
              </div>
            </div>
          </div>

          {/* Modifiers */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Customize Your Order</h3>
            <div className="space-y-2">
              {modifiers.map((modifier) => (
                <label key={modifier.id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedModifiers.includes(modifier.id)}
                      onChange={() => toggleModifier(modifier.id)}
                      className="w-4 h-4 text-neutral-600 rounded focus:ring-neutral-500"
                    />
                    <span className="text-neutral-900">{modifier.name}</span>
                  </div>
                  {modifier.price > 0 && (
                    <span className="text-neutral-600">+${modifier.price.toFixed(2)}</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Special Instructions */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">Special Instructions</h3>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special requests or dietary restrictions?"
              className="w-full p-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500 resize-none"
              rows={3}
            />
          </div>

          {/* Quantity and Add to Cart */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-lg font-semibold text-neutral-900">Quantity:</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-neutral-900">
                ${calculateTotal().toFixed(2)}
              </div>
              <button
                onClick={handleAddToCart}
                className="mt-2 bg-neutral-900 text-white px-6 py-3 rounded-lg flex items-center space-x-2 hover:bg-neutral-800 transition-colors"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
