import React, { useState, useMemo } from 'react';
import { Plus, Minus, ArrowRight, Check } from 'lucide-react';
import { useStore } from '../hooks/useStore';

export const Simulator: React.FC = () => {
    const { recipes, ingredients } = useStore();
    const [selectedRecipes, setSelectedRecipes] = useState<Record<string, number>>({});
    const [step, setStep] = useState<'select' | 'result'>('select');

    const handleQuantityChange = (recipeId: string, delta: number) => {
        setSelectedRecipes(prev => {
            const current = prev[recipeId] || 0;
            const next = Math.max(0, current + delta);
            if (next === 0) {
                const { [recipeId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [recipeId]: next };
        });
    };

    const shoppingList = useMemo(() => {
        const list: Record<string, { quantity: number; cost: number; ingredientId: string }> = {};

        Object.entries(selectedRecipes).forEach(([recipeId, batchCount]) => {
            const recipe = recipes.find(r => r.id === recipeId);
            if (!recipe) return;

            recipe.items.forEach(item => {
                const ing = ingredients.find(i => i.id === item.ingredientId);
                if (!ing) return;

                // Gross Quantity = Net Quantity * Correction Factor
                const grossQuantityPerBatch = item.quantity * (ing.correctionFactor || 1);
                const totalGrossQuantity = grossQuantityPerBatch * batchCount;
                const totalCost = totalGrossQuantity * ing.price;

                if (!list[item.ingredientId]) {
                    list[item.ingredientId] = {
                        quantity: 0,
                        cost: 0,
                        ingredientId: item.ingredientId
                    };
                }

                list[item.ingredientId].quantity += totalGrossQuantity;
                list[item.ingredientId].cost += totalCost;
            });
        });

        return Object.values(list).map(item => {
            const ing = ingredients.find(i => i.id === item.ingredientId);
            return {
                ...item,
                name: ing?.name || 'Unknown',
                unit: ing?.unit || '',
                supplier: ing?.supplier || 'N/A'
            };
        });
    }, [selectedRecipes, recipes, ingredients]);

    const totalEstimatedCost = shoppingList.reduce((sum, item) => sum + item.cost, 0);

    if (step === 'result') {
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
                    <div className="p-4 bg-blue-50 border-b border-blue-100">
                        <div className="flex justify-between items-center">
                            <span className="text-blue-900 font-medium">Custo Estimado Total</span>
                            <span className="text-2xl font-bold text-blue-700">R$ {totalEstimatedCost.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {shoppingList.map((item) => (
                            <div key={item.ingredientId} className="p-4 flex justify-between items-center">
                                <div>
                                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                                    <p className="text-sm text-gray-500">{item.supplier}</p>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-lg text-gray-900">
                                        {item.quantity.toFixed(2)} <span className="text-sm font-normal text-gray-500">{item.unit}</span>
                                    </div>
                                    <div className="text-sm text-gray-600">R$ {item.cost.toFixed(2)}</div>
                                </div>
                            </div>
                        ))}

                        {shoppingList.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                Nenhum item na lista de compras.
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-4">
                    <button className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex justify-center items-center">
                        <Check size={20} className="mr-2" />
                        Finalizar Compra
                    </button>
                    <button className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                        Exportar PDF
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Simulador de Compras</h2>
            <p className="text-gray-600">Selecione as receitas e quantidades que deseja produzir.</p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recipes.map((rec) => {
                    const count = selectedRecipes[rec.id] || 0;
                    return (
                        <div key={rec.id} className={`p-4 rounded-lg border transition-all ${count > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-gray-900">{rec.name}</h3>
                                <span className="text-sm text-gray-500">{rec.category}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Quantidade:</span>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleQuantityChange(rec.id, -1)}
                                        className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                                        disabled={count === 0}
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span className="w-8 text-center font-bold text-lg">{count}</span>
                                    <button
                                        onClick={() => handleQuantityChange(rec.id, 1)}
                                        className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {Object.keys(selectedRecipes).length > 0 && (
                <div className="fixed bottom-20 left-0 right-0 p-4 flex justify-center pointer-events-none">
                    <button
                        onClick={() => setStep('result')}
                        className="pointer-events-auto bg-blue-600 text-white px-8 py-3 rounded-full shadow-lg font-bold flex items-center hover:bg-blue-700 transition-transform transform hover:scale-105"
                    >
                        Gerar Lista de Compras
                        <ArrowRight size={20} className="ml-2" />
                    </button>
                </div>
            )}
        </div>
    );
};
