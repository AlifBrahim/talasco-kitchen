"use client";
import React, { useState, useEffect } from 'react';
import Image, { type StaticImageData } from 'next/image';
import { ShoppingCart, Utensils, Plus, Monitor, ChefHat, Loader2, Eye } from 'lucide-react';
import Link from 'next/link';
import { MenuItem as DBMenuItem, GetMenuItemsResponse } from '@shared/api';
import MenuItemModal from '@/components/MenuItemModal';
import CartModal from '@/components/CartModal';

// Default image for items without specific images
const defaultImage = '/placeholder.svg';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | StaticImageData;
  category: 'main' | 'desserts' | 'drinks';
  badge?: string;
  avg_prep_minutes?: number;
}

// Default menu items (fallback)
const defaultMenuItems: MenuItem[] = [];

export default function Index() {
  const [activeCategory, setActiveCategory] = useState<'main' | 'desserts' | 'drinks'>('main');
  const [cart, setCart] = useState<{[key: string]: number}>({});
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCart, setShowCart] = useState(false);

  // Fetch menu items from API
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/menu-items?active=true');
        if (!response.ok) {
          throw new Error('Failed to fetch menu items');
        }
        
        const data: GetMenuItemsResponse = await response.json();
        
        // Transform database menu items to UI format
        const transformedItems: MenuItem[] = data.menu_items.map((dbItem: DBMenuItem) => ({
          id: dbItem.id,
          name: dbItem.name,
          description: `Delicious ${dbItem.name.toLowerCase()}`, // Generate description
          price: dbItem.price ?? 0,
          image: dbItem.image_path || defaultImage,  // ← use path from DB
          category: mapCategoryToUI(dbItem.category),
          badge: dbItem.category === 'Pizza' ? 'Veg' : undefined,
          avg_prep_minutes: dbItem.avg_prep_minutes
        }));
        
        setMenuItems(transformedItems);

        setCart(prevCart => {
          const validIds = new Set(transformedItems.map(item => item.id));
          let mutated = false;
          const nextEntries = Object.entries(prevCart).filter(([itemId]) => {
            const keep = validIds.has(itemId);
            if (!keep) mutated = true;
            return keep;
          });

          if (!mutated) {
            return prevCart;
          }

          const nextCart = Object.fromEntries(nextEntries) as typeof prevCart;
          return nextCart;
        });
      } catch (err) {
        console.error('Error fetching menu items:', err);
        setError('Failed to load menu items. Using default menu.');
        // Keep default menu items as fallback
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, []);

  // Map database categories to UI categories
  const mapCategoryToUI = (dbCategory?: string): 'main' | 'desserts' | 'drinks' => {
    if (!dbCategory) return 'main';
    
    const category = dbCategory.toLowerCase();
    if (category.includes('dessert') || category.includes('sweet')) return 'desserts';
    if (category.includes('drink') || category.includes('beverage')) return 'drinks';
    return 'main';
  };

  const addToCart = (itemId: string, quantity: number = 1, specialInstructions?: string) => {
    setCart(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + quantity
    }));
    
    // Show notification or feedback
    console.log(`Added ${quantity}x ${menuItems.find(item => item.id === itemId)?.name} to cart`);
    if (specialInstructions) {
      console.log(`Special instructions: ${specialInstructions}`);
    }
  };

  const updateCart = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(prev => ({
        ...prev,
        [itemId]: quantity
      }));
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      delete newCart[itemId];
      return newCart;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  const openItemModal = (item: MenuItem) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const closeItemModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  const getCartCount = () => {
    return Object.values(cart).reduce((sum, count) => sum + count, 0);
  };

  const filteredItems = menuItems.filter(item => item.category === activeCategory);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <Utensils className="h-6 w-6 text-neutral-800" />
                <span className="text-lg font-semibold text-neutral-900">Bistro Menu</span>
              </Link>
              <span className="text-sm text-neutral-600 hidden sm:block">Online Ordering</span>
              <nav className="hidden md:flex items-center space-x-6">
                <Link
                  href="/kitchen"
                  className="flex items-center space-x-1 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  <Monitor className="h-4 w-4" />
                  <span>Kitchen Display</span>
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
            <button 
              onClick={() => setShowCart(true)}
              className="flex items-center space-x-2 bg-white border border-neutral-300 rounded-lg px-4 py-2 hover:bg-neutral-50 transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="text-sm font-medium">Cart</span>
              {getCartCount() > 0 && (
                <span className="bg-status-new text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getCartCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold text-neutral-900 mb-4">
            Welcome to Bistro Menu
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Discover our carefully crafted dishes made with fresh, local ingredients
          </p>
        </div>
      </section>

      {/* Category Navigation */}
      <section className="bg-white border-b border-neutral-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { key: 'main', label: 'Main Dishes' },
              { key: 'desserts', label: 'Desserts' },
              { key: 'drinks', label: 'Drinks' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeCategory === key
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </section>

      {/* Menu Items */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            {activeCategory === 'main' ? 'Main Dishes' : 
             activeCategory === 'desserts' ? 'Desserts' : 'Drinks'}
          </h2>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-amber-600 mr-3">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm text-amber-800">{error}</div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-600" />
              <span className="text-neutral-600">Loading menu items...</span>
            </div>
          </div>
        )}

        {/* Menu Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative">
                <Image
                  src={item.image}   // expects '/...' under public
                  alt={item.name}
                  width={600}
                  height={400}
                  className="w-full h-48 object-cover"
                />
                {item.badge && (
                  <span className="absolute top-3 left-3 bg-status-ready text-white text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg text-neutral-900 mb-2">{item.name}</h3>
                <p className="text-sm text-neutral-600 mb-4 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-neutral-900">RM{item.price}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openItemModal(item)}
                      className="bg-neutral-100 text-neutral-700 px-3 py-2 rounded-lg flex items-center space-x-1 hover:bg-neutral-200 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="text-sm font-medium">View</span>
                    </button>
                    <button
                      onClick={() => addToCart(item.id)}
                      className="bg-neutral-900 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-neutral-800 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-sm font-medium">Add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}

        {/* Empty State for other categories */}
        {!loading && filteredItems.length === 0 && (
          <div className="text-center py-12">
            <div className="text-neutral-400 mb-4">
              <Utensils className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Coming Soon</h3>
            <p className="text-neutral-600">
              We're working on adding more delicious {activeCategory} to our menu.
            </p>
          </div>
        )}
      </main>

      {/* Menu Item Modal */}
      {selectedItem && (
        <MenuItemModal
          item={selectedItem}
          isOpen={showModal}
          onClose={closeItemModal}
          onAddToCart={addToCart}
        />
      )}

      {/* Cart Modal */}
      <CartModal
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        cart={cart}
        menuItems={menuItems}
        onUpdateCart={updateCart}
        onRemoveFromCart={removeFromCart}
        onClearCart={clearCart}
      />
    </div>
  );
}
