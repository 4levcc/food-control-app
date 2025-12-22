import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FichaTecnica, Insumo, FtIngrediente, UnidadeMedida } from '../types';

interface ExportData {
    recipe: FichaTecnica;
    ingredients: FtIngrediente[];
    insumos: Insumo[];
    unidades: UnidadeMedida[];
    sectorName: string;
    difficultyName: string;
}

export const exportRecipePDF = (
    data: ExportData,
    mode: 'managerial' | 'production'
) => {
    const { recipe, ingredients, insumos, unidades, sectorName, difficultyName } = data;
    const doc = new jsPDF();
    const isManagerial = mode === 'managerial';

    // -- COLORS --
    const PRIMARY_COLOR = [23, 37, 84] as [number, number, number]; // #172554 (Blue 950)
    const SECONDARY_COLOR = [241, 245, 249] as [number, number, number]; // #f1f5f9 (Slate 100)
    const ACCENT_COLOR = [59, 130, 246] as [number, number, number]; // #3b82f6 (Blue 500)
    const TEXT_COLOR = [30, 41, 59] as [number, number, number]; // #1e293b (Slate 800)

    // Helper for footer
    const addFooter = () => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            const text = "Desenvolvido por INOVARE Gestão Estratégica + Elaine Duarte Consultoria Gastronômica para Benta Brigaderia";
            const textWidth = doc.getTextWidth(text);
            const x = (doc.internal.pageSize.width - textWidth) / 2;
            doc.text(text, x, doc.internal.pageSize.height - 10);
        }
    };

    // -- HEADER --
    doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text(recipe.nome_receita, 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(200, 230, 255);
    doc.text(mode === 'managerial' ? 'RELATÓRIO GERENCIAL' : 'FICHA DE PRODUÇÃO', 14, 28);

    // Add Date
    const today = new Date().toLocaleDateString('pt-BR');
    doc.text(`Gerado em: ${today}`, 150, 28);


    // -- BASIC INFO --
    const startY = 50;
    const yieldKg = recipe.rendimento_kg || 0;
    const yieldG = yieldKg * 1000;

    const infoData = [
        ['Código ID', recipe.codigo_id || '-'],
        ['Setor', sectorName],
        ['Rendimento', `${yieldKg.toFixed(3)} Kg  (${yieldG.toFixed(0)} g)`], // Added Grams
        ['Tempo de Preparo', recipe.tempo_preparo || '-'],
        ['Dificuldade', difficultyName],
    ];

    autoTable(doc, {
        startY: startY,
        body: infoData,
        theme: 'grid',
        styles: {
            fontSize: 10,
            cellPadding: 3,
            lineColor: [226, 232, 240],
            textColor: TEXT_COLOR
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50, fillColor: SECONDARY_COLOR },
            1: { cellWidth: 100 }
        },
        margin: { left: 14 }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    // -- INGREDIENTS --
    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text('Ingredientes', 14, currentY);

    // Underline
    doc.setLineWidth(0.5);
    doc.setDrawColor(...ACCENT_COLOR);
    doc.line(14, currentY + 2, 45, currentY + 2);

    currentY += 10;

    const tableHeaders = isManagerial
        ? ['Ingrediente', 'Qtd', 'Unid', 'Custo Unit.', 'Custo Total']
        : ['Ingrediente', 'Quantidade', 'Unidade', 'Observação'];

    const tableBody = ingredients.map(ing => {
        const insumo = insumos.find(i => i.id === ing.insumo_id);
        const unidade = unidades.find(u => u.id === ing.unidade_utilizada_id);

        let costUnit = 0;
        let costTotal = 0;

        if (isManagerial && insumo) {
            const cost = insumo.custo_compra || 0;
            const qty = insumo.quantidade_compra || 1;
            const weight = insumo.peso_unidade || 1;
            const factor = insumo.fator_correcao || 1;

            const costPerPurchaseUnit = qty > 0 ? cost / qty : 0;
            const costPerBaseUnit = weight > 0 ? costPerPurchaseUnit / weight : 0;
            const realUnitCost = costPerBaseUnit * factor;

            costUnit = realUnitCost;
            costTotal = realUnitCost * (ing.quantidade_utilizada || 0);
        }

        if (isManagerial) {
            return [
                insumo?.nome_padronizado || 'Desconhecido',
                ing.quantidade_utilizada?.toString() || '0',
                unidade?.sigla || '-',
                `R$ ${costUnit.toFixed(4)}`,
                `R$ ${costTotal.toFixed(2)}`
            ];
        } else {
            return [
                insumo?.nome_padronizado || 'Desconhecido',
                ing.quantidade_utilizada?.toString() || '0',
                unidade?.sigla || '-',
                ing.dica_uso || ''
            ];
        }
    });

    autoTable(doc, {
        startY: currentY,
        head: [tableHeaders],
        body: tableBody,
        theme: 'striped',
        styles: { fontSize: 10, textColor: TEXT_COLOR },
        headStyles: {
            fillColor: PRIMARY_COLOR,
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: isManagerial
            ? { 0: { cellWidth: 'auto' }, 4: { halign: 'right' } }
            : { 0: { cellWidth: 'auto' } }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // -- FINANCIAL SUMMARY (Managerial Only) --
    if (isManagerial) {
        doc.setFontSize(14);
        doc.setTextColor(...PRIMARY_COLOR);
        doc.text('Resumo Financeiro', 14, currentY);
        doc.line(14, currentY + 2, 60, currentY + 2); // Underline
        currentY += 10;

        const totalCost = recipe.cmv_produto_valor || recipe.custo_total_estimado || 0;
        const cmvPerKg = yieldKg > 0 ? totalCost / yieldKg : 0;
        const cmvPerGram = yieldKg > 0 ? totalCost / (yieldKg * 1000) : 0;
        const salePrice = recipe.preco_venda || 0;
        const margin = salePrice > 0 ? ((salePrice - totalCost) / salePrice) * 100 : 0;
        const cmvPercent = salePrice > 0 ? (totalCost / salePrice) * 100 : 0; // NEW: CMV %

        const financialData = [
            ['Custo Total da Receita', `R$ ${totalCost.toFixed(2)}`],
            ['CMV por Kg', `R$ ${cmvPerKg.toFixed(2)}`],
            ['CMV Unitário (g)', `R$ ${cmvPerGram.toFixed(4)}`],
            ['Preço de Venda Sugerido', `R$ ${salePrice.toFixed(2)}`],
            ['CMV %', `${cmvPercent.toFixed(2)}%`], // NEW Row
            ['Margem Bruta Estimada', `${margin.toFixed(2)}%`]
        ];

        autoTable(doc, {
            startY: currentY,
            body: financialData,
            theme: 'grid',
            styles: {
                fontSize: 10,
                fontStyle: 'bold',
                textColor: TEXT_COLOR,
                lineColor: [226, 232, 240]
            },
            columnStyles: {
                0: { cellWidth: 80, fillColor: SECONDARY_COLOR },
                1: { cellWidth: 50, halign: 'right' }
            }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // -- OBSERVATIONS --
    if (recipe.observacoes) {
        // Build a page break check roughly? autoTable handles it, but for text manually...
        // Let's ensure we have space or add page.
        const pageHeight = doc.internal.pageSize.height;
        if (currentY > pageHeight - 40) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(...PRIMARY_COLOR);
        doc.text('Modo de Preparo / Observações', 14, currentY);
        doc.line(14, currentY + 2, 90, currentY + 2);
        currentY += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50);

        const splitText = doc.splitTextToSize(recipe.observacoes, 180);
        doc.text(splitText, 14, currentY);
    }

    // Apply Footer to all pages
    addFooter();

    // Save
    const suffix = isManagerial ? 'gerencia' : 'producao';
    const sanitizedName = recipe.nome_receita.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`FT-${sanitizedName}-${suffix}.pdf`);
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
