"use client";
import React, { useState } from 'react';
import { X, Clock, Settings, Plus, Trash2, Save } from 'lucide-react';

interface StationSLA {
  id: string;
  station_id: string;
  daypart: string;
  target_prep_minutes: number;
  alert_after_minutes: number;
}

interface Station {
  id: string;
  location_id: string;
  name: string;
  kind: 'prep' | 'cook' | 'expedite' | 'bar' | 'dessert';
  is_active: boolean;
  station_sla: StationSLA[];
}

interface StationManagementModalProps {
  station: Station;
  isOpen: boolean;
  onClose: () => void;
  onSave: (station: Station) => void;
}

export default function StationManagementModal({ 
  station, 
  isOpen, 
  onClose, 
  onSave 
}: StationManagementModalProps) {
  const [editedStation, setEditedStation] = useState<Station>(station);
  const [newSLA, setNewSLA] = useState<Partial<StationSLA>>({
    daypart: '',
    target_prep_minutes: 15,
    alert_after_minutes: 20
  });

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(editedStation);
    onClose();
  };

  const addSLA = () => {
    if (!newSLA.daypart) return;
    
    const sla: StationSLA = {
      id: `sla-${Date.now()}`,
      station_id: editedStation.id,
      daypart: newSLA.daypart,
      target_prep_minutes: newSLA.target_prep_minutes || 15,
      alert_after_minutes: newSLA.alert_after_minutes || 20
    };

    setEditedStation(prev => ({
      ...prev,
      station_sla: [...prev.station_sla, sla]
    }));

    setNewSLA({
      daypart: '',
      target_prep_minutes: 15,
      alert_after_minutes: 20
    });
  };

  const removeSLA = (slaId: string) => {
    setEditedStation(prev => ({
      ...prev,
      station_sla: prev.station_sla.filter(sla => sla.id !== slaId)
    }));
  };

  const updateSLA = (slaId: string, field: keyof StationSLA, value: any) => {
    setEditedStation(prev => ({
      ...prev,
      station_sla: prev.station_sla.map(sla => 
        sla.id === slaId ? { ...sla, [field]: value } : sla
      )
    }));
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getStationIcon(editedStation.kind)}</span>
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Station Configuration</h2>
                <p className="text-sm text-neutral-600">Configure {editedStation.name}</p>
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
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Station Name</label>
                <input
                  type="text"
                  value={editedStation.name}
                  onChange={(e) => setEditedStation(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Station Type</label>
                <select
                  value={editedStation.kind}
                  onChange={(e) => setEditedStation(prev => ({ ...prev, kind: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  <option value="prep">Prep Station</option>
                  <option value="cook">Cook Station</option>
                  <option value="expedite">Expedite Station</option>
                  <option value="bar">Bar Station</option>
                  <option value="dessert">Dessert Station</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editedStation.is_active}
                  onChange={(e) => setEditedStation(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 text-neutral-600 rounded focus:ring-neutral-500"
                />
                <span className="text-sm text-neutral-700">Station is active</span>
              </label>
            </div>
          </div>

          {/* SLA Configuration */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">SLA Configuration</h3>
            <div className="space-y-4">
              {editedStation.station_sla.map((sla) => (
                <div key={sla.id} className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-neutral-900">{sla.daypart}</h4>
                    <button
                      onClick={() => removeSLA(sla.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-neutral-600 mb-1">Target Prep Time (min)</label>
                      <input
                        type="number"
                        value={sla.target_prep_minutes}
                        onChange={(e) => updateSLA(sla.id, 'target_prep_minutes', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-neutral-600 mb-1">Alert After (min)</label>
                      <input
                        type="number"
                        value={sla.alert_after_minutes}
                        onChange={(e) => updateSLA(sla.id, 'alert_after_minutes', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add New SLA */}
              <div className="border-2 border-dashed border-neutral-300 rounded-lg p-4">
                <h4 className="font-medium text-neutral-900 mb-3">Add New SLA Period</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-neutral-600 mb-1">Daypart</label>
                    <select
                      value={newSLA.daypart}
                      onChange={(e) => setNewSLA(prev => ({ ...prev, daypart: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    >
                      <option value="">Select daypart</option>
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="late">Late Night</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-600 mb-1">Target (min)</label>
                    <input
                      type="number"
                      value={newSLA.target_prep_minutes}
                      onChange={(e) => setNewSLA(prev => ({ ...prev, target_prep_minutes: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-600 mb-1">Alert (min)</label>
                    <input
                      type="number"
                      value={newSLA.alert_after_minutes}
                      onChange={(e) => setNewSLA(prev => ({ ...prev, alert_after_minutes: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    />
                  </div>
                </div>
                <button
                  onClick={addSLA}
                  className="mt-3 bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-200 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add SLA</span>
                </button>
              </div>
            </div>
          </div>
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
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
