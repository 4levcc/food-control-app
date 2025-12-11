import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import type { Recipe, RecipeItem } from '../types';

export const RecipeImport: React.FC = () => {
    const { addRecipe, ingredients } = useStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleDownloadTemplate = () => {
        const headers = [
            'Nome da Receita',
            'Tipo (Base/Final)',
            'Setor',
            'Dificuldade (Fácil/Médio/Difícil)',
            'Tempo Preparo',
            'Rendimento (KG)',
            'É Insumo? (Sim/Não)',
            'Ingrediente (Nome)',
            'Qtd Ingrediente',
            'Dica Uso'
        ];

        const exampleData = [
            {
                'Nome da Receita': 'Brigadeiro ao Leite',
                'Tipo (Base/Final)': 'Final',
                'Setor': 'Brigadeiro',
                'Dificuldade (Fácil/Médio/Difícil)': 'Fácil',
                'Tempo Preparo': '45 min',
                'Rendimento (KG)': 0.500,
                'É Insumo? (Sim/Não)': 'Não',
                'Ingrediente (Nome)': 'Leite Condensado Integral',
                'Qtd Ingrediente': 395,
                'Dica Uso': 'Caixa'
            },
            {
                'Nome da Receita': 'Brigadeiro ao Leite',
                'Tipo (Base/Final)': 'Final',
                'Setor': 'Brigadeiro',
                'Dificuldade (Fácil/Médio/Difícil)': 'Fácil',
                'Tempo Preparo': '45 min',
                'Rendimento (KG)': 0.500,
                'É Insumo? (Sim/Não)': 'Não',
                'Ingrediente (Nome)': 'Manteiga sem sal',
                'Qtd Ingrediente': 20,
                'Dica Uso': ''
            },
            {
                'Nome da Receita': 'Massa de Bolo Chocolate',
                'Tipo (Base/Final)': 'Base',
                'Setor': 'Bolos',
                'Dificuldade (Fácil/Médio/Difícil)': 'Médio',
                'Tempo Preparo': '60 min',
                'Rendimento (KG)': 1.200,
                'É Insumo? (Sim/Não)': 'Sim',
                'Ingrediente (Nome)': 'Farinha de Trigo',
                'Qtd Ingrediente': 500,
                'Dica Uso': 'Peneirada'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(exampleData, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template Receitas");
        XLSX.writeFile(wb, "template_receitas.xlsx");
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

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const processData = (data: any[]) => {
        try {
            // Group by Recipe Name
            const groups: { [key: string]: any[] } = {};
            data.forEach(row => {
                const name = row['Nome da Receita'];
                if (!name) return;
                if (!groups[name]) groups[name] = [];
                groups[name].push(row);
            });

            let successCount = 0;

            Object.entries(groups).forEach(([recipeName, rows]) => {
                const firstRow = rows[0]; // General info from first row

                const items: RecipeItem[] = [];

                rows.forEach(row => {
                    const ingName = row['Ingrediente (Nome)'];
                    if (!ingName) return;

                    // Fuzzy match or exact match ingredient
                    // We'll try strict lowercase match first
                    const targetName = ingName.toString().trim().toLowerCase();
                    const ingredient = ingredients.find(i => i.name.toLowerCase() === targetName);

                    if (ingredient) {
                        items.push({
                            ingredientId: ingredient.id,
                            quantity: parseFloat(row['Qtd Ingrediente']) || 0,
                            usageHint: row['Dica Uso'] || ''
                        });
                    }
                });

                // Map fields
                const productType = (firstRow['Tipo (Base/Final)'] === 'Base') ? 'Base' : 'Final';
                const sector = firstRow['Setor'] || 'Outros';

                // Validate Sector
                const validSectors = ['Brigadeiro', 'Chocolate', 'Bolos', 'Artes e Decoração', 'Outros'];
                const finalSector = validSectors.includes(sector) ? sector : 'Outros';

                // Difficulty map
                const diffMap: { [key: string]: 'Easy' | 'Medium' | 'Hard' } = {
                    'Fácil': 'Easy',
                    'Médio': 'Medium',
                    'Difícil': 'Hard'
                };
                const difficulty = diffMap[firstRow['Dificuldade (Fácil/Médio/Difícil)']] || 'Easy';

                const newRecipe: Recipe = {
                    id: crypto.randomUUID(),
                    name: recipeName,
                    productType: productType,
                    category: productType,
                    sector: finalSector as any,
                    difficulty: difficulty,
                    time: firstRow['Tempo Preparo'] || '',
                    yieldKg: parseFloat(firstRow['Rendimento (KG)']) || 0,
                    yieldGrams: (parseFloat(firstRow['Rendimento (KG)']) || 0) * 1000,
                    isIngredient: firstRow['É Insumo? (Sim/Não)'] === 'Sim',
                    items: items,
                    createdAt: new Date().toISOString(),
                    // Code will be empty, could act as trigger to auto-generate later or user fills it
                    code: ''
                };

                addRecipe(newRecipe);
                successCount++;
            });

            setStatus('success');
            setMessage(`${successCount} receitas importadas!`);
            setTimeout(() => setStatus('idle'), 4000);

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
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
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
