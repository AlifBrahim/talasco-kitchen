"use client";
import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  Package,
  Plus,
  Utensils,
  Monitor,
  Loader2,
  Search,
  RefreshCw,
  AlertTriangle,
  Save,
  Check,
  Brain,
  ShoppingCart,
  X,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { GetKSMInventoryResponse } from '@shared/api';

interface InventoryItem {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  unit: string;
  low: number;
  updated: string;
}

interface AIPrepItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  recommendedQty: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  estimatedCost: number;
}

export default function KitchenManager() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [ksmSearch, setKsmSearch] = useState('');
  const [ksmCategory, setKsmCategory] = useState('All Categories');
  const [ksmStatus, setKsmStatus] = useState<'all' | 'in' | 'low' | 'out'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState<number>(0);
  const [saving, setSaving] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAIPrepModal, setShowAIPrepModal] = useState(false);
  const [aiPrepItems, setAiPrepItems] = useState<AIPrepItem[]>([]);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [modifiedItems, setModifiedItems] = useState<Set<string>>(new Set());
  const [originalQuantities, setOriginalQuantities] = useState<Map<string, number>>(new Map());
  const [restockBadgeCount, setRestockBadgeCount] = useState<number>(0);

  // Fetch KSM data only
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const ksmResponse = await fetch('/api/ksm');

        if (!ksmResponse.ok) {
          throw new Error('Failed to fetch KSM data');
        }

        const ksmData = await ksmResponse.json();
        const items = (ksmData as GetKSMInventoryResponse).items || [];
        setInventory(items);

        // Preload shopping list count for manager badge
        try {
          const slRes = await fetch('/api/shopping-list/monthly');
          if (slRes.ok) {
            const sl = await slRes.json();
            const urgent = (sl.items as AIPrepItem[] | undefined)?.filter(i => i.urgency === 'high' || i.urgency === 'critical').length ?? 0;
            setRestockBadgeCount(urgent);
          }
        } catch {
          // ignore
        }
      } catch (err) {
        console.error('Error fetching KSM data:', err);
        setError('Failed to load KSM data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStockStatus = (i: InventoryItem) =>
    i.quantity <= 0 ? 'out' : i.quantity <= i.low ? 'low' : 'in';
  
  const ksmTotals = {
    total: inventory.length,
    low: inventory.filter(i => getStockStatus(i) === 'low').length,
    out: inventory.filter(i => getStockStatus(i) === 'out').length
  };
  
  const ksmCategories = [
    'All Categories',
    ...Array.from(new Set((inventory.map(i => i.category).filter(Boolean) as string[])))
  ];
  
  const filteredInventory = inventory.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(ksmSearch.toLowerCase());
    const matchesCategory = ksmCategory === 'All Categories' || i.category === ksmCategory;
    const s = getStockStatus(i);
    const matchesStatus =
      ksmStatus === 'all' ||
      (ksmStatus === 'in' && s === 'in') ||
      (ksmStatus === 'low' && s === 'low') ||
      (ksmStatus === 'out' && s === 'out');
    return matchesSearch && matchesCategory && matchesStatus;
  });
  
  const resetKsmFilters = () => {
    setKsmSearch('');
    setKsmCategory('All Categories');
    setKsmStatus('all');
  };
  
  const adjustQty = (id: string, delta: number) => {
    setInventory(prev =>
      prev.map(i => {
        if (i.id === id) {
          // Store original quantity if this is the first modification
          if (!modifiedItems.has(id)) {
            setOriginalQuantities(prev => new Map(prev).set(id, i.quantity));
          }
          return { ...i, quantity: Math.max(0, i.quantity + delta) };
        }
        return i;
      })
    );
    setModifiedItems(prev => new Set(prev).add(id));
    setHasUnsavedChanges(true);
  };

  const startEditing = (item: InventoryItem) => {
    setEditingItem(item.id);
    setTempQuantity(item.quantity);
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setTempQuantity(0);
  };

  const saveQuantity = async (id: string) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    setSaving(id);
    try {
      // Call the API to save the quantity
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: tempQuantity })
      });

      if (!response.ok) {
        throw new Error('Failed to save quantity');
      }

      const updatedItem = await response.json();
      
      // Update local state with the response from server
      setInventory(prev =>
        prev.map(i =>
          i.id === id ? { 
            ...i, 
            quantity: updatedItem.quantity,
            updated: updatedItem.updated
          } : i
        )
      );
      
      // Remove from modified items and update unsaved changes
      setModifiedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      
      setEditingItem(null);
      setTempQuantity(0);
      
      // Update hasUnsavedChanges based on remaining modified items
      setHasUnsavedChanges(modifiedItems.size > 1);
    } catch (error) {
      console.error('Failed to save quantity:', error);
      // Revert the change on error
      setInventory(prev =>
        prev.map(i =>
          i.id === id ? { ...i, quantity: item.quantity } : i
        )
      );
    } finally {
      setSaving(null);
    }
  };

  const handleQuantityChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setTempQuantity(Math.max(0, numValue));
  };

  const handleAIPrep = async () => {
    try {
      const res = await fetch('/api/shopping-list/monthly');
      if (!res.ok) throw new Error('Failed to generate shopping list');
      const data = await res.json();
      setAiPrepItems((data.items || []).slice(0, 100));
      setShowAIPrepModal(true);
    } catch (e) {
      console.error(e);
      alert('Failed to generate shopping list.');
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const saveIndividualItem = async (id: string) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    setSaving(id);
    try {
      // Call the API to save the quantity
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: item.quantity })
      });

      if (!response.ok) {
        throw new Error('Failed to save quantity');
      }

      const updatedItem = await response.json();
      
      // Update local state with the response from server
      setInventory(prev =>
        prev.map(i =>
          i.id === id ? { 
            ...i, 
            quantity: updatedItem.quantity,
            updated: updatedItem.updated
          } : i
        )
      );
      
      // Remove from modified items and original quantities
      setModifiedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      
      setOriginalQuantities(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      
      // Update hasUnsavedChanges
      setHasUnsavedChanges(modifiedItems.size > 1);
      
      // Show success alert
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
      
    } catch (error) {
      console.error('Failed to save quantity:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const cancelIndividualItem = (id: string) => {
    // Get the original quantity
    const originalQty = originalQuantities.get(id);
    if (originalQty !== undefined) {
      // Reset the item to its original quantity
      setInventory(prev =>
        prev.map(i =>
          i.id === id ? { ...i, quantity: originalQty } : i
        )
      );
    }
    
    // Remove from modified items and original quantities
    setModifiedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    
    setOriginalQuantities(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
    
    // Update hasUnsavedChanges
    setHasUnsavedChanges(modifiedItems.size > 1);
  };

  const saveAllChanges = async () => {
    if (!hasUnsavedChanges) return;
    
    setIsSavingAll(true);
    try {
      // Save all modified items
      const savePromises = Array.from(modifiedItems).map(id => saveIndividualItem(id));
      await Promise.all(savePromises);
      
      // Clear all modified items
      setModifiedItems(new Set());
      setHasUnsavedChanges(false);
      
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <ChefHat className="h-6 w-6 text-neutral-800" />
                <h1 className="text-xl font-semibold text-neutral-900">Kitchen Stock Management</h1>
                <span className="text-sm text-neutral-500">Inventory Management</span>
              </div>
              <nav className="hidden md:flex items-center space-x-6">
                <Link
                  href="/"
                  className="flex items-center space-x-1 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  <Utensils className="h-4 w-4" />
                  <span>Menu</span>
                </Link>
                <Link
                  href="/kitchen"
                  className="flex items-center space-x-1 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  <Monitor className="h-4 w-4" />
                  <span>Kitchen Display</span>
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-neutral-600">{ksmTotals.total} Items</span>
              <span className="text-sm text-neutral-600">{ksmTotals.low} Low Stock</span>
              {hasUnsavedChanges && (
                <div className="flex items-center space-x-2 text-orange-600">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-medium">Unsaved changes</span>
                </div>
              )}
              <button 
                onClick={handleAIPrep}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Brain className="h-4 w-4" />
                <span className="text-sm font-medium">AI Prep Button</span>
                {restockBadgeCount > 0 && (
                  <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{restockBadgeCount}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <span className="text-neutral-600">Loading inventory data...</span>
            </div>
          </div>
        )}

        {/* Kitchen Stock Management Content */}
        {!loading && (
          <div className="space-y-8">
            {/* Top stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-neutral-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-neutral-600">Total Items</p>
                    <p className="text-3xl font-bold text-neutral-900">{ksmTotals.total}</p>
                    <p className="text-xs text-neutral-500 mt-1">Items in inventory</p>
                  </div>
                  <Package className="h-6 w-6 text-neutral-700" />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-neutral-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Low Stock</p>
                    <p className="text-3xl font-bold text-yellow-600">{ksmTotals.low}</p>
                    <p className="text-xs text-neutral-500 mt-1">Need restocking</p>
                </div>
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-neutral-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Out of Stock</p>
                    <p className="text-3xl font-bold text-red-600">{ksmTotals.out}</p>
                    <p className="text-xs text-neutral-500 mt-1">Urgent restocking</p>
                </div>
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      value={ksmSearch}
                      onChange={e => setKsmSearch(e.target.value)}
                      placeholder="Search items..."
                      className="w-[240px] pl-9 pr-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    />
              </div>
            </div>

                <div className="flex items-center gap-3">
                  <select
                    value={ksmCategory}
                    onChange={e => setKsmCategory(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-neutral-300 text-sm"
                  >
                    {ksmCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                <select 
                    value={ksmStatus}
                    onChange={e => setKsmStatus(e.target.value as any)}
                    className="px-3 py-2 rounded-lg border border-neutral-300 text-sm"
                  >
                    <option value="all">All Items</option>
                    <option value="in">In Stock</option>
                    <option value="low">Low Stock</option>
                    <option value="out">Out of Stock</option>
                </select>

                  <button
                    onClick={resetKsmFilters}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset
                  </button>
                </div>
              </div>
                        </div>

            {/* Items grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredInventory.map(item => {
                const status = getStockStatus(item);
                const border =
                  status === 'out'
                    ? 'border-red-300'
                    : status === 'low'
                      ? 'border-yellow-300'
                      : 'border-neutral-200';
                const badge =
                  status === 'out'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700';

                return (
                  <div key={item.id} className={`bg-white rounded-lg border ${border} p-4`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-neutral-900">{item.name}</h4>
                        <p className="text-xs text-neutral-500 mt-1">{item.category || 'Uncategorized'}</p>
                      </div>
                      {status !== 'in' && (
                        <span className={`text-xs px-2 py-1 rounded ${badge}`}>
                          {status === 'low' ? 'Low Stock' : 'Out of Stock'}
                        </span>
                      )}
              </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => adjustQty(item.id, -1)}
                          className="h-8 w-8 rounded-full border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                          aria-label="Decrease"
                          disabled={saving === item.id}
                        >
                          -
                        </button>
                        
                        {editingItem === item.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={tempQuantity}
                              onChange={(e) => handleQuantityChange(e.target.value)}
                              className="w-16 px-2 py-1 text-center border-2 border-blue-400 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              min="0"
                              autoFocus
                            />
                            <button
                              onClick={() => saveQuantity(item.id)}
                              className="h-6 w-6 rounded bg-green-600 text-white hover:bg-green-700 flex items-center justify-center"
                              disabled={saving === item.id}
                            >
                              {saving === item.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="h-6 w-6 rounded bg-neutral-300 text-neutral-700 hover:bg-neutral-400 flex items-center justify-center"
                              disabled={saving === item.id}
                            >
                              ×
                            </button>
                </div>
                        ) : (
                          <div 
                            className="text-neutral-900 font-semibold cursor-pointer hover:bg-neutral-50 px-2 py-1 rounded border border-neutral-300 hover:border-blue-400 transition-colors"
                            onClick={() => startEditing(item)}
                            title="Click to edit quantity"
                          >
                            {item.quantity} {item.unit}
          </div>
        )}

              <button
                          onClick={() => adjustQty(item.id, +1)}
                          className="h-8 w-8 rounded-full border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                          aria-label="Increase"
                          disabled={saving === item.id}
                        >
                          +
              </button>
            </div>

                      <div className="text-right">
                        <div className="text-xs text-neutral-500">
                          L{item.low}
                        </div>
                        <div className="text-xs text-neutral-400 mt-1">
                          Updated {new Date(item.updated).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Individual Action Buttons */}
                    {modifiedItems.has(item.id) && (
                      <div className="mt-3 pt-3 border-t border-neutral-200">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => cancelIndividualItem(item.id)}
                            disabled={saving === item.id}
                            className="flex-1 px-3 py-2 bg-neutral-300 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                          >
                            <X className="h-4 w-4" />
                            <span>Cancel</span>
                          </button>
                          <button
                            onClick={() => saveIndividualItem(item.id)}
                            disabled={saving === item.id}
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                          >
                            {saving === item.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                <span>Save</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Empty state */}
            {filteredInventory.length === 0 && !loading && (
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
                <Package className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">No items found</h3>
            <p className="text-neutral-600 mb-4">
                  {ksmSearch || ksmCategory !== 'All Categories' || ksmStatus !== 'all' 
                    ? 'Try adjusting your filters to see more items.'
                    : 'Start by adding some inventory items to track your stock.'}
                </p>
                <button className="bg-neutral-900 text-white px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors">
                  Add First Item
            </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* AI Prep Modal - Receipt Style */}
      {showAIPrepModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Brain className="h-6 w-6" />
                  <div>
                    <h2 className="text-xl font-semibold">AI Shopping List</h2>
                    <p className="text-purple-100 text-sm">Generated on {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIPrepModal(false)}
                  className="text-white hover:text-purple-200 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Receipt Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Restaurant Header */}
              <div className="text-center mb-6 border-b border-neutral-200 pb-4">
                <h1 className="text-2xl font-bold text-neutral-900">TALASCO KITCHEN</h1>
                <p className="text-neutral-600">AI-Powered Shopping List</p>
                <p className="text-sm text-neutral-500">Date: {new Date().toLocaleDateString()} | Time: {new Date().toLocaleTimeString()}</p>
              </div>


              {/* Shopping List - Receipt Style */}
              <div className="bg-neutral-50 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-neutral-900 mb-4 text-center">SHOPPING LIST</h3>
                
                {/* Receipt Items */}
                <div className="space-y-2">
                  {aiPrepItems
                    .sort((a, b) => {
                      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
                    })
                    .map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-neutral-200 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-mono text-neutral-500 w-6">
                          {index + 1}.
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-neutral-900">{item.name}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(item.urgency)}`}>
                              {getUrgencyIcon(item.urgency)}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-500">{item.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-neutral-900">
                          {item.recommendedQty} {item.unit}
                        </div>
                        <div className="text-sm text-neutral-500">
                          ~RM{item.estimatedCost.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Receipt Total */}
                <div className="border-t border-neutral-300 mt-4 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-neutral-900">TOTAL ESTIMATED COST:</span>
                    <span className="font-bold text-2xl text-neutral-900">
                      RM{aiPrepItems.reduce((sum, item) => sum + item.estimatedCost, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-900 mb-2">📋 Instructions for Staff:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Check fresh produce quality before purchasing</li>
                  <li>• Keep receipts for expense tracking</li>
                  <li>• Update inventory when items arrive</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                <button
                  onClick={() => setShowAIPrepModal(false)}
                  className="px-6 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Close
                </button>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => window.print()}
                    className="px-6 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors flex items-center space-x-2"
                  >
                    <Package className="h-4 w-4" />
                    <span>Print Receipt</span>
                  </button>
                  <button 
                    onClick={() => {
                      // Copy to clipboard for Foodpanda or other delivery apps
                      const shoppingList = aiPrepItems
                        .map(item => `${item.name} - ${item.recommendedQty} ${item.unit}`)
                        .join('\n');
                      navigator.clipboard.writeText(shoppingList);
                      alert('Shopping list copied to clipboard! You can paste this into Foodpanda or any delivery app.');
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>Copy for Foodpanda</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {showSuccessAlert && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 animate-slide-in">
            <CheckCircle className="h-5 w-5" />
            <div>
              <p className="font-semibold">Changes Saved Successfully!</p>
              <p className="text-sm text-green-100">All inventory updates have been saved.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
