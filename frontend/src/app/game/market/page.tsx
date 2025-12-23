'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';

type Listing = Awaited<ReturnType<typeof api.getMarketListings>>[0];
type MyListing = Awaited<ReturnType<typeof api.getMyMarketListings>>[0];
type Transaction = Awaited<ReturnType<typeof api.getMarketHistory>>[0];

const rarityColors: Record<string, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400',
  mythic: 'text-red-400',
};

const rarityBgColors: Record<string, string> = {
  common: 'border-gray-500/30',
  uncommon: 'border-green-500/30',
  rare: 'border-blue-500/30',
  epic: 'border-purple-500/30',
  legendary: 'border-yellow-500/30',
  mythic: 'border-red-500/30',
};

export default function MarketPage() {
  const [activeTab, setActiveTab] = useState<'browse' | 'my-listings' | 'history'>('browse');
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    try {
      if (activeTab === 'browse') {
        const data = await api.getMarketListings();
        setListings(data);
      } else if (activeTab === 'my-listings') {
        const data = await api.getMyMarketListings();
        setMyListings(data);
      } else {
        const data = await api.getMarketHistory();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to load market data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, [activeTab]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleBuy = async (listingId: string) => {
    setBuying(listingId);
    try {
      const result = await api.buyFromMarket(listingId);
      showToast('success', `Bought ${result.quantity}x ${result.item.name} for $${result.totalPrice}`);
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to buy item');
    } finally {
      setBuying(null);
    }
  };

  const handleCancel = async (listingId: string) => {
    setCanceling(listingId);
    try {
      const result = await api.cancelMarketListing(listingId);
      showToast('success', `Returned ${result.returnedItem.quantity}x ${result.returnedItem.name} to inventory`);
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to cancel listing');
    } finally {
      setCanceling(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expired';

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
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
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className={`glass rounded-xl border shadow-lg px-4 py-2 flex items-center gap-2 ${
            toast.type === 'success' ? 'border-[var(--success)]/30' : 'border-[var(--danger)]/30'
          }`}>
            <svg className={`w-5 h-5 ${toast.type === 'success' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`} fill="currentColor" viewBox="0 0 20 20">
              {toast.type === 'success' ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              )}
            </svg>
            <span className={toast.type === 'success' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
              {toast.message}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-card)]">
        {(['browse', 'my-listings', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab === 'browse' ? 'Browse' : tab === 'my-listings' ? 'My Listings' : 'History'}
          </button>
        ))}
      </div>

      {/* Fee Notice */}
      {activeTab === 'browse' && (
        <div className="text-xs text-[var(--text-muted)] text-center">
          5% transaction fee on all purchases
        </div>
      )}

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <div className="space-y-3">
          {listings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-[var(--text-muted)]">
                No items for sale. Be the first to list something!
              </CardContent>
            </Card>
          ) : (
            listings.filter(l => !l.isOwnListing).map((listing) => (
              <Card key={listing.id} className={rarityBgColors[listing.item.rarity]}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold ${rarityColors[listing.item.rarity]}`}>
                          {listing.item.name}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                          {listing.item.slot}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          x{listing.quantity}
                        </span>
                      </div>

                      {listing.item.stats && Object.keys(listing.item.stats).length > 0 && (
                        <div className="flex gap-2 text-xs mt-1">
                          {Object.entries(listing.item.stats).map(([stat, value]) => (
                            <span key={stat} className="text-[var(--accent)]">
                              +{value}% {stat.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                        <span>by {listing.sellerUsername}</span>
                        <span>•</span>
                        <span>{getTimeRemaining(listing.expiresAt)} left</span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-2">
                      <div>
                        <div className="text-lg font-bold text-[var(--accent)]">
                          ${listing.totalPrice.toLocaleString()}
                        </div>
                        {listing.quantity > 1 && (
                          <div className="text-xs text-[var(--text-muted)]">
                            ${listing.pricePerUnit}/ea
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleBuy(listing.id)}
                        disabled={buying === listing.id}
                        className="px-4 py-1.5 rounded-lg text-sm font-medium bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50"
                      >
                        {buying === listing.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          'Buy'
                        )}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* My Listings Tab */}
      {activeTab === 'my-listings' && (
        <div className="space-y-3">
          {myListings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-[var(--text-muted)]">
                You have no active listings. List items from your inventory!
              </CardContent>
            </Card>
          ) : (
            myListings.map((listing) => (
              <Card key={listing.id} className={`${rarityBgColors[listing.item.rarity]} ${listing.isExpired ? 'opacity-60' : ''}`}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${rarityColors[listing.item.rarity]}`}>
                          {listing.item.name}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                          x{listing.quantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
                        <span>${listing.totalPrice.toLocaleString()}</span>
                        <span>•</span>
                        <span className={listing.isExpired ? 'text-[var(--danger)]' : ''}>
                          {listing.isExpired ? 'Expired' : `${getTimeRemaining(listing.expiresAt)} left`}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCancel(listing.id)}
                      disabled={canceling === listing.id}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all disabled:opacity-50"
                    >
                      {canceling === listing.id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Cancel'
                      )}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-[var(--text-muted)]">
                No transaction history yet
              </CardContent>
            </Card>
          ) : (
            history.map((tx) => (
              <Card key={tx.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tx.type === 'purchase' ? 'bg-[var(--accent)]/20' : 'bg-[var(--success)]/20'
                      }`}>
                        {tx.type === 'purchase' ? (
                          <svg className="w-4 h-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${rarityColors[tx.item.rarity]}`}>
                            {tx.item.name}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">x{tx.quantity}</span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {tx.type === 'purchase' ? 'from' : 'to'} {tx.otherParty} • {formatDate(tx.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-bold ${tx.netAmount > 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {tx.netAmount > 0 ? '+' : ''}{tx.netAmount.toLocaleString()}
                      </div>
                      {tx.type === 'sale' && tx.fee > 0 && (
                        <div className="text-xs text-[var(--text-muted)]">
                          -${tx.fee} fee
                        </div>
                      )}
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
