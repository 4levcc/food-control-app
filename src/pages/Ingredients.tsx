import React, { useState } from 'react';
import { Plus, Search, Pencil, Trash2, AlertTriangle, Copy } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { IngredientForm, SYNTHETIC_CATEGORIES } from '../components/IngredientForm';
import { IngredientImport } from '../components/IngredientImport';
import type { Ingredient } from '../types';

export const Ingredients: React.FC = () => {
    const { ingredients, deleteIngredient, deleteIngredients } = useStore();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null); // For single delete
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string>('All');

    // Use the predefined categories
    const syntheticCategories = SYNTHETIC_CATEGORIES;

    const filteredIngredients = ingredients.filter((ing) => {
        const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'All'
            ? true
            : (ing.syntheticCategory || '') === filterCategory;

        return matchesSearch && matchesCategory;
    });

    const handleEdit = (ing: Ingredient) => {
        setEditingIngredient(ing);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
    };

    const confirmDelete = () => {
        if (deleteId) {
            deleteIngredient(deleteId);
            setDeleteId(null);
        }
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingIngredient(undefined);
    };

    // Bulk Actions
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(filteredIngredients.map(i => i.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const confirmBulkDelete = () => {
        deleteIngredients(selectedIds);
        setSelectedIds([]);
        setShowBulkDeleteConfirm(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Insumos</h2>
                <div className="flex space-x-2">
                    {selectedIds.length > 0 ? (
                        <button
                            onClick={() => setShowBulkDeleteConfirm(true)}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 transition-colors flex items-center"
                        >
                            <Trash2 size={18} className="mr-2" />
                            Excluir ({selectedIds.length})
                        </button>
                    ) : (
                        <>
                            <IngredientImport />
                            <button
                                onClick={() => setIsFormOpen(true)}
                                className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                                title="Novo Insumo"
                            >
                                <Plus size={24} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Toolbar: Category Filter + Select All + Search */}
            <div className="flex flex-col md:flex-row gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 justify-between items-center">
                {/* Left: Filter and Select All */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center flex-1 w-full md:w-auto">

                    {/* Category Filter */}
                    <div className="relative w-full md:w-auto">
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="appearance-none w-full md:w-auto bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-blue-500 text-sm shadow-sm"
                        >
                            <option value="All">Todas Categorias</option>
                            {syntheticCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>

                    {/* Select All */}
                    <label className="flex items-center cursor-pointer hover:text-blue-700 whitespace-nowrap">
                        <input
                            type="checkbox"
                            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mr-2 cursor-pointer"
                            checked={filteredIngredients.length > 0 && selectedIds.length === filteredIngredients.length}
                            onChange={handleSelectAll}
                        />
                        <span className="text-sm font-medium text-gray-700">
                            Selecionar Todos
                        </span>
                    </label>

                    {selectedIds.length > 0 && (
                        <span className="text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium border border-blue-100 animate-fade-in whitespace-nowrap">
                            {selectedIds.length} selecionado{selectedIds.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                {/* Right: Search */}
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar insumo..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left w-10">
                                    {/* Header checkbox logic already handled by toolbar, optionally duplicate here if needed */}
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome Padronizado (FT)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria / Sintética</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Custo em Gramas/ML</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Custo em KG/L</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredIngredients.map((ing) => {
                                // Calculations
                                const costPerUnit = (ing.purchaseCost || 0) / (ing.purchaseQuantity || 1);
                                const weight = ing.unitWeight || 1;
                                const costPerBaseUnit = costPerUnit / weight;
                                const fc = ing.correctionFactor || 1;
                                const realCostPerBaseUnit = costPerBaseUnit * fc;

                                // Determine Multiplier and Labels
                                const isGram = ing.referenceUnit === 'g';
                                const isMl = ing.referenceUnit === 'ml';
                                const largeUnitMultiplier = (isGram || isMl) ? 1000 : 1;
                                const largeUnitCost = realCostPerBaseUnit * largeUnitMultiplier; // Should be based on Real Cost? 
                                // Original logic was Base Cost * 1000. Let's stick to prompt: "Custo em Kg". Usually implies Real Cost per Kg.
                                // If "Custo em gramas" is Real Cost per Gram, then "Custo em Kg" should be Real Cost per Kg. 
                                // Previous code was showing "Kg/L" based on Base Unit Cost * 1000 (which is somewhat confusing if it's the purchase price normalized or real cost).
                                // Let's use Real Cost logic for consistency with "Custo em Gramas".

                                return (
                                    <tr key={ing.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(ing.id) ? 'bg-blue-50/50' : ''}`}>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                checked={selectedIds.includes(ing.id)}
                                                onChange={() => handleSelectOne(ing.id)}
                                            />
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{ing.name}</div>
                                            <div className="text-xs text-gray-500">{ing.description}</div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {ing.code || '-'}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div>{ing.category}</div>
                                            <div className="text-xs text-blue-600">{ing.syntheticCategory}</div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-medium">
                                            R$ {realCostPerBaseUnit.toFixed(4)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                                            R$ {largeUnitCost.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button
                                                    onClick={() => handleEdit(ing)}
                                                    className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                                    title="Editar"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const { id, ...rest } = ing; // Remove existing ID
                                                        setEditingIngredient({
                                                            ...rest,
                                                            id: '',
                                                            name: `${rest.name} (Cópia)`,
                                                            code: ''
                                                        } as Ingredient);
                                                        setIsFormOpen(true);
                                                    }}
                                                    className="text-gray-400 hover:text-green-600 transition-colors p-1"
                                                    title="Duplicar"
                                                >
                                                    <Copy size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(ing.id)}
                                                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredIngredients.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                        Nenhum insumo encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* General Delete Confirmation Modal (Used for both single and bulk) */}
            {(showBulkDeleteConfirm || deleteId) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center animate-fade-in">
                        <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {deleteId ? 'Excluir Item?' : `Excluir ${selectedIds.length} Itens?`}
                        </h3>
                        <p className="text-gray-600 mb-6 font-medium">
                            Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex space-x-3 justify-center">
                            <button
                                onClick={() => {
                                    setShowBulkDeleteConfirm(false);
                                    setDeleteId(null);
                                }}
                                className="px-5 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={deleteId ? confirmDelete : confirmBulkDelete}
                                className="px-5 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 font-medium"
                            >
                                Sim, Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isFormOpen && (
                <IngredientForm
                    onClose={handleCloseForm}
                    initialData={editingIngredient}
                />
            )}
        </div>
    );
};
