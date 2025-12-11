import React, { useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, Award } from 'lucide-react';

export const MarginsAnalytics: React.FC = () => {
    const { recipes, ingredients } = useStore();

    // 1. Process Data
    const analyticsData = useMemo(() => {
        return recipes
            .filter(r => r.productType === 'Final')
            .map(rec => {
                // Calculate Total Cost (CMV)
                const totalCost = rec.items.reduce((sum, item) => {
                    const ing = ingredients.find(i => i.id === item.ingredientId);
                    if (!ing) return sum;
                    const unitCost = ing.price * (ing.correctionFactor || 1);
                    return sum + (unitCost * item.quantity);
                }, 0);

                const salePrice = rec.salePrice || 0;
                const grossMargin = salePrice - totalCost;
                const marginPercentage = salePrice > 0 ? (grossMargin / salePrice) * 100 : 0;
                const cmvPercentage = salePrice > 0 ? (totalCost / salePrice) * 100 : 0;

                return {
                    id: rec.id,
                    name: rec.name,
                    sector: rec.sector,
                    specialty: rec.specialty || 'Geral',
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
    }, [recipes, ingredients]);

    // 2. High Level KPIs
    const kpis = useMemo(() => {
        if (analyticsData.length === 0) return null;

        const totalItems = analyticsData.length;
        const avgMarginPct = analyticsData.reduce((acc, curr) => acc + curr.marginPercentage, 0) / totalItems;
        const avgCmvPct = analyticsData.reduce((acc, curr) => acc + curr.cmvPercentage, 0) / totalItems;

        const lowMarginCount = analyticsData.filter(d => d.marginPercentage < 30).length; // < 30% margin alert
        const highCmvCount = analyticsData.filter(d => d.cmvPercentage > 40).length; // > 40% cost alert

        return { avgMarginPct, avgCmvPct, lowMarginCount, highCmvCount };
    }, [analyticsData]);

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
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <TrendingUp className="mr-3 text-blue-600" />
                Análise de Margens & Lucratividade
            </h2>

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
                        {analyticsData.length}
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
                                data={analyticsData.slice(0, 5)}
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
                                data={[...analyticsData].reverse().slice(0, 5)}
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
                            {analyticsData.map((item) => (
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

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800">
                <strong>Nota:</strong> Produtos sem "Preço de Venda" definido não são exibidos nesta análise. Vá para "Produtos Finais" para definir os preços.
            </div>
        </div>
    );
};
