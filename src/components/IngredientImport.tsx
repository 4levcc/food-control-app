import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import type { Ingredient } from '../types';

export const IngredientImport: React.FC = () => {
    const { addIngredients } = useStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleDownloadTemplate = () => {
        const headers = [
            'Nome Padronizado',
            'Descrição (Benta)',
            'Categoria',
            'Categoria Sintética',
            'Fornecedor',
            'Custo Compra',
            'Qtd Comprada',
            'Peso Unidade',
            'Unidade Ref (g/ml)',
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
                'Peso Unidade': 1,
                'Unidade Ref (g/ml)': 'g',
                'Fator Correção': 1.0
            },
            {
                'Nome Padronizado': 'Morango',
                'Descrição (Benta)': 'Morango da época',
                'Categoria': 'Hortifruti',
                'Categoria Sintética': 'Insumo de produção pronto',
                'Fornecedor': 'Ceasa',
                'Custo Compra': 10.00,
                'Qtd Comprada': 1,
                'Peso Unidade': 1,
                'Unidade Ref (g/ml)': 'kg', // Note: User might put kg, we handle it
                'Fator Correção': 1.2
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

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                processData(jsonData);
            } catch (err) {
                setStatus('error');
                setMessage('Erro ao ler arquivo Excel.');
                console.error(err);
            }
        };
        reader.readAsBinaryString(file);

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const processData = (data: any[]) => {
        try {
            const importedIngredients: Ingredient[] = data.map((row: any) => {
                const purchaseCost = parseFloat(row['Custo Compra']) || 0;
                const purchaseQty = parseFloat(row['Qtd Comprada']) || 1;
                const unitWeight = parseFloat(row['Peso Unidade']) || 1;
                const correctionFactor = parseFloat(row['Fator Correção']) || 1;

                const costPerUnit = purchaseCost / purchaseQty;

                // Check if unit is kg or L and convert if strictly needed, 
                // but our app uses 'g' or 'ml' as ref. 
                // If user enters 'kg', we treat '1 kg' as '1000 g' typically?
                // The prompt logic was simpler: Base Cost / Weight.
                // Let's keep consistent with existing logic.
                const costPerRefUnit = costPerUnit / unitWeight;

                const realCost = costPerUnit * correctionFactor;


                return {
                    id: crypto.randomUUID(),
                    name: row['Nome Padronizado'] || 'Unnamed',
                    description: row['Descrição (Benta)'] || '',
                    category: row['Categoria'] || 'Outros',
                    syntheticCategory: row['Categoria Sintética'] || 'Outros',
                    supplier: row['Fornecedor'] || '',
                    purchaseCost,
                    purchaseQuantity: purchaseQty,
                    unitWeight,
                    referenceUnit: (row['Unidade Ref (g/ml)'] === 'ml' ? 'ml' : 'g'),
                    realCost: realCost, // Calculated
                    correctionFactor,
                    price: costPerRefUnit, // Legacy map
                    unit: (row['Unidade Ref (g/ml)'] === 'ml' ? 'ml' : 'g'),
                    lastUpdated: new Date().toISOString()
                };
            });

            addIngredients(importedIngredients);
            setStatus('success');
            setMessage(`${importedIngredients.length} insumos importados com sucesso!`);
            setTimeout(() => setStatus('idle'), 3000);
        } catch (err) {
            setStatus('error');
            setMessage('Erro ao processar dados.');
            console.error(err);
        }
    };

    return (
        <div className="flex items-center space-x-2">
            <button
                onClick={handleDownloadTemplate}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 bg-white"
                title="Baixar Template Excel"
            >
                <Download size={18} className="mr-2" />
                <span className="text-sm font-medium">Template</span>
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
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    title="Importar Excel"
                >
                    <Upload size={18} className="mr-2" />
                    <span className="text-sm font-medium">Importar</span>
                </button>
            </div>

            {status === 'success' && (
                <div className="flex items-center text-green-600 text-sm animate-fade-in">
                    <CheckCircle size={16} className="mr-1" />
                    {message}
                </div>
            )}

            {status === 'error' && (
                <div className="flex items-center text-red-600 text-sm animate-fade-in">
                    <XCircle size={16} className="mr-1" />
                    {message}
                </div>
            )}
        </div>
    );
};
