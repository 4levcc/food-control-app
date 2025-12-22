import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Trash2, Copy, FileSpreadsheet, FileText, Clock, Pencil } from 'lucide-react';
import { RecipeEditor } from '../components/RecipeEditor'; // UPDATED IMPORT
import { ExportRecipeModal } from '../components/ExportRecipeModal';
import { exportRecipePDF } from '../utils/pdfGenerator';
import { SubstitutionModal } from '../components/SubstitutionModal';
import { supabase } from '../lib/supabase';
import type { FichaTecnica, Insumo, UnidadeMedida, SetorResponsavel, Especialidade, Dificuldade, FtIngrediente } from '../types';
import * as XLSX from 'xlsx';



export function Recipes() {
    const [recipes, setRecipes] = useState<FichaTecnica[]>([]);
    const [ftIngredientes, setFtIngredientes] = useState<FtIngrediente[]>([]);

    // Lookups
    const [insumos, setInsumos] = useState<Insumo[]>([]);
    const [unidades, setUnidades] = useState<UnidadeMedida[]>([]);
    const [setores, setSetores] = useState<SetorResponsavel[]>([]);
    const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
    const [dificuldades, setDificuldades] = useState<Dificuldade[]>([]);

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSector, setSelectedSector] = useState('all');
    const [selectedType, setSelectedType] = useState<'all' | 'Base' | 'Final'>('all');
    const [editingRecipe, setEditingRecipe] = useState<FichaTecnica | undefined>(undefined);
    const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [recipeToExport, setRecipeToExport] = useState<FichaTecnica | null>(null);

    // Add navigation hook
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [
                recipesRes,
                ftIngRes,
                insumosRes,
                unidadesRes,
                setoresRes,
                espRes,
                difRes
            ] = await Promise.all([
                supabase.from('fichas_tecnicas').select('*').order('nome_receita'),
                supabase.from('ft_ingredientes').select('*'),
                supabase.from('insumos').select('*'),
                supabase.from('unidades_medida').select('*').order('sigla'),
                supabase.from('setores_responsaveis').select('*').order('nome'),
                supabase.from('especialidades').select('*').order('nome'),
                supabase.from('dificuldades').select('*').order('nome')
            ]);

            if (recipesRes.data) setRecipes(recipesRes.data);
            if (ftIngRes.data) setFtIngredientes(ftIngRes.data);
            if (insumosRes.data) setInsumos(insumosRes.data);
            if (unidadesRes.data) setUnidades(unidadesRes.data);
            if (setoresRes.data) setSetores(setoresRes.data);
            if (espRes.data) setEspecialidades(espRes.data);
            if (difRes.data) setDificuldades(difRes.data);

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const calculateCost = (recipeId: string) => {
        const ingredients = ftIngredientes.filter(ft => ft.ft_id === recipeId);
        let total = 0;
        ingredients.forEach(ing => {
            const insumo = insumos.find(i => i.id === ing.insumo_id);
            if (insumo) {
                const cost = insumo.custo_compra || 0;
                const qty = insumo.quantidade_compra || 1;
                const weight = insumo.peso_unidade || 1;
                const factor = insumo.fator_correcao || 1;

                const costPerPurchaseUnit = qty > 0 ? cost / qty : 0;
                const costPerBaseUnit = weight > 0 ? costPerPurchaseUnit / weight : 0;
                const realUnitCost = costPerBaseUnit * factor;

                total += realUnitCost * (ing.quantidade_utilizada || 0);
            }
        });
        return total;
    };

    const handleSave = async (recipeData: Partial<FichaTecnica>, ingredientsList: Partial<FtIngrediente>[]) => {
        try {
            let recipeId = editingRecipe?.id;

            // 1. Calculate Cost (Needed for Insumo creation, but NOT for Recipe DB insert)
            const calculatedCost = ingredientsList.reduce((acc, curr) => {
                const ing = insumos.find(i => i.id === curr.insumo_id);
                if (!ing) return acc;

                const cost = ing.custo_compra || 0;
                const qty = ing.quantidade_compra || 1;
                const weight = ing.peso_unidade || 1;
                const factor = ing.fator_correcao || 1;

                const costPerPurchaseUnit = qty > 0 ? cost / qty : 0;
                const costPerBaseUnit = weight > 0 ? costPerPurchaseUnit / weight : 0;
                const realUnitCost = costPerBaseUnit * factor;

                return acc + (realUnitCost * (curr.quantidade_utilizada || 0));
            }, 0);

            // 2. Sanitation - STRICTLY allowed DB columns only
            // Excludes: custo_total_estimado, cmv_estimado (Calculated by trigger/view or just unused)
            // UPDATED: Now includes preco_venda
            const recipePayload = {
                nome_receita: recipeData.nome_receita,
                tipo_produto: recipeData.tipo_produto,
                setor_responsavel_id: recipeData.setor_responsavel_id || null,
                especialidade_id: recipeData.especialidade_id || null,
                dificuldade_id: recipeData.dificuldade_id || null,
                codigo_id: recipeData.codigo_id || null,
                tempo_preparo: recipeData.tempo_preparo || null,
                rendimento_kg: isNaN(Number(recipeData.rendimento_kg)) ? 0 : Number(recipeData.rendimento_kg),
                e_insumo: recipeData.tipo_produto === 'Base',
                observacoes: recipeData.observacoes || null,
                custo_total_estimado: calculatedCost || 0,
                preco_venda: recipeData.preco_venda || null,
                cmv_produto_valor: recipeData.cmv_produto_valor || null,
                cmv_produto_percent: recipeData.cmv_produto_percent || null
            };

            // console.log('Sending Sanitized Payload (Recipe):', recipePayload);

            // 3. Save Recipe
            let savedRecipe: FichaTecnica | null = null;
            if (recipeId) {
                const { data, error } = await supabase.from('fichas_tecnicas').update(recipePayload).eq('id', recipeId).select().single();
                if (error) throw error;
                savedRecipe = data;
            } else {
                const { data, error } = await supabase.from('fichas_tecnicas').insert(recipePayload).select().single();
                if (error) throw error;
                savedRecipe = data;
                recipeId = data.id;
            }

            if (!recipeId || !savedRecipe) throw new Error('Failed to get recipe ID');
            // console.log('Recipe Saved. ID:', recipeId, 'Type:', savedRecipe.tipo_produto);

            // 4. Save Ingredients Relation
            const { error: deleteError } = await supabase.from('ft_ingredientes').delete().eq('ft_id', recipeId);
            if (deleteError) throw deleteError;

            if (ingredientsList.length > 0) {
                const toInsert = ingredientsList.map(ing => ({
                    ft_id: recipeId!,
                    insumo_id: ing.insumo_id!,
                    quantidade_utilizada: ing.quantidade_utilizada!,
                    unidade_utilizada_id: ing.unidade_utilizada_id!,
                    dica_uso: ing.dica_uso
                }));
                const { error: insertError } = await supabase.from('ft_ingredientes').insert(toInsert);
                if (insertError) throw insertError;
            }

            // 5. Automation: Base Recipe -> Insumo
            // console.log('Checking Automation for Type:', savedRecipe.tipo_produto);

            if (savedRecipe.tipo_produto === 'Base') {
                // console.log('Verificação: PRODUTO BASE. Iniciando Try/Catch para criar Insumo...');
                try {
                    // Find or Create 'Insumo de produção própria' category
                    let synthCatId = null;
                    // console.log('Buscando Categoria Sintética...');

                    const { data: synthCats } = await supabase
                        .from('categorias_sinteticas')
                        .select('id')
                        .eq('nome', 'Insumo de produção própria')
                        .maybeSingle();

                    if (synthCats) {
                        synthCatId = synthCats.id;
                        // console.log('Categoria encontrada:', synthCatId);
                    } else {
                        // console.log('Categoria não encontrada. Criando...');
                        const { data: newSynth, error: synthError } = await supabase
                            .from('categorias_sinteticas')
                            .insert({ nome: 'Insumo de produção própria' })
                            .select('id')
                            .single();

                        if (synthError) {
                            console.error('Erro ao criar Categoria Sintética:', synthError);
                        } else if (newSynth) {
                            synthCatId = newSynth.id;
                            // console.log('Nova Categoria Criada:', synthCatId);
                        }
                    }

                    // Check for existing Insumo to update instead of erroring
                    const { data: existingInsumo } = await supabase
                        .from('insumos')
                        .select('id')
                        .eq('nome_padronizado', savedRecipe.nome_receita)
                        .maybeSingle();

                    const insumoPayload = {
                        nome_padronizado: savedRecipe.nome_receita,
                        descricao_produto: savedRecipe.nome_receita, // Mapped from Recipe Name
                        categoria_id: null,
                        categoria_sintetica_id: synthCatId,
                        custo_compra: calculatedCost, // Use calculated cost from Step 1
                        quantidade_compra: 1,
                        peso_unidade: (savedRecipe.rendimento_kg || 0) * 1000, // Converted to Grams
                        unidade_compra_id: unidades.find(u => ['un', 'und'].includes(u.sigla.toLowerCase()))?.id || unidades[0]?.id,
                        unidade_peso_id: unidades.find(u => ['g', 'gr'].includes(u.sigla.toLowerCase()))?.id || unidades[0]?.id,
                        fator_correcao: 1
                    };

                    // console.log('Payload Insumo:', insumoPayload);

                    if (existingInsumo) {
                        // console.log('Atualizando Insumo Existente:', existingInsumo.id);
                        await supabase.from('insumos').update(insumoPayload).eq('id', existingInsumo.id);
                    } else {
                        // console.log('Criando Novo Insumo...');
                        await supabase.from('insumos').insert(insumoPayload);
                    }

                    // console.log('Insumo processado com sucesso.');
                    alert('Receita Base salva e Insumo criado/atualizado com sucesso! Redirecionando...');
                    navigate('/insumos');
                    return;

                } catch (autoErr) {
                    console.error('CRITICAL: Erro no bloco de automação do Insumo:', autoErr);
                    alert('Receita salva, mas houve erro ao criar o Insumo automático. Verifique o console.');
                    // Don't return, let it fall through or just stay here.
                }
            } else {
                // console.log('Produto Final. Redirecionando...');
                alert('Ficha Técnica de Produto Final salva com sucesso!');
                navigate('/produtos-finais');
                return;
            }

            // Reset Editor (Fallback if types don't match or logic falls through)
            fetchData();
            setIsEditorOpen(false);
            setEditingRecipe(undefined);

        } catch (error: any) {
            console.error('Error saving recipe:', error);
            alert(`Erro ao salvar ficha técnica: ${error.message || JSON.stringify(error)}`);
        }
    };

    const [recipeToDelete, setRecipeToDelete] = useState<FichaTecnica | null>(null);
    const [deletionUsageCount, setDeletionUsageCount] = useState(0);
    const [deletionStep, setDeletionStep] = useState<'confirm' | 'substitute' | null>(null);

    const handleDeleteClick = async (recipe: FichaTecnica) => {
        setRecipeToDelete(recipe);

        // 1. Check if Base
        if (recipe.tipo_produto === 'Base') {
            try {
                // Find associated Insumo
                const { data: insumo } = await supabase
                    .from('insumos')
                    .select('id')
                    .eq('nome_padronizado', recipe.nome_receita)
                    .maybeSingle();

                if (insumo) {
                    // Check usage
                    const { count, error } = await supabase
                        .from('ft_ingredientes')
                        .select('id', { count: 'exact', head: true })
                        .eq('insumo_id', insumo.id);

                    if (error) throw error;

                    const usage = count || 0;
                    if (usage > 0) {
                        setDeletionUsageCount(usage);
                        setDeletionStep('substitute');
                        return;
                    }
                }
            } catch (error) {
                console.error("Error checking deletion safety", error);
            }
        }

        // Default: Simple Confirm
        setDeletionStep('confirm');
    };

    const executeDelete = async (substituteId?: string) => {
        if (!recipeToDelete) return;

        try {
            // If substitution required
            if (substituteId && recipeToDelete.tipo_produto === 'Base') {
                const { data: insumo } = await supabase
                    .from('insumos')
                    .select('id')
                    .eq('nome_padronizado', recipeToDelete.nome_receita)
                    .single();

                if (insumo) {
                    // Update references
                    const { error: updateError } = await supabase
                        .from('ft_ingredientes')
                        .update({ insumo_id: substituteId })
                        .eq('insumo_id', insumo.id);
                    if (updateError) throw updateError;

                    // Delete the old insumo
                    await supabase.from('insumos').delete().eq('id', insumo.id);
                }
            } else if (recipeToDelete.tipo_produto === 'Base') {
                // Base product but no usage: Try to delete associated insumo to keep clean
                await supabase
                    .from('insumos')
                    .delete()
                    .eq('nome_padronizado', recipeToDelete.nome_receita);
            }

            // Delete Recipe
            const { error } = await supabase.from('fichas_tecnicas').delete().eq('id', recipeToDelete.id);
            if (error) throw error;

            setRecipes(prev => prev.filter(r => r.id !== recipeToDelete.id));
            setFtIngredientes(prev => prev.filter(ft => ft.ft_id !== recipeToDelete.id));

            // Clean up
            setRecipeToDelete(null);
            setDeletionStep(null);
            alert('Excluído com sucesso!');

        } catch (error) {
            console.error(error);
            alert('Erro ao excluir: ' + (error as any).message);
        }
    };

    const handleDuplicate = async (recipe: FichaTecnica) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, data_criacao, codigo_id, ...rest } = recipe;

        const ings = ftIngredientes.filter(ft => ft.ft_id === id);

        try {
            const { data: newRecipe, error } = await supabase.from('fichas_tecnicas').insert({
                ...rest,
                nome_receita: `${recipe.nome_receita} (Cópia)`
            }).select().single();

            if (error) throw error;

            if (ings.length > 0) {
                const ingsToInsert = ings.map(ing => ({
                    ft_id: newRecipe.id,
                    insumo_id: ing.insumo_id,
                    quantidade_utilizada: ing.quantidade_utilizada,
                    unidade_utilizada_id: ing.unidade_utilizada_id,
                    dica_uso: ing.dica_uso
                }));
                await supabase.from('ft_ingredientes').insert(ingsToInsert);
            }

            fetchData();
        } catch (error) {
            console.error('Duplicate error', error);
        }
    };

    const handleBulkDelete = async () => {
        try {
            const { error } = await supabase.from('fichas_tecnicas').delete().in('id', selectedRecipes);
            if (error) throw error;
            fetchData();
            setSelectedRecipes([]);
            setShowDeleteConfirm(false);
        } catch (error) {
            console.error(error);
            alert('Erro na exclusão em massa');
        }
    };

    const handleExport = () => {
        const data = recipes
            .filter(r => selectedRecipes.includes(r.id))
            .map(r => ({
                Nome: r.nome_receita,
                Setor: setores.find(s => s.id === r.setor_responsavel_id)?.nome,
                Custo: calculateCost(r.id)
            }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Fichas");
        XLSX.writeFile(wb, "fichas_tecnicas.xlsx");
    };

    const handlePdfExportClick = (recipe: FichaTecnica) => {
        setRecipeToExport(recipe);
        setExportModalOpen(true);
    };

    const processPdfExport = (mode: 'managerial' | 'production') => {
        if (!recipeToExport) return;

        const ingredients = ftIngredientes.filter(ft => ft.ft_id === recipeToExport.id);
        const sectorName = setores.find(s => s.id === recipeToExport.setor_responsavel_id)?.nome || '-';
        const difficultyName = dificuldades.find(d => d.id === recipeToExport.dificuldade_id)?.nome || '-';

        exportRecipePDF({
            recipe: recipeToExport,
            ingredients,
            insumos,
            unidades,
            sectorName,
            difficultyName
        }, mode);

        setExportModalOpen(false);
    };

    const filteredRecipes = recipes.filter(recipe => {
        const matchesSearch = recipe.nome_receita.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSector = selectedSector === 'all' || recipe.setor_responsavel_id === selectedSector;
        const matchesType = selectedType === 'all' || recipe.tipo_produto === selectedType;
        return matchesSearch && matchesSector && matchesType;
    });

    const toggleSelectAll = () => {
        if (selectedRecipes.length === filteredRecipes.length) setSelectedRecipes([]);
        else setSelectedRecipes(filteredRecipes.map(r => r.id));
    };

    const toggleSelect = (id: string) => {
        if (selectedRecipes.includes(id)) setSelectedRecipes(prev => prev.filter(i => i !== id));
        else setSelectedRecipes(prev => [...prev, id]);
    };

    const generateNextId = (sectorId: string) => {
        const sector = setores.find(s => s.id === sectorId);
        const prefix = sector ? sector.nome.substring(0, 3).toUpperCase() : 'SET';

        // Filter recipes with this prefix
        const relevantRecipes = recipes.filter(r => r.codigo_id && r.codigo_id.startsWith(prefix));

        let maxNum = 0;
        relevantRecipes.forEach(r => {
            const parts = r.codigo_id?.split('-');
            if (parts && parts.length === 2) {
                const num = parseInt(parts[1], 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        });

        const nextNum = maxNum + 1;
        return `${prefix}-${String(nextNum).padStart(4, '0')}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Fichas Técnicas (Receitas)</h1>
                    <p className="text-gray-600 mt-1">Gerencie suas receitas e custos</p>
                </div>
                <button
                    onClick={() => {
                        setEditingRecipe(undefined);
                        setIsEditorOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <Plus size={20} />
                    Nova Ficha Técnica
                </button>
            </div>

            {/* Recipes List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
                    <div className="flex flex-col md:flex-row gap-4 flex-1 w-full xl:w-auto">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar receitas..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="relative min-w-[200px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <select
                                value={selectedSector}
                                onChange={(e) => setSelectedSector(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                            >
                                <option value="all">Todos os Setores</option>
                                {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto justify-between xl:justify-end">
                        {/* Product Type Tabs */}
                        <div className="flex bg-gray-100 p-1 rounded-lg self-start md:self-auto">
                            <button
                                onClick={() => setSelectedType('all')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${selectedType === 'all'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setSelectedType('Base')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${selectedType === 'Base'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Prod. Base
                            </button>
                            <button
                                onClick={() => setSelectedType('Final')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${selectedType === 'Final'
                                    ? 'bg-white text-green-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Prod. Final
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={selectedRecipes.length === 0}
                                className={`px-3 py-2 rounded-lg flex items-center gap-2 border transition-colors ${selectedRecipes.length > 0
                                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                                    : 'border-gray-200 text-gray-300 cursor-not-allowed'
                                    }`}
                                title="Excluir Selecionados"
                            >
                                <Trash2 size={20} />
                                <span className="hidden md:inline">({selectedRecipes.length})</span>
                            </button>
                        </div>
                    </div>
                </div>

                {selectedRecipes.length > 0 && (
                    <div className="bg-blue-50 px-4 py-2 flex items-center gap-4">
                        <span className="text-sm text-blue-700 font-medium">
                            {selectedRecipes.length} item(ns) selecionado(s)
                        </span>
                        <button
                            onClick={handleExport}
                            className="text-sm text-green-700 hover:text-green-800 font-medium flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full transition-colors"
                        >
                            <FileSpreadsheet size={16} />
                            Exportar
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                        >
                            <Trash2 size={16} />
                            Excluir Selecionados
                        </button>
                    </div>
                )}

                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                        <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                            <h3 className="text-lg font-semibold mb-2">Confirmar Exclusão</h3>
                            <p className="text-gray-600 mb-6">
                                Tem certeza que deseja excluir {selectedRecipes.length} receitas? Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedRecipes.length === filteredRecipes.length && filteredRecipes.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-gray-50"
                                    />
                                </th>
                                <th className="px-4 py-4 text-xs uppercase tracking-wider">Nome da Receita</th>
                                <th className="px-4 py-4 text-xs uppercase tracking-wider text-center">Código</th>
                                <th className="px-4 py-4 text-xs uppercase tracking-wider">Setor / Tipo</th>
                                <th className="px-4 py-4 text-xs uppercase tracking-wider">Tempo / Nível</th>
                                <th className="px-4 py-4 text-xs uppercase tracking-wider text-right">Custo Total</th>
                                <th className="px-4 py-4 text-xs uppercase tracking-wider text-right">CMV Unitário (g)</th>
                                <th className="px-4 py-4 text-xs uppercase tracking-wider text-right">CMV (Kg)</th>
                                <th className="px-4 py-4 text-xs uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRecipes.map((recipe) => {
                                const totalCost = recipe.cmv_produto_valor ?? calculateCost(recipe.id);
                                const yieldKg = recipe.rendimento_kg || 0;
                                const costPerKg = yieldKg > 0 ? totalCost / yieldKg : 0;
                                const costPerGram = yieldKg > 0 ? totalCost / (yieldKg * 1000) : 0;

                                return (
                                    <tr key={recipe.id} className="hover:bg-blue-50/50 transition-colors group">
                                        <td className="px-4 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedRecipes.includes(recipe.id)}
                                                onChange={() => toggleSelect(recipe.id)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="font-bold text-gray-900">{recipe.nome_receita}</div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-mono border border-gray-200">
                                                {recipe.codigo_id || '-'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className="font-bold text-gray-700 text-sm">
                                                    {setores.find(s => s.id === recipe.setor_responsavel_id)?.nome || '-'}
                                                </span>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full ${recipe.tipo_produto === 'Final'
                                                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                                                    }`}>
                                                    {recipe.tipo_produto === 'Base' ? 'Prod. Base' : 'Prod. Final'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col gap-1 text-sm text-gray-600">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={14} className="text-gray-400" />
                                                    <span>{recipe.tempo_preparo || '-'}</span>
                                                </div>
                                                <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-md border border-yellow-100 w-fit">
                                                    {dificuldades.find(d => d.id === recipe.dificuldade_id)?.nome || '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className="font-bold text-gray-900">
                                                R$ {totalCost.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right font-mono text-sm text-gray-600">
                                            R$ {costPerGram.toFixed(4)}
                                        </td>
                                        <td className="px-4 py-4 text-right font-mono text-sm text-gray-600">
                                            R$ {costPerKg.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handlePdfExportClick(recipe)}
                                                    className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-md transition-colors"
                                                    title="PDF / Exportar"
                                                >
                                                    <FileText size={18} />
                                                </button>
                                                <div className="w-px h-4 bg-gray-300 mx-1"></div>
                                                <button
                                                    onClick={() => handleDuplicate(recipe)}
                                                    className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition-colors"
                                                    title="Duplicar"
                                                >
                                                    <Copy size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingRecipe(recipe);
                                                        setIsEditorOpen(true);
                                                    }}
                                                    className="p-1.5 hover:bg-yellow-50 text-yellow-600 rounded-md transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(recipe)}
                                                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-md transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredRecipes.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        Nenhuma receita encontrada.
                    </div>
                )}
            </div>

            {/* Substitution Modal */}
            {deletionStep === 'substitute' && recipeToDelete && (
                <SubstitutionModal
                    recipeName={recipeToDelete.nome_receita}
                    usageCount={deletionUsageCount}
                    insumos={insumos}
                    onClose={() => setDeletionStep(null)}
                    onConfirm={(subId) => executeDelete(subId)}
                />
            )}

            {/* Simple Confirmation Modal */}
            {deletionStep === 'confirm' && recipeToDelete && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                        <h3 className="text-lg font-semibold mb-2">Confirmar Exclusão</h3>
                        <p className="text-gray-600 mb-6">
                            Tem certeza que deseja excluir <strong>{recipeToDelete.nome_receita}</strong>?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeletionStep(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => executeDelete()}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isEditorOpen && (
                <RecipeEditor
                    onClose={() => setIsEditorOpen(false)}
                    onSave={handleSave}
                    initialData={editingRecipe}
                    initialIngredients={editingRecipe ? ftIngredientes.filter(i => i.ft_id === editingRecipe.id) : []}
                    insumos={insumos}
                    unidades={unidades}
                    setores={setores}
                    especialidades={especialidades}
                    dificuldades={dificuldades}
                    generateId={generateNextId}
                />
            )}

            <ExportRecipeModal
                isOpen={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                onExport={processPdfExport}
                recipeName={recipeToExport?.nome_receita || ''}
            />
        </div>
    );
}
