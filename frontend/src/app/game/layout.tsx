'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useCharacterStore } from '@/stores/characterStore';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { DebugOverlay } from '@/components/debug/DebugOverlay';

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isInitializing, loadUser } = useAuthStore();
  const { loadCharacter } = useCharacterStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.push('/login');
    }
  }, [isInitializing, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCharacter();
    }
  }, [isAuthenticated, loadCharacter]);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-4">{children}</main>
      <BottomNav />
      <DebugOverlay />
    </div>
  );
}
