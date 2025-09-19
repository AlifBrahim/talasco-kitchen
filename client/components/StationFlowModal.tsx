"use client";
import React, { useState } from 'react';
import { X, Plus, Trash2, Save, ArrowRight, ChefHat, Clock } from 'lucide-react';

interface Station {
  id: string;
  name: string;
  kind: string;
  is_active: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  avg_prep_minutes: number;
}

interface StationFlow {
  id: string;
  menu_item_id: string;
  station_id: string;
  sequence: number;
}

interface StationFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: Station[];
  menuItems: MenuItem[];
  onSave: (flows: StationFlow[]) => void;
}

export default function StationFlowModal({ 
  isOpen, 
  onClose, 
  stations, 
  menuItems, 
  onSave 
}: StationFlowModalProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<MenuItem | null>(null);
  const [flows, setFlows] = useState<StationFlow[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const addStationToFlow = (stationId: string) => {
    if (!selectedRecipe) return;

    const newFlow: StationFlow = {
      id: `flow-${Date.now()}`,
      menu_item_id: selectedRecipe.id,
      station_id: stationId,
      sequence: flows.length + 1
    };

    setFlows(prev => [...prev, newFlow]);
  };

  const removeStationFromFlow = (flowId: string) => {
    setFlows(prev => {
      const newFlows = prev.filter(flow => flow.id !== flowId);
      // Reorder sequences
      return newFlows.map((flow, index) => ({
        ...flow,
        sequence: index + 1
      }));
    });
  };

  const moveStation = (flowId: string, direction: 'up' | 'down') => {
    setFlows(prev => {
      const flowIndex = prev.findIndex(flow => flow.id === flowId);
      if (flowIndex === -1) return prev;

      const newFlows = [...prev];
      const targetIndex = direction === 'up' ? flowIndex - 1 : flowIndex + 1;

      if (targetIndex < 0 || targetIndex >= newFlows.length) return prev;

      // Swap flows
      [newFlows[flowIndex], newFlows[targetIndex]] = [newFlows[targetIndex], newFlows[flowIndex]];

      // Update sequences
      return newFlows.map((flow, index) => ({
        ...flow,
        sequence: index + 1
      }));
    });
  };

  const handleSave = () => {
    onSave(flows);
    onClose();
    setFlows([]);
    setSelectedRecipe(null);
  };

  const getStationName = (stationId: string) => {
    return stations.find(s => s.id === stationId)?.name || 'Unknown Station';
  };

  const getStationIcon = (kind: string) => {
    switch (kind) {
      case 'prep': return '🥄';
      case 'cook': return '🔥';
      case 'expedite': return '⚡';
      case 'bar': return '🍸';
      case 'dessert': return '🍰';
      default: return '⚙️';
    }
  };

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ChefHat className="h-6 w-6 text-neutral-600" />
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Station Flow Management</h2>
                <p className="text-sm text-neutral-600">Create workflow sequences for recipes</p>
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
        <div className="p-6 space-y-6">
          {/* Recipe Selection */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Select Recipe</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedRecipe(item);
                    setFlows([]);
                    setIsCreating(true);
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    selectedRecipe?.id === item.id
                      ? 'border-neutral-900 bg-neutral-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <h4 className="font-medium text-neutral-900">{item.name}</h4>
                  <p className="text-sm text-neutral-600">{item.category}</p>
                  <div className="flex items-center space-x-1 mt-2 text-xs text-neutral-500">
                    <Clock className="h-3 w-3" />
                    <span>{item.avg_prep_minutes} min</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Flow Creation */}
          {selectedRecipe && isCreating && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">
                  Creating Flow for: {selectedRecipe.name}
                </h3>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setFlows([]);
                  }}
                  className="text-neutral-600 hover:text-neutral-800 text-sm"
                >
                  Cancel
                </button>
              </div>

              {/* Available Stations */}
              <div className="mb-6">
                <h4 className="font-medium text-neutral-900 mb-3">Available Stations</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {stations.filter(station => station.is_active).map((station) => (
                    <button
                      key={station.id}
                      onClick={() => addStationToFlow(station.id)}
                      className={`p-3 rounded-lg text-white flex flex-col items-center space-y-2 hover:opacity-80 transition-opacity ${getStationColor(station.kind)}`}
                    >
                      <span className="text-lg">{getStationIcon(station.kind)}</span>
                      <span className="text-xs font-medium text-center">{station.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Flow */}
              {flows.length > 0 && (
                <div>
                  <h4 className="font-medium text-neutral-900 mb-3">Current Flow Sequence</h4>
                  <div className="space-y-2">
                    {flows.map((flow, index) => (
                      <div key={flow.id} className="flex items-center space-x-3 p-3 border border-neutral-200 rounded-lg">
                        <span className="w-6 h-6 bg-neutral-900 text-white text-xs rounded-full flex items-center justify-center font-medium">
                          {flow.sequence}
                        </span>
                        <div className={`px-3 py-2 rounded-lg text-white flex items-center space-x-2 ${getStationColor(stations.find(s => s.id === flow.station_id)?.kind || '')}`}>
                          <span>{getStationIcon(stations.find(s => s.id === flow.station_id)?.kind || '')}</span>
                          <span className="text-sm font-medium">{getStationName(flow.station_id)}</span>
                        </div>
                        <div className="flex items-center space-x-1 ml-auto">
                          <button
                            onClick={() => moveStation(flow.id, 'up')}
                            disabled={index === 0}
                            className="p-1 text-neutral-600 hover:text-neutral-800 disabled:opacity-50"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveStation(flow.id, 'down')}
                            disabled={index === flows.length - 1}
                            className="p-1 text-neutral-600 hover:text-neutral-800 disabled:opacity-50"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => removeStationFromFlow(flow.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Flow Visualization */}
              {flows.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-neutral-900 mb-3">Flow Visualization</h4>
                  <div className="bg-neutral-50 rounded-lg p-4">
                    <div className="flex items-center justify-center space-x-4 flex-wrap gap-4">
                      {flows.map((flow, index) => (
                        <div key={flow.id} className="flex items-center space-x-2">
                          <div className={`${getStationColor(stations.find(s => s.id === flow.station_id)?.kind || '')} rounded-lg p-3 text-white flex items-center justify-center min-w-[120px]`}>
                            <div className="text-center">
                              <div className="mb-1">{getStationIcon(stations.find(s => s.id === flow.station_id)?.kind || '')}</div>
                              <div className="text-xs font-medium">{getStationName(flow.station_id)}</div>
                            </div>
                          </div>
                          {index < flows.length - 1 && (
                            <ArrowRight className="h-5 w-5 text-neutral-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-200 rounded-b-lg">
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-neutral-700 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {flows.length > 0 && (
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Save Flow</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
