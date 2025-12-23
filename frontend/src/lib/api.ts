const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    }
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  getAccessToken() {
    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] =
        `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refresh();
      if (refreshed) {
        (headers as Record<string, string>)['Authorization'] =
          `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
        });
        if (!retryResponse.ok) {
          throw new Error(await retryResponse.text());
        }
        return retryResponse.json();
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  private async refresh(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const tokens = await response.json();
      this.setTokens(tokens.accessToken, tokens.refreshToken);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  // Auth
  async register(data: {
    email: string;
    username: string;
    password: string;
    cityId?: string;
  }) {
    const tokens = await this.request<{ accessToken: string; refreshToken: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
    this.setTokens(tokens.accessToken, tokens.refreshToken);
    return tokens;
  }

  async login(data: { email: string; password: string }) {
    const tokens = await this.request<{ accessToken: string; refreshToken: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
    this.setTokens(tokens.accessToken, tokens.refreshToken);
    return tokens;
  }

  logout() {
    this.clearTokens();
  }

  // Users
  async getMe() {
    return this.request<any>('/users/me');
  }

  async updateSettings(data: { gradeDisplaySystem?: string }) {
    return this.request<any>('/users/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Characters
  async getCharacter() {
    return this.request<any>('/characters/me');
  }

  // Study
  async study() {
    return this.request<any>('/study', { method: 'POST' });
  }

  // Locations
  async getLocationProgress() {
    return this.request<any[]>('/locations/progress');
  }

  async completeClass() {
    return this.request<any>('/locations/complete-class', { method: 'POST' });
  }

  async advanceToNextLocation() {
    return this.request<{
      previousLocation: string;
      newLocation: string;
      newClass: { id: string; gradeNumber: number } | null;
    }>('/locations/advance', { method: 'POST' });
  }

  // Specializations
  async getSpecializations() {
    return this.request<{
      currentSpecialization: { id: string; name: string } | null;
      specializations: {
        id: string;
        name: string;
        requirements: {
          subjects: {
            subjectId: string;
            subjectName: string;
            requiredLevel: number;
            currentLevel: number;
            met: boolean;
          }[];
          minGradeAverage: number;
          currentGradeAverage: number;
          gradeAverageMet: boolean;
          unlockCost: number;
          costMet: boolean;
        };
        canUnlock: boolean;
        isSelected: boolean;
      }[];
      canSelect: boolean;
      gradeAverage: number;
      cash: number;
    }>('/locations/specializations');
  }

  async selectSpecialization(specializationId: string) {
    return this.request<{
      success: boolean;
      specialization: { id: string; name: string };
      cashDeducted: number;
      newCash: string;
    }>(`/locations/specializations/${specializationId}/select`, {
      method: 'POST',
    });
  }

  // Grades
  async getGrades(classId?: string) {
    const query = classId ? `?classId=${classId}` : '';
    return this.request<any[]>(`/grades${query}`);
  }

  async getGradeStats() {
    return this.request<any>('/grades/stats');
  }

  // Cities
  async getCities() {
    return this.request<any[]>('/cities');
  }

  // Subjects
  async getSubjects() {
    return this.request<any[]>('/subjects');
  }

  // Items
  async getItems() {
    return this.request<any[]>('/items');
  }

  async getShopItems() {
    return this.request<any[]>('/items/shop');
  }

  // Inventory
  async getInventory() {
    return this.request<any>('/inventory');
  }

  async equipItem(inventoryItemId: string) {
    return this.request<any>(`/inventory/equip/${inventoryItemId}`, {
      method: 'POST',
    });
  }

  async unequipItem(slot: string) {
    return this.request<any>(`/inventory/unequip/${slot}`, {
      method: 'POST',
    });
  }

  async buyFromNpc(itemId: string, quantity: number = 1) {
    return this.request<any>('/inventory/buy', {
      method: 'POST',
      body: JSON.stringify({ itemId, quantity }),
    });
  }

  async sellToNpc(inventoryItemId: string, quantity: number = 1) {
    return this.request<any>('/inventory/sell', {
      method: 'POST',
      body: JSON.stringify({ inventoryItemId, quantity }),
    });
  }

  // Quests
  async getQuests() {
    return this.request<any>('/quests');
  }

  async startQuest(questId: string) {
    return this.request<any>(`/quests/${questId}/start`, {
      method: 'POST',
    });
  }

  // Olympiads
  async getOlympiads() {
    return this.request<{
      olympiadEnergy: number;
      olympiadEnergyMax: number;
      olympiads: {
        id: string;
        name: string;
        difficulty: string;
        subject: { id: string; name: string } | null;
        energyCost: number;
        requiredLevel: number;
        isUnlocked: boolean;
        canAfford: boolean;
        rewards: {
          cash_min: number;
          cash_max: number;
          xp_min: number;
          xp_max: number;
          item_chance: number;
        };
      }[];
    }>('/olympiads');
  }

  async battleOlympiad(olympiadId: string) {
    return this.request<{
      won: boolean;
      playerScore: number;
      npcScore: number;
      npcLevel: number;
      rewards: {
        cash: number;
        xp: number;
        itemDrop?: {
          itemId: string;
          itemName: string;
          rarity: string;
        };
      } | null;
      newOlympiadEnergy: number;
    }>(`/olympiads/${olympiadId}/battle`, { method: 'POST' });
  }

  // Weekly Olympiads
  async getWeeklyOlympiad() {
    return this.request<{
      event: {
        id: string;
        name: string;
        status: 'upcoming' | 'active' | 'ended';
        startsAt: string;
        endsAt: string;
        subject: { id: string; name: string } | null;
        rewardsByPercentile: {
          top10: { cash: number; xp: number };
          top25: { cash: number; xp: number };
          top50: { cash: number; xp: number };
          participation: { cash: number; xp: number };
        };
        totalParticipants: number;
      } | null;
      participation: {
        score: number;
        rank: number | null;
        rewardsClaimed: boolean;
      } | null;
    }>('/olympiads/weekly');
  }

  async joinWeeklyOlympiad(eventId: string) {
    return this.request<{
      success: boolean;
      score: number;
      rank: number;
      totalParticipants: number;
    }>(`/olympiads/weekly/${eventId}/join`, { method: 'POST' });
  }

  async getWeeklyLeaderboard(eventId: string, limit: number = 50, offset: number = 0) {
    return this.request<{
      leaderboard: {
        rank: number;
        username: string;
        score: number;
        isCurrentUser: boolean;
      }[];
      totalParticipants: number;
    }>(`/olympiads/weekly/${eventId}/leaderboard?limit=${limit}&offset=${offset}`);
  }

  async getMyWeeklyRank(eventId: string) {
    return this.request<{
      rank: number;
      score: number;
      totalParticipants: number;
      percentile: number;
      tier: 'top10' | 'top25' | 'top50' | 'participation';
    }>(`/olympiads/weekly/${eventId}/my-rank`);
  }

  async claimWeeklyRewards(eventId: string) {
    return this.request<{
      success: boolean;
      tier: string;
      rewards: {
        cash: number;
        xp: number;
      };
      finalRank: number;
      totalParticipants: number;
    }>(`/olympiads/weekly/${eventId}/claim`, { method: 'POST' });
  }

  // Chat
  async getChatMessages() {
    return this.request<{
      id: string;
      username: string;
      message: string;
      createdAt: string;
    }[]>('/chat');
  }

  async sendChatMessage(message: string) {
    return this.request<{
      id: string;
      username: string;
      message: string;
      createdAt: string;
    }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Debug
  async getDebugConfig() {
    return this.request<{ cooldownDisabled: boolean }>('/debug/config');
  }

  async toggleCooldown() {
    return this.request<{ cooldownDisabled: boolean }>('/debug/toggle-cooldown', {
      method: 'POST',
    });
  }

  async renewEnergy() {
    return this.request<{ questEnergy: number; olympiadEnergy: number }>('/debug/renew-energy', {
      method: 'POST',
    });
  }

  async grantGrade(subjectId: string, score?: number) {
    return this.request<{ gradeId: string; subjectName: string; score: number }>('/debug/grant-grade', {
      method: 'POST',
      body: JSON.stringify({ subjectId, score }),
    });
  }

  async getDebugSubjects() {
    return this.request<{ id: string; name: string; category: string }[]>('/debug/subjects');
  }

  async resetAccount() {
    return this.request<{ success: boolean; message: string }>('/debug/reset-account', {
      method: 'POST',
    });
  }

  // Crafting
  async getCraftingRecipes() {
    return this.request<{
      id: string;
      name: string;
      requiredLevel: number;
      levelMet: boolean;
      resultType: 'item' | 'material';
      result: {
        id: string;
        name: string;
        rarity: string;
        description?: string;
        stats?: Record<string, number>;
      };
      resultQuantity: number;
      ingredients: {
        type: 'material' | 'item';
        id: string;
        name: string;
        quantity: number;
        owned: number;
        sufficient: boolean;
      }[];
      canCraft: boolean;
    }[]>('/crafting/recipes');
  }

  async getCraftingMaterials() {
    return this.request<{
      id: string;
      name: string;
      rarity: string;
      description: string;
      quantity: number;
    }[]>('/crafting/materials');
  }

  async craftItem(recipeId: string, quantity: number = 1) {
    return this.request<{
      success: boolean;
      crafted: {
        name: string;
        resultType: 'item' | 'material';
        result: {
          id: string;
          name: string;
          rarity: string;
        };
        quantity: number;
      };
    }>('/crafting/craft', {
      method: 'POST',
      body: JSON.stringify({ recipeId, quantity }),
    });
  }

  // Market
  async getMarketListings() {
    return this.request<{
      id: string;
      item: {
        id: string;
        name: string;
        description: string;
        slot: string;
        rarity: string;
        stats: Record<string, number>;
      };
      quantity: number;
      pricePerUnit: number;
      totalPrice: number;
      sellerUsername: string;
      sellerId: string;
      isOwnListing: boolean;
      expiresAt: string;
      createdAt: string;
    }[]>('/market/listings');
  }

  async getMyMarketListings() {
    return this.request<{
      id: string;
      item: {
        id: string;
        name: string;
        rarity: string;
        slot: string;
      };
      quantity: number;
      pricePerUnit: number;
      totalPrice: number;
      expiresAt: string;
      isExpired: boolean;
      createdAt: string;
    }[]>('/market/my-listings');
  }

  async createMarketListing(inventoryItemId: string, quantity: number, pricePerUnit: number) {
    return this.request<{
      id: string;
      item: {
        id: string;
        name: string;
        rarity: string;
      };
      quantity: number;
      pricePerUnit: number;
      totalPrice: number;
      expiresAt: string;
    }>('/market/listings', {
      method: 'POST',
      body: JSON.stringify({ inventoryItemId, quantity, pricePerUnit }),
    });
  }

  async buyFromMarket(listingId: string, quantity?: number) {
    return this.request<{
      success: boolean;
      item: {
        id: string;
        name: string;
        rarity: string;
      };
      quantity: number;
      totalPrice: number;
      fee: number;
      sellerUsername: string;
    }>('/market/buy', {
      method: 'POST',
      body: JSON.stringify({ listingId, quantity }),
    });
  }

  async cancelMarketListing(listingId: string) {
    return this.request<{
      success: boolean;
      returnedItem: {
        id: string;
        name: string;
        quantity: number;
      };
    }>(`/market/listings/${listingId}`, {
      method: 'DELETE',
    });
  }

  async getMarketHistory() {
    return this.request<{
      id: string;
      type: 'purchase' | 'sale';
      item: {
        id: string;
        name: string;
        rarity: string;
      };
      quantity: number;
      totalPrice: number;
      fee: number;
      netAmount: number;
      otherParty: string;
      createdAt: string;
    }[]>('/market/history');
  }

  // Daily Rewards
  async getDailyRewardStatus() {
    return this.request<{
      currentDay: number;
      canClaim: boolean;
      lastClaim: string | null;
      todayReward: {
        day: number;
        cash: number;
        itemRarity: string | null;
        questEnergy: number | null;
      } | null;
      allRewards: {
        day: number;
        cash: number;
        itemRarity: string | null;
        questEnergy: number | null;
        isCurrent: boolean;
        isClaimed: boolean;
      }[];
    }>('/daily-rewards');
  }

  async claimDailyReward() {
    return this.request<{
      success: boolean;
      claimedDay: number;
      nextDay: number;
      rewards: {
        cash: number;
        questEnergy: number;
        item: {
          id: string;
          name: string;
          rarity: string;
        } | null;
      };
    }>('/daily-rewards/claim', { method: 'POST' });
  }
}

export const api = new ApiClient();
