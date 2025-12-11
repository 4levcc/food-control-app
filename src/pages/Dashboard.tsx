import React, { useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, AlertCircle, ChefHat, DollarSign } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const Dashboard: React.FC = () => {
    const { recipes, ingredients } = useStore();

    const stats = useMemo(() => {
        // 1. Basic Counts
        const totalRecipes = recipes.length;
        const totalIngredients = ingredients.length;
        const totalBaseProducts = recipes.filter(r => r.productType === 'Base').length;
        const totalFinalProducts = recipes.filter(r => r.productType === 'Final').length;

        // 2. Financials (Only for Final Products)
        const finalProducts = recipes.filter(r => r.productType === 'Final');

        const financialData = finalProducts.map(rec => {
            const totalCost = rec.items.reduce((sum, item) => {
                const ing = ingredients.find(i => i.id === item.ingredientId);
                if (!ing) return sum;
                const unitCost = ing.price * (ing.correctionFactor || 1);
                return sum + (unitCost * item.quantity);
            }, 0);

            const salePrice = rec.salePrice || 0;
            const grossMargin = salePrice - totalCost;
            const marginPercent = salePrice > 0 ? (grossMargin / salePrice) * 100 : 0;
            const cmvPercent = salePrice > 0 ? (totalCost / salePrice) * 100 : 0;

            return {
                ...rec,
                totalCost,
                marginPercent,
                cmvPercent,
                grossMargin,
                hasPrice: salePrice > 0
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
        const topProfitable = [...productsWithPrice].sort((a, b) => b.marginPercent - a.marginPercent).slice(0, 5);

        // 3. Sector Distribution
        const sectorCounts = finalProducts.reduce((acc, curr) => {
            const sector = curr.sector || 'Outros';
            acc[sector] = (acc[sector] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const sectorData = Object.entries(sectorCounts).map(([name, value]) => ({ name, value }));

        return {
            totalRecipes,
            totalIngredients,
            totalBaseProducts,
            totalFinalProducts,
            avgMargin,
            avgCmv,
            lowMarginCount,
            topProfitable,
            sectorData,
            productsWithPriceCount: productsWithPrice.length,
            alerts: productsWithPrice.filter(p => p.marginPercent < 30) // Critical Alerts
        };
    }, [recipes, ingredients]);

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
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-6">Distribuição por Setor</h3>
                    <div className="h-72">
                        {stats.sectorData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.sectorData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.sectorData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                Nenhuma receita cadastrada.
                            </div>
                        )}
                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                            {stats.sectorData.map((entry, index) => (
                                <div key={entry.name} className="flex items-center text-xs text-gray-500">
                                    <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                    {entry.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Critical Alerts List */}
            {stats.alerts.length > 0 && (
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
            )}
        </div>
    );
};
