import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface Ingredient {
  type: 'material' | 'item';
  id: string;
  quantity: number;
}

@Injectable()
export class CraftingService {
  constructor(private prisma: PrismaService) {}

  async getRecipes(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const recipes = await this.prisma.recipe.findMany({
      include: {
        resultItem: true,
        resultMaterial: true,
      },
      orderBy: { requiredCharacterLevel: 'asc' },
    });

    // Get player's materials and items for availability check
    const playerMaterials = await this.prisma.characterMaterial.findMany({
      where: { characterId: character.id },
    });
    const inventory = await this.prisma.characterInventory.findMany({
      where: { characterId: character.id },
    });

    // Get all materials and items for names
    const allMaterials = await this.prisma.material.findMany();
    const allItems = await this.prisma.item.findMany();
    const materialNameMap = new Map(allMaterials.map(m => [m.id, m.name]));
    const itemNameMap = new Map(allItems.map(i => [i.id, i.name]));

    const materialMap = new Map(playerMaterials.map(m => [m.materialId, m.quantity]));
    const itemMap = new Map(inventory.map(i => [i.itemId, i.quantity]));

    return recipes.map(recipe => {
      const ingredients = recipe.ingredients as unknown as Ingredient[];
      const ingredientStatus = ingredients.map(ing => {
        const owned = ing.type === 'material'
          ? materialMap.get(ing.id) || 0
          : itemMap.get(ing.id) || 0;
        const name = ing.type === 'material'
          ? materialNameMap.get(ing.id) || 'Unknown'
          : itemNameMap.get(ing.id) || 'Unknown';
        return {
          ...ing,
          name,
          owned,
          sufficient: owned >= ing.quantity,
        };
      });

      const canCraft = character.level >= recipe.requiredCharacterLevel &&
        ingredientStatus.every(i => i.sufficient);

      return {
        id: recipe.id,
        name: recipe.name,
        requiredLevel: recipe.requiredCharacterLevel,
        levelMet: character.level >= recipe.requiredCharacterLevel,
        resultType: recipe.resultItemId ? 'item' : 'material',
        result: recipe.resultItem || recipe.resultMaterial,
        resultQuantity: recipe.resultQuantity,
        ingredients: ingredientStatus,
        canCraft,
      };
    });
  }

  async getMaterials(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const materials = await this.prisma.characterMaterial.findMany({
      where: { characterId: character.id },
      include: { material: true },
    });

    return materials.map(m => ({
      id: m.material.id,
      name: m.material.name,
      rarity: m.material.rarity,
      description: m.material.description,
      quantity: m.quantity,
    }));
  }

  async craft(userId: string, recipeId: string, quantity: number = 1) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        resultItem: true,
        resultMaterial: true,
      },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    if (character.level < recipe.requiredCharacterLevel) {
      throw new BadRequestException(
        `Character level ${recipe.requiredCharacterLevel} required`,
      );
    }

    const ingredients = recipe.ingredients as unknown as Ingredient[];

    // Verify all ingredients are available (multiplied by quantity)
    for (const ing of ingredients) {
      const required = ing.quantity * quantity;
      if (ing.type === 'material') {
        const mat = await this.prisma.characterMaterial.findUnique({
          where: {
            characterId_materialId: {
              characterId: character.id,
              materialId: ing.id,
            },
          },
        });
        if (!mat || mat.quantity < required) {
          throw new BadRequestException('Not enough materials');
        }
      } else {
        const item = await this.prisma.characterInventory.findUnique({
          where: {
            characterId_itemId: {
              characterId: character.id,
              itemId: ing.id,
            },
          },
        });
        if (!item || item.quantity < required) {
          throw new BadRequestException('Not enough items');
        }
      }
    }

    // Deduct ingredients
    for (const ing of ingredients) {
      const deduct = ing.quantity * quantity;
      if (ing.type === 'material') {
        await this.prisma.characterMaterial.update({
          where: {
            characterId_materialId: {
              characterId: character.id,
              materialId: ing.id,
            },
          },
          data: { quantity: { decrement: deduct } },
        });
      } else {
        await this.prisma.characterInventory.update({
          where: {
            characterId_itemId: {
              characterId: character.id,
              itemId: ing.id,
            },
          },
          data: { quantity: { decrement: deduct } },
        });
      }
    }

    // Add result
    const resultQuantity = recipe.resultQuantity * quantity;

    if (recipe.resultItemId) {
      await this.prisma.characterInventory.upsert({
        where: {
          characterId_itemId: {
            characterId: character.id,
            itemId: recipe.resultItemId,
          },
        },
        create: {
          characterId: character.id,
          itemId: recipe.resultItemId,
          quantity: resultQuantity,
        },
        update: {
          quantity: { increment: resultQuantity },
        },
      });
    } else if (recipe.resultMaterialId) {
      await this.prisma.characterMaterial.upsert({
        where: {
          characterId_materialId: {
            characterId: character.id,
            materialId: recipe.resultMaterialId,
          },
        },
        create: {
          characterId: character.id,
          materialId: recipe.resultMaterialId,
          quantity: resultQuantity,
        },
        update: {
          quantity: { increment: resultQuantity },
        },
      });
    }

    // Clean up zero-quantity entries
    await this.prisma.characterMaterial.deleteMany({
      where: { characterId: character.id, quantity: { lte: 0 } },
    });
    await this.prisma.characterInventory.deleteMany({
      where: { characterId: character.id, quantity: { lte: 0 } },
    });

    return {
      success: true,
      crafted: {
        name: recipe.name,
        resultType: recipe.resultItemId ? 'item' : 'material',
        result: recipe.resultItem || recipe.resultMaterial,
        quantity: resultQuantity,
      },
    };
  }
}
