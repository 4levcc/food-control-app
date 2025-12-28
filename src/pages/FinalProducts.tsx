import React, { useState, useEffect } from 'react';
import { ExternalLink, Filter, ArrowUpDown, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { utils, writeFile } from 'xlsx';
import type { FichaTecnica, SetorResponsavel, Especialidade } from '../types';

type SortDirection = 'asc' | 'desc';
type SortKey = 'setor' | 'receita' | 'cmv' | 'rendimento_kg' | 'rendimento_gr' | 'preco';

export const FinalProducts: React.FC = () => {
    const [products, setProducts] = useState<FichaTecnica[]>([]);
    const [setores, setSetores] = useState<SetorResponsavel[]>([]);
    const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);

    // Filters
    const [filterSector, setFilterSector] = useState<string>('All');
    const [filterSpecialty, setFilterSpecialty] = useState<string>('All');

    // Sorting
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);

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

    // 1. Filter
    const filteredProducts = products.filter(p => {
        const matchSec = filterSector === 'All' || p.setor_responsavel_id === filterSector;
        const matchEsp = filterSpecialty === 'All' || p.especialidade_id === filterSpecialty;
        return matchSec && matchEsp;
    });

    // 2. Sort
    const sortedProducts = React.useMemo(() => {
        if (!sortConfig) return filteredProducts;

        return [...filteredProducts].sort((a, b) => {
            let valA: any = '';
            let valB: any = '';

            switch (sortConfig.key) {
                case 'setor':
                    valA = setores.find(s => s.id === a.setor_responsavel_id)?.nome || '';
                    valB = setores.find(s => s.id === b.setor_responsavel_id)?.nome || '';
                    break;
                case 'receita':
                    valA = a.nome_receita.toLowerCase();
                    valB = b.nome_receita.toLowerCase();
                    break;
                case 'cmv':
                    valA = a.cmv_produto_valor ?? a.custo_total_estimado ?? 0;
                    valB = b.cmv_produto_valor ?? b.custo_total_estimado ?? 0;
                    break;
                case 'rendimento_kg':
                    valA = a.rendimento_kg || 0;
                    valB = b.rendimento_kg || 0;
                    break;
                case 'rendimento_gr':
                    valA = (a.rendimento_kg || 0) * 1000;
                    valB = (b.rendimento_kg || 0) * 1000;
                    break;
                case 'preco':
                    valA = a.preco_venda || 0;
                    valB = b.preco_venda || 0;
                    break;
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredProducts, sortConfig, setores]);

    const handleSort = (key: SortKey) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const getSortIcon = (key: SortKey) => {
        if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="ml-1 text-gray-400 opacity-50" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="ml-1 text-blue-600" />
            : <ArrowDown size={14} className="ml-1 text-blue-600" />;
    };

    const handleExport = () => {
        const exportData = sortedProducts.map(p => {
            const setor = setores.find(s => s.id === p.setor_responsavel_id)?.nome || '-';
            const cmv = p.cmv_produto_valor ?? p.custo_total_estimado ?? 0;
            const rendKg = p.rendimento_kg || 0;
            const rendGr = rendKg * 1000;
            const preco = p.preco_venda || 0;

            return {
                "Setor": setor,
                "Produto/Receita": p.nome_receita,
                "CMV (R$)": cmv,
                "Rendimento (Kg)": rendKg,
                "Rendimento (g)": rendGr,
                "Preço de Venda (R$)": preco
            };
        });

        const ws = utils.json_to_sheet(exportData);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Produtos Finais");
        writeFile(wb, "produtos_finais.xlsx");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Produtos Finais</h2>

                <button
                    onClick={handleExport}
                    className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm"
                    title="Baixar planilha Excel"
                >
                    <Download size={18} className="mr-2" />
                    Exportar Excel
                </button>
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
                    title="Filtrar por Setor"
                >
                    <option value="All">Todos os Setores</option>
                    {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>

                <select
                    value={filterSpecialty}
                    onChange={(e) => setFilterSpecialty(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 border border-blue-300 bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900"
                    title="Filtrar por Especialidade"
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
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('setor')}
                                >
                                    <div className="flex items-center">Setor {getSortIcon('setor')}</div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('receita')}
                                >
                                    <div className="flex items-center">Receita {getSortIcon('receita')}</div>
                                </th>
                                <th
                                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('cmv')}
                                >
                                    <div className="flex items-center justify-end">CMV R$ (do produto) {getSortIcon('cmv')}</div>
                                </th>
                                <th
                                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('rendimento_kg')}
                                >
                                    <div className="flex items-center justify-end">Rendimento (kg) {getSortIcon('rendimento_kg')}</div>
                                </th>
                                <th
                                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('rendimento_gr')}
                                >
                                    <div className="flex items-center justify-end">Rendimento (gr) {getSortIcon('rendimento_gr')}</div>
                                </th>
                                <th
                                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => handleSort('preco')}
                                >
                                    <div className="flex items-center justify-end">Preço Venda {getSortIcon('preco')}</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedProducts.map((rec) => (
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
                            {sortedProducts.length === 0 && (
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
