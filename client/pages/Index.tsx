"use client";
import React, { useState } from 'react';
import Image, { type StaticImageData } from 'next/image';
import pizzaImg from '@/images/C2sRSNqBHLde2DpstxMafqv3hr5KrNWGIs24MW-YS00/31536000.1789786010913.ueMnJoYFOXgEAnn1j034SMwP_UQuQAPziw1UQ_YyLxE.WyHdITSk1tPZtHUiyZP9Qej1jGZ6My-LbOWOfnbhOh0.webp';
import saladImg from '@/images/Tf7NmhS3Z1K-mtZ5GGfp4cFoggLR-IuegFJdW3APIJk/31536000.1789786010313.f4JxLiMcdM1po26hHmK3L96d6w-aWlUmbsGKvbdmIrU.BURmQFSYXt-2hhbxR3EPJ4Ah1iZthd66LmC6zUsFAWU.webp';
import pastaImg from '@/images/zoUDy0rRxPFl_KbW_85eCIZitbpAO6jI0F778aT6oHk/31536000.1789786010288.OOU3zQYY4rnhjdyz90n1ArueZIQ_Z3PxQoKL1kf2nHI.QyPbiG99cwRMGcYilFShrKTy65kT2Om95R3nYMR8J0Y.webp';
import burgerImg from '@/images/3RwYYDYE9aPqya-MaXQCY8lTyX4JRDDnCGkvrc4JKE0/31536000.1789786010585.Jc9TO6EPl-F7RCs33AX5CT31zGjgEJOHXdS6jzgf3SQ.2N1Fni1xsCXP-j7fDUTV-seAQVTQKNF2UT4eZ0PUPuM.webp';
import { ShoppingCart, Utensils, Plus, Monitor, ChefHat } from 'lucide-react';
import Link from 'next/link';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | StaticImageData;
  category: 'main' | 'desserts' | 'drinks';
  badge?: string;
}

const menuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Margherita Pizza',
    description: 'Classic pizza with fresh mozzarella, tomato sauce, and basil',
    price: 16.99,
    image: pizzaImg,
    category: 'main',
    badge: 'Veg'
  },
  {
    id: '2',
    name: 'Grilled Chicken Salad',
    description: 'Fresh mixed greens with grilled chicken, cherry tomatoes, and balsamic dressing',
    price: 14.99,
    image: saladImg,
    category: 'main'
  },
  {
    id: '3',
    name: 'Pasta Carbonara',
    description: 'Creamy pasta with pancetta, parmesan cheese, and black pepper',
    price: 18.99,
    image: pastaImg,
    category: 'main'
  },
  {
    id: '4',
    name: 'Classic Burger',
    description: 'Beef patty with lettuce, tomato, onion, and fries',
    price: 15.99,
    image: burgerImg,
    category: 'main'
  }
];

export default function Index() {
  const [activeCategory, setActiveCategory] = useState<'main' | 'desserts' | 'drinks'>('main');
  const [cart, setCart] = useState<{[key: string]: number}>({});

  const addToCart = (itemId: string) => {
    setCart(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
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
            <button className="flex items-center space-x-2 bg-white border border-neutral-300 rounded-lg px-4 py-2 hover:bg-neutral-50 transition-colors">
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

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative">
                <Image
                  src={item.image}
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
                  <span className="text-xl font-bold text-neutral-900">${item.price}</span>
                  <button
                    onClick={() => addToCart(item.id)}
                    className="bg-neutral-900 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-neutral-800 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">Add to Cart</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State for other categories */}
        {filteredItems.length === 0 && (
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
    </div>
  );
}
