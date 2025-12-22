import React, { useState, useEffect } from 'react';
import { ExternalLink, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { FichaTecnica, SetorResponsavel, Especialidade } from '../types';

export const FinalProducts: React.FC = () => {
    const [products, setProducts] = useState<FichaTecnica[]>([]);
    const [setores, setSetores] = useState<SetorResponsavel[]>([]);
    const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);

    // Filters
    const [filterSector, setFilterSector] = useState<string>('All');
    const [filterSpecialty, setFilterSpecialty] = useState<string>('All');

    const fetchData = async () => {
        const [prodRes, setRes, espRes] = await Promise.all([
            supabase.from('fichas_tecnicas')
                .select('*')
                .eq('tipo_produto', 'Final')
                .order('nome_receita'),
            supabase.from('setores_responsaveis').select('*').order('nome'),
            supabase.from('especialidades').select('*').order('nome')
        ]);

        if (prodRes.data) setProducts(prodRes.data);
        if (setRes.data) setSetores(setRes.data);
        if (espRes.data) setEspecialidades(espRes.data);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredProducts = products.filter(p => {
        const matchSec = filterSector === 'All' || p.setor_responsavel_id === filterSector;
        const matchEsp = filterSpecialty === 'All' || p.especialidade_id === filterSpecialty;
        return matchSec && matchEsp;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Produtos Finais</h2>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center text-gray-500 font-medium">
                    <Filter size={20} className="mr-2" />
                    Filtros:
                </div>
                <select
                    value={filterSector}
                    onChange={(e) => setFilterSector(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="All">Todos os Setores</option>
                    {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>

                <select
                    value={filterSpecialty}
                    onChange={(e) => setFilterSpecialty(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 border border-blue-300 bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900"
                >
                    <option value="All">Todas as Especialidades</option>
                    {especialidades.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-lg shadowoverflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Setor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receita</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CMV R$ (do produto)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rendimento (kg)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rendimento (gr)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Preço Venda</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredProducts.map((rec) => (
                                <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {setores.find(s => s.id === rec.setor_responsavel_id)?.nome || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        <div className="flex items-center group">
                                            {rec.nome_receita}
                                            <ExternalLink size={14} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                        R$ {(rec.cmv_produto_valor ?? rec.custo_total_estimado ?? 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                        {rec.rendimento_kg} kg
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                        {(rec.rendimento_kg * 1000).toFixed(0)} g
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-700">
                                        R$ {(rec.preco_venda || 0).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                        Nenhum produto final encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
