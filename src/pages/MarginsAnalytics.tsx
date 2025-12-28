import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { FichaTecnica, Insumo, FtIngrediente, SetorResponsavel, ConfiguracaoNegocio, Especialidade } from '../types';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, Award, ArrowUpDown, Download, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';

export const MarginsAnalytics: React.FC = () => {
    const [recipes, setRecipes] = useState<FichaTecnica[]>([]);
    const [ingredients, setIngredients] = useState<Insumo[]>([]);
    const [ftIngredients, setFtIngredients] = useState<FtIngrediente[]>([]);
    const [sectors, setSectors] = useState<SetorResponsavel[]>([]);
    const [specialties, setSpecialties] = useState<Especialidade[]>([]);
    const [businessConfig, setBusinessConfig] = useState<ConfiguracaoNegocio | null>(null);

    // Filter State
    const [selectedSector, setSelectedSector] = useState('all');
    const [selectedSpecialty, setSelectedSpecialty] = useState('all');

    const [loading, setLoading] = useState(true);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [recipesRes, ingRes, ftIngRes, sectorsRes, specialtiesRes, configRes] = await Promise.all([
                supabase.from('fichas_tecnicas').select('*'),
                supabase.from('insumos').select('*'),
                supabase.from('ft_ingredientes').select('*'),
                supabase.from('setores_responsaveis').select('*').order('nome'),
                supabase.from('especialidades').select('*').order('nome'),
                supabase.from('configuracoes_negocio').select('*').single()
            ]);

            if (recipesRes.data) setRecipes(recipesRes.data);
            if (ingRes.data) setIngredients(ingRes.data);
            if (ftIngRes.data) setFtIngredients(ftIngRes.data);
            if (sectorsRes.data) setSectors(sectorsRes.data);
            if (specialtiesRes.data) setSpecialties(specialtiesRes.data);
            if (configRes.data) setBusinessConfig(configRes.data);
        } catch (error) {
            console.error('Error fetching analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Variable Expenses Rate
    const variableExpensesRate = useMemo(() => {
        if (!businessConfig?.despesas_variaveis) return 0;
        const expenses = typeof businessConfig.despesas_variaveis === 'string'
            ? JSON.parse(businessConfig.despesas_variaveis)
            : businessConfig.despesas_variaveis;

        if (Array.isArray(expenses)) {
            return expenses.reduce((acc: number, curr: any) => acc + (Number(curr.valor) || 0), 0);
        }
        return 0;
    }, [businessConfig]);

    // 1. Process Data
    const analyticsData = useMemo(() => {
        return recipes
            .filter(r => r.tipo_produto === 'Final')
            .map(rec => {
                // Calculate Total Cost (CMV)
                let totalCost = rec.cmv_produto_valor;

                if (totalCost === null || totalCost === undefined) {
                    const recIngredients = ftIngredients.filter(ft => ft.ft_id === rec.id);
                    totalCost = recIngredients.reduce((sum, item) => {
                        const ing = ingredients.find(i => i.id === item.insumo_id);
                        if (!ing) return sum;

                        const cost = ing.custo_compra || 0;
                        const qty = ing.quantidade_compra || 1;
                        const weight = ing.peso_unidade || 1;
                        const factor = ing.fator_correcao || 1;

                        const costPerPurchaseUnit = qty > 0 ? cost / qty : 0;
                        const costPerBaseUnit = weight > 0 ? costPerPurchaseUnit / weight : 0;
                        const realUnitCost = costPerBaseUnit * factor;

                        return sum + (realUnitCost * item.quantidade_utilizada);
                    }, 0);
                }

                const salePrice = rec.preco_venda || 0;

                // Contribution Margin Calculation
                // MC = PV - CMV - Desp. Variáveis
                const variableExpensesValue = salePrice * (variableExpensesRate / 100);
                const contributionMarginValue = salePrice - totalCost - variableExpensesValue;

                // MC %
                const marginPercentage = salePrice > 0 ? (contributionMarginValue / salePrice) * 100 : 0;
                const cmvPercentage = salePrice > 0 ? (totalCost / salePrice) * 100 : 0;

                const sectorName = sectors.find(s => s.id === rec.setor_responsavel_id)?.nome || 'Outros';
                const specialtyName = specialties.find(s => s.id === rec.especialidade_id)?.nome || 'Geral';

                // Calculate Target Margin
                let targetMargin = businessConfig?.margem_padrao || 0;
                if (businessConfig?.usar_margem_por_especialidade && rec.especialidade_id) {
                    const margins = typeof businessConfig.margens_especialidades === 'string'
                        ? JSON.parse(businessConfig.margens_especialidades)
                        : businessConfig.margens_especialidades || [];

                    const found = margins.find((m: any) => m.especialidade_id === rec.especialidade_id);
                    if (found) {
                        targetMargin = found.margem;
                    }
                }

                return {
                    id: rec.id,
                    name: rec.nome_receita,
                    sector: sectorName,
                    sectorId: rec.setor_responsavel_id, // Keep ID for filtering
                    specialty: specialtyName,
                    specialtyId: rec.especialidade_id, // Keep ID for filtering
                    totalCost,
                    salePrice,
                    variableExpensesValue,
                    contributionMarginValue,
                    marginPercentage, // This is now Contribution Margin %
                    cmvPercentage,
                    targetMargin,
                    hasPrice: salePrice > 0
                };
            })
            .filter(item => item.hasPrice); // Only analyze items with a price set
    }, [recipes, ingredients, ftIngredients, sectors, specialties, variableExpensesRate, businessConfig]);

    const filteredData = useMemo(() => {
        // Start with all data
        let data = analyticsData;

        // Filter by Sector
        if (selectedSector !== 'all') {
            data = data.filter(d => d.sectorId === selectedSector);
        }

        // Filter by Specialty
        if (selectedSpecialty !== 'all') {
            data = data.filter(d => d.specialtyId === selectedSpecialty);
        }

        // Sort data
        if (sortConfig) {
            const { key, direction } = sortConfig;
            data = [...data].sort((a, b) => {
                const valA = a?.[key as keyof typeof a];
                const valB = b?.[key as keyof typeof b];

                // Handle null/undefined - push to end or treat as 0
                if (valA === valB) return 0;
                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;

                if (valA < valB) {
                    return direction === 'asc' ? -1 : 1;
                }
                if (valA > valB) {
                    return direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        } else {
            // Default sort: Margin Descending
            data = [...data].sort((a, b) => b.marginPercentage - a.marginPercentage);
        }

        return data;
    }, [analyticsData, selectedSector, selectedSpecialty, sortConfig]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleExportExcel = () => {
        const dataToExport = filteredData.map(item => ({
            Produto: item.name,
            Especialidade: item.specialty,
            'Preço Venda': item.salePrice,
            'Custo (CMV)': item.totalCost,
            'Despesa Variável': item.variableExpensesValue,
            'Margem Contribuição ($)': item.contributionMarginValue,
            'Margem % (Alvo)': item.targetMargin / 100,
            'Margem % (Atual)': item.marginPercentage / 100
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);

        // Format percentages in Excel
        const range = XLSX.utils.decode_range(ws['!ref']!);
        for (let C = 0; C <= range.e.c; ++C) {
            for (let R = 1; R <= range.e.r; ++R) {
                const cell_address = { c: C, r: R };
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                if (ws[cell_ref]) {
                    if (C >= 6) { // Last 2 columns are percentages (Alvo and Atual) - Index 6 and 7
                        ws[cell_ref].z = '0.00%';
                    } else if (C >= 2 && C <= 5) { // Money columns
                        ws[cell_ref].z = '"R$" #,##0.00';
                    }
                }
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Margens");
        XLSX.writeFile(wb, `Analise_Margens_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const availableSectors = useMemo(() => {
        const uniqueSectorIds = Array.from(new Set(analyticsData.map(d => d.sectorId).filter(Boolean)));
        return sectors.filter(s => uniqueSectorIds.includes(s.id));
    }, [analyticsData, sectors]);

    // 2. High Level KPIs
    const kpis = useMemo(() => {
        if (filteredData.length === 0) {
            return { avgMarginPct: 0, avgCmvPct: 0, lowMarginCount: 0, highCmvCount: 0 };
        }

        const totalItems = filteredData.length;
        const avgMarginPct = filteredData.reduce((acc, curr) => acc + curr.marginPercentage, 0) / totalItems;
        const avgCmvPct = filteredData.reduce((acc, curr) => acc + curr.cmvPercentage, 0) / totalItems;

        const lowMarginCount = filteredData.filter(d => d.marginPercentage < 30).length; // < 30% margin alert
        const highCmvCount = filteredData.filter(d => d.cmvPercentage > 40).length; // > 40% cost alert

        return { avgMarginPct, avgCmvPct, lowMarginCount, highCmvCount };
    }, [filteredData]);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Carregando análise...</div>;
    }

    if (analyticsData.length === 0) {
        return (
            <div className="p-8 text-center bg-white rounded-lg border border-gray-200 shadow-sm">
                <AlertCircle size={48} className="mx-auto text-yellow-500 mb-4" />
                <h3 className="text-xl font-bold text-gray-900">Nenhum dado para análise</h3>
                <p className="text-gray-500 mt-2">
                    Para visualizar as margens, certifique-se de ter <strong>Produtos Finais</strong> cadastrados e com <strong>Preço de Venda</strong> definido na página "Produtos Finais".
                </p>
                <p className="text-sm text-gray-400 mt-4">Calcule seus custos e defina preços para desbloquear insights valiosos.</p>
            </div>
        );
    }

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig?.key !== columnKey) return <ArrowUpDown size={14} className="ml-1 text-gray-400 opacity-50" />;
        return <ArrowUpDown size={14} className={`ml-1 ${sortConfig.direction === 'asc' ? 'text-blue-500' : 'text-blue-500 rotate-180'}`} />;
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <TrendingUp className="mr-3 text-blue-600" />
                    Análise de Margens de Contribuição
                </h2>

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    {/* Sector Filter Tabs */}
                    {availableSectors.length > 0 && (
                        <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1 overflow-x-auto max-w-full">
                            <button
                                onClick={() => setSelectedSector('all')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${selectedSector === 'all'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                                    }`}
                            >
                                Todos
                            </button>
                            {availableSectors.map(sector => (
                                <button
                                    key={sector.id}
                                    onClick={() => setSelectedSector(sector.id)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${selectedSector === sector.id
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                                        }`}
                                >
                                    {sector.nome}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Specialty Filter Dropdown */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <select
                            value={selectedSpecialty}
                            onChange={(e) => setSelectedSpecialty(e.target.value)}
                            className="bg-white border border-gray-300 rounded-lg pl-10 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[180px]"
                            aria-label="Filtrar por Especialidade"
                        >
                            <option value="all">Todas as Especialidades</option>
                            {specialties.map(spec => (
                                <option key={spec.id} value={spec.id}>{spec.nome}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center relative group">
                    <span className="text-sm text-gray-500 uppercase font-semibold text-center">Margem de Contribuição Média</span>
                    <span className={`text-3xl font-bold mt-2 ${kpis.avgMarginPct >= 50 ? 'text-green-600' : 'text-blue-600'}`}>
                        {kpis.avgMarginPct.toFixed(1)}%
                    </span>
                    <span className="text-xs text-green-500 mt-1 flex items-center">
                        <Award size={12} className="mr-1" /> Meta: {'>'}50%
                    </span>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs p-2 rounded shadow-lg max-w-[200px] pointer-events-none z-10">
                        MC = Preço - CMV - Despesas Variáveis ({variableExpensesRate.toFixed(1)}%)
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-sm text-gray-500 uppercase font-semibold">Média de CMV</span>
                    <span className={`text-3xl font-bold mt-2 ${kpis.avgCmvPct > 40 ? 'text-red-500' : 'text-green-600'}`}>
                        {kpis.avgCmvPct.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-400 mt-1">Custo Mercadoria Vendida</span>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-sm text-gray-500 uppercase font-semibold">Alertas de Margem</span>
                    <span className="text-3xl font-bold mt-2 text-yellow-600">
                        {kpis.lowMarginCount}
                    </span>
                    <span className="text-xs text-yellow-600 mt-1">Produtos com MC {'<'} 30%</span>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-sm text-gray-500 uppercase font-semibold">Produtos Analisados</span>
                    <span className="text-3xl font-bold mt-2 text-gray-900">
                        {filteredData.length}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">Total com preço definido</span>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Winners Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                        <TrendingUp size={20} className="mr-2 text-green-500" />
                        Top 5 - Maiores Margens (%)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={[...filteredData].sort((a, b) => b.marginPercentage - a.marginPercentage).slice(0, 5)}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" unit="%" />
                                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Margem Contrib.']} />
                                <Bar dataKey="marginPercentage" fill="#059669" radius={[0, 4, 4, 0]} name="Margem %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bottom Losers Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                        <TrendingDown size={20} className="mr-2 text-red-500" />
                        Atenção - Menores Margens (%)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={[...filteredData].sort((a, b) => a.marginPercentage - b.marginPercentage).slice(0, 5)}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" unit="%" />
                                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Margem Contrib.']} />
                                <Bar dataKey="marginPercentage" fill="#DC2626" radius={[0, 4, 4, 0]} name="Margem %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">Análise Detalhada por Produto</h3>
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm font-medium transition-colors"
                    >
                        <Download size={16} />
                        Exportar Excel
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th onClick={() => handleSort('name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group select-none">
                                    <div className="flex items-center">Produto <SortIcon columnKey="name" /></div>
                                </th>
                                <th onClick={() => handleSort('specialty')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group select-none">
                                    <div className="flex items-center">Especialidade <SortIcon columnKey="specialty" /></div>
                                </th>
                                <th onClick={() => handleSort('salePrice')} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group select-none">
                                    <div className="flex items-center justify-end">Preço Venda <SortIcon columnKey="salePrice" /></div>
                                </th>
                                <th onClick={() => handleSort('totalCost')} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group select-none">
                                    <div className="flex items-center justify-end">Custo (CMV) <SortIcon columnKey="totalCost" /></div>
                                </th>
                                <th onClick={() => handleSort('variableExpensesValue')} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group select-none">
                                    <div className="flex items-center justify-end">Despesa Variável <SortIcon columnKey="variableExpensesValue" /></div>
                                </th>
                                <th onClick={() => handleSort('targetMargin')} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group select-none">
                                    <div className="flex items-center justify-end">Margem % (Alvo) <SortIcon columnKey="targetMargin" /></div>
                                </th>
                                <th onClick={() => handleSort('marginPercentage')} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group select-none">
                                    <div className="flex items-center justify-end">Margem % (Atual) <SortIcon columnKey="marginPercentage" /></div>
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status (Meta)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredData.map((item) => {
                                // Status Logic
                                const diff = item.marginPercentage - item.targetMargin;
                                let status: 'critical' | 'adequate' | 'excellent' = 'critical';

                                if (diff < -1) status = 'critical';
                                else if (diff >= -1 && diff <= 1) status = 'adequate';
                                else status = 'excellent';

                                return (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {item.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.specialty}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                                            R$ {item.salePrice.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                            R$ {item.totalCost.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600 font-medium my-tooltip relative group/exp">
                                            R$ {item.variableExpensesValue.toFixed(2)}
                                            <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/exp:block bg-gray-800 text-white text-xs p-1 rounded whitespace-nowrap z-10'>
                                                {variableExpensesRate.toFixed(1)}% do Preço
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 font-medium bg-gray-50">
                                            {item.targetMargin.toFixed(1)}%
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                            <div className="flex items-center justify-end">
                                                <span className={`font-bold ${status === 'critical' ? 'text-red-600' : status === 'adequate' ? 'text-yellow-600' : 'text-green-600'}`}>
                                                    {item.marginPercentage.toFixed(1)}%
                                                </span>
                                            </div>
                                            {/* Mini bar viz */}
                                            <div className="w-full h-1 bg-gray-200 rounded-full mt-1 ml-auto max-w-[80px]">
                                                <div
                                                    className={`h-1 rounded-full ${status === 'critical' ? 'bg-red-500' : status === 'adequate' ? 'bg-yellow-500' : 'bg-green-500'} w-full`}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                            {status === 'excellent' ? (
                                                <span className="text-green-700 bg-green-100 px-3 py-1 rounded-full text-xs border border-green-200 font-semibold shadow-sm">Excelente</span>
                                            ) : status === 'adequate' ? (
                                                <span className="text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full text-xs border border-yellow-200 font-semibold shadow-sm">Adequado</span>
                                            ) : (
                                                <span className="text-red-700 bg-red-100 px-3 py-1 rounded-full text-xs border border-red-200 font-semibold shadow-sm">Crítico</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>


        </div>
    );
};
