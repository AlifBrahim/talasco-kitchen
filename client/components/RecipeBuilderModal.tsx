"use client";
import React, { useState } from 'react';
import { X, Plus, Trash2, Save, ChefHat, Package, Clock } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  qty: number;
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  avg_prep_minutes: number;
  ingredients: Ingredient[];
}

interface RecipeBuilderModalProps {
  recipe?: Recipe;
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
}

export default function RecipeBuilderModal({ 
  recipe, 
  isOpen, 
  onClose, 
  onSave 
}: RecipeBuilderModalProps) {
  const [editedRecipe, setEditedRecipe] = useState<Recipe>(recipe || {
    id: `recipe-${Date.now()}`,
    name: '',
    description: '',
    category: 'Main',
    avg_prep_minutes: 15,
    ingredients: []
  });

  const [newIngredient, setNewIngredient] = useState<Partial<Ingredient>>({
    name: '',
    unit: 'g',
    qty: 0
  });

  const availableIngredients = [
    { id: '1', name: 'Tomatoes', unit: 'g' },
    { id: '2', name: 'Onions', unit: 'g' },
    { id: '3', name: 'Garlic', unit: 'cloves' },
    { id: '4', name: 'Olive Oil', unit: 'ml' },
    { id: '5', name: 'Salt', unit: 'g' },
    { id: '6', name: 'Pepper', unit: 'g' },
    { id: '7', name: 'Pasta', unit: 'g' },
    { id: '8', name: 'Cheese', unit: 'g' },
    { id: '9', name: 'Chicken', unit: 'g' },
    { id: '10', name: 'Rice', unit: 'g' }
  ];

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(editedRecipe);
    onClose();
  };

  const addIngredient = () => {
    if (!newIngredient.name || !newIngredient.qty) return;

    const ingredient: Ingredient = {
      id: `ingredient-${Date.now()}`,
      name: newIngredient.name,
      unit: newIngredient.unit || 'g',
      qty: newIngredient.qty
    };

    setEditedRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, ingredient]
    }));

    setNewIngredient({
      name: '',
      unit: 'g',
      qty: 0
    });
  };

  const removeIngredient = (ingredientId: string) => {
    setEditedRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(ing => ing.id !== ingredientId)
    }));
  };

  const updateIngredient = (ingredientId: string, field: keyof Ingredient, value: any) => {
    setEditedRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.map(ing => 
        ing.id === ingredientId ? { ...ing, [field]: value } : ing
      )
    }));
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
                <h2 className="text-xl font-bold text-neutral-900">Recipe Builder</h2>
                <p className="text-sm text-neutral-600">
                  {recipe ? 'Edit Recipe' : 'Create New Recipe'}
                </p>
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
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Recipe Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Recipe Name</label>
                <input
                  type="text"
                  value={editedRecipe.name}
                  onChange={(e) => setEditedRecipe(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="Enter recipe name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Category</label>
                <select
                  value={editedRecipe.category}
                  onChange={(e) => setEditedRecipe(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  <option value="Main">Main Course</option>
                  <option value="Appetizer">Appetizer</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Beverage">Beverage</option>
                  <option value="Salad">Salad</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Description</label>
              <textarea
                value={editedRecipe.description}
                onChange={(e) => setEditedRecipe(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500 resize-none"
                rows={3}
                placeholder="Describe the recipe..."
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Prep Time (minutes)</label>
              <input
                type="number"
                value={editedRecipe.avg_prep_minutes}
                onChange={(e) => setEditedRecipe(prev => ({ ...prev, avg_prep_minutes: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                min="1"
              />
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Ingredients</h3>
            
            {/* Current Ingredients */}
            <div className="space-y-3 mb-6">
              {editedRecipe.ingredients.map((ingredient) => (
                <div key={ingredient.id} className="flex items-center space-x-3 p-3 border border-neutral-200 rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={ingredient.name}
                      onChange={(e) => updateIngredient(ingredient.id, 'name', e.target.value)}
                      className="px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    />
                    <input
                      type="number"
                      value={ingredient.qty}
                      onChange={(e) => updateIngredient(ingredient.id, 'qty', parseFloat(e.target.value))}
                      className="px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                      min="0"
                      step="0.1"
                    />
                    <select
                      value={ingredient.unit}
                      onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
                      className="px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="l">l</option>
                      <option value="cloves">cloves</option>
                      <option value="cups">cups</option>
                      <option value="tbsp">tbsp</option>
                      <option value="tsp">tsp</option>
                    </select>
                  </div>
                  <button
                    onClick={() => removeIngredient(ingredient.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Ingredient */}
            <div className="border-2 border-dashed border-neutral-300 rounded-lg p-4">
              <h4 className="font-medium text-neutral-900 mb-3">Add Ingredient</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={newIngredient.name}
                  onChange={(e) => setNewIngredient(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ingredient name"
                  className="px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                />
                <input
                  type="number"
                  value={newIngredient.qty || ''}
                  onChange={(e) => setNewIngredient(prev => ({ ...prev, qty: parseFloat(e.target.value) }))}
                  placeholder="Quantity"
                  className="px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  min="0"
                  step="0.1"
                />
                <select
                  value={newIngredient.unit}
                  onChange={(e) => setNewIngredient(prev => ({ ...prev, unit: e.target.value }))}
                  className="px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                >
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="cloves">cloves</option>
                  <option value="cups">cups</option>
                  <option value="tbsp">tbsp</option>
                  <option value="tsp">tsp</option>
                </select>
                <button
                  onClick={addIngredient}
                  className="bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recipe Summary */}
          <div className="bg-neutral-50 rounded-lg p-4">
            <h3 className="font-medium text-neutral-900 mb-2">Recipe Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-neutral-600" />
                <span>{editedRecipe.avg_prep_minutes} minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-neutral-600" />
                <span>{editedRecipe.ingredients.length} ingredients</span>
              </div>
              <div className="flex items-center space-x-2">
                <ChefHat className="h-4 w-4 text-neutral-600" />
                <span>{editedRecipe.category}</span>
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
              <span>Save Recipe</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
