import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Trash2, Copy, FileSpreadsheet, Pencil } from 'lucide-react';
import { IngredientForm } from '../components/IngredientForm';
import { IngredientImport } from '../components/IngredientImport';
import { supabase } from '../lib/supabase';
import type { Insumo, CategoriaInsumo, CategoriaSintetica, UnidadeMedida } from '../types';
import * as XLSX from 'xlsx';

export function Ingredients() {
    const [ingredients, setIngredients] = useState<Insumo[]>([]);

    // Lookups
    const [categorias, setCategorias] = useState<CategoriaInsumo[]>([]);
    const [categoriasSinteticas, setCategoriasSinteticas] = useState<CategoriaSintetica[]>([]);
    const [unidades, setUnidades] = useState<UnidadeMedida[]>([]);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [editingIngredient, setEditingIngredient] = useState<Insumo | undefined>(undefined);
    const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [ingredientToDelete, setIngredientToDelete] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [ins, cats, sinCats, unds] = await Promise.all([
                supabase.from('insumos').select('*').order('nome_padronizado'),
                supabase.from('categorias_insumos').select('*').order('nome'),
                supabase.from('categorias_sinteticas').select('*').order('nome'),
                supabase.from('unidades_medida').select('*').order('sigla')
            ]);

            if (ins.data) setIngredients(ins.data);
            if (cats.data) setCategorias(cats.data);
            if (sinCats.data) setCategoriasSinteticas(sinCats.data);
            if (unds.data) setUnidades(unds.data);
        } catch (error) {
            console.error("Error fetching data", error);
        }
    };

    const handleSave = async (data: Partial<Insumo>) => {
        try {
            if (editingIngredient) {
                // Update
                const { error } = await supabase
                    .from('insumos')
                    .update(data)
                    .eq('id', editingIngredient.id);
                if (error) throw error;
            } else {
                // Create
                const payload = { ...data };
                delete payload.id;
                const { error } = await supabase.from('insumos').insert(payload);
                if (error) throw error;
            }
            fetchData();
            setIsFormOpen(false);
            setEditingIngredient(undefined);
        } catch (error) {
            console.error("Error saving ingredient", error);
            alert("Erro ao salvar insumo.");
        }
    };

    const confirmDelete = async () => {
        if (ingredientToDelete) {
            await executeDelete(ingredientToDelete);
        } else {
            await handleBulkDelete();
        }
    };

    const handleDeleteClick = (id: string) => {
        setIngredientToDelete(id);
        setShowDeleteConfirm(true);
    };

    const executeDelete = async (id: string) => {
        try {
            // 1. Delete usages in recipes first (Manual Cascade)
            const { error: usageError } = await supabase.from('ft_ingredientes').delete().eq('insumo_id', id);
            if (usageError) throw usageError;

            // 2. Delete the ingredient
            const { error } = await supabase.from('insumos').delete().eq('id', id);
            if (error) throw error;

            fetchData();
            setSelectedIngredients(prev => prev.filter(i => i !== id));
            setShowDeleteConfirm(false);
            setIngredientToDelete(null);
        } catch (error) {
            console.error("Error deleting", error);
            alert("Erro ao excluir.");
        }
    };

    const handleDuplicate = async (ing: Insumo) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, data_cadastro, ...rest } = ing;
        const copy = {
            ...rest,
            nome_padronizado: `${ing.nome_padronizado} (Cópia)`
        };
        try {
            const { error } = await supabase.from('insumos').insert(copy);
            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error("Error duplicating", error);
        }
    };

    const handleBulkDelete = async () => {
        try {
            // 1. Delete usages
            const { error: usageError } = await supabase.from('ft_ingredientes').delete().in('insumo_id', selectedIngredients);
            if (usageError) throw usageError;

            // 2. Delete ingredients
            const { error } = await supabase.from('insumos').delete().in('id', selectedIngredients);
            if (error) throw error;

            fetchData();
            setSelectedIngredients([]);
            setShowDeleteConfirm(false);
        } catch (error) {
            console.error("Bulk delete error", error);
            alert("Erro ao excluir itens.");
        }
    };

    const getCategoryName = (id: string) => categorias.find(c => c.id === id)?.nome || '-';

    const handleExport = () => {
        const data = ingredients
            .filter(i => selectedIngredients.length === 0 || selectedIngredients.includes(i.id))
            .map(i => ({
                Nome: i.nome_padronizado,
                Descricao: i.descricao_produto,
                Categoria: getCategoryName(i.categoria_id || ''),
                Fornecedor: i.fornecedor,
                Custo: i.custo_compra,
                Unidade: unidades.find(u => u.id === i.unidade_compra_id)?.sigla
            }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Insumos");
        XLSX.writeFile(wb, "insumos.xlsx");
    };

    const filteredIngredients = ingredients.filter(ing => {
        const matchSearch = ing.nome_padronizado.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCat = selectedCategory === 'all' || ing.categoria_id === selectedCategory;
        return matchSearch && matchCat;
    });

    const toggleSelectAll = () => {
        if (selectedIngredients.length === filteredIngredients.length) setSelectedIngredients([]);
        else setSelectedIngredients(filteredIngredients.map(i => i.id));
    };

    const toggleSelect = (id: string) => {
        if (selectedIngredients.includes(id)) setSelectedIngredients(p => p.filter(i => i !== id));
        else setSelectedIngredients(p => [...p, id]);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Insumos</h1>
                    <p className="text-gray-600 mt-1">Gerencie seu estoque de ingredientes</p>
                </div>
                <button
                    onClick={() => {
                        setEditingIngredient(undefined);
                        setIsFormOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <Plus size={20} />
                    Novo Insumo
                </button>
            </div>

            <div className="flex justify-end mb-4">
                <IngredientImport onImportSuccess={fetchData} />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar insumos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="relative min-w-[200px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                            >
                                <option value="all">Todas as Categorias</option>
                                {categorias.map(c => (
                                    <option key={c.id} value={c.id}>{c.nome}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {selectedIngredients.length > 0 && (
                    <div className="bg-blue-50 px-4 py-2 flex items-center gap-4 border-b border-blue-100">
                        <span className="text-sm text-blue-700 font-medium">{selectedIngredients.length} selecionados</span>
                        <button onClick={handleExport} className="text-green-600 hover:text-green-800 flex items-center gap-1 text-sm font-medium">
                            <FileSpreadsheet size={16} /> Exportar
                        </button>
                        <button onClick={() => setShowDeleteConfirm(true)} className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm font-medium">
                            <Trash2 size={16} /> Excluir
                        </button>
                    </div>
                )}

                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                        <div className="bg-white p-6 rounded-lg shadow-xl">
                            <h3>Confirmar Exclusão</h3>
                            <p>
                                {ingredientToDelete
                                    ? `Tem certeza que deseja excluir este insumo? Ele será removido de todas as receitas.`
                                    : `Excluir ${selectedIngredients.length} itens? Eles serão removidos de todas as receitas.`}
                            </p>
                            <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => { setShowDeleteConfirm(false); setIngredientToDelete(null); }} className="px-4 py-2 bg-gray-100 rounded">Cancelar</button>
                                <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded">Excluir</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 w-10">
                                    <input type="checkbox" checked={selectedIngredients.length === filteredIngredients.length && filteredIngredients.length > 0} onChange={toggleSelectAll} />
                                </th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Categoria</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Fornecedor</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Custo Real<br />(Kg/ L/ Un)</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Custo Real<br />(g/ ml/ un)</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredIngredients.map(ing => {
                                // Calculate Real Costs Inline
                                const cost = ing.custo_compra || 0;
                                const qty = ing.quantidade_compra || 1;
                                const weight = ing.peso_unidade || 1;
                                const factor = ing.fator_correcao || 1;

                                const costPerUnit = qty > 0 ? cost / qty : 0;
                                const costPerBase = weight > 0 ? costPerUnit / weight : 0;
                                const realCostStored = costPerBase * factor; // Cost per whatever unit is stored

                                const unitSigla = unidades.find(u => u.id === ing.unidade_peso_id)?.sigla.toLowerCase() || '';

                                let realCostLarge = 0;
                                let realCostSmall = 0;

                                if (['kg', 'l', 'lt'].includes(unitSigla)) {
                                    // Sored in Large Unit
                                    realCostLarge = realCostStored;
                                    realCostSmall = realCostStored / 1000;
                                } else if (['g', 'gr', 'ml'].includes(unitSigla)) {
                                    // Stored in Small Unit
                                    realCostLarge = realCostStored * 1000;
                                    realCostSmall = realCostStored;
                                } else {
                                    // Unit (un) or others
                                    realCostLarge = realCostStored;
                                    realCostSmall = realCostStored;
                                }

                                return (
                                    <tr key={ing.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <input type="checkbox" checked={selectedIngredients.includes(ing.id)} onChange={() => toggleSelect(ing.id)} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-800">{ing.nome_padronizado}</div>
                                            <div className="text-xs text-gray-500">{ing.descricao_produto}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 text-xs bg-gray-100 rounded-full">{getCategoryName(ing.categoria_id || '')}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{ing.fornecedor || '-'}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-800 text-right">
                                            R$ {realCostLarge.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                            R$ {realCostSmall.toFixed(4)}
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-3">
                                            <button
                                                onClick={() => handleDuplicate(ing)}
                                                title="Duplicar Insumo"
                                                className="p-1 hover:bg-blue-50 rounded transition-colors"
                                            >
                                                <Copy size={18} className="text-blue-600" />
                                            </button>
                                            <button
                                                onClick={() => { setEditingIngredient(ing); setIsFormOpen(true); }}
                                                title="Editar Insumo"
                                                className="p-1 hover:bg-yellow-50 rounded transition-colors"
                                            >
                                                <Pencil size={18} className="text-yellow-600" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(ing.id); }}
                                                title="Excluir Insumo"
                                                className="p-1 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <Trash2 size={18} className="text-red-600" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {isFormOpen && (
                <IngredientForm
                    onClose={() => {
                        setIsFormOpen(false);
                        setEditingIngredient(undefined);
                    }}
                    onSave={handleSave}
                    initialData={editingIngredient}
                    categorias={categorias}
                    unidades={unidades}
                    categoriasSinteticas={categoriasSinteticas}
                />
            )}
        </div>
    );
}
