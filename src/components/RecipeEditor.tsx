import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Trash2, Calculator, Info, DollarSign } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import type { Recipe, RecipeItem, Ingredient } from '../types';
import { generateIngredientCode } from '../utils/codeGenerator';

interface RecipeEditorProps {
    onClose: () => void;
    initialData?: Recipe | null;
}

export const RecipeEditor: React.FC<RecipeEditorProps> = ({ onClose, initialData }) => {
    const { ingredients, recipes, addRecipe, updateRecipe, addIngredient, updateIngredient, settings } = useStore();

    // Default values
    const defaultSector = settings.sectors[0] || 'Brigadeiro';

    // State
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        productType: initialData?.productType || 'Final' as 'Base' | 'Final',
        sector: (initialData?.sector || defaultSector) as any,
        specialty: initialData?.specialty || '', // Initialize specialty
        difficulty: initialData?.difficulty || 'Easy' as const,
        time: initialData?.time || '',
        isIngredient: initialData?.isIngredient || false,
        yieldKg: initialData?.yieldKg?.toString() || '',
    });

    // Auto-generated fields
    const [code, setCode] = useState(initialData?.code || '');
    const creationDate = initialData ? new Date(initialData.createdAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');

    // Ingredients List State
    const [items, setItems] = useState<RecipeItem[]>(initialData?.items || []);
    const [selectedIngredientId, setSelectedIngredientId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [usageHint, setUsageHint] = useState('');

    // Generate Code on Sector Change only if NOT editing or if code is missing
    useEffect(() => {
        if (initialData?.code) return; // Don't overwrite existing code when editing

        const sectorPrefix = formData.sector.substring(0, 3).toUpperCase();
        const existingCodes = recipes.map(r => r.code || '').filter(Boolean);

        const regex = new RegExp(`^${sectorPrefix}-(\\d{4})$`);
        let maxSeq = 0;
        existingCodes.forEach(c => {
            const match = c.match(regex);
            if (match) maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
        });
        setCode(`${sectorPrefix}-${(maxSeq + 1).toString().padStart(4, '0')}`);
    }, [formData.sector, recipes, initialData]);

    // Handle Add Item
    const handleAddItem = () => {
        if (!selectedIngredientId || !quantity) return;
        setItems(prev => [...prev, {
            ingredientId: selectedIngredientId,
            quantity: parseFloat(quantity),
            usageHint
        }]);
        setSelectedIngredientId('');
        setQuantity('');
        setUsageHint('');
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    // Calculations
    const calculateTotalCost = useMemo(() => {
        return items.reduce((total, item) => {
            const ing = ingredients.find(i => i.id === item.ingredientId);
            const unitCost = (ing?.price || 0) * (ing?.correctionFactor || 1);
            return total + (unitCost * item.quantity);
        }, 0);
    }, [items, ingredients]);

    const yieldGrams = useMemo(() => {
        const normalizedYield = formData.yieldKg.replace(',', '.');
        const kg = parseFloat(normalizedYield) || 0;
        return kg * 1000;
    }, [formData.yieldKg]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const recipeData: Recipe = {
            id: initialData?.id || crypto.randomUUID(),
            name: formData.name,
            productType: formData.productType,
            category: formData.productType, // Legacy compatibility
            sector: formData.sector,
            code: code,
            difficulty: formData.difficulty,
            time: formData.time,
            isIngredient: formData.isIngredient,
            yieldKg: parseFloat(formData.yieldKg.replace(',', '.')) || 0,
            yieldGrams: yieldGrams,
            items,
            createdAt: initialData?.createdAt || new Date().toISOString(),
            salePrice: initialData?.salePrice, // Preserve existing price if not edited here
            specialty: formData.productType === 'Final' ? formData.specialty : undefined,
        };

        if (initialData?.id) {
            updateRecipe(initialData.id, recipeData);
        } else {
            addRecipe(recipeData);
        }

        // Handle Ingredient Sync (Create or Update)
        if (formData.isIngredient) {
            // Calculate common values
            const ingSynthCat = "Insumo de produção produzido";
            // Fix parsing: handle comma as decimal separator
            const normalizedYield = formData.yieldKg.replace(',', '.');
            const yieldKg = parseFloat(normalizedYield) || 0;

            // Guard against divide by zero if yield is missing
            if (yieldKg <= 0) {
                // Should we warn? For now, we proceed but cost/g might be infinity if used elsewhere.
            }

            // Calculate CMV (Cost per KG)
            const calculatedCostPerKg = yieldKg > 0 ? calculateTotalCost / yieldKg : 0;
            const calculatedCostPerGram = calculatedCostPerKg / 1000;

            // Prepare common ingredient payload (Normalized to 1KG Unit)
            // This ensures Ingredient Form displays the CMV/KG as the "Real Cost"
            const ingredientPayload: Partial<Ingredient> = {
                name: formData.name,
                description: `${formData.name} - Produção interna`,
                category: formData.sector,
                syntheticCategory: ingSynthCat,
                supplier: 'Produção Interna',

                // Normalize: "Purchased" 1 KG at the CMV Price
                purchaseCost: calculatedCostPerKg,
                purchaseQuantity: 1,
                unitWeight: 1000, // 1 Unit = 1000g = 1KG
                referenceUnit: 'g',

                realCost: calculatedCostPerKg, // Direct match to CMV
                correctionFactor: 1,

                price: calculatedCostPerGram, // Usage price in other recipes
                unit: 'g',
                lastUpdated: new Date().toISOString()
            };

            if (initialData?.id) {
                // EDIT MODE: Try to find existing ingredient to update
                // Use robust matching (trim + lowercase) to find the ingredient
                const targetName = initialData.name.trim().toLowerCase();
                const existingIngredient = ingredients.find(i =>
                    i.name.trim().toLowerCase() === targetName &&
                    i.syntheticCategory === ingSynthCat
                );

                if (existingIngredient) {
                    updateIngredient(existingIngredient.id, ingredientPayload);
                } else {
                    // Try finding by current name if initial didn't match (edge case)
                    const currentName = formData.name.trim().toLowerCase();
                    const fallbackIngredient = ingredients.find(i =>
                        i.name.trim().toLowerCase() === currentName &&
                        i.syntheticCategory === ingSynthCat
                    );

                    if (fallbackIngredient) {
                        updateIngredient(fallbackIngredient.id, ingredientPayload);
                    } else {
                        // Not found, create new
                        const existingIngCodes = ingredients.map(i => i.code || '').filter(Boolean);
                        const ingCode = generateIngredientCode(ingSynthCat, existingIngCodes);

                        addIngredient({
                            ...ingredientPayload as Ingredient,
                            id: crypto.randomUUID(),
                            code: ingCode,
                        });
                    }
                }
            } else {
                // CREATE MODE
                const existingIngCodes = ingredients.map(i => i.code || '').filter(Boolean);
                const ingCode = generateIngredientCode(ingSynthCat, existingIngCodes);

                addIngredient({
                    ...ingredientPayload as Ingredient,
                    id: crypto.randomUUID(),
                    code: ingCode,
                });
            }
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl my-8">
                    <div className="flex justify-between items-center p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl z-10">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {initialData?.id ? 'Editar Ficha Técnica' : 'Ficha Técnica de Produção'}
                        </h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-8">
                        {/* 1. Identification */}
                        <div className="space-y-4">
                            <h4 className="flex items-center text-blue-800 font-semibold bg-blue-50 p-2 rounded">
                                <Info size={18} className="mr-2" />
                                1. Identificação da Receita
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Receita</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Produto</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.productType}
                                        onChange={e => setFormData({ ...formData, productType: e.target.value as any })}
                                    >
                                        <option value="Final">Produto Final</option>
                                        <option value="Base">Produto Base</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Setor Responsável</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.sector}
                                        onChange={e => setFormData({ ...formData, sector: e.target.value as any })}
                                    >
                                        {settings.sectors.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                {/* Specialty Field - Only for Final Products */}
                                {formData.productType === 'Final' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade</label>
                                        <select
                                            className="w-full px-3 py-2 border border-blue-300 bg-blue-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.specialty}
                                            onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                                        >
                                            <option value="">Selecione...</option>
                                            {settings.specialties.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Código/ID (Auto)</label>
                                    <input disabled type="text" value={code} className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Data Criação</label>
                                    <input disabled type="text" value={creationDate} className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.difficulty}
                                        onChange={e => setFormData({ ...formData, difficulty: e.target.value as any })}
                                    >
                                        <option value="Easy">Fácil</option>
                                        <option value="Medium">Médio</option>
                                        <option value="Hard">Difícil</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tempo de Preparo</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: 45 min"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.time}
                                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center">
                                    <label className="flex items-center cursor-pointer mt-6">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mr-2"
                                            checked={formData.isIngredient}
                                            onChange={e => setFormData({ ...formData, isIngredient: e.target.checked })}
                                        />
                                        <span className="font-medium text-gray-900">É de um insumo?</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* 2. Ingredients & Inputs */}
                        <div className="space-y-4">
                            <h4 className="flex items-center text-blue-800 font-semibold bg-blue-50 p-2 rounded">
                                <Calculator size={18} className="mr-2" />
                                2. Ingredientes e Insumos
                            </h4>

                            {/* Adder */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-gray-50 p-3 rounded-lg items-end">
                                <div className="md:col-span-4">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Ingrediente</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm"
                                        value={selectedIngredientId}
                                        onChange={e => setSelectedIngredientId(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {ingredients.map(ing => (
                                            <option key={ing.id} value={ing.id}>{ing.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Qtd (g/ml/un)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm"
                                        value={quantity}
                                        onChange={e => setQuantity(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="md:col-span-5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Dica de uso</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm"
                                        value={usageHint}
                                        onChange={e => setUsageHint(e.target.value)}
                                        placeholder="Opcional"
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        className="w-full bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 flex justify-center"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* List */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2">Ingrediente</th>
                                            <th className="px-4 py-2">Categoria</th>
                                            <th className="px-4 py-2">Qtd</th>
                                            <th className="px-4 py-2">Custo Un (g/ml)</th>
                                            <th className="px-4 py-2">Custo Total</th>
                                            <th className="px-4 py-2">Dica</th>
                                            <th className="px-4 py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, index) => {
                                            const ing = ingredients.find(i => i.id === item.ingredientId);
                                            if (!ing) return null;
                                            const unitCost = (ing.price || 0) * (ing.correctionFactor || 1);
                                            const totalCost = unitCost * item.quantity;
                                            return (
                                                <tr key={index} className="border-b hover:bg-gray-50">
                                                    <td className="px-4 py-2 font-medium">{ing.name}</td>
                                                    <td className="px-4 py-2 text-gray-500">{ing.category}</td>
                                                    <td className="px-4 py-2">{item.quantity} {ing.unit}</td>
                                                    <td className="px-4 py-2">R$ {unitCost.toFixed(4)}</td>
                                                    <td className="px-4 py-2 font-bold">R$ {totalCost.toFixed(2)}</td>
                                                    <td className="px-4 py-2 text-gray-500 italic max-w-xs truncate">{item.usageHint || '-'}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {items.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="text-center py-4 text-gray-400">Adicione ingredientes acima.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-blue-50">
                                            <td colSpan={4} className="px-4 py-2 text-right font-bold text-gray-900">Total Insumos:</td>
                                            <td className="px-4 py-2 font-bold text-blue-700">R$ {calculateTotalCost.toFixed(2)}</td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* 3. Yield */}
                        <div className="space-y-4">
                            <h4 className="flex items-center text-blue-800 font-semibold bg-blue-50 p-2 rounded">
                                <Info size={18} className="mr-2" />
                                3. Rendimento da Receita
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rendimento Total (em KG)</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                                        value={formData.yieldKg}
                                        onChange={e => setFormData({ ...formData, yieldKg: e.target.value })}
                                        placeholder="0.000"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Peso final sem embalagens. Se pesou em gramas, divida por 1000.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rendimento Total (em Gramas)</label>
                                    <input disabled type="text" value={yieldGrams.toFixed(0)} className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-lg text-gray-600 text-lg font-bold" />
                                    <p className="text-xs text-gray-500 mt-1">Cálculo automático: KG x 1000</p>
                                </div>
                            </div>
                        </div>

                        {/* 4. Nutrition (Placeholder) */}
                        <div className="space-y-4 opacity-50">
                            <h4 className="flex items-center text-gray-500 font-semibold bg-gray-100 p-2 rounded">
                                4. Informação Nutricional (Em Breve)
                            </h4>
                            <p className="text-sm text-gray-400 italic">Cálculo automático de valor energético será implementado.</p>
                        </div>

                        <hr className="border-gray-100" />

                        {/* 5. Custo de Mercadoria Vendida (CMV) */}
                        <div className="space-y-4">
                            <h4 className="flex items-center text-blue-800 font-semibold bg-blue-50 p-2 rounded">
                                <DollarSign size={18} className="mr-2" />
                                5. Custo de Mercadoria Vendida
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg border border-green-100">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Custo Total da Receita</label>
                                    <div className="text-lg font-bold text-gray-900">
                                        R$ {calculateTotalCost.toFixed(2)}
                                    </div>
                                    <p className="text-xs text-gray-500">Soma dos insumos</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rendimento Total</label>
                                    <div className="text-lg font-bold text-gray-900">
                                        {formData.yieldKg ? parseFloat(formData.yieldKg).toFixed(3) : '0.000'} kg
                                    </div>
                                    <p className="text-xs text-gray-500">Peso final</p>
                                </div>

                                <div className="md:col-span-2 border-t border-green-200 my-2"></div>

                                <div>
                                    <label className="block text-sm font-medium text-green-800 mb-1">CMV (por KG)</label>
                                    <div className="text-2xl font-bold text-green-700">
                                        R$ {(() => {
                                            const yieldVal = parseFloat(formData.yieldKg) || 0;
                                            return yieldVal > 0 ? (calculateTotalCost / yieldVal).toFixed(2) : '0.00';
                                        })()}
                                    </div>
                                    <p className="text-xs text-green-600">Custo Total ÷ Rendimento Kg</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-green-800 mb-1">CMV (por Grama)</label>
                                    <div className="text-xl font-bold text-green-700">
                                        R$ {(() => {
                                            const yieldVal = parseFloat(formData.yieldKg) || 0;
                                            const costPerKg = yieldVal > 0 ? (calculateTotalCost / yieldVal) : 0;
                                            return (costPerKg / 1000).toFixed(4);
                                        })()}
                                    </div>
                                    <p className="text-xs text-green-600">CMV Kg ÷ 1000</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                            >
                                Salvar Ficha Técnica {formData.isIngredient && '& Gerar Insumo'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
