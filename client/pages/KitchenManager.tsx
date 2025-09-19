"use client";
import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  BookOpen,
  Workflow,
  BarChart3,
  Clock,
  TrendingUp,
  DollarSign,
  Package,
  Plus,
  Utensils,
  MapPin,
  Monitor,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { GetStationsResponse, GetMenuItemsResponse, GetOrdersResponse } from '@shared/api';
import StationManagementModal from '@/components/StationManagementModal';
import RecipeBuilderModal from '@/components/RecipeBuilderModal';
import StationFlowModal from '@/components/StationFlowModal';

interface StationFlow {
  id: string;
  name: string;
  color: string;
  icon: React.ReactNode;
}

const stationFlows: StationFlow[] = [
  { id: 'prep-a', name: 'Prep Station A', color: 'bg-blue-500', icon: <Utensils className="h-4 w-4" /> },
  { id: 'stovetop', name: 'Stovetop Station', color: 'bg-orange-500', icon: <span className="text-xs">🔥</span> },
  { id: 'oven', name: 'Oven Station', color: 'bg-red-500', icon: <span className="text-xs">🥧</span> },
  { id: 'assembly', name: 'Assembly Line', color: 'bg-purple-100', icon: <span className="text-xs">🍽️</span> },
  { id: 'plating', name: 'Plating Station', color: 'bg-yellow-500', icon: <span className="text-xs">⭐</span> }
];

export default function KitchenManager() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'recipes' | 'station-flows' | 'menu-builder'>('dashboard');
  const [stations, setStations] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const [showStationModal, setShowStationModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [showFlowModal, setShowFlowModal] = useState(false);
  const [stationFlows, setStationFlows] = useState<any[]>([]);

  // Fetch data from APIs
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [stationsResponse, menuItemsResponse, ordersResponse] = await Promise.all([
          fetch('/api/stations'),
          fetch('/api/menu-items'),
          fetch('/api/orders')
        ]);

        if (!stationsResponse.ok || !menuItemsResponse.ok || !ordersResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const [stationsData, menuItemsData, ordersData] = await Promise.all([
          stationsResponse.json(),
          menuItemsResponse.json(),
          ordersResponse.json()
        ]);

        setStations(stationsData.stations || []);
        setMenuItems(menuItemsData.menu_items || []);
        setOrders(ordersData.orders || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Using sample data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate dashboard stats from real data
  const dashboardStats = [
    { 
      label: 'Total Recipes', 
      value: menuItems.length.toString(), 
      icon: <BookOpen className="h-5 w-5" />, 
      color: 'text-blue-600' 
    },
    { 
      label: 'Active Stations', 
      value: stations.filter(s => s.is_active).length.toString(), 
      icon: <Package className="h-5 w-5" />, 
      color: 'text-green-600' 
    },
    { 
      label: 'Active Orders', 
      value: orders.filter(o => o.status === 'in_progress').length.toString(), 
      icon: <Workflow className="h-5 w-5" />, 
      color: 'text-purple-600' 
    },
    { 
      label: 'Avg Prep Time (min)', 
      value: menuItems.length > 0 
        ? Math.round(menuItems.reduce((sum, item) => sum + (item.avg_prep_minutes || 0), 0) / menuItems.length)
        : '0', 
      icon: <Clock className="h-5 w-5" />, 
      color: 'text-orange-600' 
    }
  ];

  // Helper functions for station display
  const getStationColor = (kind: string) => {
    switch (kind) {
      case 'prep': return 'bg-blue-500';
      case 'cook': return 'bg-orange-500';
      case 'expedite': return 'bg-green-500';
      case 'bar': return 'bg-purple-500';
      case 'dessert': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const getStationIcon = (kind: string) => {
    switch (kind) {
      case 'prep': return <Utensils className="h-4 w-4" />;
      case 'cook': return <span className="text-xs">🔥</span>;
      case 'expedite': return <span className="text-xs">⚡</span>;
      case 'bar': return <span className="text-xs">🍸</span>;
      case 'dessert': return <span className="text-xs">🍰</span>;
      default: return <span className="text-xs">⚙️</span>;
    }
  };

  const openStationModal = (station: any) => {
    setSelectedStation(station);
    setShowStationModal(true);
  };

  const closeStationModal = () => {
    setShowStationModal(false);
    setSelectedStation(null);
  };

  const saveStation = (updatedStation: any) => {
    setStations(prev => prev.map(station => 
      station.id === updatedStation.id ? updatedStation : station
    ));
    console.log('Station updated:', updatedStation);
  };

  const openRecipeModal = (recipe?: any) => {
    setSelectedRecipe(recipe || null);
    setShowRecipeModal(true);
  };

  const closeRecipeModal = () => {
    setShowRecipeModal(false);
    setSelectedRecipe(null);
  };

  const saveRecipe = (recipe: any) => {
    console.log('Recipe saved:', recipe);
    // In a real app, this would update the database
    // For now, add to menuItems state
    setMenuItems(prev => {
      const existingIndex = prev.findIndex(item => item.id === recipe.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = recipe;
        return updated;
      } else {
        return [...prev, recipe];
      }
    });
  };

  const openFlowModal = () => {
    setShowFlowModal(true);
  };

  const closeFlowModal = () => {
    setShowFlowModal(false);
  };

  const saveStationFlows = (flows: any[]) => {
    setStationFlows(flows);
    console.log('Station flows saved:', flows);
    // In a real app, this would update the database
  };

  // Calculate time analytics from real data
  const timeAnalytics = [
    { 
      label: 'Average Recipe Time', 
      value: menuItems.length > 0 
        ? `${Math.round(menuItems.reduce((sum, item) => sum + (item.avg_prep_minutes || 0), 0) / menuItems.length)} min`
        : '0 min', 
      detail: '' 
    },
    { 
      label: 'Fastest Recipe', 
      value: menuItems.length > 0 
        ? `${Math.min(...menuItems.map(item => item.avg_prep_minutes || 0))} min`
        : '0 min', 
      detail: menuItems.length > 0 ? menuItems.find(item => item.avg_prep_minutes === Math.min(...menuItems.map(i => i.avg_prep_minutes || 0)))?.name : ''
    },
    { 
      label: 'Longest Recipe', 
      value: menuItems.length > 0 
        ? `${Math.max(...menuItems.map(item => item.avg_prep_minutes || 0))} min`
        : '0 min', 
      detail: menuItems.length > 0 ? menuItems.find(item => item.avg_prep_minutes === Math.max(...menuItems.map(i => i.avg_prep_minutes || 0)))?.name : ''
    }
  ];

  const difficultyStats = [
    { label: 'Easy', value: '0', color: 'bg-green-500' },
    { label: 'Medium', value: '1', color: 'bg-yellow-500' },
    { label: 'Hard', value: '0', color: 'bg-red-500' }
  ];

  const pricingStats = [
    { label: 'Average Price', value: '$0.00' },
    { label: 'Lowest Price', value: '$0.00' },
    { label: 'Highest Price', value: '$0.00' }
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <ChefHat className="h-6 w-6 text-neutral-800" />
                <h1 className="text-xl font-semibold text-neutral-900">Kitchen Manager</h1>
                <span className="text-sm text-neutral-500">Recipe & Menu Builder</span>
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
              <span className="text-sm text-neutral-600">1 Recipes</span>
              <span className="text-sm text-neutral-600">0 Menu Items</span>
              <button className="bg-neutral-900 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-neutral-800 transition-colors">
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">New Recipe</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-4 w-4" /> },
              { key: 'recipes', label: 'Recipes', icon: <BookOpen className="h-4 w-4" /> },
              { key: 'station-flows', label: 'Station Flows', icon: <Workflow className="h-4 w-4" /> },
              { key: 'menu-builder', label: 'Menu Builder', icon: <Utensils className="h-4 w-4" /> }
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === key
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

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
              <span className="text-neutral-600">Loading kitchen data...</span>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dashboardStats.map((stat, index) => (
                <div key={index} className="bg-white rounded-lg border border-neutral-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-600">{stat.label}</p>
                      <p className="text-3xl font-bold text-neutral-900">{stat.value}</p>
                    </div>
                    <div className={stat.color}>
                      {stat.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Time Analytics */}
              <div className="bg-white rounded-lg border border-neutral-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Clock className="h-5 w-5 text-neutral-600" />
                  <h3 className="text-lg font-semibold text-neutral-900">Time Analytics</h3>
                </div>
                <div className="space-y-4">
                  {timeAnalytics.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-sm text-neutral-600">{item.label}</span>
                      <span className="text-sm font-medium text-neutral-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recipe Difficulty */}
              <div className="bg-white rounded-lg border border-neutral-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-neutral-600" />
                  <h3 className="text-lg font-semibold text-neutral-900">Recipe Difficulty</h3>
                </div>
                <div className="space-y-3">
                  {difficultyStats.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                        <span className="text-sm text-neutral-600">{item.label}</span>
                      </div>
                      <span className="text-sm font-medium text-neutral-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Menu Pricing */}
              <div className="bg-white rounded-lg border border-neutral-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <DollarSign className="h-5 w-5 text-neutral-600" />
                  <h3 className="text-lg font-semibold text-neutral-900">Menu Pricing</h3>
                </div>
                <div className="space-y-4">
                  {pricingStats.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-sm text-neutral-600">{item.label}</span>
                      <span className="text-sm font-medium text-neutral-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Recipes */}
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-neutral-900">Recent Recipes</h3>
                <span className="text-sm text-neutral-500">Menu Categories</span>
              </div>
              <div className="flex items-center justify-between py-4 border-b border-neutral-100">
                <div>
                  <h4 className="font-medium text-neutral-900">Classic Spaghetti Bolognese</h4>
                  <p className="text-sm text-neutral-600">Main Course • 65 min</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-neutral-900">Medium</p>
                  <p className="text-sm text-neutral-600">Difficulty</p>
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className="text-neutral-500">No menu items created yet</p>
              </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">1</div>
                <div className="text-sm text-blue-600">Total Recipes</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-green-600">Available Items</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">0</div>
                <div className="text-sm text-purple-600">Station Flows</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">65</div>
                <div className="text-sm text-orange-600">Avg Time (min)</div>
              </div>
            </div>
          </div>
        )}

        {/* Station Flows Tab */}
        {!loading && activeTab === 'station-flows' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <MapPin className="h-5 w-5 text-neutral-600" />
                <h2 className="text-xl font-semibold text-neutral-900">Station Flow Management</h2>
              </div>
              <p className="text-neutral-600 mb-8">Design efficient workflows by mapping recipes to kitchen stations.</p>

              {/* Recipe Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-neutral-700 mb-2">Select Recipe</label>
                <select 
                  value={selectedRecipe}
                  onChange={(e) => setSelectedRecipe(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  <option>Classic Spaghetti Bolognese</option>
                </select>
                <button className="ml-4 bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors">
                  + Create Flow
                </button>
              </div>

              {/* Flow Title */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">Station Flow Management</h3>
                    <p className="text-sm text-neutral-600">Create workflow sequences for your recipes</p>
                  </div>
                  <button
                    onClick={openFlowModal}
                    className="bg-neutral-900 text-white px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Flow</span>
                  </button>
                </div>
              </div>

              {/* Station Flow Visualization */}
              <div className="bg-neutral-50 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-center space-x-4 flex-wrap gap-4">
                  {stations.length > 0 ? stations.map((station, index) => (
                    <div key={station.id} className="flex items-center space-x-2">
                      <div 
                        className={`${getStationColor(station.kind)} rounded-lg p-3 text-white flex items-center justify-center min-w-[120px] cursor-pointer hover:opacity-80 transition-opacity`}
                        onClick={() => openStationModal(station)}
                        title="Click to configure station"
                      >
                        <div className="text-center">
                          <div className="mb-1">{getStationIcon(station.kind)}</div>
                          <div className="text-xs font-medium">{station.name}</div>
                        </div>
                      </div>
                      {index < stations.length - 1 && (
                        <div className="text-neutral-400">→</div>
                      )}
                    </div>
                  )) : (
                    <div className="text-center py-8 text-neutral-500">
                      No stations configured yet
                    </div>
                  )}
                </div>
              </div>

              {/* Station Flow Sequence */}
              <div className="mb-8">
                <h4 className="text-lg font-medium text-neutral-900 mb-4">Station Flow Sequence</h4>
                <div className="bg-neutral-50 rounded-lg p-6 text-center">
                  <p className="text-neutral-500">No stations added to flow yet. Add stations above.</p>
                </div>
              </div>

              {/* Existing Station Flows */}
              <div>
                <h4 className="text-lg font-medium text-neutral-900 mb-4">Existing Station Flows</h4>
                <div className="bg-neutral-50 rounded-lg p-6 text-center">
                  <p className="text-neutral-500">No station flows created yet.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recipes Tab */}
        {!loading && activeTab === 'recipes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-neutral-900">Recipe Management</h2>
              <button
                onClick={() => openRecipeModal()}
                className="bg-neutral-900 text-white px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Recipe</span>
              </button>
            </div>

            {/* Recipe List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map((item) => (
                <div key={item.id} className="bg-white border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-neutral-900">{item.name}</h3>
                    <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 mb-3">{item.description || 'No description'}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-neutral-500">
                      <Clock className="h-4 w-4" />
                      <span>{item.avg_prep_minutes || 0} min</span>
                    </div>
                    <button
                      onClick={() => openRecipeModal(item)}
                      className="text-neutral-600 hover:text-neutral-900 text-sm"
                    >
                      Edit Recipe
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu Builder Tab */}
        {!loading && activeTab === 'menu-builder' && (
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
            <div className="text-neutral-400 mb-4">
              <Utensils className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Menu Builder</h3>
            <p className="text-neutral-600 mb-4">
              Build and manage your restaurant menu with drag-and-drop functionality.
            </p>
            <button
              onClick={() => openRecipeModal()}
              className="bg-neutral-900 text-white px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Start Building Menu
            </button>
          </div>
        )}
      </main>

      {/* Station Management Modal */}
      {selectedStation && (
        <StationManagementModal
          station={selectedStation}
          isOpen={showStationModal}
          onClose={closeStationModal}
          onSave={saveStation}
        />
      )}

      {/* Recipe Builder Modal */}
      <RecipeBuilderModal
        recipe={selectedRecipe}
        isOpen={showRecipeModal}
        onClose={closeRecipeModal}
        onSave={saveRecipe}
      />

      {/* Station Flow Modal */}
      <StationFlowModal
        isOpen={showFlowModal}
        onClose={closeFlowModal}
        stations={stations}
        menuItems={menuItems}
        onSave={saveStationFlows}
      />
    </div>
  );
}
