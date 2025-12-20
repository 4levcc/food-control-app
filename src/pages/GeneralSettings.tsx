import React, { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { Plus, Trash2, Edit2, AlertTriangle, X } from 'lucide-react';
import type { SettingType } from '../contexts/FoodControlContext';

export const GeneralSettings: React.FC = () => {
    const { settings, addSetting, updateSetting, deleteSetting, deleteSettings } = useStore();
    const [activeTab, setActiveTab] = useState<SettingType>('category'); // Tabs: category, syntheticCategory, sector, specialty

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

    // Form State
    const [editingValue, setEditingValue] = useState(''); // Current value being edited/deleted
    const [newValue, setNewValue] = useState(''); // New value for add/edit
    const [replacementValue, setReplacementValue] = useState(''); // For delete replacement

    // Bulk selection state
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    // Labels Mapping
    const LABELS = {
        category: { title: 'Categorias de Insumos', label: 'Categoria' },
        syntheticCategory: { title: 'Categorias Sintéticas', label: 'Categoria Sintética' },
        sector: { title: 'Setores Responsáveis', label: 'Setor' },
        specialty: { title: 'Especialidades', label: 'Especialidade' },
    };

    const currentList = activeTab === 'category' ? settings.categories :
        activeTab === 'syntheticCategory' ? settings.syntheticCategories :
            activeTab === 'sector' ? settings.sectors : settings.specialties;

    const handleAdd = () => {
        if (!newValue.trim()) return;
        addSetting(activeTab, newValue.trim());
        setNewValue('');
        setIsAddModalOpen(false);
    };

    const handleEdit = () => {
        if (!newValue.trim() || newValue === editingValue) return;
        updateSetting(activeTab, editingValue, newValue.trim());
        setNewValue('');
        setEditingValue('');
        setIsEditModalOpen(false);
    };

    const handleDelete = () => {
        deleteSetting(activeTab, editingValue, replacementValue || undefined);
        setEditingValue('');
        setReplacementValue('');
        setIsDeleteModalOpen(false);
    };

    const handleBulkDelete = () => {
        deleteSettings(activeTab, selectedItems, replacementValue || undefined);
        setSelectedItems([]);
        setReplacementValue('');
        setIsBulkDeleteModalOpen(false);
    };

    const openEdit = (val: string) => {
        setEditingValue(val);
        setNewValue(val);
        setIsEditModalOpen(true);
    };

    const openDelete = (val: string) => {
        setEditingValue(val);
        setReplacementValue('');
        setIsDeleteModalOpen(true);
    };

    // Selection Handlers
    const toggleSelect = (item: string) => {
        setSelectedItems(prev =>
            prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
        );
    };

    const toggleSelectAll = () => {
        if (selectedItems.length === currentList.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems([...currentList]);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Cadastro Geral</h2>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
                {(Object.keys(LABELS) as SettingType[]).map((key) => (
                    <button
                        key={key}
                        onClick={() => { setActiveTab(key); setSelectedItems([]); }}
                        className={`px-4 py-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === key
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        {LABELS[key].title}
                    </button>
                ))}
            </div>

            {/* Content Actions */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">{LABELS[activeTab].title}</h3>
                <div className="flex items-center">
                    {selectedItems.length > 0 && (
                        <button
                            onClick={() => {
                                setReplacementValue('');
                                setIsBulkDeleteModalOpen(true);
                            }}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 flex items-center transition-colors mr-4 animate-fade-in"
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
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left w-10">
                                <input
                                    type="checkbox"
                                    checked={currentList.length > 0 && selectedItems.length === currentList.length}
                                    onChange={toggleSelectAll}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {currentList.map((item) => (
                            <tr key={item} className={`hover:bg-gray-50 transition-colors ${selectedItems.includes(item) ? 'bg-blue-50' : ''}`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.includes(item)}
                                        onChange={() => toggleSelect(item)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item}</td>
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
                        {currentList.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-6 py-10 text-center text-gray-500">
                                    Nenhum item cadastrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Adicionar {LABELS[activeTab].label}</h3>
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
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Editar {LABELS[activeTab].label}</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">Original: {editingValue}</p>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-1"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            autoFocus
                        />
                        <p className="text-xs text-yellow-600 mb-4 bg-yellow-50 p-2 rounded">
                            Atenção: A alteração deste nome será aplicada automaticamente em todos os registros vinculados.
                        </p>
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
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
                        <div className="text-center mb-4">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Excluir {editingValue}?</h3>
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
                                {currentList.filter(item => item !== editingValue).map(item => (
                                    <option key={item} value={item}>Mover para "{item}"</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-2">
                                Se houver insumos ou receitas usando "{editingValue}", eles serão atualizados conforme sua escolha acima.
                            </p>
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
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
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
                                {currentList.filter(item => !selectedItems.includes(item)).map(item => (
                                    <option key={item} value={item}>Mover para "{item}"</option>
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
