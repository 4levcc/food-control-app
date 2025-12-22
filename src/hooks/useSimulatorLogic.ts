
import { useState, useCallback, useEffect } from 'react';
import type { FichaTecnica, FtIngrediente, Insumo, UnidadeMedida } from '../types';

interface ShoppingItem {
    id: string; // insumo_id
    name: string;
    quantity: number;
    unit: string;
    cost: number;
    supplier?: string;
    isBaseProduct?: boolean;
}

interface UseSimulatorLogicProps {
    recipes: FichaTecnica[];
    ftIngredientes: FtIngrediente[];
    insumos: Insumo[];
    unidades: UnidadeMedida[];
}

export function useSimulatorLogic({ recipes, ftIngredientes, insumos, unidades }: UseSimulatorLogicProps) {
    const [selectedRecipes, setSelectedRecipes] = useState<{ recipeId: string; quantity: number }[]>([]);
    const [explodeBaseProducts, setExplodeBaseProducts] = useState(false);
    const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
    const [totalCost, setTotalCost] = useState(0);

    // Helper to find unit symbol
    const getUnitSymbol = (id: string) => unidades.find(u => u.id === id)?.sigla || '-';

    const calculateList = useCallback(() => {
        let itemsMap = new Map<string, ShoppingItem>();

        // Helper for recursion
        const processRecipe = (recipe: FichaTecnica, batchQty: number, level = 0) => {
            // Safety break for recursion
            if (level > 10) return;

            const ingredients = ftIngredientes.filter(ft => ft.ft_id === recipe.id);

            ingredients.forEach(ing => {
                const insumo = insumos.find(i => i.id === ing.insumo_id);
                if (!insumo) return;

                // Check if this insumo is actually a Base Product Recipe
                const baseRecipe = recipes.find(r => r.tipo_produto === 'Base' && r.nome_receita === insumo.nome_padronizado);

                if (explodeBaseProducts && baseRecipe) {
                    // RECURSION
                    let requiredAmountInKg = ing.quantidade_utilizada;
                    const unit = unidades.find(u => u.id === ing.unidade_utilizada_id);

                    if (unit?.sigla.toLowerCase() === 'g') {
                        requiredAmountInKg = ing.quantidade_utilizada / 1000;
                    } else if (unit?.sigla.toLowerCase() === 'kg') {
                        requiredAmountInKg = ing.quantidade_utilizada;
                    }

                    const baseYieldKg = baseRecipe.rendimento_kg || 1;
                    const subBatchCount = (requiredAmountInKg / baseYieldKg) * batchQty;

                    processRecipe(baseRecipe, subBatchCount, level + 1);

                } else {
                    // TERMINAL INGREDIENT
                    const qtyNeeded = ing.quantidade_utilizada * batchQty;

                    const existing = itemsMap.get(insumo.id);

                    const cost = insumo.custo_compra || 0;
                    const purchaseQty = insumo.quantidade_compra || 1;
                    const weight = insumo.peso_unidade || 1;
                    const factor = insumo.fator_correcao || 1;

                    const costPerPurchaseUnit = purchaseQty > 0 ? cost / purchaseQty : 0;
                    const costPerBaseUnit = weight > 0 ? costPerPurchaseUnit / weight : 0;
                    const realUnitCost = costPerBaseUnit * factor;

                    const estimatedCost = realUnitCost * qtyNeeded;

                    if (existing) {
                        itemsMap.set(insumo.id, {
                            ...existing,
                            quantity: existing.quantity + qtyNeeded,
                            cost: existing.cost + estimatedCost
                        });
                    } else {
                        itemsMap.set(insumo.id, {
                            id: insumo.id,
                            name: insumo.nome_padronizado,
                            quantity: qtyNeeded,
                            unit: getUnitSymbol(ing.unidade_utilizada_id),
                            cost: estimatedCost,
                            supplier: insumo.fornecedor || undefined,
                            isBaseProduct: !!baseRecipe
                        });
                    }
                }
            });
        };

        selectedRecipes.forEach(selection => {
            const recipe = recipes.find(r => r.id === selection.recipeId);
            if (!recipe) return;

            const yieldVal = recipe.rendimento_kg || 1;
            const multiplier = yieldVal > 0 ? selection.quantity / yieldVal : selection.quantity;

            processRecipe(recipe, multiplier);
        });

        const items = Array.from(itemsMap.values());
        setShoppingList(items);
        setTotalCost(items.reduce((acc, curr) => acc + curr.cost, 0));

    }, [selectedRecipes, explodeBaseProducts, recipes, ftIngredientes, insumos, unidades]);

    // FIX: Clear list if selection is empty
    useEffect(() => {
        if (selectedRecipes.length === 0 && shoppingList.length > 0) {
            setShoppingList([]);
            setTotalCost(0);
        }
    }, [selectedRecipes, shoppingList.length]);

    return {
        selectedRecipes,
        setSelectedRecipes,
        explodeBaseProducts,
        setExplodeBaseProducts,
        shoppingList,
        totalCost,
        calculateList
    };
}
