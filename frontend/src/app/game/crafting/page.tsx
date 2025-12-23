'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

type Recipe = Awaited<ReturnType<typeof api.getCraftingRecipes>>[0];
type Material = Awaited<ReturnType<typeof api.getCraftingMaterials>>[0];

const rarityColors: Record<string, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400',
  mythic: 'text-red-400',
};

const rarityBgColors: Record<string, string> = {
  common: 'bg-gray-500/10 border-gray-500/30',
  uncommon: 'bg-green-500/10 border-green-500/30',
  rare: 'bg-blue-500/10 border-blue-500/30',
  epic: 'bg-purple-500/10 border-purple-500/30',
  legendary: 'bg-yellow-500/10 border-yellow-500/30',
  mythic: 'bg-red-500/10 border-red-500/30',
};

export default function CraftingPage() {
  const [activeTab, setActiveTab] = useState<'recipes' | 'materials'>('recipes');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [crafting, setCrafting] = useState<string | null>(null);
  const [craftResult, setCraftResult] = useState<{ name: string; quantity: number } | null>(null);

  const loadData = async () => {
    try {
      const [recipesData, materialsData] = await Promise.all([
        api.getCraftingRecipes(),
        api.getCraftingMaterials(),
      ]);
      setRecipes(recipesData);
      setMaterials(materialsData);
    } catch (err) {
      console.error('Failed to load crafting data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCraft = async (recipeId: string) => {
    setCrafting(recipeId);
    try {
      const result = await api.craftItem(recipeId);
      setCraftResult({ name: result.crafted.name, quantity: result.crafted.quantity });
      await loadData();
      setTimeout(() => setCraftResult(null), 2000);
    } catch (err) {
      console.error('Craft failed:', err);
    } finally {
      setCrafting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[var(--bg-card)]" />
          <div className="absolute inset-0 rounded-full border-4 border-t-[var(--accent)] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Craft Result Toast */}
      {craftResult && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="glass rounded-xl border border-[var(--success)]/30 shadow-lg px-4 py-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--success)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-[var(--success)] font-medium">
              Crafted {craftResult.quantity}x {craftResult.name}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-[var(--bg-card)]">
        <button
          onClick={() => setActiveTab('recipes')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'recipes'
              ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Recipes
        </button>
        <button
          onClick={() => setActiveTab('materials')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'materials'
              ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Materials ({materials.reduce((sum, m) => sum + m.quantity, 0)})
        </button>
      </div>

      {activeTab === 'recipes' ? (
        <div className="space-y-3">
          {recipes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-[var(--text-muted)]">
                No recipes available
              </CardContent>
            </Card>
          ) : (
            recipes.map((recipe) => (
              <Card key={recipe.id} className={!recipe.canCraft ? 'opacity-60' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Recipe Info */}
                    <div className="flex-1 space-y-2">
                      {/* Result */}
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${rarityColors[recipe.result.rarity] || 'text-white'}`}>
                          {recipe.resultQuantity > 1 && `${recipe.resultQuantity}x `}
                          {recipe.result.name}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                          {recipe.resultType === 'item' ? 'Item' : 'Material'}
                        </span>
                      </div>

                      {/* Stats if item */}
                      {recipe.result.stats && Object.keys(recipe.result.stats).length > 0 && (
                        <div className="flex gap-2 text-xs">
                          {Object.entries(recipe.result.stats).map(([stat, value]) => (
                            <span key={stat} className="text-[var(--accent)]">
                              +{value}% {stat.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Ingredients */}
                      <div className="flex flex-wrap gap-2">
                        {recipe.ingredients.map((ing, i) => (
                          <span
                            key={i}
                            className={`text-xs px-2 py-1 rounded border ${
                              ing.sufficient
                                ? 'border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]'
                                : 'border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]'
                            }`}
                          >
                            {ing.name}: {ing.owned}/{ing.quantity}
                          </span>
                        ))}
                      </div>

                      {/* Level requirement */}
                      {!recipe.levelMet && (
                        <div className="text-xs text-[var(--text-muted)]">
                          Requires level {recipe.requiredLevel}
                        </div>
                      )}
                    </div>

                    {/* Craft Button */}
                    <button
                      onClick={() => handleCraft(recipe.id)}
                      disabled={!recipe.canCraft || crafting === recipe.id}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        recipe.canCraft
                          ? 'bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed'
                      }`}
                    >
                      {crafting === recipe.id ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Craft'
                      )}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {materials.length === 0 ? (
            <Card className="col-span-2">
              <CardContent className="py-8 text-center text-[var(--text-muted)]">
                No materials collected yet. Study to find materials!
              </CardContent>
            </Card>
          ) : (
            materials.map((material) => (
              <Card
                key={material.id}
                className={`${rarityBgColors[material.rarity] || ''}`}
              >
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-medium ${rarityColors[material.rarity] || 'text-white'}`}>
                        {material.name}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {material.description}
                      </div>
                    </div>
                    <div className="text-xl font-bold text-[var(--text-primary)]">
                      {material.quantity}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
