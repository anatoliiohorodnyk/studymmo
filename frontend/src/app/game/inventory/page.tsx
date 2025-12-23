'use client';

import { useState, useEffect } from 'react';
import { useCharacterStore } from '@/stores/characterStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { api } from '@/lib/api';

interface ListingModal {
  inventoryItemId: string;
  itemName: string;
  maxQuantity: number;
  npcPrice: number;
}

const slotLabels: Record<string, string> = {
  pen: 'Pen',
  notebook: 'Notebook',
  backpack: 'Backpack',
  calculator: 'Calculator',
  glasses: 'Glasses',
};

const slotIcons: Record<string, string> = {
  pen: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
  notebook: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  backpack: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  calculator: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  glasses: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
};

const rarityStyles: Record<string, string> = {
  common: 'border-[var(--rarity-common)] bg-[var(--bg-secondary)]',
  uncommon: 'border-[var(--rarity-uncommon)] bg-[var(--rarity-uncommon)]/10',
  rare: 'border-[var(--rarity-rare)] bg-[var(--rarity-rare)]/10',
  epic: 'border-[var(--rarity-epic)] bg-[var(--rarity-epic)]/10',
  legendary: 'border-[var(--rarity-legendary)] bg-[var(--rarity-legendary)]/10',
  mythic: 'border-red-500 bg-red-500/10',
};

const rarityTextColors: Record<string, string> = {
  common: 'text-[var(--rarity-common)]',
  uncommon: 'text-[var(--rarity-uncommon)]',
  rare: 'text-[var(--rarity-rare)]',
  epic: 'text-[var(--rarity-epic)]',
  legendary: 'text-[var(--rarity-legendary)]',
  mythic: 'text-red-500',
};

interface InventoryItem {
  id: string;
  item: {
    id: string;
    name: string;
    description: string;
    slot: string;
    rarity: string;
    stats: Record<string, number>;
    npcSellPrice: number;
  };
  quantity: number;
}

interface EquipmentSlot {
  slot: string;
  item: {
    id: string;
    name: string;
    rarity: string;
    stats: Record<string, number>;
  } | null;
}

export default function InventoryPage() {
  const { character, isLoading, refreshCharacter } = useCharacterStore();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [equipment, setEquipment] = useState<EquipmentSlot[]>([]);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'shop'>('inventory');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [listingModal, setListingModal] = useState<ListingModal | null>(null);
  const [listingQuantity, setListingQuantity] = useState(1);
  const [listingPrice, setListingPrice] = useState(0);

  useEffect(() => {
    loadInventory();
    loadShopItems();
  }, []);

  const loadInventory = async () => {
    try {
      const data = await api.getInventory();
      setInventory(data.inventory);
      setEquipment(data.equipment);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    }
  };

  const loadShopItems = async () => {
    try {
      const items = await api.getShopItems();
      setShopItems(items);
    } catch (error) {
      console.error('Failed to load shop items:', error);
    }
  };

  const handleEquip = async (inventoryItemId: string) => {
    setIsUpdating(true);
    try {
      const data = await api.equipItem(inventoryItemId);
      setInventory(data.inventory);
      setEquipment(data.equipment);
      await refreshCharacter();
      showMessage('success', 'Item equipped!');
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to equip');
    }
    setIsUpdating(false);
  };

  const handleUnequip = async (slot: string) => {
    setIsUpdating(true);
    try {
      const data = await api.unequipItem(slot);
      setInventory(data.inventory);
      setEquipment(data.equipment);
      await refreshCharacter();
      showMessage('success', 'Item unequipped!');
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to unequip');
    }
    setIsUpdating(false);
  };

  const handleBuy = async (itemId: string, price: number) => {
    if (!character || Number(character.cash) < price) {
      showMessage('error', 'Not enough cash!');
      return;
    }
    setIsUpdating(true);
    try {
      await api.buyFromNpc(itemId, 1);
      await loadInventory();
      await refreshCharacter();
      showMessage('success', 'Item purchased!');
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to buy');
    }
    setIsUpdating(false);
  };

  const handleSell = async (inventoryItemId: string) => {
    setIsUpdating(true);
    try {
      await api.sellToNpc(inventoryItemId, 1);
      await loadInventory();
      await refreshCharacter();
      showMessage('success', 'Item sold!');
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to sell');
    }
    setIsUpdating(false);
  };

  const openListingModal = (inv: InventoryItem) => {
    setListingModal({
      inventoryItemId: inv.id,
      itemName: inv.item.name,
      maxQuantity: inv.quantity,
      npcPrice: inv.item.npcSellPrice,
    });
    setListingQuantity(1);
    setListingPrice(Math.round(inv.item.npcSellPrice * 1.2)); // Suggest 20% above NPC price
  };

  const handleCreateListing = async () => {
    if (!listingModal) return;
    setIsUpdating(true);
    try {
      await api.createMarketListing(listingModal.inventoryItemId, listingQuantity, listingPrice);
      await loadInventory();
      setListingModal(null);
      showMessage('success', 'Listed on market!');
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to list');
    }
    setIsUpdating(false);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  if (isLoading || !character) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[var(--bg-card)]" />
          <div className="absolute inset-0 rounded-full border-4 border-t-[var(--accent)] animate-spin" />
        </div>
      </div>
    );
  }

  const allSlots = ['pen', 'notebook', 'backpack', 'calculator', 'glasses'];
  const equipmentMap = new Map(equipment.map(e => [e.slot, e.item]));
  const displayEquipment = allSlots.map(slot => ({
    slot,
    item: equipmentMap.get(slot) || null,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {message && (
        <div
          className={`p-3 rounded-xl text-center animate-slide-up flex items-center justify-center gap-2 ${
            message.type === 'success'
              ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/30'
              : 'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30'
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            {message.type === 'success' ? (
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            ) : (
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            )}
          </svg>
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
            </svg>
            Equipment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {displayEquipment.map((eq) => (
              <div
                key={eq.slot}
                className={`p-3 rounded-xl border-2 transition-all hover:shadow-[var(--shadow-md)] ${
                  eq.item
                    ? rarityStyles[eq.item.rarity]
                    : 'border-dashed border-[var(--border)] bg-[var(--bg-secondary)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${eq.item ? 'bg-white/10' : 'bg-[var(--bg-card)]'}`}>
                    <svg className={`w-3.5 h-3.5 ${eq.item ? rarityTextColors[eq.item.rarity] : 'text-[var(--text-muted)]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={slotIcons[eq.slot]} />
                    </svg>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                    {slotLabels[eq.slot] || eq.slot}
                  </p>
                </div>
                {eq.item ? (
                  <>
                    <p className="font-semibold text-sm text-[var(--text-primary)]">
                      {eq.item.name}
                    </p>
                    <p className={`text-xs capitalize font-medium ${rarityTextColors[eq.item.rarity]}`}>
                      {eq.item.rarity}
                    </p>
                    <div className="mt-2 space-y-0.5">
                      {Object.entries(eq.item.stats).map(([stat, value]) => (
                        <p key={stat} className="text-xs text-[var(--success)]">
                          +{value}% {stat.replace('_', ' ')}
                        </p>
                      ))}
                    </div>
                    <button
                      onClick={() => handleUnequip(eq.slot)}
                      disabled={isUpdating}
                      className="mt-3 w-full text-xs py-1.5 px-2 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] rounded-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                      Unequip
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-[var(--text-muted)] italic">Empty</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tab Buttons */}
      <div className="flex gap-2 p-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all ${
            activeTab === 'inventory'
              ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-[var(--bg-primary)] shadow-lg shadow-[var(--accent)]/20'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
          }`}
        >
          Inventory
        </button>
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all ${
            activeTab === 'shop'
              ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-[var(--bg-primary)] shadow-lg shadow-[var(--accent)]/20'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
          }`}
        >
          NPC Shop
        </button>
      </div>

      {activeTab === 'inventory' && (
        <Card>
          <CardHeader>
            <CardTitle>Your Items</CardTitle>
          </CardHeader>
          <CardContent>
            {inventory.length === 0 ? (
              <p className="text-[var(--text-muted)] text-center py-8">
                Your inventory is empty.
                <br />
                <span className="text-sm">
                  Study to find items or buy from the NPC Shop!
                </span>
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inventory.map((inv) => (
                  <div
                    key={inv.id}
                    className={`p-3 rounded-lg border-2 ${rarityStyles[inv.item.rarity]}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{inv.item.name}</p>
                        <p className={`text-xs capitalize ${rarityTextColors[inv.item.rarity]}`}>
                          {inv.item.rarity} {slotLabels[inv.item.slot]}
                        </p>
                      </div>
                      <span className="text-xs bg-[var(--bg-secondary)] px-2 py-1 rounded text-[var(--text-secondary)]">
                        x{inv.quantity}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-[var(--text-secondary)]">
                      {Object.entries(inv.item.stats).map(([stat, value]) => (
                        <span key={stat} className="mr-2">
                          +{value}% {stat.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleEquip(inv.id)}
                        disabled={isUpdating}
                        className="flex-1 text-xs py-1.5 px-2 bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] rounded font-medium disabled:opacity-50"
                      >
                        Equip
                      </button>
                      <button
                        onClick={() => handleSell(inv.id)}
                        disabled={isUpdating}
                        className="text-xs py-1.5 px-2 bg-[var(--success)] text-white hover:bg-emerald-600 rounded font-medium disabled:opacity-50"
                      >
                        ${inv.item.npcSellPrice}
                      </button>
                      <button
                        onClick={() => openListingModal(inv)}
                        disabled={isUpdating}
                        className="text-xs py-1.5 px-2 border border-[var(--accent)]/50 text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded font-medium disabled:opacity-50"
                        title="List on Market"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'shop' && (
        <Card>
          <CardHeader>
            <CardTitle>
              NPC Shop
              <span className="ml-2 text-sm font-normal text-[var(--success)]">
                ${character.cash}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shopItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border-2 ${rarityStyles[item.rarity]}`}
                >
                  <p className="font-medium text-[var(--text-primary)]">{item.name}</p>
                  <p className={`text-xs capitalize ${rarityTextColors[item.rarity]}`}>
                    {item.rarity} {slotLabels[item.slot]}
                  </p>
                  <div className="mt-2 text-xs text-[var(--text-secondary)]">
                    {Object.entries(item.stats as Record<string, number>).map(([stat, value]) => (
                      <span key={stat} className="mr-2">
                        +{value}% {stat.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => handleBuy(item.id, item.npcBuyPrice)}
                      disabled={isUpdating || Number(character.cash) < item.npcBuyPrice}
                      className="w-full text-sm py-2 px-3 bg-[var(--success)] text-white hover:bg-emerald-600 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Buy for ${item.npcBuyPrice}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Listing Modal */}
      {listingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass rounded-2xl border border-[var(--border)] p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
              List on Market
            </h3>

            <div className="mb-4">
              <p className="text-[var(--text-secondary)] font-medium">{listingModal.itemName}</p>
              <p className="text-xs text-[var(--text-muted)]">NPC price: ${listingModal.npcPrice}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">Quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setListingQuantity(Math.max(1, listingQuantity - 1))}
                    className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={listingQuantity}
                    onChange={(e) => setListingQuantity(Math.min(listingModal.maxQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="flex-1 h-10 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-center text-[var(--text-primary)]"
                  />
                  <button
                    onClick={() => setListingQuantity(Math.min(listingModal.maxQuantity, listingQuantity + 1))}
                    className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">Max: {listingModal.maxQuantity}</p>
              </div>

              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1">Price per unit ($)</label>
                <input
                  type="number"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full h-10 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-center text-[var(--text-primary)]"
                />
              </div>

              <div className="bg-[var(--bg-secondary)] rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Total:</span>
                  <span className="text-[var(--text-primary)] font-medium">${(listingPrice * listingQuantity).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Fee (5%):</span>
                  <span className="text-[var(--warning)]">-${Math.ceil(listingPrice * listingQuantity * 0.05).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-[var(--border)] pt-1">
                  <span className="text-[var(--text-muted)]">You receive:</span>
                  <span className="text-[var(--success)] font-medium">${Math.floor(listingPrice * listingQuantity * 0.95).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setListingModal(null)}
                className="flex-1 py-2.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateListing}
                disabled={isUpdating || listingPrice < 1}
                className="flex-1 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] font-medium transition-all disabled:opacity-50"
              >
                {isUpdating ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'List Item'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
