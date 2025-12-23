'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(email, password);
      router.push('/game');
    } catch {
      // Error is handled in store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-[var(--bg-primary)]">S</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--accent)]">StudyMMO</h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">Welcome back, student!</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="your@email.com"
            />
            <Input
              id="password"
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter password"
            />

            {error && (
              <p className="text-sm text-[var(--danger)] text-center bg-[var(--danger-bg)] p-2 rounded-lg">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
            >
              Login
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[var(--accent)] hover:text-[var(--accent-light)] font-medium">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
