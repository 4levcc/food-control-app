import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { FichaTecnica, Insumo, FtIngrediente, SetorResponsavel } from '../types';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, Award } from 'lucide-react';

export const MarginsAnalytics: React.FC = () => {
    const [recipes, setRecipes] = useState<FichaTecnica[]>([]);
    const [ingredients, setIngredients] = useState<Insumo[]>([]);
    const [ftIngredients, setFtIngredients] = useState<FtIngrediente[]>([]);
    const [sectors, setSectors] = useState<SetorResponsavel[]>([]);
    const [selectedSector, setSelectedSector] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [recipesRes, ingRes, ftIngRes, sectorsRes] = await Promise.all([
                supabase.from('fichas_tecnicas').select('*'),
                supabase.from('insumos').select('*'),
                supabase.from('ft_ingredientes').select('*'),
                supabase.from('setores_responsaveis').select('*').order('nome')
            ]);

            if (recipesRes.data) setRecipes(recipesRes.data);
            if (ingRes.data) setIngredients(ingRes.data);
            if (ftIngRes.data) setFtIngredients(ftIngRes.data);
            if (sectorsRes.data) setSectors(sectorsRes.data);
        } catch (error) {
            console.error('Error fetching analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

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
                const grossMargin = salePrice - totalCost;
                const marginPercentage = salePrice > 0 ? (grossMargin / salePrice) * 100 : 0;
                const cmvPercentage = salePrice > 0 ? (totalCost / salePrice) * 100 : 0;

                const sectorName = sectors.find(s => s.id === rec.setor_responsavel_id)?.nome || 'Outros';

                return {
                    id: rec.id,
                    name: rec.nome_receita,
                    sector: sectorName,
                    sectorId: rec.setor_responsavel_id, // Keep ID for filtering
                    specialty: getSpecialtyName(rec.especialidade_id),
                    totalCost,
                    salePrice,
                    grossMargin,
                    marginPercentage,
                    cmvPercentage,
                    isProfitable: grossMargin > 0,
                    hasPrice: salePrice > 0
                };
            })
            .filter(item => item.hasPrice) // Only analyze items with a price set
            .sort((a, b) => b.marginPercentage - a.marginPercentage);
    }, [recipes, ingredients, ftIngredients, sectors]);

    const filteredData = useMemo(() => {
        if (selectedSector === 'all') return analyticsData;
        return analyticsData.filter(d => d.sectorId === selectedSector);
    }, [analyticsData, selectedSector]);

    const availableSectors = useMemo(() => {
        const uniqueSectorIds = Array.from(new Set(analyticsData.map(d => d.sectorId).filter(Boolean)));
        return sectors.filter(s => uniqueSectorIds.includes(s.id));
    }, [analyticsData, sectors]);

    // 2. High Level KPIs
    const kpis = useMemo(() => {
        if (filteredData.length === 0) return null;

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

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <TrendingUp className="mr-3 text-blue-600" />
                    Análise de Margens & Lucratividade
                </h2>

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
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-sm text-gray-500 uppercase font-semibold">Média de Margem Bruta</span>
                    <span className={`text-3xl font-bold mt-2 ${kpis!.avgMarginPct >= 50 ? 'text-green-600' : 'text-blue-600'}`}>
                        {kpis?.avgMarginPct.toFixed(1)}%
                    </span>
                    <span className="text-xs text-green-500 mt-1 flex items-center">
                        <Award size={12} className="mr-1" /> Meta: {'>'}50%
                    </span>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-sm text-gray-500 uppercase font-semibold">Média de CMV</span>
                    <span className={`text-3xl font-bold mt-2 ${kpis!.avgCmvPct > 40 ? 'text-red-500' : 'text-green-600'}`}>
                        {kpis?.avgCmvPct.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-400 mt-1">Custo Mercadoria Vendida</span>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <span className="text-sm text-gray-500 uppercase font-semibold">Alertas de Margem</span>
                    <span className="text-3xl font-bold mt-2 text-yellow-600">
                        {kpis?.lowMarginCount}
                    </span>
                    <span className="text-xs text-yellow-600 mt-1">Produtos com MG {'<'} 30%</span>
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
                                data={filteredData.slice(0, 5)}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" unit="%" />
                                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Margem']} />
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
                                data={[...filteredData].reverse().slice(0, 5)}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" unit="%" />
                                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Margem']} />
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
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Setor</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Preço Venda</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Custo (CMV)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Lucro Bruto</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CMV %</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margem %</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {item.name}
                                        <div className="text-xs text-gray-400 font-normal">{item.specialty}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.sector}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                                        R$ {item.salePrice.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                        R$ {item.totalCost.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-700 font-medium">
                                        R$ {item.grossMargin.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                                        <span className={`px-2 py-1 rounded full text-xs font-medium ${item.cmvPercentage > 40 ? 'bg-red-100 text-red-800' : 'bg-gray-100'}`}>
                                            {item.cmvPercentage.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                        <div className="flex items-center justify-end">
                                            <span className={`font-bold ${item.marginPercentage < 30 ? 'text-red-600' : 'text-green-600'}`}>
                                                {item.marginPercentage.toFixed(1)}%
                                            </span>
                                        </div>
                                        {/* Mini bar viz */}
                                        <div className="w-full h-1 bg-gray-200 rounded-full mt-1 ml-auto max-w-[80px]">
                                            <div
                                                className={`h-1 rounded-full ${item.marginPercentage < 30 ? 'bg-red-500' : 'bg-green-500'}`}
                                                style={{ width: `${Math.min(item.marginPercentage, 100)}%` }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                        {item.marginPercentage >= 50 ? (
                                            <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs border border-green-100">Excelente</span>
                                        ) : item.marginPercentage >= 30 ? (
                                            <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-xs border border-blue-100">Bom</span>
                                        ) : (
                                            <span className="text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs border border-red-100">Crítico</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>


        </div>
    );
};

// Helper functions (placeholders until lookups fully integrated or fetched)
function getSectorName(id: string | null) {
    if (!id) return 'Outros';
    return 'Geral'; // Simplified
}
function getSpecialtyName(id: string | null) {
    if (!id) return 'Geral';
    return 'Geral'; // Simplified
}
