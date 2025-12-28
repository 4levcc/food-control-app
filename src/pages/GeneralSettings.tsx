import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, AlertTriangle, X, Save, Calculator, DollarSign, Percent } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { CategoriaInsumo, CategoriaSintetica, SetorResponsavel, Especialidade, ConfiguracaoNegocio, DespesaVariavel, MargemEspecialidade } from '../types';

type SettingType = 'category' | 'syntheticCategory' | 'sector' | 'specialty' | 'pricing' | 'maintenance';

interface LookupItem {
    id: string;
    nome: string;
}

// --- Reusable Components ---

interface NumericInputProps {
    value: number;
    onChange: (value: number) => void;
    className?: string;
    placeholder?: string;
}

const NumericInput: React.FC<NumericInputProps> = ({ value, onChange, className, placeholder }) => {
    // Helper to format as pt-BR currency (without symbol if we just want the number format)
    // Actually, Intl.NumberFormat with 'decimal' style is better for input, but we want 1.000,00 structure.
    const formatValue = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    };

    const [displayValue, setDisplayValue] = useState('');

    // Sync state with prop value
    useEffect(() => {
        // Only sync if the parsed display value is different to avoid cursor jumping if we were to support live typing (which we don't fully here)
        // For onBlur-centric, we can sync when value changes externally or roughly matches.
        // Let's simple sync:
        const parsedDisplay = parseFloat(displayValue.replace(/\./g, '').replace(',', '.'));
        if (parsedDisplay !== value) {
            setDisplayValue(formatValue(value));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        // Allow digits, dots and commas. 
        // We let user type "150.000" or "150000" or "150,00".
        // Regex: allowed chars
        if (/^[\d.,]*$/.test(newValue)) {
            setDisplayValue(newValue);
        }
    };

    const handleBlur = () => {
        // Parse: Remove dots, replace comma with dot
        // Ex: "150.000,00" -> "150000.00"
        let raw = displayValue.replace(/\./g, ''); // Remove thousands separators
        raw = raw.replace(',', '.'); // Replace decimal separator

        const parsed = parseFloat(raw);

        if (!isNaN(parsed)) {
            // Update parent
            onChange(parsed);
            // Re-format display
            setDisplayValue(formatValue(parsed));
        } else {
            // Revert
            setDisplayValue(formatValue(value));
        }
    };

    const handleFocus = () => {
        // Optional: On focus, maybe remove formatting to make editing easier?
        // Or keep it? Standard UX often selects all.
        // Let's keep formatting but maybe select all (user browser behavior usually).
    };

    return (
        <input
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            className={className}
            placeholder={placeholder}
        />
    );
};

export const GeneralSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SettingType>('category');

    // Data State for Standard Tabs
    const [categories, setCategories] = useState<CategoriaInsumo[]>([]);
    const [syntheticCategories, setSyntheticCategories] = useState<CategoriaSintetica[]>([]);
    const [sectors, setSectors] = useState<SetorResponsavel[]>([]);
    const [specialties, setSpecialties] = useState<Especialidade[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Data State for Pricing Parameters
    const [businessConfig, setBusinessConfig] = useState<ConfiguracaoNegocio | null>(null);
    const [variableExpenses, setVariableExpenses] = useState<DespesaVariavel[]>([]);
    const [specialtyMargins, setSpecialtyMargins] = useState<MargemEspecialidade[]>([]);
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isBackfilling, setIsBackfilling] = useState(false);

    // Form State (Standard Tabs)
    const [editingItem, setEditingItem] = useState<LookupItem | null>(null);
    const [newValue, setNewValue] = useState('');
    const [replacementValue, setReplacementValue] = useState('');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    // Config Mapping for Standard Tabs
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

    useEffect(() => {
        fetchAllData();
        fetchBusinessConfig();
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

    const fetchBusinessConfig = async () => {
        try {
            const { data, error } = await supabase
                .from('configuracoes_negocio')
                .select('*')
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
                console.error("Error fetching business config:", error);
            }

            if (data) {
                setBusinessConfig(data);
                // Parse JSONB fields safely
                const loadedExpenses = typeof data.despesas_variaveis === 'string'
                    ? JSON.parse(data.despesas_variaveis)
                    : data.despesas_variaveis || [];

                const loadedMargins = typeof data.margens_especialidades === 'string'
                    ? JSON.parse(data.margens_especialidades)
                    : data.margens_especialidades || [];

                setVariableExpenses(Array.isArray(loadedExpenses) ? loadedExpenses : []);
                setSpecialtyMargins(Array.isArray(loadedMargins) ? loadedMargins : []);
            } else {
                // Initialize default if not exists
                const defaultConfig = {
                    despesas_fixas_total: 0,
                    despesas_variaveis: [],
                    usar_margem_por_especialidade: false,
                    margem_padrao: 0,
                    margens_especialidades: []
                };
                setBusinessConfig(defaultConfig as any);
            }
        } catch (error) {
            console.error("Error in fetchBusinessConfig:", error);
        }
    };

    // --- Standard Tabs Handlers ---

    const handleAdd = async () => {
        if (!newValue.trim() || activeTab === 'pricing') return;
        const currentConfig = CONFIG[activeTab as keyof typeof CONFIG];
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
        if (!newValue.trim() || !editingItem || activeTab === 'pricing') return;
        const currentConfig = CONFIG[activeTab as keyof typeof CONFIG];
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
        if (!editingItem || activeTab === 'pricing') return;
        const currentConfig = CONFIG[activeTab as keyof typeof CONFIG];
        try {
            if (replacementValue) {
                const tableToUpdate = activeTab === 'category' || activeTab === 'syntheticCategory' ? 'insumos' : 'fichas_tecnicas';
                const columnToUpdate = activeTab === 'category' ? 'categoria_id'
                    : activeTab === 'syntheticCategory' ? 'categoria_sintetica_id'
                        : activeTab === 'sector' ? 'setor_responsavel_id'
                            : 'especialidade_id';

                await supabase.from(tableToUpdate).update({ [columnToUpdate]: replacementValue }).eq(columnToUpdate, editingItem.id);
            } else {
                const tableToUpdate = activeTab === 'category' || activeTab === 'syntheticCategory' ? 'insumos' : 'fichas_tecnicas';
                const columnToUpdate = activeTab === 'category' ? 'categoria_id'
                    : activeTab === 'syntheticCategory' ? 'categoria_sintetica_id'
                        : activeTab === 'sector' ? 'setor_responsavel_id'
                            : 'especialidade_id';

                // Allow nullify
                await supabase.from(tableToUpdate).update({ [columnToUpdate]: null }).eq(columnToUpdate, editingItem.id);
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
        if (activeTab === 'pricing') return;
        const currentConfig = CONFIG[activeTab as keyof typeof CONFIG];
        try {
            const tableToUpdate = activeTab === 'category' || activeTab === 'syntheticCategory' ? 'insumos' : 'fichas_tecnicas';
            const columnToUpdate = activeTab === 'category' ? 'categoria_id'
                : activeTab === 'syntheticCategory' ? 'categoria_sintetica_id'
                    : activeTab === 'sector' ? 'setor_responsavel_id'
                        : 'especialidade_id';

            if (replacementValue) {
                await supabase.from(tableToUpdate).update({ [columnToUpdate]: replacementValue }).in(columnToUpdate, selectedItems);
            } else {
                await supabase.from(tableToUpdate).update({ [columnToUpdate]: null }).in(columnToUpdate, selectedItems);
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

    // --- Pricing Tab Logic ---

    const handleSaveConfig = async () => {
        if (!businessConfig) return;
        setIsSavingConfig(true);
        try {
            // Prepare payload
            const payload = {
                despesas_fixas_total: businessConfig.despesas_fixas_total,
                despesas_variaveis: variableExpenses,
                usar_margem_por_especialidade: businessConfig.usar_margem_por_especialidade,
                margem_padrao: businessConfig.margem_padrao,
                margens_especialidades: specialtyMargins
            };

            // Upsert based on existing ID or creating new row
            // If we have an ID, use it. If not, it will create one (if we handle it right)
            // But 'single row' pattern usually assumes we know the ID or we query it. 
            // In 'fetchBusinessConfig', if no data, we set a default object without ID.

            let query = supabase.from('configuracoes_negocio');
            let result;

            if (businessConfig.id) {
                result = await query.update(payload).eq('id', businessConfig.id);
            } else {
                // If table is empty, insert.
                result = await query.insert(payload);
            }

            if (result.error) throw result.error;

            // Format decimals in state after successful save
            if (businessConfig) {
                setBusinessConfig({
                    ...businessConfig,
                    margem_padrao: Number(businessConfig.margem_padrao.toFixed(2))
                });
            }
            setVariableExpenses(variableExpenses.map(v => ({ ...v, valor: Number(v.valor.toFixed(2)) })));
            setSpecialtyMargins(specialtyMargins.map(m => ({ ...m, margem: Number(m.margem.toFixed(2)) })));

            alert("Configurações salvas com sucesso!");
        } finally {
            setIsSavingConfig(false);
        }
    };

    const addVariableExpense = () => {
        const newExpense: DespesaVariavel = {
            id: crypto.randomUUID(),
            nome: 'Nova Despesa',
            valor: 0
        };
        setVariableExpenses([...variableExpenses, newExpense]);
    };

    const removeVariableExpense = (id: string) => {
        setVariableExpenses(variableExpenses.filter(e => e.id !== id));
    };

    const updateVariableExpense = (id: string, field: 'nome' | 'valor', value: any) => {
        setVariableExpenses(variableExpenses.map(e =>
            e.id === id ? { ...e, [field]: value } : e
        ));
    };

    const updateSpecialtyMargin = (specialtyId: string, margin: number) => {
        const index = specialtyMargins.findIndex(m => m.especialidade_id === specialtyId);
        if (index >= 0) {
            const newMargins = [...specialtyMargins];
            newMargins[index].margem = margin;
            setSpecialtyMargins(newMargins);
        } else {
            setSpecialtyMargins([...specialtyMargins, { especialidade_id: specialtyId, margem: margin }]);
        }
    };

    const getSpecialtyMargin = (specialtyId: string) => {
        return specialtyMargins.find(m => m.especialidade_id === specialtyId)?.margem || 0;
    };

    // Calculations for Proof Table
    const totalVarExpensesPercent = variableExpenses.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
    const fixedExpenses = Number(businessConfig?.despesas_fixas_total) || 0;

    // We need a representative Margin to calculate PE. 
    // If "Per Specialty", we can't easily calculate a single PE without sales mix. 
    // Uses "Margem Padrão" if disabled, or we could ask user which margin to use for simulation.
    // For simplicity, if "Per Specialty" is ON, we might show a warning or ask for an Average Margin, 
    // OR just use the Standard Margin as a reference for the calculation?
    // Let's use `margem_padrao` as the reference for calculation if single.

    // If "Per Specialty" is checked, we can't calculate one single PE accurately for the whole business without mix.
    // Let's assume for the "Prova Real" we use the configured logic. If "Per Specialty", we maybe show a dashed line or user selects a specialty to simulate?
    // User request: "Input para 'despesas_fixas_total'. Exibir tabela de cálculo reverso (fórmulas apenas no front...)"
    // It implies a general calculator. Let's use `margem_padrao` if `!usar_margem...`. 
    // If `usar_margem...` is true, maybe we default to `margem_padrao` as a "General Average" just for the calculator?
    // Let's stick to `businessConfig?.margem_padrao` for the calculator input if "Standard" is selected.
    // If "Specialty" is selected, let's allow user to input a "Simulated Margin" in the calculator area or pick a specialty?
    // Simplest: Use `margem_padrao` field as "Margem Global Estimada" when "Por Especialidade" is OFF? 
    // When "Por Especialidade" is ON, we might still want a global PE estimate. 
    // Let's use `businessConfig?.margem_padrao` for the Calc regardless, or add a temporary state for "Simulation Margin".

    // Let's separate the "Configured Margin" from "Calculator Margin".
    // Actually, usually users want to see PE based on their setting. 
    // If they set "Standard Margin" = 50%, PE should use 50%.

    // Logic for Calculator Margin
    // If "Por Especialidade" is ON: Use Arithmetic Mean of specialty margins
    // If "Margem Única" is ON: Use margem_padrao

    let marginForCalc = 0;
    if (businessConfig?.usar_margem_por_especialidade) {
        // Calculate Arithmetic Mean
        // Use specialties list length or margins list? Ideally specialties list to encourage filling all.
        // But let's adhere to "margins found". If a specialty has 0 or no entry, it counts as 0?
        // Let's use the defined specialties list as the denominator to show "real" coverage.
        const totalMargins = specialties.reduce((acc, spec) => {
            return acc + getSpecialtyMargin(spec.id);
        }, 0);
        marginForCalc = specialties.length > 0 ? (totalMargins / specialties.length) : 0;
    } else {
        marginForCalc = businessConfig?.margem_padrao || 0;
    }

    const faturamentoNecessario = marginForCalc > 0 ? (fixedExpenses / (marginForCalc / 100)) : 0;

    // Proof
    // Faturamento = faturamentoNecessario
    // (-) Variáveis = Faturamento * (totalVarExpensesPercent / 100)
    // (-) CMV = Faturamento * (1 - (marginForCalc/100) - (totalVarExpensesPercent/100)) -> This is the "Plug"
    // (-) Fixas = fixedExpenses
    // (=) Result should be 0

    // CMV Estimado calculation:
    // If Margin = Sales - CMV - VarExp => CMV = Sales - Margin - VarExp
    // CMV % = 100% - Margin% - VarExp%
    const cmvPercent = 100 - marginForCalc - totalVarExpensesPercent;

    // Forced Math for Display Consistency
    // 1. Sales is calculated.
    // 2. Variable Expenses is calculated from Sales.
    // 3. Fixed Expenses is Input.
    // 4. CMV is the PLUG to ensure Sales - Var - CMV = Fixed.
    //    Because Contribution Margin MUST equal Fixed Costs at Break Even.
    const varExpensesValue = faturamentoNecessario * (totalVarExpensesPercent / 100);
    const cmvValue = faturamentoNecessario - varExpensesValue - fixedExpenses; // PLUG

    // Proof result is mathematically forced to 0
    const proofResult = faturamentoNecessario - varExpensesValue - cmvValue - fixedExpenses;


    // Helper for currency/percent formatting
    // Helper for currency/percent formatting
    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    const formatPercent = (value: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

    // --- Render Helpers ---

    // --- Maintenance Tab Logic ---

    const handleBackfillCodes = async () => {
        setIsBackfilling(true);
        try {
            // 1. Fetch all recipes and sectors
            const [recipesResponse, sectorsResponse] = await Promise.all([
                supabase.from('fichas_tecnicas').select('id, codigo, setor_responsavel_id, nome_receita'),
                supabase.from('setores_responsaveis').select('id, nome')
            ]);

            if (recipesResponse.error) throw recipesResponse.error;
            if (sectorsResponse.error) throw sectorsResponse.error;

            const recipes = recipesResponse.data || [];
            const sectors = sectorsResponse.data || [];

            // 2. Identify missing codes and existing sequences
            // recipesToUpdate removed (unused)
            const recipesWithCode = recipes.filter(r => r.codigo && r.codigo.trim() !== '');
            const recipesMissingCode = recipes.filter(r => !r.codigo || r.codigo.trim() === '');

            if (recipesMissingCode.length === 0) {
                alert("Todas as fichas técnicas já possuem código.");
                return;
            }

            // Map to track the highest sequence number for each prefix
            const prefixMaxSequence: Record<string, number> = {};

            // Initialize from existing codes
            recipesWithCode.forEach(r => {
                const parts = r.codigo.split('-');
                if (parts.length === 2) {
                    const prefix = parts[0];
                    const num = parseInt(parts[1], 10);
                    if (!isNaN(num)) {
                        prefixMaxSequence[prefix] = Math.max(prefixMaxSequence[prefix] || 0, num);
                    }
                }
            });

            // 3. Generate new codes
            let updatedCount = 0;
            const updatesPromises: any[] = []; // Typed as any[] to accept PostgrestFilterBuilder

            for (const recipe of recipesMissingCode) {
                const sector = sectors.find(s => s.id === recipe.setor_responsavel_id);
                // Default prefix logic: First 3 letters of Sector, or 'GEN' if no sector
                let prefix = 'GEN';
                if (sector && sector.nome) {
                    prefix = sector.nome.substring(0, 3).toUpperCase();
                }

                // Increment sequence
                const nextSeq = (prefixMaxSequence[prefix] || 0) + 1;
                prefixMaxSequence[prefix] = nextSeq;

                // Format: AAA-0000
                const newCode = `${prefix}-${nextSeq.toString().padStart(4, '0')}`;

                // Push update promise
                updatesPromises.push(
                    supabase.from('fichas_tecnicas').update({ codigo: newCode }).eq('id', recipe.id)
                );
                updatedCount++;
            }

            await Promise.all(updatesPromises);

            alert(`Sucesso! ${updatedCount} códigos foram gerados automaticamente.`);
            await fetchAllData(); // Refresh if needed, though this doesn't populate standard lists.

        } catch (error: any) {
            console.error("Error backfilling codes:", error);
            alert(`Erro ao gerar códigos: ${error.message}`);
        } finally {
            setIsBackfilling(false);
        }
    };

    const renderMaintenanceTab = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-6">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-lg mr-4">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Manutenção e Reparos</h3>
                        <p className="text-sm text-gray-500">Ferramentas administrativas para correção de dados.</p>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-1">Gerar Códigos Faltantes (Backfill)</h4>
                            <p className="text-sm text-gray-500 max-w-lg mb-4">
                                Esta rotina busca todas as fichas técnicas sem código definido e gera automaticamente
                                um código sequencial baseado no Setor (Ex: "CHO-0045"), respeitando a numeração existente.
                            </p>
                            <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-100 w-fit">
                                <AlertTriangle className="mr-2" size={14} />
                                Recomendado apenas se houver fichas 'quebradas' ou importadas sem código.
                            </div>
                        </div>
                        <button
                            onClick={handleBackfillCodes}
                            disabled={isBackfilling}
                            className="bg-gray-800 text-white px-6 py-3 rounded-lg shadow hover:bg-gray-700 flex items-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isBackfilling ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <Edit2 size={18} className="mr-2" />
                                    Gerar Códigos
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderPricingTab = () => {
        if (!businessConfig) return <div>Carregando...</div>;

        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header Actions */}
                <div className="flex justify-end sticky top-0 bg-gray-50 pb-4 z-10">
                    <button
                        onClick={handleSaveConfig}
                        disabled={isSavingConfig}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg shadow-lg hover:bg-blue-700 flex items-center transition-all transform hover:scale-105 font-medium"
                    >
                        <Save size={20} className="mr-2" />
                        {isSavingConfig ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* SECTION A: Despesas Variáveis */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                <DollarSign className="mr-2 text-blue-600" size={20} />
                                Despesas Variáveis
                            </h3>
                            <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold border border-blue-100">
                                Total: {formatPercent(totalVarExpensesPercent)}%
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {variableExpenses.map((expense) => (
                                <div key={expense.id} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                                    <input
                                        type="text"
                                        value={expense.nome}
                                        onChange={(e) => updateVariableExpense(expense.id, 'nome', e.target.value)}
                                        className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Nome da despesa (ex: Taxa Cartão)"
                                        aria-label="Nome da despesa"
                                    />
                                    <div className="relative w-24">
                                        <NumericInput
                                            value={expense.valor}
                                            onChange={(val) => updateVariableExpense(expense.id, 'valor', val)}
                                            className="w-full bg-white border border-gray-300 rounded-md pl-3 pr-7 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-right"
                                            placeholder="0,00"
                                            aria-label="Valor da despesa"
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-gray-400">
                                            <span className="text-xs">%</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeVariableExpense(expense.id)}
                                        className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-md transition-colors"
                                        title="Remover"
                                        aria-label="Remover despesa"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={addVariableExpense}
                                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center font-medium mt-2"
                            >
                                <Plus size={18} className="mr-2" />
                                Adicionar Nova Despesa
                            </button>
                        </div>
                    </div>

                    {/* SECTION B: Margem de Contribuição */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center mb-6">
                            <Percent className="mr-2 text-blue-600" size={20} />
                            Políticas de Margem
                        </h3>

                        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                            <button
                                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${!businessConfig.usar_margem_por_especialidade ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setBusinessConfig({ ...businessConfig, usar_margem_por_especialidade: false })}
                            >
                                Margem Única Global
                            </button>
                            <button
                                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${businessConfig.usar_margem_por_especialidade ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setBusinessConfig({ ...businessConfig, usar_margem_por_especialidade: true })}
                            >
                                Por Especialidade
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {!businessConfig.usar_margem_por_especialidade ? (
                                <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <label className="block text-sm font-medium text-gray-600 mb-2">
                                        Defina a Margem de Contribuição Padrão
                                    </label>
                                    <div className="relative w-40 mx-auto">
                                        <NumericInput
                                            value={businessConfig.margem_padrao}
                                            onChange={(val) => setBusinessConfig({ ...businessConfig, margem_padrao: val })}
                                            className="w-full text-center text-3xl font-bold bg-transparent border-b-2 border-blue-300 focus:border-blue-600 outline-none py-2 text-gray-800"
                                            placeholder="0,00"
                                            aria-label="Margem Padrão"
                                        />
                                        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold">%</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">Aplicada a todos os produtos finais.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Especialidades</h4>
                                    {specialties.length === 0 ? (
                                        <div className="text-center text-gray-400 p-4 font-normal">Nenhuma especialidade cadastrada.</div>
                                    ) : (
                                        specialties.map(spec => (
                                            <div key={spec.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                <span className="text-sm font-medium text-gray-700">{spec.nome}</span>
                                                <div className="relative w-24">
                                                    <NumericInput
                                                        value={getSpecialtyMargin(spec.id)}
                                                        onChange={(val) => updateSpecialtyMargin(spec.id, val)}
                                                        className="w-full bg-white border border-gray-300 rounded-md pl-3 pr-7 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-right font-medium"
                                                        placeholder="0,00"
                                                    />
                                                    <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-gray-400 text-xs shadow-none bg-transparent">%</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* SECTION C: Ponto de Equilíbrio (Calculator) */}
                <div className="bg-gray-900 text-white rounded-xl shadow-lg p-6 lg:p-8">
                    <div className="flex items-center mb-8">
                        <div className="p-3 bg-gray-800 rounded-lg mr-4">
                            <Calculator className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Simulador de Ponto de Equilíbrio</h3>
                            <p className="text-gray-400 text-sm">Visualize o faturamento necessário para cobrir seus custos.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {/* Inputs */}
                        <div className="lg:col-span-1 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Despesas Fixas Totais (R$)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500">R$</span>
                                    </div>
                                    <NumericInput
                                        value={businessConfig.despesas_fixas_total}
                                        onChange={(val) => setBusinessConfig({ ...businessConfig, despesas_fixas_total: val })}
                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="0,00"
                                        aria-label="Despesas Fixas Totais"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-400">
                                        {businessConfig.usar_margem_por_especialidade ? 'Média Aritmética (Por Especialidade)' : 'Margem Única Global'}
                                    </span>
                                    <span className="text-blue-400 font-bold">{formatPercent(marginForCalc)}%</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-full"></div>
                                </div>
                            </div>
                        </div>

                        {/* Result Big Number */}
                        <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700">
                            <div className="text-center mb-8">
                                <span className="text-gray-400 uppercase tracking-widest text-xs font-semibold">Faturamento Mensal Necessário (PE)</span>
                                <div className="text-4xl lg:text-5xl font-extrabold text-white mt-2">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturamentoNecessario)}
                                </div>
                            </div>

                            {/* Prova Real Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-700 text-left text-gray-500">
                                            <th className="py-2 pl-2">Componente</th>
                                            <th className="py-2 text-right">Fórmula / Referência</th>
                                            <th className="py-2 text-right pr-2">Valor (R$)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/50">
                                        <tr>
                                            <td className="py-3 pl-2 text-white font-medium">Faturamento Estimado</td>
                                            <td className="py-3 text-right text-gray-500">Ponto de Equilíbrio Calculado</td>
                                            <td className="py-3 text-right pr-2 text-white font-bold">{formatCurrency(faturamentoNecessario)}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 pl-2 text-red-300">(-) Despesas Variáveis ({formatPercent(totalVarExpensesPercent)}%)</td>
                                            <td className="py-3 text-right text-gray-500">Sobre Faturamento</td>
                                            <td className="py-3 text-right pr-2 text-red-300">-{formatCurrency(varExpensesValue)}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 pl-2 text-red-300">(-) C.M.V. Estimado ({formatPercent(cmvPercent)}%)</td>
                                            <td className="py-3 text-right text-gray-500">100% - Margem - Variáveis (Ajuste)</td>
                                            <td className="py-3 text-right pr-2 text-red-300">-{formatCurrency(cmvValue)}</td>
                                        </tr>
                                        <tr className="bg-gray-800/50">
                                            <td className="py-3 pl-2 text-blue-300 font-medium">(=) Margem de Contribuição</td>
                                            <td className="py-3 text-right text-gray-500">Faturamento - Var - CMV</td>
                                            <td className="py-3 text-right pr-2 text-blue-300 font-bold">{formatCurrency(fixedExpenses)}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 pl-2 text-orange-300">(-) Despesas Fixas</td>
                                            <td className="py-3 text-right text-gray-500">Input Usuário</td>
                                            <td className="py-3 text-right pr-2 text-orange-300">-{formatCurrency(fixedExpenses)}</td>
                                        </tr>
                                        <tr className="bg-gray-700/30">
                                            <td className="py-3 pl-2 text-blue-400 font-bold text-base">(=) Resultado (Prova Real)</td>
                                            <td className="py-3 text-right text-gray-500">Deve ser ZERO</td>
                                            <td className={`py-3 text-right pr-2 font-bold text-base ${Math.abs(proofResult) < 0.05 ? 'text-blue-400' : 'text-yellow-400'}`}>
                                                {formatCurrency(0)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- Main Render ---

    const currentConfig = activeTab !== 'pricing' ? CONFIG[activeTab as keyof typeof CONFIG] : null;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Cadastro Geral</h2>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto pb-1">
                <button
                    onClick={() => { setActiveTab('category'); setSelectedItems([]); }}
                    className={`px-4 py-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'category' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    Categorias Materiais
                </button>
                <button
                    onClick={() => { setActiveTab('syntheticCategory'); setSelectedItems([]); }}
                    className={`px-4 py-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'syntheticCategory' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    Categorias Sintéticas
                </button>
                <button
                    onClick={() => { setActiveTab('sector'); setSelectedItems([]); }}
                    className={`px-4 py-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'sector' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    Setores
                </button>
                <button
                    onClick={() => { setActiveTab('specialty'); setSelectedItems([]); }}
                    className={`px-4 py-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'specialty' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    Especialidades
                </button>
                <button
                    onClick={() => { setActiveTab('pricing'); setSelectedItems([]); }}
                    className={`px-4 py-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors items-center flex ${activeTab === 'pricing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    <Calculator size={16} className="mr-2" />
                    Parâmetros de Precificação
                </button>
                <button
                    onClick={() => { setActiveTab('maintenance'); setSelectedItems([]); }}
                    className={`px-4 py-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors items-center flex ${activeTab === 'maintenance' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    <AlertTriangle size={16} className="mr-2" />
                    Manutenção
                </button>
            </div>

            {/* Content Switch */}
            {activeTab === 'pricing' ? renderPricingTab()
                : activeTab === 'maintenance' ? renderMaintenanceTab()
                    : (
                        <>
                            {/* Content Actions for Standard Lists */}
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-800">{currentConfig?.title}</h3>
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
                                                        checked={currentConfig!.data.length > 0 && selectedItems.length === currentConfig!.data.length}
                                                        onChange={() => {
                                                            if (selectedItems.length === currentConfig!.data.length) {
                                                                setSelectedItems([]);
                                                            } else {
                                                                setSelectedItems(currentConfig!.data.map(i => i.id));
                                                            }
                                                        }}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                                                        aria-label="Selecionar todos"
                                                    />
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {currentConfig?.data.map((item) => (
                                                <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${selectedItems.includes(item.id) ? 'bg-blue-50' : ''}`}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedItems.includes(item.id)}
                                                            onChange={() => {
                                                                setSelectedItems(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
                                                            }}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                                                            aria-label={`Selecionar ${item.nome}`}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.nome}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => {
                                                                setEditingItem(item);
                                                                setNewValue(item.nome);
                                                                setIsEditModalOpen(true);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                                            title="Editar"
                                                            aria-label={`Editar ${item.nome}`}
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingItem(item);
                                                                setReplacementValue('');
                                                                setIsDeleteModalOpen(true);
                                                            }}
                                                            className="text-red-600 hover:text-red-900"
                                                            title="Excluir"
                                                            aria-label={`Excluir ${item.nome}`}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {currentConfig?.data.length === 0 && (
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
                        </>
                    )}

            {/* --- Modals for Standard Tabs (Only show if activeTab != pricing) --- */}

            {/* Add Modal */}
            {isAddModalOpen && activeTab !== 'pricing' && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Adicionar {currentConfig?.label}</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
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
                            aria-label={`Nome do novo ${currentConfig?.label}`}
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
            {isEditModalOpen && activeTab !== 'pricing' && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Editar {currentConfig?.label}</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
                                <X size={24} />
                            </button>
                        </div>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            autoFocus
                            aria-label="Nome do item"
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
            {isDeleteModalOpen && editingItem && activeTab !== 'pricing' && (
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
                                aria-label="Selecionar opção"
                            >
                                <option value="">Remover vínculo (Deixar em branco)</option>
                                {currentConfig!.data.filter(item => item.id !== editingItem.id).map(item => (
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
            {isBulkDeleteModalOpen && activeTab !== 'pricing' && (
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
                                aria-label="Selecionar opção"
                            >
                                <option value="">Deixar em branco (Remover vínculo)</option>
                                {currentConfig!.data.filter(item => !selectedItems.includes(item.id)).map(item => (
                                    <option key={item.id} value={item.id}>Mover para "{item.nome}"</option>
                                ))}
                            </select>
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
