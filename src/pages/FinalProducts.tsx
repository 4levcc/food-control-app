import React, { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { Save, ExternalLink, Filter } from 'lucide-react';
import { RecipeEditor } from '../components/RecipeEditor';
import type { Recipe } from '../types';

export const FinalProducts: React.FC = () => {
    const { recipes, ingredients, updateRecipe, settings } = useStore();
    const [prices, setPrices] = useState<Record<string, string>>({});
    const [openRecipeId, setOpenRecipeId] = useState<string | null>(null);
    const [filterSector, setFilterSector] = useState<string>('All');
    const [filterSpecialty, setFilterSpecialty] = useState<string>('All');

    // Filter Final Products based on Sector and Specialty
    const finalProducts = recipes.filter(r => {
        const isFinal = r.productType === 'Final';
        const MATCH_SECTOR = filterSector === 'All' ? true : r.sector === filterSector;
        const MATCH_SPECIALTY = filterSpecialty === 'All' ? true : r.specialty === filterSpecialty;

        return isFinal && MATCH_SECTOR && MATCH_SPECIALTY;
    });

    // Handle price input change
    const handlePriceChange = (id: string, value: string) => {
        setPrices(prev => ({ ...prev, [id]: value }));
    };

    // Save price to recipe
    const handleSavePrice = (recipe: Recipe) => {
        const priceStr = prices[recipe.id];
        if (priceStr === undefined) return; // No change

        const salePrice = parseFloat(priceStr);
        if (!isNaN(salePrice)) {
            updateRecipe(recipe.id, { salePrice });
            // Optional: Show success feedback
        }
    };

    const handleOpenRecipe = (id: string) => {
        setOpenRecipeId(id);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Produtos Finais</h2>
            </div>

            {/* Filters Toolbar */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center text-gray-500 font-medium">
                    <Filter size={20} className="mr-2" />
                    Filtros:
                </div>

                {/* Sector Filter */}
                <select
                    value={filterSector}
                    onChange={(e) => setFilterSector(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="All">Todos os Setores</option>
                    {settings.sectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                {/* Specialty Filter */}
                <select
                    value={filterSpecialty}
                    onChange={(e) => setFilterSpecialty(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 border border-blue-300 bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900"
                >
                    <option value="All">Todas as Especialidades</option>
                    {settings.specialties.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                {(filterSector !== 'All' || filterSpecialty !== 'All') && (
                    <button
                        onClick={() => { setFilterSector('All'); setFilterSpecialty('All'); }}
                        className="text-sm text-red-600 hover:text-red-800 underline"
                    >
                        Limpar Filtros
                    </button>
                )}
            </div>

            <div className="bg-white rounded-lg shadowoverflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Setor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receita</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Custo Total</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rendimento</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço De Venda</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {finalProducts.map((rec) => {
                                // Calculate Total Cost dynamically
                                const totalCost = rec.items.reduce((sum, item) => {
                                    const ing = ingredients.find(i => i.id === item.ingredientId);
                                    let itemCost = 0;
                                    if (ing) {
                                        // ing.price is cost per unit (g/ml)
                                        itemCost = ing.price * item.quantity * (ing.correctionFactor || 1);
                                    }
                                    return sum + itemCost;
                                }, 0);

                                const yieldGrams = rec.yieldKg ? rec.yieldKg * 1000 : 0;
                                const currentPriceInput = prices[rec.id] !== undefined ? prices[rec.id] : (rec.salePrice?.toString() || '');

                                return (
                                    <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {rec.sector || rec.category}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            <button
                                                onClick={() => handleOpenRecipe(rec.id)}
                                                className="hover:text-blue-600 flex items-center group"
                                            >
                                                {rec.name}
                                                <ExternalLink size={14} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                            R$ {totalCost.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                            {yieldGrams.toFixed(0)} g
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div className="relative rounded-md shadow-sm max-w-[120px]">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="text-gray-500 sm:text-sm">R$</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-8 sm:text-sm border-gray-300 rounded-md py-1"
                                                    placeholder="0.00"
                                                    value={currentPriceInput}
                                                    onChange={(e) => handlePriceChange(rec.id, e.target.value)}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <button
                                                onClick={() => handleSavePrice(rec)}
                                                className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 p-2 rounded-full transition-colors"
                                                title="Salvar Preço"
                                                disabled={!prices[rec.id]} // Disable if no change in input state
                                            >
                                                <Save size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {finalProducts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                        Nenhum produto final encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {openRecipeId && (
                <RecipeEditor
                    onClose={() => setOpenRecipeId(null)}
                    initialData={recipes.find(r => r.id === openRecipeId) || null}
                />
            )}
        </div>
    );
};
