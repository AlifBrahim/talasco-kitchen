"use client";
import React, { useState, useEffect } from 'react';
import Image, { type StaticImageData } from 'next/image';
import { ShoppingCart, Utensils, Plus, Monitor, ChefHat, Loader2, Eye } from 'lucide-react';
import Link from 'next/link';
import { MenuItem as DBMenuItem, GetMenuItemsResponse, MenuItemAvailability, GetMenuAvailabilityResponse } from '@shared/api';
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
  // Stock availability
  available?: boolean;
  stockStatus?: 'available' | 'low_stock' | 'out_of_stock';
  missingIngredients?: string[];
}

// Default menu items (fallback)
const defaultMenuItems: MenuItem[] = [];

export default function Index() {
  const [activeCategory, setActiveCategory] = useState<'main' | 'desserts' | 'drinks'>('main');
  const [cart, setCart] = useState<{[key: string]: number}>({});
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockAvailability, setStockAvailability] = useState<{[key: string]: MenuItemAvailability}>({});
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCart, setShowCart] = useState(false);

  // Fetch stock availability
  const fetchStockAvailability = async () => {
    try {
      const response = await fetch('/api/menu-items/availability');
      if (!response.ok) {
        throw new Error('Failed to fetch stock availability');
      }
      
      const data: GetMenuAvailabilityResponse = await response.json();
      
      // Convert to lookup object
      const availabilityMap = data.items.reduce((acc, item) => {
        acc[item.itemid.toString()] = item;
        return acc;
      }, {} as {[key: string]: MenuItemAvailability});
      
      setStockAvailability(availabilityMap);
    } catch (err) {
      console.error('Error fetching stock availability:', err);
      // Don't show error for availability, just log it
    }
  };

  // Fetch menu items from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch menu items and stock availability in parallel
        const [menuResponse, availabilityResponse] = await Promise.allSettled([
          fetch('/api/menu-items?active=true'),
          fetch('/api/menu-items/availability')
        ]);

        // Handle menu items
        if (menuResponse.status === 'fulfilled' && menuResponse.value.ok) {
          const menuData: GetMenuItemsResponse = await menuResponse.value.json();
          
          // Handle stock availability  
          let availabilityMap: {[key: string]: MenuItemAvailability} = {};
          if (availabilityResponse.status === 'fulfilled' && availabilityResponse.value.ok) {
            const availabilityData: GetMenuAvailabilityResponse = await availabilityResponse.value.json();
            availabilityMap = availabilityData.items.reduce((acc, item) => {
              acc[item.itemid.toString()] = item;
              return acc;
            }, {} as {[key: string]: MenuItemAvailability});
            setStockAvailability(availabilityMap);
          }
          
          // Transform database menu items to UI format with availability
          const transformedItems: MenuItem[] = menuData.menu_items.map((dbItem: DBMenuItem) => {
            const availability = availabilityMap[dbItem.id];
            return {
              id: dbItem.id,
              name: dbItem.name,
              description: `Delicious ${dbItem.name.toLowerCase()}`, // Generate description
              price: dbItem.price ?? 0,
              image: dbItem.image_path || defaultImage,
              category: mapCategoryToUI(dbItem.category),
              badge: dbItem.category === 'Pizza' ? 'Veg' : undefined,
              avg_prep_minutes: dbItem.avg_prep_minutes,
              // Add availability info
              available: availability?.available ?? true,
              stockStatus: availability?.stockStatus ?? 'available',
              missingIngredients: availability?.missingIngredients ?? []
            };
          });
          
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
        } else {
          throw new Error('Failed to fetch menu items');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load menu items. Using default menu.');
        // Keep default menu items as fallback
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh stock availability every 30 seconds
    const interval = setInterval(fetchStockAvailability, 30000);
    return () => clearInterval(interval);
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
    const item = menuItems.find(item => item.id === itemId);
    
    // Check availability before adding to cart
    if (!item?.available) {
      const missingItems = item?.missingIngredients?.join(', ') || 'Unknown ingredients';
      alert(`Sorry, ${item?.name} is currently unavailable.\n\nMissing ingredients: ${missingItems}\n\nPlease ask staff to restock first.`);
      return;
    }
    
    // Check if adding to cart would exceed stock
    const currentCartQuantity = cart[itemId] || 0;
    const totalQuantity = currentCartQuantity + quantity;
    
    // For now, we'll allow adding but could add more sophisticated stock checking here
    setCart(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + quantity
    }));
    
    // Show notification or feedback
    console.log(`Added ${quantity}x ${item?.name} to cart`);
    if (specialInstructions) {
      console.log(`Special instructions: ${specialInstructions}`);
    }
    
    // Show warning for low stock items
    if (item?.stockStatus === 'low_stock') {
      console.warn(`⚠️ ${item.name} is running low on ingredients`);
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
            <div key={item.id} className={`bg-white rounded-lg shadow-sm border overflow-hidden transition-shadow ${
              item.available 
                ? 'border-neutral-200 hover:shadow-md' 
                : 'border-red-200 bg-gray-50 opacity-75'
            }`}>
              <div className="relative">
                <Image
                  src={item.image}   // expects '/...' under public
                  alt={item.name}
                  width={600}
                  height={400}
                  className={`w-full h-48 object-cover ${!item.available ? 'grayscale' : ''}`}
                />
                {/* Stock Status Badge */}
                {item.stockStatus && (
                  <span className={`absolute top-3 right-3 text-white text-xs px-2 py-1 rounded-full ${
                    item.stockStatus === 'available' ? 'bg-green-500' :
                    item.stockStatus === 'low_stock' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}>
                    {item.stockStatus === 'available' ? 'Available' :
                     item.stockStatus === 'low_stock' ? 'Low Stock' :
                     'Out of Stock'}
                  </span>
                )}
                {item.badge && (
                  <span className="absolute top-3 left-3 bg-status-ready text-white text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
                {!item.available && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <span className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
                      Unavailable
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className={`font-semibold text-lg mb-2 ${item.available ? 'text-neutral-900' : 'text-gray-600'}`}>
                  {item.name}
                </h3>
                <p className={`text-sm mb-4 line-clamp-2 ${item.available ? 'text-neutral-600' : 'text-gray-500'}`}>
                  {item.description}
                </p>
                
                {/* Show missing ingredients for unavailable items */}
                {!item.available && item.missingIngredients && item.missingIngredients.length > 0 && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    <div className="font-medium mb-1">Missing ingredients:</div>
                    <div className="text-xs">{item.missingIngredients.slice(0, 2).join(', ')}</div>
                    {item.missingIngredients.length > 2 && (
                      <div className="text-xs text-red-600">+{item.missingIngredients.length - 2} more</div>
                    )}
                  </div>
                )}
                
                {/* Low stock warning */}
                {item.available && item.stockStatus === 'low_stock' && (
                  <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                    <div className="font-medium">⚠️ Running low on ingredients</div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className={`text-xl font-bold ${item.available ? 'text-neutral-900' : 'text-gray-500'}`}>
                    RM{item.price}
                  </span>
                  <button
                    onClick={() => addToCart(item.id)}
                    disabled={!item.available}
                    className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                      item.available 
                        ? 'bg-neutral-900 text-white hover:bg-neutral-800' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {item.available ? 'Add' : 'Restock First'}
                    </span>
                  </button>
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
