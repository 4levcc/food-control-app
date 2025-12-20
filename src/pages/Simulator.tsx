import React, { useState, useMemo } from 'react';
import { ArrowRight, FileText, Layers } from 'lucide-react'; // Added icons
import { useStore } from '../hooks/useStore';
import { exportShoppingListPDF } from '../utils/pdfGenerator';
import type { Recipe } from '../types';

export const Simulator: React.FC = () => {
    const { recipes, ingredients } = useStore();
    const [selectedRecipes, setSelectedRecipes] = useState<Record<string, number>>({});
    const [step, setStep] = useState<'select' | 'result'>('select');
    const [explodeBaseIngredients, setExplodeBaseIngredients] = useState(false);
    const [filter, setFilter] = useState<'all' | 'base' | 'final'>('all');

    const handleManualQuantityChange = (recipeId: string, value: string) => {
        const val = parseInt(value, 10);
        if (isNaN(val) || val < 0) return;

        setSelectedRecipes(prev => {
            if (val === 0) {
                const { [recipeId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [recipeId]: val };
        });
    };

    const shoppingList = useMemo(() => {
        const finalList: Record<string, { quantity: number; cost: number; ingredientId: string }> = {};
        const baseList: Record<string, { quantity: number; cost: number; ingredientId: string }> = {};

        // Helper to add to specific list
        const addToList = (
            list: typeof finalList,
            item: { ingredientId: string; quantity: number },
            ing: { price: number; correctionFactor?: number },
            batchCount: number
        ) => {
            if (!list[item.ingredientId]) {
                list[item.ingredientId] = {
                    quantity: 0,
                    cost: 0,
                    ingredientId: item.ingredientId
                };
            }
            // Gross Quantity logic
            const grossQuantity = item.quantity * (ing.correctionFactor || 1) * batchCount;
            const cost = grossQuantity * ing.price;

            list[item.ingredientId].quantity += grossQuantity;
            list[item.ingredientId].cost += cost;
        };

        // Recursive function to collect ingredients
        const collectIngredients = (recipe: Recipe, batches: number, isBaseRecursion: boolean) => {
            recipe.items.forEach(item => {
                const ing = ingredients.find(i => i.id === item.ingredientId);
                if (!ing) return;

                // Check for Base Product Match (Explode Logic)
                let baseRecipe: Recipe | undefined;
                if (explodeBaseIngredients) {
                    baseRecipe = recipes.find(r =>
                        r.name === ing.name &&
                        (r.productType === 'Base' || r.isIngredient)
                    );
                }

                if (baseRecipe) {
                    // Calculate batches needed
                    const totalBaseIngNeeded = item.quantity * batches;
                    const yieldVal = baseRecipe.yieldGrams || (baseRecipe.yieldKg * 1000) || 1;
                    const baseBatches = totalBaseIngNeeded / yieldVal;

                    // Recurse as 'Base'
                    collectIngredients(baseRecipe, baseBatches, true);
                } else {
                    // Regular Ingredient
                    if (explodeBaseIngredients) {
                        // If exploding, separate into lists
                        if (isBaseRecursion) {
                            addToList(baseList, item, ing, batches);
                        } else {
                            addToList(finalList, item, ing, batches);
                        }
                    } else {
                        // Not exploding: everything goes to main list (finalList acts as main)
                        addToList(finalList, item, ing, batches);
                    }
                }
            });
        };

        Object.entries(selectedRecipes).forEach(([recipeId, batchCount]) => {
            const recipe = recipes.find(r => r.id === recipeId);
            if (recipe) {
                // Start recursion as 'Final' (isBaseRecursion = false)
                collectIngredients(recipe, batchCount, false);
            }
        });

        // Formatter
        const formatList = (list: typeof finalList) => Object.values(list).map(item => {
            const ing = ingredients.find(i => i.id === item.ingredientId);
            return {
                ...item,
                name: ing?.name || 'Unknown',
                unit: ing?.unit || '',
                supplier: ing?.supplier || 'N/A'
            };
        }).sort((a, b) => a.name.localeCompare(b.name));

        return {
            final: formatList(finalList),
            base: formatList(baseList),
            all: formatList({ ...finalList, ...baseList }) // Fallback/Combined if needed
        };
    }, [selectedRecipes, recipes, ingredients, explodeBaseIngredients]);

    // Calculate total cost from both lists
    const totalEstimatedCost = shoppingList.final.reduce((sum, item) => sum + item.cost, 0) +
        shoppingList.base.reduce((sum, item) => sum + item.cost, 0);

    // Check if any selected recipe has base products (to enable/disable toggle)
    const hasBaseProducts = useMemo(() => {
        return Object.keys(selectedRecipes).some(id => {
            const recipe = recipes.find(r => r.id === id);
            if (!recipe) return false;
            // Check if any ingredient matches a base recipe
            return recipe.items.some(item => {
                const ing = ingredients.find(i => i.id === item.ingredientId);
                if (!ing) return false;
                return recipes.some(r => r.name === ing.name && (r.productType === 'Base' || r.isIngredient));
            });
        });
    }, [selectedRecipes, recipes, ingredients]);

    const filteredRecipes = useMemo(() => {
        return recipes.filter(rec => {
            if (filter === 'all') return true;
            if (filter === 'base') return rec.productType === 'Base';
            if (filter === 'final') return rec.productType === 'Final';
            return true;
        });
    }, [recipes, filter]);


    if (step === 'result') {
        const hasBaseItems = shoppingList.base.length > 0;

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Lista de Compras</h2>
                    <button
                        onClick={() => setStep('select')}
                        className="text-blue-600 font-medium hover:underline"
                    >
                        Voltar
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
                        <div>
                            <span className="text-blue-900 font-medium block">Custo Estimado Total</span>
                            {explodeBaseIngredients && <span className="text-xs text-blue-600">(Com produtos base explodidos)</span>}
                        </div>
                        <span className="text-2xl font-bold text-blue-700">R$ {totalEstimatedCost.toFixed(2)}</span>
                    </div>

                    <div className="divide-y divide-gray-100 p-4">
                        {/* Final Products List */}
                        {hasBaseItems && <h3 className="font-bold text-gray-800 mb-2 mt-2">Itens de Produtos Finais</h3>}
                        {shoppingList.final.map((item) => (
                            <div key={item.ingredientId} className="py-3 flex justify-between items-center hover:bg-gray-50 transition-colors border-b last:border-0 border-gray-100">
                                <div>
                                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                                    <p className="text-xs text-gray-500">{item.supplier}</p>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-lg text-gray-900">
                                        {item.quantity.toFixed(2)} <span className="text-sm font-normal text-gray-500">{item.unit}</span>
                                    </div>
                                    <div className="text-sm text-gray-600">R$ {item.cost.toFixed(2)}</div>
                                </div>
                            </div>
                        ))}

                        {/* Base Products List */}
                        {hasBaseItems && (
                            <>
                                <h3 className="font-bold text-orange-800 mb-2 mt-6 border-t pt-4">Itens de Receitas Base</h3>
                                {shoppingList.base.map((item) => (
                                    <div key={item.ingredientId} className="py-3 flex justify-between items-center hover:bg-orange-50 transition-colors border-b last:border-0 border-gray-100 bg-orange-50/30 rounded px-2">
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{item.name}</h4>
                                            <p className="text-xs text-gray-500">{item.supplier}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-lg text-gray-900">
                                                {item.quantity.toFixed(2)} <span className="text-sm font-normal text-gray-500">{item.unit}</span>
                                            </div>
                                            <div className="text-sm text-gray-600">R$ {item.cost.toFixed(2)}</div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}


                        {shoppingList.final.length === 0 && shoppingList.base.length === 0 && (
                            <div className="p-10 text-center text-gray-500">
                                Nenhum item na lista de compras.
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => exportShoppingListPDF(
                            [], // Pass empty main list since we use grouped
                            totalEstimatedCost,
                            { final: shoppingList.final, base: shoppingList.base }
                        )}
                        className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex justify-center items-center shadow-sm"
                    >
                        <FileText size={20} className="mr-2" />
                        Exportar PDF
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Simulador de Compras</h2>
            <div className="flex justify-between items-center">
                <p className="text-gray-600">Selecione as receitas e quantidades que deseja produzir.</p>

                {/* Filter */}
                <div className="inline-flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'all'
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilter('base')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'base'
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        Prod. Base
                    </button>
                    <button
                        onClick={() => setFilter('final')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'final'
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        Prod. Final
                    </button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredRecipes.map((rec) => {
                    const count = selectedRecipes[rec.id] || 0;
                    return (
                        <div key={rec.id} className={`p-4 rounded-lg border transition-all ${count > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-gray-900 leading-tight">{rec.name}</h3>
                                <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2 ${rec.productType === 'Base' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                    {rec.productType === 'Base' ? 'Base' : 'Final'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between mt-auto">
                                <span className="text-sm font-medium text-gray-700">Quantidade:</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={count}
                                    onChange={(e) => handleManualQuantityChange(rec.id, e.target.value)}
                                    className="w-full h-10 text-center font-bold text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    aria-label={`Quantidade de ${rec.name}`}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {Object.keys(selectedRecipes).length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t border-gray-200 flex flex-col md:flex-row justify-center items-center gap-4 shadow-lg z-10 transition-all animate-slide-up">

                    {/* Explode Toggle */}
                    <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${hasBaseProducts
                        ? 'bg-orange-50 border-orange-200 text-orange-800'
                        : 'bg-gray-50 border-gray-200 text-gray-400 opacity-75'}`}>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="explodeBase"
                                checked={explodeBaseIngredients}
                                onChange={(e) => setExplodeBaseIngredients(e.target.checked)}
                                disabled={!hasBaseProducts}
                                className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500 disabled:cursor-not-allowed"
                            />
                            <label htmlFor="explodeBase" className={`ml-2 text-sm font-medium cursor-pointer ${!hasBaseProducts ? 'cursor-not-allowed' : ''}`}>
                                Listar itens dos produtos base?
                            </label>
                        </div>
                        {hasBaseProducts && <Layers size={16} className="text-orange-500" />}
                    </div>

                    <button
                        onClick={() => setStep('result')}
                        className="bg-blue-600 text-white px-8 py-3 rounded-full shadow-lg font-bold flex items-center hover:bg-blue-700 transition-transform transform hover:scale-105"
                    >
                        Gerar Lista de Compras
                        <ArrowRight size={20} className="ml-2" />
                    </button>
                </div>
            )}

            {/* Spacer for fixed bottom bar */}
            <div className="h-24"></div>
        </div>
    );
};
