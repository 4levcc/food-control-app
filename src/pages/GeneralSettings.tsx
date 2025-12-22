import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, AlertTriangle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CategoriaInsumo, CategoriaSintetica, SetorResponsavel, Especialidade } from '../types';

type SettingType = 'category' | 'syntheticCategory' | 'sector' | 'specialty';

interface LookupItem {
    id: string;
    nome: string;
}

export const GeneralSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SettingType>('category');

    // Data State
    const [categories, setCategories] = useState<CategoriaInsumo[]>([]);
    const [syntheticCategories, setSyntheticCategories] = useState<CategoriaSintetica[]>([]);
    const [sectors, setSectors] = useState<SetorResponsavel[]>([]);
    const [specialties, setSpecialties] = useState<Especialidade[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

    // Form State
    const [editingItem, setEditingItem] = useState<LookupItem | null>(null);
    const [newValue, setNewValue] = useState('');
    const [replacementValue, setReplacementValue] = useState(''); // Id of replacement

    // Bulk selection state
    const [selectedItems, setSelectedItems] = useState<string[]>([]); // Array of IDs

    // Config Mapping
    const CONFIG = {
        category: {
            title: 'Categorias de Insumos',
            label: 'Categoria',
            table: 'categorias_insumos',
            data: categories,
            setData: setCategories
        },
        syntheticCategory: {
            title: 'Categorias Sintéticas',
            label: 'Categoria Sintética',
            table: 'categorias_sinteticas',
            data: syntheticCategories,
            setData: setSyntheticCategories
        },
        sector: {
            title: 'Setores Responsáveis',
            label: 'Setor',
            table: 'setores_responsaveis',
            data: sectors,
            setData: setSectors
        },
        specialty: {
            title: 'Especialidades',
            label: 'Especialidade',
            table: 'especialidades',
            data: specialties,
            setData: setSpecialties
        },
    };

    const currentConfig = CONFIG[activeTab];

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const [cats, sinCats, secs, specs] = await Promise.all([
                supabase.from('categorias_insumos').select('*').order('nome'),
                supabase.from('categorias_sinteticas').select('*').order('nome'),
                supabase.from('setores_responsaveis').select('*').order('nome'),
                supabase.from('especialidades').select('*').order('nome')
            ]);

            if (cats.data) setCategories(cats.data);
            if (sinCats.data) setSyntheticCategories(sinCats.data);
            if (secs.data) setSectors(secs.data);
            if (specs.data) setSpecialties(specs.data);

        } catch (error) {
            console.error("Error fetching settings:", error);
            alert("Erro ao carregar configurações.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newValue.trim()) return;
        try {
            const { error } = await supabase
                .from(currentConfig.table)
                .insert({ nome: newValue.trim() });

            if (error) throw error;

            await fetchAllData();
            setNewValue('');
            setIsAddModalOpen(false);
        } catch (error) {
            console.error("Error adding:", error);
            alert("Erro ao adicionar item.");
        }
    };

    const handleEdit = async () => {
        if (!newValue.trim() || !editingItem) return;
        try {
            const { error } = await supabase
                .from(currentConfig.table)
                .update({ nome: newValue.trim() })
                .eq('id', editingItem.id);

            if (error) throw error;

            await fetchAllData();
            setNewValue('');
            setEditingItem(null);
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Error updating:", error);
            alert("Erro ao atualizar item.");
        }
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        try {
            // If replacement selected, we would update references first.
            // Complication: The core tables (insumos, fichas_tecnicas) have FKs.
            // If we delete a category that is in use, Supabase will throw foreign key constraint violation 
            // unless we update those rows or have ON DELETE CASCADE/SET NULL.
            // Currently our schema might restrict delete.
            // Implementing "Move to" logic requires updating the child tables.

            if (replacementValue) {
                // Update references logic would go here.
                // Since this is generic, we'd need to know relationships.
                // For MVP, we might just try delete and catch specific FK error.
                // OR: manually update known tables.

                if (activeTab === 'category') {
                    await supabase.from('insumos').update({ categoria_id: replacementValue }).eq('categoria_id', editingItem.id);
                } else if (activeTab === 'syntheticCategory') {
                    await supabase.from('insumos').update({ categoria_sintetica_id: replacementValue }).eq('categoria_sintetica_id', editingItem.id);
                } else if (activeTab === 'sector') {
                    await supabase.from('fichas_tecnicas').update({ setor_responsavel_id: replacementValue }).eq('setor_responsavel_id', editingItem.id);
                } else if (activeTab === 'specialty') {
                    await supabase.from('fichas_tecnicas').update({ especialidade_id: replacementValue }).eq('especialidade_id', editingItem.id);
                }
            } else {
                // Set to NULL if possible/allowed or let DB fail
                if (activeTab === 'category') {
                    await supabase.from('insumos').update({ categoria_id: null }).eq('categoria_id', editingItem.id);
                } else if (activeTab === 'syntheticCategory') {
                    await supabase.from('insumos').update({ categoria_sintetica_id: null }).eq('categoria_sintetica_id', editingItem.id);
                } else if (activeTab === 'sector') {
                    await supabase.from('fichas_tecnicas').update({ setor_responsavel_id: null }).eq('setor_responsavel_id', editingItem.id);
                } else if (activeTab === 'specialty') {
                    await supabase.from('fichas_tecnicas').update({ especialidade_id: null }).eq('especialidade_id', editingItem.id);
                }
            }

            const { error } = await supabase.from(currentConfig.table).delete().eq('id', editingItem.id);
            if (error) throw error;

            await fetchAllData();
            setEditingItem(null);
            setReplacementValue('');
            setIsDeleteModalOpen(false);

        } catch (error: any) {
            console.error("Error deleting:", error);
            alert(`Erro ao excluir: ${error.message || 'Verifique dependências.'}`);
        }
    };

    const handleBulkDelete = async () => {
        try {
            // Very simplified bulk update for references... potentially slow for many items.
            if (replacementValue) {
                if (activeTab === 'category') {
                    await supabase.from('insumos').update({ categoria_id: replacementValue }).in('categoria_id', selectedItems);
                } else if (activeTab === 'syntheticCategory') {
                    await supabase.from('insumos').update({ categoria_sintetica_id: replacementValue }).in('categoria_sintetica_id', selectedItems);
                } else if (activeTab === 'sector') {
                    await supabase.from('fichas_tecnicas').update({ setor_responsavel_id: replacementValue }).in('setor_responsavel_id', selectedItems);
                } else if (activeTab === 'specialty') {
                    await supabase.from('fichas_tecnicas').update({ especialidade_id: replacementValue }).in('especialidade_id', selectedItems);
                }
            } else {
                if (activeTab === 'category') {
                    await supabase.from('insumos').update({ categoria_id: null }).in('categoria_id', selectedItems);
                } else if (activeTab === 'syntheticCategory') {
                    await supabase.from('insumos').update({ categoria_sintetica_id: null }).in('categoria_sintetica_id', selectedItems);
                } else if (activeTab === 'sector') {
                    await supabase.from('fichas_tecnicas').update({ setor_responsavel_id: null }).in('setor_responsavel_id', selectedItems);
                } else if (activeTab === 'specialty') {
                    await supabase.from('fichas_tecnicas').update({ especialidade_id: null }).in('especialidade_id', selectedItems);
                }
            }

            const { error } = await supabase.from(currentConfig.table).delete().in('id', selectedItems);
            if (error) throw error;

            await fetchAllData();
            setSelectedItems([]);
            setReplacementValue('');
            setIsBulkDeleteModalOpen(false);

        } catch (error: any) {
            console.error("Error bulk deleting:", error);
            alert("Erro ao excluir itens.");
        }
    };

    const openEdit = (item: LookupItem) => {
        setEditingItem(item);
        setNewValue(item.nome);
        setIsEditModalOpen(true);
    };

    const openDelete = (item: LookupItem) => {
        setEditingItem(item);
        setReplacementValue('');
        setIsDeleteModalOpen(true);
    };

    const toggleSelect = (id: string) => {
        setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedItems.length === currentConfig.data.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(currentConfig.data.map(i => i.id));
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Cadastro Geral</h2>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
                {(Object.keys(CONFIG) as SettingType[]).map((key) => (
                    <button
                        key={key}
                        onClick={() => { setActiveTab(key); setSelectedItems([]); }}
                        className={`px-4 py-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === key
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        {CONFIG[key].title}
                    </button>
                ))}
            </div>

            {/* Content Actions */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">{currentConfig.title}</h3>
                <div className="flex items-center">
                    {selectedItems.length > 0 && (
                        <button
                            onClick={() => {
                                setReplacementValue('');
                                setIsBulkDeleteModalOpen(true);
                            }}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 flex items-center transition-colors mr-4"
                        >
                            <Trash2 size={18} className="mr-2" />
                            Excluir ({selectedItems.length})
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setNewValue('');
                            setIsAddModalOpen(true);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 flex items-center transition-colors"
                    >
                        <Plus size={18} className="mr-2" />
                        Adicionar Novo
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Carregando...</div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left w-10">
                                    <input
                                        type="checkbox"
                                        checked={currentConfig.data.length > 0 && selectedItems.length === currentConfig.data.length}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentConfig.data.map((item) => (
                                <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${selectedItems.includes(item.id) ? 'bg-blue-50' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.includes(item.id)}
                                            onChange={() => toggleSelect(item.id)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.nome}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => openEdit(item)}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                            title="Editar"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => openDelete(item)}
                                            className="text-red-600 hover:text-red-900"
                                            title="Excluir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {currentConfig.data.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center text-gray-500">
                                        Nenhum item cadastrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Adicionar {currentConfig.label}</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                            placeholder="Nome..."
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            autoFocus
                        />
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={!newValue.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                Adicionar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Editar {currentConfig.label}</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            autoFocus
                        />
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEdit}
                                disabled={!newValue.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteModalOpen && editingItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="text-center mb-4">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Excluir {editingItem.nome}?</h3>
                        </div>

                        <div className="mb-4 text-left">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ação para registros vinculados:
                            </label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={replacementValue}
                                onChange={(e) => setReplacementValue(e.target.value)}
                            >
                                <option value="">Remover vínculo (Deixar em branco)</option>
                                {currentConfig.data.filter(item => item.id !== editingItem.id).map(item => (
                                    <option key={item.id} value={item.id}>Mover para "{item.nome}"</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-center space-x-3 mt-6">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
                            >
                                Confirmar Exclusão
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Delete Modal */}
            {isBulkDeleteModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="text-center mb-4">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Excluir {selectedItems.length} Itens?</h3>
                        </div>

                        <div className="mb-4 text-left">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ação para registros vinculados:
                            </label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={replacementValue}
                                onChange={(e) => setReplacementValue(e.target.value)}
                            >
                                <option value="">Deixar em branco (Remover vínculo)</option>
                                {/* Show only items NOT selected for deletion */}
                                {currentConfig.data.filter(item => !selectedItems.includes(item.id)).map(item => (
                                    <option key={item.id} value={item.id}>Mover para "{item.nome}"</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-2">
                                Registros vinculados aos itens excluídos serão atualizados para a opção escolhida ou terão o vínculo removido.
                            </p>
                        </div>

                        <div className="flex justify-center space-x-3 mt-6">
                            <button
                                onClick={() => setIsBulkDeleteModalOpen(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
                            >
                                Confirmar Exclusão
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
