import React, { useRef, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Insumo, UnidadeMedida } from '../types';

export const IngredientImport: React.FC<{ onImportSuccess?: () => void }> = ({ onImportSuccess }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    // Lookups (fetched on mount)
    const [units, setUnits] = useState<UnidadeMedida[]>([]);

    useEffect(() => {
        const fetchLookups = async () => {
            const { data } = await supabase.from('unidades_medida').select('*');
            if (data) setUnits(data);
        };
        fetchLookups();
    }, []);

    const handleDownloadTemplate = () => {
        const headers = [
            'Nome Padronizado',
            'Descrição (Benta)',
            'Categoria',
            'Categoria Sintética',
            'Fornecedor',
            'Custo Compra',
            'Qtd Comprada',
            'Unidade Compra', // Keeping in template for reference even if form hides it? Or remove? User said "exclua o campo", implying form. Template usually matches import.
            // But verify "Peso Unidade" and "Unidade Ref (g/ml)"
            'Peso Unidade', // Changed from 'Peso da Unidade'
            'un Ref (g/ml)', // Updated to match user request
            'Fator Correção'
        ];

        const exampleData = [
            {
                'Nome Padronizado': 'Leite Integral',
                'Descrição (Benta)': 'Leite 1L Italac',
                'Categoria': 'Laticínios',
                'Categoria Sintética': 'Insumo de produção pronto',
                'Fornecedor': 'Atacadão',
                'Custo Compra': 60.00,
                'Qtd Comprada': 12,
                'Unidade Compra': 'un',
                'Peso Unidade': 1,
                'un Ref (g/ml)': 'L',
                'Fator Correção': 1.0
            }
        ];

        const ws = XLSX.utils.json_to_sheet(exampleData, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template Insumos");
        XLSX.writeFile(wb, "template_insumos.xlsx");
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setStatus('loading');
        setMessage('Lendo arquivo...');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                await processData(jsonData);
            } catch (err) {
                setStatus('error');
                setMessage('Erro ao ler arquivo Excel.');
                console.error(err);
            }
        };
        reader.readAsBinaryString(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const processData = async (data: any[]) => {
        try {
            setMessage(`Analisando ${data.length} registros...`);

            // 1. Extract Unique Categories and Synthetic Categories from Excel
            const excelCategories = new Set<string>();
            const excelSinCategories = new Set<string>();

            data.forEach(row => {
                if (row['Categoria']) excelCategories.add(row['Categoria'].toString().trim());
                if (row['Categoria Sintética']) excelSinCategories.add(row['Categoria Sintética'].toString().trim());
            });

            // 2. Fetch Existing Categories from DB
            const [dbCats, dbSinCats] = await Promise.all([
                supabase.from('categorias_insumos').select('*'),
                supabase.from('categorias_sinteticas').select('*')
            ]);

            if (dbCats.error) throw dbCats.error;
            if (dbSinCats.error) throw dbSinCats.error;

            // Maps for Case-Insensitive Lookup (Name -> ID)
            const catMap = new Map<string, string>();
            const sinCatMap = new Map<string, string>();

            dbCats.data.forEach(c => catMap.set(c.nome.toLowerCase(), c.id));
            dbSinCats.data.forEach(c => sinCatMap.set(c.nome.toLowerCase(), c.id));

            // 3. Identify Missing Categories
            const newCatsToInsert: { nome: string }[] = [];
            const newSinCatsToInsert: { nome: string }[] = [];

            excelCategories.forEach(catName => {
                if (!catMap.has(catName.toLowerCase())) {
                    newCatsToInsert.push({ nome: catName });
                }
            });

            excelSinCategories.forEach(catName => {
                if (!sinCatMap.has(catName.toLowerCase())) {
                    newSinCatsToInsert.push({ nome: catName });
                }
            });

            // 4. Batch Insert Missing Categories
            if (newCatsToInsert.length > 0) {
                setMessage(`Cadastrando ${newCatsToInsert.length} novas categorias...`);
                const { data: newCats, error } = await supabase
                    .from('categorias_insumos')
                    .insert(newCatsToInsert)
                    .select();
                if (error) throw error;
                newCats.forEach(c => catMap.set(c.nome.toLowerCase(), c.id));
            }

            if (newSinCatsToInsert.length > 0) {
                setMessage(`Cadastrando ${newSinCatsToInsert.length} novas categorias sintéticas...`);
                const { data: newSinCats, error } = await supabase
                    .from('categorias_sinteticas')
                    .insert(newSinCatsToInsert)
                    .select();
                if (error) throw error;
                newSinCats.forEach(c => sinCatMap.set(c.nome.toLowerCase(), c.id));
            }

            // 5. Prepare Ingredients for Upsert
            setMessage(`Processando ${data.length} insumos...`);
            const toUpsert: Partial<Insumo>[] = [];

            for (const row of data) {
                if (!row['Nome Padronizado']) continue;

                const catName = row['Categoria']?.toString().trim();
                const sinCatName = row['Categoria Sintética']?.toString().trim();
                const unitBuyName = row['Unidade Compra'];
                // Check for 'un Ref (g/ml)' as requested, fallback to 'Unidade Ref (g/ml)' or 'Unidade Peso'
                const unitWeightRef = row['un Ref (g/ml)'] || row['Unidade Ref (g/ml)'] || row['Unidade Peso'];

                const catId = catName ? catMap.get(catName.toLowerCase()) : null;
                const sinCatId = sinCatName ? sinCatMap.get(sinCatName.toLowerCase()) : null;

                const unitBuy = units.find(u => u.sigla.toLowerCase() === unitBuyName?.toString().trim().toLowerCase()) ||
                    units.find(u => u.sigla === 'un');

                // Map Unidade Ref to matching ID
                const unitWeight = units.find(u => u.sigla.toLowerCase() === unitWeightRef?.toString().trim().toLowerCase()) ||
                    units.find(u => u.sigla === 'kg'); // Default to KG if not found, or maybe 'g'?

                toUpsert.push({
                    nome_padronizado: row['Nome Padronizado'],
                    descricao_produto: row['Descrição (Benta)'] || '',
                    categoria_id: catId || null,
                    categoria_sintetica_id: sinCatId || null,
                    fornecedor: row['Fornecedor'],
                    custo_compra: parseFloat(row['Custo Compra']) || 0,
                    quantidade_compra: parseFloat(row['Qtd Comprada']) || 1,
                    unidade_compra_id: unitBuy?.id, // Will default to 'un' or similar if not found
                    peso_unidade: parseFloat(row['Peso Unidade']) || 1, // Updated column mapping
                    unidade_peso_id: unitWeight?.id,
                    fator_correcao: parseFloat(row['Fator Correção']) || 1
                });
            }

            if (toUpsert.length === 0) {
                throw new Error("Nenhum dado válido encontrado para importar.");
            }

            // 6. Upsert Ingredients (Match by nome_padronizado)
            // Note: Currently 'nome_padronizado' might not be a unique constraint in DB, 
            // but for 'upsert' to work as Update, we need a conflict target. 
            // If the user wants to update existing ones, we should use 'nome_padronizado' as key assuming it is unique conceptually.
            // If 'id' is verified, we used that. Here we rely on name.
            // We'll trust the user intention or adding distinct onConflict.

            const { error: upsertError } = await supabase
                .from('insumos')
                .upsert(toUpsert, { onConflict: 'nome_padronizado' });

            if (upsertError) throw upsertError;

            // Refresh Local State
            // No need to local fetch again as we rely on onImportSuccess to refresh parent


            setStatus('success');
            setMessage(`${toUpsert.length} insumos importados/atualizados com sucesso!`);
            if (onImportSuccess) onImportSuccess();
            setTimeout(() => setStatus('idle'), 4000);

        } catch (err: any) {
            setStatus('error');
            setMessage(err.message || 'Erro ao processar dados.');
            console.error(err);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleDownloadTemplate}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 bg-white"
                title="Baixar Template"
            >
                <Download size={18} className="mr-2" />
                <span className="hidden sm:inline">Template</span>
            </button>

            <div className="relative">
                <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={status === 'loading'}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    title="Importar Excel"
                >
                    <Upload size={18} className="mr-2" />
                    <span className="hidden sm:inline">{status === 'loading' ? '...' : 'Importar'}</span>
                </button>
            </div>

            {status === 'success' && (
                <span className="text-green-600 text-sm flex items-center font-medium">
                    <CheckCircle size={16} className="mr-1" /> Sucesso!
                </span>
            )}
            {status === 'error' && (
                <span className="text-red-600 text-sm flex items-center font-medium">
                    <XCircle size={16} className="mr-1" /> {message}
                </span>
            )}
        </div>
    );
};
