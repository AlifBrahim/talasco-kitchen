"use client";
import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  BarChart3,
  ChefHat,
  Target,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Plus
} from 'lucide-react';
import {
  DemandForecastResponse,
  PrepPlanResponse,
  TrendAnalysisResponse,
  DemandForecastRequest,
  PrepPlanRequest,
  TrendAnalysisRequest
} from '@shared/api';

interface ForecastDashboardProps {
  locationId?: string;
}

export default function ForecastDashboard({ locationId = 'default' }: ForecastDashboardProps) {
  const [activeTab, setActiveTab] = useState<'demand' | 'prep' | 'trends'>('demand');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Demand forecast state
  const [demandData, setDemandData] = useState<DemandForecastResponse | null>(null);
  const [demandFilters, setDemandFilters] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    bucket_hours: 1
  });

  // Prep plan state
  const [prepData, setPrepData] = useState<PrepPlanResponse | null>(null);
  const [prepFilters, setPrepFilters] = useState({
    target_date: new Date().toISOString().split('T')[0],
    time_window_hours: 8,
    prep_lead_time_hours: 2
  });

  // Trend analysis state
  const [trendData, setTrendData] = useState<TrendAnalysisResponse | null>(null);
  const [trendFilters, setTrendFilters] = useState({
    period_days: 30,
    granularity: 'day' as 'hour' | 'day' | 'week'
  });

  const fetchDemandForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/forecast/demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          ...demandFilters
        })
      });
      
      if (!response.ok) throw new Error('Failed to fetch demand forecast');
      const data = await response.json();
      setDemandData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrepPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/forecast/prep-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          ...prepFilters
        })
      });
      
      if (!response.ok) throw new Error('Failed to fetch prep plan');
      const data = await response.json();
      setPrepData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/forecast/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          ...trendFilters
        })
      });
      
      if (!response.ok) throw new Error('Failed to fetch trend analysis');
      const data = await response.json();
      setTrendData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'demand') fetchDemandForecast();
    else if (activeTab === 'prep') fetchPrepPlan();
    else if (activeTab === 'trends') fetchTrendAnalysis();
  }, [activeTab, locationId]);

  const tabs = [
    { id: 'demand', label: 'Demand Forecast', icon: BarChart3 },
    { id: 'prep', label: 'Prep Planning', icon: ChefHat },
    { id: 'trends', label: 'Trend Analysis', icon: TrendingUp }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Forecasting Dashboard</h2>
          <p className="text-gray-600">AI-powered demand prediction and prep planning</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/forecast/seed-demo-data', { method: 'POST' });
                const result = await response.json();
                if (response.ok) {
                  alert(`Demo data seeded: ${result.message}`);
                } else {
                  alert(`Error: ${result.error}`);
                }
              } catch (err) {
                alert('Failed to seed demo data');
              }
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            <span>Seed Demo Data</span>
          </button>
          <button
            onClick={() => {
              if (activeTab === 'demand') fetchDemandForecast();
              else if (activeTab === 'prep') fetchPrepPlan();
              else if (activeTab === 'trends') fetchTrendAnalysis();
            }}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'demand' && (
          <DemandForecastView
            data={demandData}
            loading={loading}
            filters={demandFilters}
            onFiltersChange={setDemandFilters}
            onRefresh={fetchDemandForecast}
          />
        )}
        
        {activeTab === 'prep' && (
          <PrepPlanView
            data={prepData}
            loading={loading}
            filters={prepFilters}
            onFiltersChange={setPrepFilters}
            onRefresh={fetchPrepPlan}
          />
        )}
        
        {activeTab === 'trends' && (
          <TrendAnalysisView
            data={trendData}
            loading={loading}
            filters={trendFilters}
            onFiltersChange={setTrendFilters}
            onRefresh={fetchTrendAnalysis}
          />
        )}
      </div>
    </div>
  );
}

// Demand Forecast Component
function DemandForecastView({ 
  data, 
  loading, 
  filters, 
  onFiltersChange, 
  onRefresh 
}: {
  data: DemandForecastResponse | null;
  loading: boolean;
  filters: any;
  onFiltersChange: (filters: any) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => onFiltersChange({ ...filters, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => onFiltersChange({ ...filters, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Buckets (hours)</label>
            <select
              value={filters.bucket_hours}
              onChange={(e) => onFiltersChange({ ...filters, bucket_hours: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 Hour</option>
              <option value={2}>2 Hours</option>
              <option value={4}>4 Hours</option>
              <option value={8}>8 Hours</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Generate Forecast'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.total_items}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Peak Hour</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Date(data.summary.peak_hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expected Orders</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.total_expected_orders}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forecast Table */}
      {data && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Demand Forecast Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factors</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.forecasts.map((forecast, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{forecast.menu_item_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(forecast.bucket_start).toLocaleString([], { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{forecast.expected_qty}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${forecast.confidence * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{Math.round(forecast.confidence * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500">
                        <div>Historical: {forecast.factors.historical_avg}</div>
                        <div>Trend: {forecast.factors.trend_factor}x</div>
                        <div>Seasonal: {forecast.factors.seasonal_factor}x</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Prep Plan Component
function PrepPlanView({ 
  data, 
  loading, 
  filters, 
  onFiltersChange, 
  onRefresh 
}: {
  data: PrepPlanResponse | null;
  loading: boolean;
  filters: any;
  onFiltersChange: (filters: any) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
            <input
              type="date"
              value={filters.target_date}
              onChange={(e) => onFiltersChange({ ...filters, target_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Window (hours)</label>
            <select
              value={filters.time_window_hours}
              onChange={(e) => onFiltersChange({ ...filters, time_window_hours: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={4}>4 Hours</option>
              <option value={6}>6 Hours</option>
              <option value={8}>8 Hours</option>
              <option value={12}>12 Hours</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prep Lead Time (hours)</label>
            <select
              value={filters.prep_lead_time_hours}
              onChange={(e) => onFiltersChange({ ...filters, prep_lead_time_hours: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 Hour</option>
              <option value={2}>2 Hours</option>
              <option value={3}>3 Hours</option>
              <option value={4}>4 Hours</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Plan'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <ChefHat className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Items to Prep</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.total_items}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Prep Time</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.total_prep_time_hours}h</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Estimated Cost</p>
                <p className="text-2xl font-bold text-gray-900">${data.summary.estimated_cost}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Waste Risk</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.waste_risk_score}/10</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prep Recommendations */}
      {data && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Prep Recommendations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rationale</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.prep_recommendations.map((rec, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{rec.menu_item_name}</div>
                      <div className="text-sm text-gray-500">{rec.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{rec.recommended_qty}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(rec.prep_start_time).toLocaleString([], { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{rec.prep_duration_minutes}m</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${rec.cost_estimate}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        rec.waste_risk === 'low' ? 'bg-green-100 text-green-800' :
                        rec.waste_risk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {rec.waste_risk}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate">{rec.rationale}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Trend Analysis Component
function TrendAnalysisView({ 
  data, 
  loading, 
  filters, 
  onFiltersChange, 
  onRefresh 
}: {
  data: TrendAnalysisResponse | null;
  loading: boolean;
  filters: any;
  onFiltersChange: (filters: any) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Analysis Period</label>
            <select
              value={filters.period_days}
              onChange={(e) => onFiltersChange({ ...filters, period_days: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>7 Days</option>
              <option value={14}>14 Days</option>
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Granularity</label>
            <select
              value={filters.granularity}
              onChange={(e) => onFiltersChange({ ...filters, granularity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="hour">Hourly</option>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Analyze Trends'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Items Analyzed</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.total_items_analyzed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Trending Up</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.trending_up}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-red-600 rotate-180" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Trending Down</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.trending_down}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Growth Rate</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.avg_growth_rate}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trend Details */}
      {data && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Trend Analysis Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peak Times</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommendations</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.trends.map((trend, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{trend.menu_item_name}</div>
                      <div className="text-sm text-gray-500">{trend.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          trend.trend_direction === 'increasing' ? 'bg-green-100 text-green-800' :
                          trend.trend_direction === 'decreasing' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {trend.trend_direction}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          ({trend.trend_strength})
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        trend.growth_rate > 0 ? 'text-green-600' : 
                        trend.growth_rate < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {trend.growth_rate > 0 ? '+' : ''}{trend.growth_rate}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {trend.peak_hours.length > 0 && (
                          <div>Hours: {trend.peak_hours.join(', ')}</div>
                        )}
                        {trend.peak_days.length > 0 && (
                          <div>Days: {trend.peak_days.join(', ')}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs">
                        {trend.recommendations.map((rec, i) => (
                          <div key={i} className="mb-1">• {rec}</div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
