import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Recipe, Ingredient } from '../types';

export const exportRecipePDF = (
    recipe: Recipe,
    ingredients: Ingredient[],
    mode: 'full' | 'production'
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- Helper Functions ---
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    // --- Header ---
    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text(recipe.name, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Código: ${recipe.code || 'N/A'}`, 14, 28);
    doc.text(`Setor: ${recipe.sector}`, 14, 33);

    // Header Right Side
    doc.setFontSize(10);
    doc.text(`Preparo: ${recipe.time}`, pageWidth - 14, 28, { align: 'right' });
    doc.text(`Dificuldade: ${recipe.difficulty}`, pageWidth - 14, 33, { align: 'right' });

    // --- Yield Section ---
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 40, pageWidth - 28, 12, 'F');
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text('Rendimento Final:', 18, 47);
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`${recipe.yieldKg} kg / ${(recipe.yieldKg * 1000).toFixed(0)} g`, 50, 47.5);

    // --- Ingredients Table ---
    let tableBody = recipe.items.map(item => {
        const ing = ingredients.find(i => i.id === item.ingredientId);
        if (!ing) return [];

        const unitCost = (ing.price || 0) * (ing.correctionFactor || 1);
        const totalCost = unitCost * item.quantity;

        let row = [
            ing.name,
            `${item.quantity} ${ing.unit}`, // Quantity + Unit
            item.usageHint || '-'
        ];

        if (mode === 'full') {
            row.push(formatCurrency(unitCost));
            row.push(formatCurrency(totalCost));
        }

        return row;
    });

    // Define Columns
    let head = [['Ingrediente', 'Quantidade', 'Observação']];
    if (mode === 'full') {
        head[0].push('Custo Unit.', 'Custo Total');
    }

    autoTable(doc, {
        startY: 60,
        head: head,
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] }, // Blue-600
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: mode === 'full' ? {
            0: { cellWidth: 'auto' },
            3: { halign: 'right' },
            4: { halign: 'right', fontStyle: 'bold' }
        } : {}
    });

    // --- Financials (Full Mode Only) ---
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY + 10;

    if (mode === 'full') {
        // Calculate Totals
        const totalCost = recipe.items.reduce((sum, item) => {
            const ing = ingredients.find(i => i.id === item.ingredientId);
            const unitCost = (ing?.price || 0) * (ing?.correctionFactor || 1);
            return sum + (unitCost * item.quantity);
        }, 0);

        const yieldKg = recipe.yieldKg || 1;
        const cmvKg = totalCost / yieldKg;
        const cmvUnit = cmvKg / 1000; // per gram

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Análise Financeira', 14, finalY);

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Indicador', 'Valor']],
            body: [
                ['Custo Total da Receita', formatCurrency(totalCost)],
                ['CMV (por Kg)', formatCurrency(cmvKg)],
                ['CMV (por Grama)', `R$ ${cmvUnit.toFixed(4)}`],
                ['Preço de Venda (Sugerido/Atual)', formatCurrency(recipe.salePrice || 0)],
            ],
            theme: 'plain',
            styles: { fontSize: 10 },
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
            tableWidth: 100
        });
    }

    // --- Footer ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);

        // Line 1: Attribution
        const attribution = "Desenvolvido por INOVARE Gestão Estratégica + Elaine Duarte Consultoria Gastronômica para Benta Brigaderia";
        doc.text(attribution, pageWidth / 2, pageHeight - 15, { align: 'center' });

        // Line 2: Brand + Page Number
        doc.text(`FoodControl - Página ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // Save
    const sanitizeFilename = (name: string) => {
        return name.replace(/[<>:"/\\|?*]/g, '');
    };

    const suffix = mode === 'full' ? 'gerencia' : 'produção';
    const fileName = `FT - ${sanitizeFilename(recipe.name)} - ${suffix}.pdf`;
    doc.save(fileName);
};

export const exportShoppingListPDF = (
    items: { name: string; quantity: number; unit: string; cost: number; supplier: string }[],
    totalCost: number,
    groupedItems?: {
        final: { name: string; quantity: number; unit: string; cost: number; supplier: string }[],
        base: { name: string; quantity: number; unit: string; cost: number; supplier: string }[]
    }
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Helper
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text('Lista de Compras', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 14, 28);

    // Total Cost
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 35, pageWidth - 28, 14, 'F'); // Increased height
    doc.setFontSize(12); // Slightly larger
    doc.setTextColor(60);
    doc.text('Custo Estimado Total:', 18, 44);
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235); // Blue
    doc.text(formatCurrency(totalCost), pageWidth - 18, 44, { align: 'right' });

    // Table Logic
    const renderTable = (data: typeof items, startY: number, title?: string) => {
        if (data.length === 0) return startY;

        if (title) {
            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.text(title, 14, startY - 5);
        }

        const tableBody = data.map(item => [
            item.name,
            item.supplier || '-',
            `${item.quantity.toFixed(2)} ${item.unit}`,
            formatCurrency(item.cost)
        ]);

        autoTable(doc, {
            startY: startY,
            head: [['Item', 'Fornecedor', 'Qtd.', 'Estimativa']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: title?.includes('Base') ? [234, 88, 12] : [37, 99, 235] }, // Orange for Base, Blue for Final
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: {
                2: { halign: 'right' },
                3: { halign: 'right', fontStyle: 'bold' }
            }
        });

        // @ts-ignore
        return doc.lastAutoTable.finalY + 15;
    };

    if (groupedItems) {
        let currentY = 65;
        if (groupedItems.final.length > 0) {
            currentY = renderTable(groupedItems.final, currentY, 'Itens de Produtos Finais');
        }
        if (groupedItems.base.length > 0) {
            renderTable(groupedItems.base, currentY, 'Itens de Receitas Base');
        }
    } else {
        renderTable(items, 60);
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);

        // Line 1: Attribution
        const attribution = "Desenvolvido por INOVARE Gestão Estratégica + Elaine Duarte Consultoria Gastronômica para Benta Brigaderia";
        doc.text(attribution, pageWidth / 2, pageHeight - 15, { align: 'center' });

        // Line 2: Brand + Page Number
        doc.text(`FoodControl - Página ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    doc.save(`Lista_de_Compras_${new Date().toISOString().split('T')[0]}.pdf`);
};
