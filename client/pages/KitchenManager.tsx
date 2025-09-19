"use client";
import React, { useState } from 'react';
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
  Monitor
} from 'lucide-react';
import Link from 'next/link';

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
  const [selectedRecipe, setSelectedRecipe] = useState('Classic Spaghetti Bolognese');

  const dashboardStats = [
    { label: 'Total Recipes', value: '1', icon: <BookOpen className="h-5 w-5" />, color: 'text-blue-600' },
    { label: 'Available Items', value: '0', icon: <Package className="h-5 w-5" />, color: 'text-green-600' },
    { label: 'Station Flows', value: '0', icon: <Workflow className="h-5 w-5" />, color: 'text-purple-600' },
    { label: 'Avg Time (min)', value: '65', icon: <Clock className="h-5 w-5" />, color: 'text-orange-600' }
  ];

  const timeAnalytics = [
    { label: 'Average Recipe Time', value: '65 min', detail: '' },
    { label: 'Fastest Recipe', value: '65 min', detail: '' },
    { label: 'Longest Recipe', value: '65 min', detail: '' }
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
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
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
        {activeTab === 'station-flows' && (
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
                <h3 className="text-lg font-medium text-neutral-900 mb-2">Editing Flow: Classic Spaghetti Bolognese</h3>
                <p className="text-sm text-neutral-600">Add Station to Flow</p>
              </div>

              {/* Station Flow Visualization */}
              <div className="bg-neutral-50 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-center space-x-4 flex-wrap gap-4">
                  {stationFlows.map((station, index) => (
                    <div key={station.id} className="flex items-center space-x-2">
                      <div className={`${station.color} rounded-lg p-3 text-white flex items-center justify-center min-w-[120px]`}>
                        <div className="text-center">
                          <div className="mb-1">{station.icon}</div>
                          <div className="text-xs font-medium">{station.name}</div>
                        </div>
                      </div>
                      {index < stationFlows.length - 1 && (
                        <div className="text-neutral-400">→</div>
                      )}
                    </div>
                  ))}
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

        {/* Placeholder for other tabs */}
        {(activeTab === 'recipes' || activeTab === 'menu-builder') && (
          <div className="bg-white rounded-lg border border-neutral-200 p-12 text-center">
            <div className="text-neutral-400 mb-4">
              <BookOpen className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              {activeTab === 'recipes' ? 'Recipes Management' : 'Menu Builder'}
            </h3>
            <p className="text-neutral-600">
              This section is ready for development. Continue prompting to add more functionality.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
