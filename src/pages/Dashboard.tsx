import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { FichaTecnica, Insumo, FtIngrediente, SetorResponsavel } from '../types';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, AlertCircle, ChefHat, DollarSign } from 'lucide-react';

export const Dashboard: React.FC = () => {
    const [recipes, setRecipes] = useState<FichaTecnica[]>([]);
    const [ingredients, setIngredients] = useState<Insumo[]>([]);
    const [ftIngredients, setFtIngredients] = useState<FtIngrediente[]>([]);
    const [sectors, setSectors] = useState<SetorResponsavel[]>([]);
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
                supabase.from('setores_responsaveis').select('*')
            ]);

            if (recipesRes.data) setRecipes(recipesRes.data);
            if (ingRes.data) setIngredients(ingRes.data);
            if (ftIngRes.data) setFtIngredients(ftIngRes.data);
            if (sectorsRes.data) setSectors(sectorsRes.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        // 1. Basic Counts
        const totalRecipes = recipes.length;
        const totalIngredients = ingredients.length;
        const totalBaseProducts = recipes.filter(r => r.tipo_produto === 'Base').length;
        const totalFinalProducts = recipes.filter(r => r.tipo_produto === 'Final').length;

        // 2. Financials (Only for Final Products)
        const finalProducts = recipes.filter(r => r.tipo_produto === 'Final');

        const financialData = finalProducts.map(rec => {
            // Calculate Cost based on ingredients
            // Calculate Cost based on ingredients
            const recIngredients = ftIngredients.filter(ft => ft.ft_id === rec.id);

            // Use stored total cost if available, otherwise fallback to calculation (or 0)
            let totalCost = rec.custo_total_estimado || 0;

            // Optional: Recalculate if stored value is missing (Backward compatibility)
            if (totalCost === 0 && recIngredients.length > 0) {
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
            const marginPercent = salePrice > 0 ? (grossMargin / salePrice) * 100 : 0;
            const cmvPercent = salePrice > 0 ? (totalCost / salePrice) * 100 : 0;

            return {
                ...rec,
                name: rec.nome_receita, // Mapping for charts
                totalCost,
                marginPercent,
                cmvPercent,
                grossMargin,
                hasPrice: salePrice > 0,
                sector: getSectorName(rec.setor_responsavel_id) // Placeholder, need lookup or map
            };
        });

        const productsWithPrice = financialData.filter(p => p.hasPrice);
        const avgMargin = productsWithPrice.length > 0
            ? productsWithPrice.reduce((acc, curr) => acc + curr.marginPercent, 0) / productsWithPrice.length
            : 0;
        const avgCmv = productsWithPrice.length > 0
            ? productsWithPrice.reduce((acc, curr) => acc + curr.cmvPercent, 0) / productsWithPrice.length
            : 0;

        const lowMarginCount = productsWithPrice.filter(p => p.marginPercent < 30).length;

        // Sorting for Best/Worst
        const sortedByMargin = [...productsWithPrice].sort((a, b) => b.marginPercent - a.marginPercent);
        const topProfitable = sortedByMargin.slice(0, 5);
        const worstProfitable = [...sortedByMargin].reverse().slice(0, 5);

        // 3. Sector Distribution
        const sectorCounts: { [key: string]: number } = {};
        recipes.forEach(r => {
            const sectorId = r.setor_responsavel_id || 'others';
            sectorCounts[sectorId] = (sectorCounts[sectorId] || 0) + 1;
        });

        const sectorStats = Object.entries(sectorCounts).map(([id, count]) => {
            const sectorName = sectors.find(s => s.id === id)?.nome || (id === 'others' ? 'Sem Setor' : 'Outros');
            return {
                name: sectorName,
                value: count
            };
        }).sort((a, b) => b.value - a.value);

        const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

        // 4. Sector Profitability (New)
        const sectorProfitability = sectors.map(sector => {
            const sectorProducts = productsWithPrice.filter(p => p.setor_responsavel_id === sector.id);
            const count = sectorProducts.length;

            if (count === 0) return null;

            const avgMargin = sectorProducts.reduce((acc, curr) => acc + curr.marginPercent, 0) / count;
            const avgCmv = sectorProducts.reduce((acc, curr) => acc + curr.cmvPercent, 0) / count;

            return {
                id: sector.id,
                name: sector.nome,
                avgMargin,
                avgCmv,
                count
            };
        }).filter((s): s is NonNullable<typeof s> => s !== null);

        return {
            totalRecipes,
            totalIngredients,
            totalBaseProducts,
            totalFinalProducts,
            avgMargin,
            avgCmv,
            lowMarginCount,
            topProfitable,
            worstProfitable,

            productsWithPriceCount: productsWithPrice.length,
            alerts: productsWithPrice.filter(p => p.marginPercent < 30),
            financialData,
            sectorStats,
            sectorProfitability,
            COLORS
        };
    }, [recipes, ingredients, ftIngredients, sectors]);

    // Helper to fetch sectors to show proper names
    // I will modify the main fetch to include sectors

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Carregando dashboard...</div>;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Dashboard Geral</h2>
                <div className="text-sm text-gray-500">
                    Visão geral do negócio
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Receitas</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.totalRecipes}</h3>
                        </div>
                        <div className="bg-purple-50 p-2 rounded-lg group-hover:bg-purple-100 transition-colors">
                            <ChefHat className="text-purple-600" size={24} />
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                        <span className="font-medium text-gray-900 mr-1">{stats.totalFinalProducts}</span> Finais
                        <span className="mx-1">•</span>
                        <span className="font-medium text-gray-900 mr-1">{stats.totalBaseProducts}</span> Base
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Média Margem</p>
                            <h3 className={`text-3xl font-bold mt-1 ${stats.productsWithPriceCount === 0 ? 'text-gray-400' : stats.avgMargin >= 50 ? 'text-green-600' : 'text-yellow-600'}`}>
                                {stats.productsWithPriceCount > 0 ? `${stats.avgMargin.toFixed(1)}%` : '-'}
                            </h3>
                        </div>
                        <div className="bg-green-50 p-2 rounded-lg group-hover:bg-green-100 transition-colors">
                            <TrendingUp className="text-green-600" size={24} />
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                        Baseado em {stats.productsWithPriceCount} produtos com preço
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Média CMV</p>
                            <h3 className={`text-3xl font-bold mt-1 ${stats.productsWithPriceCount === 0 ? 'text-gray-400' : stats.avgCmv <= 40 ? 'text-green-600' : 'text-red-500'}`}>
                                {stats.productsWithPriceCount > 0 ? `${stats.avgCmv.toFixed(1)}%` : '-'}
                            </h3>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-lg group-hover:bg-blue-100 transition-colors">
                            <DollarSign className="text-blue-600" size={24} />
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                        Custo Mercadoria Vendida
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Alertas Críticos</p>
                            <h3 className={`text-3xl font-bold mt-1 ${stats.lowMarginCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                {stats.lowMarginCount}
                            </h3>
                        </div>
                        <div className="bg-red-50 p-2 rounded-lg group-hover:bg-red-100 transition-colors">
                            <AlertCircle className="text-red-600" size={24} />
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-red-600">
                        Produtos com margem &lt; 30%
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart: Profitability */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                    <h3 className="font-bold text-gray-900 mb-6">Top 5 - Maior Rentabilidade</h3>
                    <div className="h-72">
                        {stats.topProfitable.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={stats.topProfitable}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" unit="%" />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Margem']}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="marginPercent" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={20} name="Margem %" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                Insuficiente dados de preço para exibir gráfico.
                            </div>
                        )}
                    </div>
                </div>

                {/* Secondary Chart: Distribution */}
                {/* Simplified: Removed Pie Chart as per strict MVP request to focus on real data and removing broken sectors if complex */}
                {/* Or I can re-add it if I fetch sectors. Let's keep it simpler for now or just show a message if empty. */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center">
                    <h3 className="font-bold text-gray-900 mb-2 w-full text-left">Distribuição por Setor</h3>
                    <div className="h-64 w-full">
                        {stats.sectorStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.sectorStats}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.sectorStats.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={stats.COLORS[index % stats.COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => [value, 'Receitas']}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                Nenhuma receita cadastrada.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top 5 Worst Profitability */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-6">Top 5 - Pior Rentabilidade</h3>
                <div className="h-72">
                    {stats.worstProfitable.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={stats.worstProfitable}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" unit="%" />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Margem']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="marginPercent" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={20} name="Margem %" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                            Insuficiente dados de preço para exibir gráfico.
                        </div>
                    )}
                </div>
            </div>

            {/* Critical Alerts List */}
            {
                stats.alerts.length > 0 && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-6">
                        <div className="flex items-center mb-4">
                            <AlertCircle className="text-red-600 mr-2" size={20} />
                            <h3 className="font-bold text-red-900">Atenção Necessária ({stats.alerts.length})</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stats.alerts.slice(0, 6).map(alert => (
                                <div key={alert.id} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-900">{alert.name}</p>
                                        <p className="text-xs text-red-600">Margem: {alert.marginPercent.toFixed(1)}%</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-medium text-gray-500">CMV</span>
                                        <p className="text-sm font-bold text-gray-700">{alert.cmvPercent.toFixed(1)}%</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {stats.alerts.length > 6 && (
                            <p className="text-center text-xs text-red-600 mt-4">E mais {stats.alerts.length - 6} itens...</p>
                        )}
                    </div>
                )
            }
            {/* Sector Profitability Cards (New) */}
            <div>
                <h3 className="font-bold text-gray-900 mb-4 text-lg">Rentabilidade por Setor</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {stats.sectorProfitability.map((sector: any) => (
                        <div key={sector.id} className="bg-white p-6 rounded-xl shadow-sm border border-orange-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="text-orange-500" size={20} />
                                <h4 className="font-bold text-gray-900">Rentabilidade - {sector.name}</h4>
                            </div>
                            <p className="text-sm text-gray-500 mb-6">Margem de contribuição média</p>

                            <div className="space-y-6">
                                {/* CMV Bar */}
                                <div>
                                    <div className="flex justify-between text-sm font-medium mb-1">
                                        <span className="text-gray-600">CMV Médio</span>
                                        <span className="text-orange-600">{sector.avgCmv.toFixed(2)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(sector.avgCmv, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Margin Bar */}
                                <div>
                                    <div className="flex justify-between text-sm font-medium mb-1">
                                        <span className="text-gray-600">MC Média</span>
                                        <span className="text-green-600">{sector.avgMargin.toFixed(2)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(sector.avgMargin, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {stats.sectorProfitability.length === 0 && (
                        <div className="col-span-full p-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            Nenhum dado de rentabilidade por setor disponível.
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

// Helper for sector name if needed (can implement context or fetch later)
function getSectorName(id: string | null) {
    if (!id) return 'Outros';
    // Simplified: return 'Geral' or id until map is ready
    return 'Geral';
}
