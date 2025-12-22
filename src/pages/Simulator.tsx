
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { FichaTecnica, Insumo, UnidadeMedida, FtIngrediente, SetorResponsavel } from '../types';
import { Search, Calculator, ShoppingCart, Trash2, FileText, ArrowRight, CheckSquare } from 'lucide-react';
import { useSimulatorLogic } from '../hooks/useSimulatorLogic';
import { exportShoppingListPDF } from '../utils/pdfGenerator';

export function Simulator() {
    const [recipes, setRecipes] = useState<FichaTecnica[]>([]);
    const [ftIngredientes, setFtIngredientes] = useState<FtIngrediente[]>([]);
    const [insumos, setInsumos] = useState<Insumo[]>([]);
    const [unidades, setUnidades] = useState<UnidadeMedida[]>([]);
    const [setores, setSetores] = useState<SetorResponsavel[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSector, setSelectedSector] = useState('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [r, f, i, u, s] = await Promise.all([
                supabase.from('fichas_tecnicas').select('*').order('nome_receita'),
                supabase.from('ft_ingredientes').select('*'),
                supabase.from('insumos').select('*'),
                supabase.from('unidades_medida').select('*'),
                supabase.from('setores_responsaveis').select('*').order('nome')
            ]);
            if (r.data) setRecipes(r.data);
            if (f.data) setFtIngredientes(f.data);
            if (i.data) setInsumos(i.data);
            if (u.data) setUnidades(u.data);
            if (s.data) setSetores(s.data);
        } catch (error) {
            console.error('Error fetching data for simulator:', error);
        }
    };

    const logic = useSimulatorLogic({ recipes, ftIngredientes, insumos, unidades });

    const handleAddRecipe = (recipe: FichaTecnica) => {
        if (!logic.selectedRecipes.find(r => r.recipeId === recipe.id)) {
            // Default quantity: Rendimento or 1
            const defaultQty = recipe.rendimento_kg || 1;
            logic.setSelectedRecipes(prev => [...prev, { recipeId: recipe.id, quantity: defaultQty }]);
        }
    };

    const handleRemoveRecipe = (id: string) => {
        logic.setSelectedRecipes(prev => prev.filter(r => r.recipeId !== id));
    };

    const handleUpdateQuantity = (id: string, newQty: number) => {
        logic.setSelectedRecipes(prev => prev.map(r => r.recipeId === id ? { ...r, quantity: newQty } : r));
    };

    const filteredRecipes = recipes.filter(r => {
        const matchSearch = r.nome_receita.toLowerCase().includes(searchTerm.toLowerCase());
        const matchSector = selectedSector === 'all' || r.setor_responsavel_id === selectedSector;
        return matchSearch && matchSector;
    });

    const handleExport = () => {
        // Separate items for grouping
        // Ensure supplier is string for PDF generator
        const safeList = logic.shoppingList.map(i => ({ ...i, supplier: i.supplier || '' }));

        const finalItems = safeList.filter(i => !i.isBaseProduct);
        const baseItems = safeList.filter(i => i.isBaseProduct);

        // Prepare selected recipes list
        const recipesList = logic.selectedRecipes.map(s => {
            const r = recipes.find(x => x.id === s.recipeId);
            return {
                name: r?.nome_receita || 'Desconhecido',
                quantity: s.quantity
            };
        });

        exportShoppingListPDF(
            safeList,
            logic.totalCost,
            {
                final: finalItems,
                base: baseItems
            },
            recipesList // Pass the list
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Simulador de Compras</h1>
                    <p className="text-gray-600 mt-1">Planeje sua produção e gere a lista de compras automaticamente.</p>
                </div>
            </div>

            {/* Selection Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left: Recipe Selector */}
                <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-[600px] flex flex-col">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Search size={20} />
                        Selecionar Receitas
                    </h3>

                    <div className="space-y-3 mb-4">
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={selectedSector}
                            onChange={e => setSelectedSector(e.target.value)}
                            aria-label="Filtrar por Setor"
                        >
                            <option value="all">Todos os Setores</option>
                            {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {filteredRecipes.map(recipe => {
                            const isSelected = logic.selectedRecipes.some(r => r.recipeId === recipe.id);
                            return (
                                <button
                                    key={recipe.id}
                                    onClick={() => !isSelected && handleAddRecipe(recipe)}
                                    disabled={isSelected}
                                    className={`w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center group ${isSelected
                                        ? 'bg-blue-50 border-blue-200 opacity-60 cursor-default'
                                        : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-md'
                                        }`}
                                >
                                    <div>
                                        <div className="font-semibold text-gray-800 text-sm group-hover:text-blue-700 transition-colors">{recipe.nome_receita}</div>
                                        <div className="text-xs text-gray-500">
                                            {recipe.tipo_produto === 'Base' ? 'Prod. Base' : 'Prod. Final'} • {recipe.rendimento_kg} Kg
                                        </div>
                                    </div>
                                    {isSelected && <CheckSquare size={16} className="text-blue-500" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Selected & Simulation */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Selected List */}
                    {logic.selectedRecipes.length > 0 ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <Calculator size={20} />
                                Itens a Produzir
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {logic.selectedRecipes.map(item => {
                                    const r = recipes.find(x => x.id === item.recipeId);
                                    if (!r) return null;
                                    return (
                                        <div key={item.recipeId} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors">
                                            <div className="flex-1">
                                                <div className="font-bold text-gray-800 text-sm">{r.nome_receita}</div>
                                                <div className={`text-[10px] uppercase font-bold tracking-wide ${r.tipo_produto === 'Base' ? 'text-orange-600' : 'text-green-600'}`}>
                                                    {r.tipo_produto === 'Base' ? 'Base' : 'Final'}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-bold text-gray-500">Kg:</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.001"
                                                    className="w-24 px-2 py-1 border border-gray-300 rounded text-center font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={item.quantity}
                                                    onChange={e => handleUpdateQuantity(item.recipeId, parseFloat(e.target.value))}
                                                    aria-label={`Quantidade de ${r.nome_receita} em Kg`}
                                                />
                                            </div>

                                            <button
                                                onClick={() => handleRemoveRecipe(item.recipeId)}
                                                className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50"
                                                title="Remover"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-100 pt-4">
                                {logic.selectedRecipes.some(s => recipes.find(r => r.id === s.recipeId)?.tipo_produto === 'Final') ? (
                                    <label className="flex items-center gap-2 cursor-pointer select-none group">
                                        <input
                                            type="checkbox"
                                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                            checked={logic.explodeBaseProducts}
                                            onChange={e => logic.setExplodeBaseProducts(e.target.checked)}
                                        />
                                        <span className="text-gray-700 font-medium group-hover:text-blue-600 transition-colors">Listar insumos dos produtos base?</span>
                                    </label>
                                ) : (
                                    <div className="flex-1"></div> /* Spacer to keep button on right */
                                )}

                                <button
                                    onClick={logic.calculateList}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2"
                                >
                                    Gerar Lista de Compras
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-400 flex flex-col items-center gap-2">
                            <Calculator size={48} className="opacity-20" />
                            <p>Selecione receitas à esquerda para começar a simulação.</p>
                        </div>
                    )}

                    {/* Results */}
                    {logic.shoppingList.length > 0 && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-6 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                                        <ShoppingCart className="text-blue-600" />
                                        Lista de Compras
                                    </h3>
                                    <p className="text-sm text-gray-500">Baseado na produção planejada</p>
                                </div>
                                <div className="text-right w-full sm:w-auto bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wide">Custo Estimado Total</div>
                                    <div className="text-2xl font-bold text-blue-600">
                                        {logic.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white text-gray-500 uppercase text-xs font-bold border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 bg-gray-50/50">Insumo</th>
                                            <th className="px-6 py-3 bg-gray-50/50">Fornecedor</th>
                                            <th className="px-6 py-3 bg-gray-50/50 text-right">Qtd Necessária</th>
                                            <th className="px-6 py-3 bg-gray-50/50 text-right">Custo Est.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {logic.shoppingList.sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                                            <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-6 py-3">
                                                    <div className="font-bold text-gray-800">{item.name}</div>
                                                    {item.isBaseProduct && logic.explodeBaseProducts && (
                                                        <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full uppercase mt-1">
                                                            Receita Base
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-500">
                                                    {item.supplier || '-'}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                                                        {item.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                                                    </span>
                                                    <span className="text-gray-500 ml-1 text-sm font-medium">{item.unit}</span>
                                                </td>
                                                <td className="px-6 py-3 text-right font-medium text-blue-600">
                                                    {item.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end">
                                <button
                                    onClick={handleExport}
                                    className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold shadow-sm hover:shadow-md flex items-center gap-2 active:scale-95 transform duration-100"
                                >
                                    <FileText size={18} />
                                    Exportar Lista em PDF
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
