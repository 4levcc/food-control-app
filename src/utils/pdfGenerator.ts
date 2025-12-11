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
    const fileName = `${recipe.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${mode}.pdf`;
    doc.save(fileName);
};
