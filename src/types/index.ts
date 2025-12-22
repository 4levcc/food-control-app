export * from './supabase';

import type { Database } from './supabase';

// Helper types for easier use
export type Insumo = Database['public']['Tables']['insumos']['Row'];
export type FichaTecnica = Database['public']['Tables']['fichas_tecnicas']['Row'];
export type FtIngrediente = Database['public']['Tables']['ft_ingredientes']['Row'];

export type CategoriaInsumo = Database['public']['Tables']['categorias_insumos']['Row'];
export type CategoriaSintetica = Database['public']['Tables']['categorias_sinteticas']['Row'];
export type UnidadeMedida = Database['public']['Tables']['unidades_medida']['Row'];
export type SetorResponsavel = Database['public']['Tables']['setores_responsaveis']['Row'];
export type Especialidade = Database['public']['Tables']['especialidades']['Row'];
export type Dificuldade = Database['public']['Tables']['dificuldades']['Row'];

// KEEPING OLD TYPES FOR BACKWARD COMPATIBILITY WHERE NEEDED
// If existing legacy components break, we might need to re-add 'Ingredient' etc. but mapped to Insumo.
// Given strict instructions to update IngredientForm/Ingredients.tsx, we focus on the new types.

export interface Ingredient {
    id: string;
    code?: string;
    description: string;
    category: string;
    syntheticCategory: string;
    purchaseCost: number;
    purchaseQuantity: number;
    unitWeight: number;
    referenceUnit: 'g' | 'ml';
    realCost: number;
    correctionFactor: number;
    name: string;
    price: number;
    unit: string;
    supplier: string;
    lastUpdated: string;
}

export interface Supplier {
    id: string;
    name: string;
    contact?: string;
}

export interface RecipeItem {
    ingredientId: string;
    quantity: number;
    usageHint?: string;
}

export interface Recipe {
    id: string;
    name: string;
    category: string;
    productType: 'Base' | 'Final';
    sector: 'Brigadeiro' | 'Chocolate' | 'Bolos' | 'Artes e Decoração' | 'Outros';
    code?: string;
    isIngredient: boolean;
    yieldKg: number;
    yieldGrams: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    time: string;
    items: RecipeItem[];
    createdAt: string;
    salePrice?: number;
    specialty?: string;
}

