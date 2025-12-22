import React, { useState, useEffect } from 'react';
import { X, Save, Calculator, AlertCircle } from 'lucide-react';
import type { Insumo, CategoriaInsumo, UnidadeMedida } from '../types';

interface IngredientFormProps {
    onClose: () => void;
    onSave: (data: Partial<Insumo>) => Promise<void>;
    initialData?: Insumo;
    categorias: CategoriaInsumo[];
    unidades: UnidadeMedida[];
    categoriasSinteticas?: { id: string, nome: string }[];
}

export function IngredientForm({ onClose, onSave, initialData, categorias, unidades, categoriasSinteticas = [] }: IngredientFormProps) {

    // Initialize state
    const [formData, setFormData] = useState<Partial<Insumo>>({
        nome_padronizado: '',
        descricao_produto: '',
        categoria_id: '',
        categoria_sintetica_id: '',
        fornecedor: '',
        custo_compra: 0,
        quantidade_compra: 1,
        unidade_compra_id: '', // Will default to UN/UND if found, else first available
        peso_unidade: 0,
        unidade_peso_id: '',
        fator_correcao: 1
    });

    const [calculations, setCalculations] = useState({
        costPerUnit: 0,
        costPerBase: 0,
        realCostKg: 0,
        realCostBase: 0
    });

    // Check if it's a Base Ingredient (managed by Recipe)
    const baseCategory = categoriasSinteticas.find(c => c.nome === 'Insumo de produção própria');
    const isBaseIngredient = !!(initialData?.categoria_sintetica_id && baseCategory && initialData.categoria_sintetica_id === baseCategory.id);

    // Find default unit 'UN' or 'UND' for Unidade de Compra (hidden field)
    useEffect(() => {
        if (!initialData && !formData.unidade_compra_id && unidades.length > 0) {
            const unUnit = unidades.find(u => u.sigla.toUpperCase() === 'UN' || u.sigla.toUpperCase() === 'UND');
            setFormData(prev => ({
                ...prev,
                unidade_compra_id: unUnit ? unUnit.id : unidades[0].id
            }));
        }
    }, [unidades, initialData, formData.unidade_compra_id]);


    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            // Defaults for new entry
            const defaultUnitId = unidades[0]?.id || '';
            // Try to find 'g' or 'ml' for default weight unit
            const gramOrMl = unidades.find(u => ['g', 'ml', 'gr'].includes(u.sigla.toLowerCase()))?.id || defaultUnitId;

            setFormData(prev => ({
                ...prev,
                nome_padronizado: '',
                descricao_produto: '',
                categoria_id: '',
                categoria_sintetica_id: '',
                fornecedor: '',
                custo_compra: 0,
                quantidade_compra: 1,
                peso_unidade: 0,
                unidade_peso_id: gramOrMl,
                fator_correcao: 1
            }));
        }
    }, [initialData, categorias, categoriasSinteticas, unidades]);

    useEffect(() => {
        const cost = Number(formData.custo_compra) || 0;
        const qty = Number(formData.quantidade_compra) || 1;
        const weight = Number(formData.peso_unidade) || 0;
        const factor = Number(formData.fator_correcao) || 1;

        // Cost per purchased unit (e.g. Cost per Box)
        const costPerUnit = qty > 0 ? cost / qty : 0;

        // Cost per weight unit (e.g. Cost per gram) RAW (without factor)
        // If weight represents the package content (e.g. 200g), then Cost/g = CostPerUnit / 200
        const costPerBase = weight > 0 ? costPerUnit / weight : 0;

        // Determine unit type
        const selectedUnitSigla = unidades.find(u => u.id === formData.unidade_peso_id)?.sigla.toLowerCase() || '';

        let realCostLarge = 0;
        let realCostSmall = 0;

        const realCostStored = costPerBase * factor; // Cost per whatever unit is stored

        if (['kg', 'l', 'lt'].includes(selectedUnitSigla)) {
            // Sored in Large Unit
            realCostLarge = realCostStored;
            realCostSmall = realCostStored / 1000;
        } else if (['g', 'gr', 'ml'].includes(selectedUnitSigla)) {
            // Stored in Small Unit
            realCostLarge = realCostStored * 1000;
            realCostSmall = realCostStored;
        } else {
            // Unit (un) or others
            realCostLarge = realCostStored;
            realCostSmall = realCostStored;
        }

        setCalculations({
            costPerUnit,
            costPerBase,
            realCostKg: realCostLarge,
            realCostBase: realCostSmall
        });
    }, [formData, unidades]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Convert empty strings to null for nullable fields to avoid UUID errors
        const cleanedData = {
            ...formData,
            categoria_id: formData.categoria_id || null,
            categoria_sintetica_id: formData.categoria_sintetica_id || null
        };
        onSave(cleanedData);
    };

    const handleInputChange = (field: keyof Insumo, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl z-10">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {initialData ? 'Editar Insumo' : 'Novo Insumo Detalhado'}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700" title="Fechar">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome Padronizado (FT)</label>
                            <input
                                required
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.nome_padronizado || ''}
                                onChange={(e) => handleInputChange('nome_padronizado', e.target.value)}
                                placeholder="Ex: Leite Integral"
                                disabled={isBaseIngredient}
                                title="Nome Padronizado"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição Produto (Benta)</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.descricao_produto || ''}
                                onChange={(e) => handleInputChange('descricao_produto', e.target.value)}
                                placeholder="Ex: Leite Integral 1L Italac"
                                title="Descrição Produto"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Categoria</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.categoria_id || ''}
                                    onChange={(e) => handleInputChange('categoria_id', e.target.value)}
                                    title="Categoria"
                                >
                                    <option value="">Selecione...</option>
                                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Categoria Sintética</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.categoria_sintetica_id || ''}
                                    onChange={(e) => handleInputChange('categoria_sintetica_id', e.target.value)}
                                    disabled={isBaseIngredient}
                                    title="Categoria Sintética"
                                >
                                    <option value="">Selecione...</option>
                                    {categoriasSinteticas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <Calculator size={18} className="text-gray-700" />
                        <h4 className="font-semibold text-gray-900">Custos e Unidades</h4>
                    </div>

                    {isBaseIngredient && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 text-sm">
                            <AlertCircle className="text-amber-600 mt-0.5 shrink-0" size={16} />
                            <span className="text-amber-800">Gerenciado automaticamente pela Ficha Técnica.</span>
                        </div>
                    )}

                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Custo Compra (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                disabled={isBaseIngredient}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${isBaseIngredient ? 'bg-gray-100' : ''}`}
                                value={formData.custo_compra || ''}
                                onChange={e => handleInputChange('custo_compra', parseFloat(e.target.value))}
                                title="Custo Compra"
                            />
                        </div>
                        <div className="col-span-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Qtd. Comprada</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                disabled={isBaseIngredient}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${isBaseIngredient ? 'bg-gray-100' : ''}`}
                                value={formData.quantidade_compra || ''}
                                onChange={e => handleInputChange('quantidade_compra', parseFloat(e.target.value))}
                                title="Quantidade Comprada"
                            />
                        </div>
                        <div className="col-span-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Peso Unidade</label>
                            <div className="flex">
                                <input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    required
                                    disabled={isBaseIngredient}
                                    className={`w-full px-3 py-2 border border-gray-300 border-r-0 rounded-l-lg outline-none focus:ring-2 focus:ring-blue-500 ${isBaseIngredient ? 'bg-gray-100' : ''}`}
                                    value={formData.peso_unidade || ''}
                                    onChange={e => handleInputChange('peso_unidade', parseFloat(e.target.value))}
                                    title="Peso por Unidade"
                                />
                                <select
                                    className="bg-gray-50 border border-gray-300 rounded-r-lg px-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.unidade_peso_id || ''}
                                    onChange={e => handleInputChange('unidade_peso_id', e.target.value)}
                                    disabled={isBaseIngredient}
                                    title="Unidade de Peso"
                                >
                                    {unidades
                                        .filter(u => ['g', 'ml', 'un'].includes(u.sigla.toLowerCase()))
                                        .map(u => (
                                            <option key={u.id} value={u.id}>{u.sigla}</option>
                                        ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Calculated Raw Costs */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Custo por Unidade:</span>
                            <span className="font-semibold text-gray-900">R$ {calculations.costPerUnit.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Custo por {unidades.find(u => u.id === formData.unidade_peso_id)?.sigla || 'un'}:</span>
                            <span className="font-semibold text-gray-900">R$ {calculations.costPerBase.toFixed(4)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Fator de Correção</label>
                            <input
                                type="number"
                                step="0.01"
                                min="1"
                                required
                                disabled={isBaseIngredient}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${isBaseIngredient ? 'bg-gray-100' : ''}`}
                                value={formData.fator_correcao || ''}
                                onChange={e => handleInputChange('fator_correcao', parseFloat(e.target.value))}
                                title="Fator de Correção"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Fornecedor</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.fornecedor || ''}
                                onChange={e => handleInputChange('fornecedor', e.target.value)}
                                title="Fornecedor"
                            />
                        </div>
                    </div>

                    <p className="text-xs text-gray-500">Peso Bruto / Peso Líquido</p>

                    {/* Final Calculated Costs */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-blue-900 font-medium text-sm">Custo Real (KG/ LT/ UN)</span>
                            <span className="text-xl font-bold text-blue-700">R$ {calculations.realCostKg.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
                            <span className="text-blue-900 font-medium text-sm">Custo Real (g/ ml/ un)</span>
                            <span className="text-lg font-bold text-blue-700">R$ {calculations.realCostBase.toFixed(4)}</span>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">Considerando fator de correção</p>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Save size={20} />
                        {initialData ? 'Atualizar Insumo' : 'Salvar Insumo'}
                    </button>
                </form>
            </div>
        </div>
    );
}
