import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Trash2, Info, DollarSign, FileText } from 'lucide-react';
import type { FichaTecnica, FtIngrediente, Insumo, UnidadeMedida, SetorResponsavel, Especialidade, Dificuldade } from '../types';

interface RecipeEditorProps {
    onClose: () => void;
    onSave: (recipe: Partial<FichaTecnica>, ingredients: Partial<FtIngrediente>[]) => void;
    initialData?: FichaTecnica;
    initialIngredients?: FtIngrediente[];
    insumos: Insumo[];
    unidades: UnidadeMedida[];
    setores: SetorResponsavel[];
    especialidades: Especialidade[];
    dificuldades: Dificuldade[];
    generateId: (sectorId: string) => string;
}

export const RecipeEditor: React.FC<RecipeEditorProps> = ({
    onClose,
    onSave,
    initialData,
    initialIngredients = [],
    insumos,
    unidades,
    setores,
    especialidades,
    dificuldades,
    generateId
}) => {

    // Form State
    const [formData, setFormData] = useState<Partial<FichaTecnica>>({
        nome_receita: '',
        tipo_produto: 'Final',
        setor_responsavel_id: '',
        especialidade_id: '',
        dificuldade_id: '',
        tempo_preparo: '',
        codigo_id: '',
        e_insumo: false,
        rendimento_kg: 0,
        preco_venda: 0,
        observacoes: '',
        cmv_produto_valor: 0,
        cmv_produto_percent: 0
    });

    const [currentIngredients, setCurrentIngredients] = useState<Partial<FtIngrediente>[]>([]);

    // Ingredient Adder State
    const [selectedIngId, setSelectedIngId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [selectedUnitId, setSelectedUnitId] = useState('');
    const [usageHint, setUsageHint] = useState('');

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
            setCurrentIngredients(initialIngredients);
        } else {
            setFormData({
                nome_receita: '',
                tipo_produto: 'Final', // Default to Final, user can change
                setor_responsavel_id: '',
                especialidade_id: '',
                dificuldade_id: '',
                tempo_preparo: '',
                codigo_id: '',
                e_insumo: false,
                rendimento_kg: 0,
                preco_venda: 0,
                observacoes: '',
                cmv_produto_valor: 0,
                cmv_produto_percent: 0
            });
            setCurrentIngredients([]);
        }
    }, [initialData, initialIngredients]);

    // Auto-generate ID when sector changes
    useEffect(() => {
        if (!initialData && formData.setor_responsavel_id) {
            const newId = generateId(formData.setor_responsavel_id);
            setFormData(prev => ({ ...prev, codigo_id: newId }));
        }
    }, [formData.setor_responsavel_id, initialData, generateId]);

    const handleAddIngredient = () => {
        if (!selectedIngId || !quantity || !selectedUnitId) return;

        setCurrentIngredients(prev => [...prev, {
            insumo_id: selectedIngId,
            quantidade_utilizada: parseFloat(quantity),
            unidade_utilizada_id: selectedUnitId,
            dica_uso: usageHint
        }]);

        // Reset inputs
        setSelectedIngId('');
        setQuantity('');
        setSelectedUnitId('');
        setUsageHint('');
    };

    const handleRemoveIngredient = (index: number) => {
        setCurrentIngredients(prev => prev.filter((_, i) => i !== index));
    };

    // Calculations
    const totalCost = useMemo(() => {
        return currentIngredients.reduce((acc, curr) => {
            const ing = insumos.find(i => i.id === curr.insumo_id);
            if (!ing || !ing.custo_compra || !ing.quantidade_compra) return acc;

            const cost = ing.custo_compra;
            const qty = ing.quantidade_compra;
            const weight = ing.peso_unidade || 1;
            const factor = ing.fator_correcao || 1;

            const costPerPurchaseUnit = cost / qty;
            const costPerBaseUnit = weight > 0 ? costPerPurchaseUnit / weight : 0;
            const realUnitCost = costPerBaseUnit * factor;

            return acc + (realUnitCost * (curr.quantidade_utilizada || 0));
        }, 0);
    }, [currentIngredients, insumos]);

    const yieldKg = formData.rendimento_kg || 0;
    const yieldGrams = yieldKg * 1000;

    // CMV Calculations
    const cmvPerKg = yieldKg > 0 ? totalCost / yieldKg : 0;
    const cmvPerGram = cmvPerKg / 1000;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Calculate CMV fields to save
        const cmvValue = totalCost;
        const cmvPercent = (formData.preco_venda && formData.preco_venda > 0)
            ? ((totalCost / formData.preco_venda) * 100)
            : 0;

        const payload = {
            ...formData,
            cmv_produto_valor: cmvValue,
            cmv_produto_percent: cmvPercent
        };

        onSave(payload, currentIngredients);
    };

    // Date formatting for the form
    const creationDate = initialData?.data_criacao
        ? new Date(initialData.data_criacao).toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR');

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl my-8">
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl z-10">
                        <h3 className="text-xl font-bold text-gray-800">
                            Ficha Técnica de Produção
                        </h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700" title="Fechar">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-8">

                        {/* 1. Identification */}
                        <div className="space-y-4">
                            <h4 className="flex items-center text-blue-700 font-semibold bg-blue-50 p-2 rounded">
                                <Info size={18} className="mr-2" />
                                1. Identificação da Receita
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Row 1 */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Nome da Receita</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.nome_receita || ''}
                                        onChange={e => setFormData({ ...formData, nome_receita: e.target.value })}
                                        title="Nome da Receita"
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Tipo de Produto</label>
                                    <select
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.tipo_produto || ''}
                                        onChange={e => setFormData({ ...formData, tipo_produto: e.target.value as any })}
                                        title="Tipo de Produto"
                                    >
                                        <option value="Final">Produto Final</option>
                                        <option value="Base">Produto Base</option>
                                    </select>
                                </div>

                                {/* Row 2 */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Setor Responsável</label>
                                    <select
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.setor_responsavel_id || ''}
                                        onChange={e => setFormData({ ...formData, setor_responsavel_id: e.target.value })}
                                        title="Setor Responsável"
                                    >
                                        <option value="">Selecione...</option>
                                        {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Especialidade</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.especialidade_id || ''}
                                        onChange={e => setFormData({ ...formData, especialidade_id: e.target.value })}
                                        title="Especialidade"
                                    >
                                        <option value="">Selecione...</option>
                                        {especialidades.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Código/ID (Auto)</label>
                                    <input
                                        type="text"
                                        readOnly
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
                                        value={formData.codigo_id || ''}
                                        title="Código ID"
                                    />
                                </div>

                                {/* Row 3 */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Data Criação</label>
                                    <input
                                        type="text"
                                        readOnly
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
                                        value={creationDate}
                                        title="Data de Criação"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Dificuldade</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.dificuldade_id || ''}
                                        onChange={e => setFormData({ ...formData, dificuldade_id: e.target.value })}
                                        title="Dificuldade"
                                    >
                                        <option value="">Selecione...</option>
                                        {dificuldades.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Tempo de Preparo</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: 45 min"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.tempo_preparo || ''}
                                        onChange={e => setFormData({ ...formData, tempo_preparo: e.target.value })}
                                        title="Tempo de Preparo"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Ingredients */}
                        <div className="space-y-4">
                            <h4 className="flex items-center text-blue-700 font-semibold bg-blue-50 p-2 rounded">
                                <FileText size={18} className="mr-2" />
                                2. Ingredientes e Insumos
                            </h4>

                            {/* Adder ROW */}
                            <div className="flex flex-col md:flex-row gap-2 items-end">
                                <div className="flex-grow">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Ingrediente</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm"
                                        value={selectedIngId}
                                        onChange={e => setSelectedIngId(e.target.value)}
                                        title="Selecione o insumo"
                                    >
                                        <option value="">Selecione...</option>
                                        {insumos.map(i => (
                                            <option key={i.id} value={i.id}>{i.nome_padronizado}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-24">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Qtd (Un)</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        placeholder="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm"
                                        value={quantity}
                                        onChange={e => setQuantity(e.target.value)}
                                        title="Quantidade"
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Unidade</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm"
                                        value={selectedUnitId}
                                        onChange={e => setSelectedUnitId(e.target.value)}
                                        title="Unidade"
                                    >
                                        <option value="">Und</option>
                                        {unidades
                                            .filter(u => ['g', 'ml', 'un'].includes(u.sigla.toLowerCase()))
                                            .map(u => (
                                                <option key={u.id} value={u.id}>{u.sigla}</option>
                                            ))}
                                    </select>
                                </div>
                                <div className="flex-grow">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Dica de Uso</label>
                                    <input
                                        type="text"
                                        placeholder="Opcional"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm"
                                        value={usageHint}
                                        onChange={e => setUsageHint(e.target.value)}
                                        title="Dica de Uso"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddIngredient}
                                    className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors h-[38px] w-10 flex items-center justify-center"
                                    title="Adicionar ingrediente"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            {/* List */}
                            <div className="border border-gray-100 rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-3">Ingrediente</th>
                                            <th className="px-4 py-3">Unid</th>
                                            <th className="px-4 py-3 text-right">Qtd</th>
                                            <th className="px-4 py-3 text-right">Custo Un (Base)</th>
                                            <th className="px-4 py-3 text-right">Custo Total</th>
                                            <th className="px-4 py-3">Dica</th>
                                            <th className="px-4 py-3 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {currentIngredients.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">
                                                    Adicione ingredientes acima.
                                                </td>
                                            </tr>
                                        )}
                                        {currentIngredients.map((item, idx) => {
                                            const ing = insumos.find(i => i.id === item.insumo_id);
                                            const ingName = ing?.nome_padronizado || '-';
                                            const unitName = unidades.find(u => u.id === item.unidade_utilizada_id)?.sigla || '-';

                                            const cost = ing?.custo_compra || 0;
                                            const qty = ing?.quantidade_compra || 1;
                                            const weight = ing?.peso_unidade || 1;
                                            const factor = ing?.fator_correcao || 1;

                                            const costPerPurchaseUnit = qty > 0 ? cost / qty : 0;
                                            const costPerBaseUnit = weight > 0 ? costPerPurchaseUnit / weight : 0;
                                            const realUnitCost = costPerBaseUnit * factor;

                                            const subtotal = realUnitCost * (item.quantidade_utilizada || 0);

                                            return (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium text-gray-800">{ingName}</td>
                                                    <td className="px-4 py-3 text-gray-500">{unitName}</td>
                                                    <td className="px-4 py-3 text-right">{item.quantidade_utilizada}</td>
                                                    <td className="px-4 py-3 text-right text-gray-500">R$ {realUnitCost.toFixed(4)}</td>
                                                    <td className="px-4 py-3 text-right font-semibold text-gray-800">R$ {subtotal.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-gray-500 italic">{item.dica_uso}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveIngredient(idx)}
                                                            className="text-red-400 hover:text-red-600 transition-colors"
                                                            title="Remover"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div className="bg-blue-50 p-3 flex justify-between items-center border-t border-blue-100">
                                    <span className="font-bold text-gray-700 ml-auto mr-4">Total Insumos:</span>
                                    <span className="font-bold text-blue-700 text-lg">R$ {totalCost.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Yield */}
                        <div className="space-y-4">
                            <h4 className="flex items-center text-blue-700 font-semibold bg-blue-50 p-2 rounded">
                                <Info size={18} className="mr-2" />
                                3. Rendimento da Receita
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Rendimento Total (em KG)</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                        value={formData.rendimento_kg || ''}
                                        onChange={e => setFormData({ ...formData, rendimento_kg: parseFloat(e.target.value) })}
                                        placeholder="0.000"
                                        title="Rendimento em KG"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Peso final sem embalagens. Se pesou em gramas, divida por 1000.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Rendimento Total (em Gramas)</label>
                                    <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-bold">
                                        {yieldGrams.toFixed(0)}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Cálculo automático: KG x 1000</p>
                                </div>
                            </div>
                        </div>

                        {/* 4. Nutritional Info (Placeholder) */}
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <h4 className="font-bold text-gray-400 uppercase text-sm mb-2">4. Informação Nutricional (Em Breve)</h4>
                            <p className="text-xs text-gray-400 italic">Cálculo automático de valor energético será implementado.</p>
                        </div>

                        {/* 5. CMV Dashboard */}
                        <div className="space-y-4">
                            <h4 className="flex items-center text-blue-700 font-semibold bg-blue-50 p-2 rounded">
                                <DollarSign size={18} className="mr-2" />
                                5. Custo de Mercadoria Vendida
                            </h4>

                            <div className="bg-green-50 rounded-xl border border-green-100 p-6">
                                <div className="grid grid-cols-2 gap-8 mb-6 border-b border-green-200 pb-6">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-600 mb-1">Custo Total da Receita</p>
                                        <p className="text-2xl font-bold text-gray-800">R$ {totalCost.toFixed(2)}</p>
                                        <p className="text-xs text-gray-500">Soma dos insumos</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-600 mb-1">Rendimento Total</p>
                                        <p className="text-2xl font-bold text-gray-800">{yieldKg.toFixed(3)} kg</p>
                                        <p className="text-xs text-gray-500">Peso final</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-sm font-bold text-green-800 mb-1">CMV (por KG)</p>
                                        <p className="text-3xl font-bold text-green-600">R$ {cmvPerKg.toFixed(2)}</p>
                                        <p className="text-xs text-green-700 font-medium">Custo Total ÷ Rendimento Kg</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-green-800 mb-1">CMV (por Grama)</p>
                                        <p className="text-3xl font-bold text-green-600">R$ {cmvPerGram.toFixed(4)}</p>
                                        <p className="text-xs text-green-700 font-medium">CMV Kg ÷ 1000</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 6. Sales Price (Only for Final Products) */}
                        {formData.tipo_produto === 'Final' && (
                            <div className="space-y-4">
                                <h4 className="flex items-center text-blue-700 font-semibold bg-blue-50 p-2 rounded">
                                    <DollarSign size={18} className="mr-2" />
                                    6. Preço de Venda
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-600 mb-1">Preço de Venda Sugerido</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                                value={formData.preco_venda || ''}
                                                onChange={e => setFormData({ ...formData, preco_venda: parseFloat(e.target.value) })}
                                                placeholder="0.00"
                                                title="Preço de Venda"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Este valor será exibido na página de Produtos Finais.</p>
                                    </div>

                                    {/* CMV Calculations */}
                                    <div className="bg-green-50 p-4 rounded-lg space-y-3">
                                        <div>
                                            <p className="text-sm font-bold text-green-800 mb-1">CMV R$ (do produto)</p>
                                            <p className="text-2xl font-bold text-green-600">R$ {totalCost.toFixed(2)}</p>
                                            <p className="text-xs text-green-700 font-medium">Custo Total da Receita</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-green-800 mb-1">CMV % (do produto)</p>
                                            <p className="text-2xl font-bold text-green-600">
                                                {formData.preco_venda && formData.preco_venda > 0
                                                    ? ((totalCost / formData.preco_venda) * 100).toFixed(2)
                                                    : '0.00'}%
                                            </p>
                                            <p className="text-xs text-green-700 font-medium">Custo Total ÷ Preço Venda</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className="pt-4 border-t border-gray-200 sticky bottom-0 bg-white p-4 -mx-6 -mb-6 mt-8 shadow-inner">
                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                            >
                                {formData.tipo_produto === 'Base' ? 'Salvar Ficha Técnica & Gerar Insumo' : 'Salvar Ficha Técnica'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
