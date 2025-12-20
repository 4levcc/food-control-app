import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Ingredient, Recipe } from '../types';
import { generateIngredientCode } from '../utils/codeGenerator';

const STORAGE_KEYS = {
    INGREDIENTS: 'foodcontrol_ingredients',
    RECIPES: 'foodcontrol_recipes',
    SETTINGS: 'foodcontrol_settings',
};

// Default Constants
const DEFAULT_CATEGORIES = [
    'Bebidas', 'Confeitaria', 'Embalagens', 'Gorduras', 'Laticínios',
    'Chocolates e Cacau', 'Mercearia Seca', 'Proteínas', 'Saborizantes'
];

const DEFAULT_SYNTHETIC_CATEGORIES = [
    'Insumo de produção pronto',
    'Insumo de produção produzido',
    'Embalagens',
    'Outros insumos'
];

const DEFAULT_SECTORS = ['Brigadeiro', 'Chocolate', 'Bolos', 'Artes e Decoração', 'Outros'];

const DEFAULT_SPECIALTIES = [
    'Bem-Casado', 'Bem-Nascido', 'Bem-Vivido', 'Bico & Flores de Açúcar',
    'Biscoitos Amanteigados', 'Bolo de Rolo', 'Brigadeiros de Tacho',
    'Brownie & Suspiro', 'Butter Cream', 'Chocolates', 'Cocada',
    'Digestivos', 'Doces', 'Especiais', 'Gourmets', 'Meia Esfera',
    'Nacionais', 'Naked Cake', 'Palha Italiana',
    'Papel de Arroz & Flores de Açúcar', 'Pasta Americana & Flores de Açúcar',
    'Pintura & Flores de Açúcar', 'Rendado', 'Rendado & Flores de Açúcar',
    'Semi Naked', 'Sobremesas'
];

export type SettingType = 'category' | 'syntheticCategory' | 'sector' | 'specialty';

interface Settings {
    categories: string[];
    syntheticCategories: string[];
    sectors: string[];
    specialties: string[];
}

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

    // Settings
    settings: Settings;
    addSetting: (type: SettingType, value: string) => void;
    updateSetting: (type: SettingType, oldValue: string, newValue: string) => void;
    deleteSetting: (type: SettingType, value: string, replaceWith?: string) => void;
    deleteSettings: (type: SettingType, values: string[], replaceWith?: string) => void;
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

    const [settings, setSettings] = useState<Settings>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            if (stored) return JSON.parse(stored);
        } catch (e) {
            console.error("Failed to load settings", e);
        }
        return {
            categories: DEFAULT_CATEGORIES,
            syntheticCategories: DEFAULT_SYNTHETIC_CATEGORIES,
            sectors: DEFAULT_SECTORS,
            specialties: DEFAULT_SPECIALTIES
        };
    });

    // Persistence Effects
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(ingredients));
    }, [ingredients]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(recipes));
    }, [recipes]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }, [settings]);

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

    // Settings Actions
    const addSetting = (type: SettingType, value: string) => {
        setSettings(prev => {
            const listKey = type === 'category' ? 'categories' :
                type === 'syntheticCategory' ? 'syntheticCategories' :
                    type === 'sector' ? 'sectors' : 'specialties';

            if (prev[listKey].includes(value)) return prev;

            return {
                ...prev,
                [listKey]: [...prev[listKey], value].sort()
            };
        });
    };

    const updateSetting = (type: SettingType, oldValue: string, newValue: string) => {
        // 1. Update List
        setSettings(prev => {
            const listKey = type === 'category' ? 'categories' :
                type === 'syntheticCategory' ? 'syntheticCategories' :
                    type === 'sector' ? 'sectors' : 'specialties';

            return {
                ...prev,
                [listKey]: prev[listKey].map(item => item === oldValue ? newValue : item).sort()
            };
        });

        // 2. Update Entities
        if (type === 'category') {
            setIngredients(prev => prev.map(ing => ing.category === oldValue ? { ...ing, category: newValue } : ing));
        } else if (type === 'syntheticCategory') {
            setIngredients(prev => prev.map(ing => ing.syntheticCategory === oldValue ? { ...ing, syntheticCategory: newValue } : ing));
        } else if (type === 'sector') {
            setRecipes(prev => prev.map(rec => rec.sector === oldValue ? { ...rec, sector: newValue as any } : rec));
        } else if (type === 'specialty') {
            setRecipes(prev => prev.map(rec => rec.specialty === oldValue ? { ...rec, specialty: newValue } : rec));
        }
    };

    const deleteSetting = (type: SettingType, value: string, replaceWith?: string) => {
        // 1. Update List
        setSettings(prev => {
            const listKey = type === 'category' ? 'categories' :
                type === 'syntheticCategory' ? 'syntheticCategories' :
                    type === 'sector' ? 'sectors' : 'specialties';

            return {
                ...prev,
                [listKey]: prev[listKey].filter(item => item !== value)
            };
        });

        // 2. Update Entities
        const newVal = replaceWith || '';
        if (type === 'category') {
            setIngredients(prev => prev.map(ing => ing.category === value ? { ...ing, category: newVal } : ing));
        } else if (type === 'syntheticCategory') {
            setIngredients(prev => prev.map(ing => ing.syntheticCategory === value ? { ...ing, syntheticCategory: newVal } : ing));
        } else if (type === 'sector') {
            setRecipes(prev => prev.map(rec => rec.sector === value ? { ...rec, sector: newVal as any } : rec));
        } else if (type === 'specialty') {
            setRecipes(prev => prev.map(rec => rec.specialty === value ? { ...rec, specialty: newVal } : rec));
        }
    };

    const deleteSettings = (type: SettingType, values: string[], replaceWith?: string) => {
        // 1. Update List
        setSettings(prev => {
            const listKey = type === 'category' ? 'categories' :
                type === 'syntheticCategory' ? 'syntheticCategories' :
                    type === 'sector' ? 'sectors' : 'specialties';

            return {
                ...prev,
                [listKey]: prev[listKey].filter(item => !values.includes(item))
            };
        });

        // 2. Update Entities
        const newVal = replaceWith || '';
        if (type === 'category') {
            setIngredients(prev => prev.map(ing => values.includes(ing.category) ? { ...ing, category: newVal } : ing));
        } else if (type === 'syntheticCategory') {
            setIngredients(prev => prev.map(ing => values.includes(ing.syntheticCategory) ? { ...ing, syntheticCategory: newVal } : ing));
        } else if (type === 'sector') {
            setRecipes(prev => prev.map(rec => values.includes((rec.sector as string)) ? { ...rec, sector: newVal as any } : rec));
        } else if (type === 'specialty') {
            setRecipes(prev => prev.map(rec => values.includes((rec.specialty || '')) ? { ...rec, specialty: newVal } : rec));
        }
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
            settings,
            addSetting,
            updateSetting,
            deleteSetting,
            deleteSettings
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
