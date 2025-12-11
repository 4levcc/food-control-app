export interface Ingredient {
    id: string;
    code?: string; // Auto-generated code (e.g., LAT-0001)
    description: string; // Produto - Descrição (Benta)
    category: string;
    syntheticCategory: string; // Categoria Sintética
    purchaseCost: number; // Custo Compra (R$)
    purchaseQuantity: number; // Qtd. De Unidades Compradas
    unitWeight: number; // Peso da unidade (g/ml)
    referenceUnit: 'g' | 'ml'; // Un. Referência
    realCost: number; // Custo Real (R$)
    correctionFactor: number; // Fator Correção

    // Legacy fields mapped or kept for compatibility/display
    name: string; // Nome Padronizado - FT
    price: number; // This will likely map to Cost per Ref Unit or Real Cost depending on usage in recipes
    unit: string; // Kept for display, likely same as referenceUnit
    supplier: string;
    lastUpdated: string;
}

export interface RecipeItem {
    ingredientId: string;
    quantity: number; // in the same unit as the ingredient
    usageHint?: string;
}

export interface Recipe {
    id: string;
    name: string;
    category: string; // 'Base' or 'Final' -> Refined to 'productType' in UI but keeping field for compatibility or updating
    productType: 'Base' | 'Final';
    sector: 'Brigadeiro' | 'Chocolate' | 'Bolos' | 'Artes e Decoração' | 'Outros';
    code?: string;
    isIngredient: boolean;
    yieldKg: number;
    yieldGrams: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    time: string; // e.g., '45 min'
    items: RecipeItem[];
    createdAt: string;
    salePrice?: number; // Preço de Venda
    specialty?: string; // Especialidade (Only for Final Products)
}

export interface RecipeItem {
    ingredientId: string;
    quantity: number; // in the same unit as the ingredient
    usageHint?: string; // Dica de uso
}

export interface Supplier {
    id: string;
    name: string;
    contact?: string;
}
