import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Ingredient, Recipe } from '../types';
import { generateIngredientCode } from '../utils/codeGenerator';

const STORAGE_KEYS = {
    INGREDIENTS: 'foodcontrol_ingredients',
    RECIPES: 'foodcontrol_recipes',
};

interface FoodControlContextType {
    ingredients: Ingredient[];
    recipes: Recipe[];
    addIngredient: (ingredient: Ingredient) => void;
    addIngredients: (ingredients: Ingredient[]) => void;
    updateIngredient: (id: string, updates: Partial<Ingredient>) => void;
    deleteIngredient: (id: string) => void;
    deleteIngredients: (ids: string[]) => void;
    addRecipe: (recipe: Recipe) => void;
    updateRecipe: (id: string, updates: Partial<Recipe>) => void;
    deleteRecipe: (id: string) => void;
    deleteRecipes: (ids: string[]) => void;
}

const FoodControlContext = createContext<FoodControlContextType | undefined>(undefined);

export const FoodControlProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.INGREDIENTS);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error("Failed to load ingredients", e);
            return [];
        }
    });

    const [recipes, setRecipes] = useState<Recipe[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.RECIPES);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error("Failed to load recipes", e);
            return [];
        }
    });

    // Persistence Effects
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(ingredients));
    }, [ingredients]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(recipes));
    }, [recipes]);

    // Actions
    const addIngredient = (ingredient: Ingredient) => {
        setIngredients((prev) => {
            const code = ingredient.code || generateIngredientCode(
                ingredient.syntheticCategory || 'GENERIC',
                prev.map(i => i.code || '')
            );
            return [...prev, { ...ingredient, code }];
        });
    };

    const addIngredients = (newIngredients: Ingredient[]) => {
        setIngredients((prev) => {
            let currentCodes = prev.map(i => i.code || '');
            const added = newIngredients.map(ing => {
                const code = ing.code || generateIngredientCode(
                    ing.syntheticCategory || 'GENERIC',
                    currentCodes
                );
                currentCodes.push(code);
                return { ...ing, code };
            });
            return [...prev, ...added];
        });
    };

    const updateIngredient = (id: string, updates: Partial<Ingredient>) => {
        setIngredients((prev) =>
            prev.map((ing) => (ing.id === id ? { ...ing, ...updates } : ing))
        );
    };

    const deleteIngredient = (id: string) => {
        setIngredients((prev) => prev.filter((ing) => ing.id !== id));
    };

    const deleteIngredients = (ids: string[]) => {
        setIngredients((prev) => prev.filter((ing) => !ids.includes(ing.id)));
    };

    const addRecipe = (recipe: Recipe) => {
        setRecipes((prev) => [...prev, recipe]);
    };

    const updateRecipe = (id: string, updates: Partial<Recipe>) => {
        setRecipes((prev) =>
            prev.map((rec) => (rec.id === id ? { ...rec, ...updates } : rec))
        );
    };

    const deleteRecipe = (id: string) => {
        setRecipes((prev) => prev.filter((rec) => rec.id !== id));
    };

    const deleteRecipes = (ids: string[]) => {
        setRecipes((prev) => prev.filter((rec) => !ids.includes(rec.id)));
    };

    return (
        <FoodControlContext.Provider value={{
            ingredients,
            recipes,
            addIngredient,
            addIngredients,
            updateIngredient,
            deleteIngredient,
            deleteIngredients,
            addRecipe,
            updateRecipe,
            deleteRecipe,
            deleteRecipes,
        }}>
            {children}
        </FoodControlContext.Provider>
    );
};

export const useStore = () => {
    const context = useContext(FoodControlContext);
    if (context === undefined) {
        throw new Error('useStore must be used within a FoodControlProvider');
    }
    return context;
};
