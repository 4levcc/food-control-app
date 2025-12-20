import React, { useState, useEffect } from 'react';
import { X, Calculator } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import type { Ingredient } from '../types';

interface IngredientFormProps {
    onClose: () => void;
    initialData?: Ingredient;
}

export const IngredientForm: React.FC<IngredientFormProps> = ({ onClose, initialData }) => {
    const { addIngredient, updateIngredient, settings } = useStore();

    // Ensure we have at least one category to default to, or empty string
    const defaultCategory = settings.categories[0] || '';
    const defaultSynthetic = settings.syntheticCategories[0] || '';

    // Initialize state with initialData if provided
    const [formData, setFormData] = useState({
        name: initialData?.name || '', // Nome Padronizado
        description: initialData?.description || '', // Benta Descrição
        category: initialData?.category || defaultCategory,
        syntheticCategory: initialData?.syntheticCategory || defaultSynthetic,
        supplier: initialData?.supplier || '',

        purchaseCost: initialData?.purchaseCost?.toString() || '', // Custo Compra
        purchaseQuantity: initialData?.purchaseQuantity?.toString() || '1', // Qtd Unidades Compradas
        unitWeight: initialData?.unitWeight?.toString() || '', // Peso da unidade (g/ml)
        referenceUnit: (initialData?.referenceUnit || 'g') as 'g' | 'ml',

        correctionFactor: initialData?.correctionFactor?.toString() || '1.00',
    });

    const [calculations, setCalculations] = useState({
        costPerUnit: 0,
        costPerRefUnit: 0,
        realCost: initialData?.realCost || 0,
        realCostPerRefUnit: (initialData?.price || 0) * (initialData?.correctionFactor || 1) // Approx init
    });

    useEffect(() => {
        const cost = parseFloat(formData.purchaseCost) || 0;
        const qty = parseFloat(formData.purchaseQuantity) || 1;
        const weight = parseFloat(formData.unitWeight) || 1;
        const factor = parseFloat(formData.correctionFactor) || 1;

        const costPerUnit = cost / qty;
        const costPerRefUnit = costPerUnit / weight; // Price per g/ml

        // Formula per requirements: Custo/Unidade x Fator de Correção
        // Note: Usually Real Cost is per usable unit, but following prompt "custo/ unidade x fator de correção"
        // Wait, "custo/ unidade x fator de correção" implies the cost of the *unit* adjusted for loss. 
        // Let's assume the prompt meant "Custo Real is based on the cost per usable part".
        // If FC is Gross/Net (e.g. 1.2), then Real Cost = Base Cost * FC.
        const realCost = costPerUnit * factor;
        const realCostPerRefUnit = costPerRefUnit * factor;

        setCalculations({
            costPerUnit,
            costPerRefUnit,
            realCost,
            realCostPerRefUnit
        });
    }, [formData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Common fields
        const ingredientData: any = {
            name: formData.name, // Nome Padronizado
            description: formData.description,
            category: formData.category,
            syntheticCategory: formData.syntheticCategory,
            supplier: formData.supplier,

            purchaseCost: parseFloat(formData.purchaseCost),
            purchaseQuantity: parseFloat(formData.purchaseQuantity),
            unitWeight: parseFloat(formData.unitWeight),
            referenceUnit: formData.referenceUnit,

            correctionFactor: parseFloat(formData.correctionFactor) || 1,

            // Calculated fields
            realCost: calculations.realCost,

            // Legacy mapping for compatibility
            // "price" is usually price per Reference Unit (e.g. price per kg/L) for recipe calcs.
            // If referenceUnit is 'g', price should be per 'g'. 
            // However, typical usage is per kg. Let's stick to base unit 'g' or 'ml' for now as requested.
            price: calculations.costPerRefUnit,
            unit: formData.referenceUnit,

            lastUpdated: new Date().toISOString(),
        };

        if (initialData) {
            updateIngredient(initialData.id, ingredientData);
        } else {
            addIngredient({
                ...ingredientData,
                id: crypto.randomUUID(),
            });
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl z-10">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {initialData ? 'Editar Insumo' : 'Novo Insumo Detalhado'}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Padronizado (FT)</label>
                            <input
                                required
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: Leite Integral"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Produto (Benta)</label>
                            <input
                                required
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Ex: Leite Integral 1L Italac"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                {settings.categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria Sintética</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.syntheticCategory}
                                onChange={(e) => setFormData({ ...formData, syntheticCategory: e.target.value })}
                            >
                                {settings.syntheticCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Purchasing Info */}
                    <h4 className="font-semibold text-gray-900 flex items-center">
                        <Calculator size={18} className="mr-2" />
                        Custos e Unidades
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Custo Compra (R$)</label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.purchaseCost}
                                onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Qtd. Comprada</label>
                            <input
                                required
                                type="number"
                                step="1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.purchaseQuantity}
                                onChange={(e) => setFormData({ ...formData, purchaseQuantity: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Peso Unidade</label>
                            <div className="flex">
                                <input
                                    required
                                    type="number"
                                    step="0.1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.unitWeight}
                                    onChange={(e) => setFormData({ ...formData, unitWeight: e.target.value })}
                                />
                                <select
                                    className="px-2 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 text-sm"
                                    value={formData.referenceUnit}
                                    onChange={(e) => setFormData({ ...formData, referenceUnit: e.target.value as 'g' | 'ml' })}
                                >
                                    <option value="g">g</option>
                                    <option value="ml">ml</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Auto-Calculated Previews */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Custo por Unidade:</span>
                            <span className="font-semibold">R$ {calculations.costPerUnit.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Custo por {formData.referenceUnit}:</span>
                            <span className="font-semibold">R$ {calculations.costPerRefUnit.toFixed(4)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fator de Correção</label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.correctionFactor}
                                onChange={(e) => setFormData({ ...formData, correctionFactor: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-1">Peso Bruto / Peso Líquido</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.supplier}
                                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-blue-900 font-medium">Custo Real (KG/ LT/ UN)</span>
                            <span className="text-xl font-bold text-blue-700">R$ {calculations.realCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-blue-200 pt-2">
                            <span className="text-blue-900 font-medium">Custo Real (gr/ml/un)</span>
                            <span className="text-lg font-bold text-blue-700">R$ {calculations.realCostPerRefUnit.toFixed(4)}</span>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">Considerando fator de correção</p>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        {initialData ? 'Atualizar Insumo' : 'Salvar Insumo'}
                    </button>
                </form>
            </div>
        </div>
    );
};
