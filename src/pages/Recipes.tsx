import React, { useState } from 'react';
import { Plus, Search, ChefHat, Clock, Pencil, Trash2, Copy, AlertTriangle, FileText } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { RecipeEditor } from '../components/RecipeEditor';

import { exportRecipePDF } from '../utils/pdfGenerator';
import type { Recipe } from '../types';

export const Recipes: React.FC = () => {
    const { recipes, ingredients, deleteRecipe, deleteRecipes } = useStore();
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'All' | 'Base' | 'Final'>('All');

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    // PDF Export State
    const [exportModalRecipe, setExportModalRecipe] = useState<Recipe | null>(null);

    const filteredRecipes = recipes.filter((rec) => {
        const matchesSearch = rec.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'All'
            ? true
            : rec.productType === filterType;
        return matchesSearch && matchesType;
    });

    const handleEdit = (recipe: Recipe) => {
        setEditingRecipe(recipe);
        setIsEditorOpen(true);
    };

    const handleAddNew = () => {
        setEditingRecipe(null);
        setIsEditorOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
    };

    const confirmDelete = () => {
        if (deleteId) {
            deleteRecipe(deleteId);
            setDeleteId(null);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(filteredRecipes.map(r => r.id));
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
        deleteRecipes(selectedIds);
        setSelectedIds([]);
        setShowBulkDeleteConfirm(false);
    };

    const handleDuplicate = (recipe: Recipe) => {
        const { id, createdAt, ...rest } = recipe;
        setEditingRecipe({
            ...rest,
            id: '', // Triggers new creation
            name: `${rest.name} (Cópia)`,
            code: '', // Clear code to auto-generate
            createdAt: new Date().toISOString()
        } as Recipe);
        setIsEditorOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Receitas</h2>
                <div className="flex space-x-2 items-center">

                    {selectedIds.length > 0 ? (
                        <button
                            onClick={() => setShowBulkDeleteConfirm(true)}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 transition-colors flex items-center"
                        >
                            <Trash2 size={18} className="mr-2" />
                            Excluir ({selectedIds.length})
                        </button>
                    ) : (
                        <button
                            onClick={handleAddNew}
                            className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                            title="Nova Receita"
                        >
                            <Plus size={24} />
                        </button>
                    )}
                </div>
            </div>

            {/* Filters and Search Bar Container */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                {/* Filters (Left Side) - Updated style to match Ingredients Toolbar (but keeping buttons as they are specific to this data type) */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center flex-1 w-full md:w-auto">

                    {/* Filter Buttons */}
                    <div className="flex space-x-2 bg-white p-1 rounded-lg border border-gray-200">
                        <button
                            onClick={() => setFilterType('All')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${filterType === 'All'
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilterType('Base')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${filterType === 'Base'
                                ? 'bg-orange-100 text-orange-700'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Prod. Base
                        </button>
                        <button
                            onClick={() => setFilterType('Final')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${filterType === 'Final'
                                ? 'bg-green-100 text-green-700'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Prod. Final
                        </button>
                    </div>

                    {/* Select All */}
                    <label className="flex items-center cursor-pointer hover:text-blue-700 whitespace-nowrap">
                        <input
                            type="checkbox"
                            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mr-2 cursor-pointer"
                            checked={filteredRecipes.length > 0 && selectedIds.length === filteredRecipes.length}
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
                        placeholder="Buscar receita..."
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
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome da Receita</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Setor / Tipo</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tempo / Nível</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Custo Total</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CMV Unitário (g)</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CMV (kg)</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredRecipes.map((rec) => {
                                // Calculate Costs on the fly
                                const totalCost = rec.items.reduce((sum, item) => {
                                    const ing = ingredients.find(i => i.id === item.ingredientId);
                                    if (!ing) return sum;
                                    const unitCost = ing.price * (ing.correctionFactor || 1);
                                    return sum + (unitCost * item.quantity);
                                }, 0);

                                // Calculations
                                const costPerGram = rec.yieldGrams ? (totalCost / rec.yieldGrams) : 0;
                                const costPerKg = costPerGram * 1000;

                                return (
                                    <tr key={rec.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(rec.id) ? 'bg-blue-50/50' : ''}`}>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                checked={selectedIds.includes(rec.id)}
                                                onChange={() => handleSelectOne(rec.id)}
                                            />
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{rec.name}</div>
                                            {/* Optional description or subtitle if needed */}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {rec.code || '-'}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                            <div>{rec.sector}</div>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${rec.productType === 'Base' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                                                }`}>
                                                {rec.productType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <Clock size={14} className="mr-1" />
                                                {rec.time}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {rec.difficulty === 'Easy' ? 'Fácil' : rec.difficulty === 'Medium' ? 'Médio' : 'Difícil'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-bold">
                                            R$ {totalCost.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                                            R$ {costPerGram.toFixed(4)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                                            R$ {costPerKg.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button
                                                    onClick={() => handleDuplicate(rec)}
                                                    className="p-1.5 text-gray-400 hover:text-green-600 bg-transparent hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Duplicar"
                                                >
                                                    <Copy size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setExportModalRecipe(rec)}
                                                    className="p-1.5 text-gray-400 hover:text-purple-600 bg-transparent hover:bg-purple-50 rounded-lg transition-colors"
                                                    title="Gerar PDF"
                                                >
                                                    <FileText size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(rec)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 bg-transparent hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(rec.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 bg-transparent hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredRecipes.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                                        Nenhuma receita encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* General Delete Confirmation Modal */}
            {(showBulkDeleteConfirm || deleteId) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center animate-fade-in">
                        <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {deleteId ? 'Excluir Receita?' : `Excluir ${selectedIds.length} Itens?`}
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

            {isEditorOpen && (
                <RecipeEditor
                    onClose={() => setIsEditorOpen(false)}
                    initialData={editingRecipe}
                />
            )}

            {/* PDF Export Modal */}
            {exportModalRecipe && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center animate-fade-in relative">
                        <button
                            onClick={() => setExportModalRecipe(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <Trash2 size={20} className="transform rotate-45" /> {/* Close Icon hack using rotated trash or just text x */}
                        </button>

                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="text-purple-600" size={24} />
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-2">Exportar Ficha Técnica</h3>
                        <p className="text-sm text-gray-500 mb-6">Selecione o tipo de relatório que deseja gerar para <strong>{exportModalRecipe.name}</strong></p>

                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    exportRecipePDF(exportModalRecipe, ingredients, 'full');
                                    setExportModalRecipe(null);
                                }}
                                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                            >
                                <FileText size={18} className="mr-2" />
                                Ficha Completa (Com Custos)
                            </button>

                            <button
                                onClick={() => {
                                    exportRecipePDF(exportModalRecipe, ingredients, 'production');
                                    setExportModalRecipe(null);
                                }}
                                className="w-full flex items-center justify-center px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                <ChefHat size={18} className="mr-2" />
                                Para Produção (Sem Valores)
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
