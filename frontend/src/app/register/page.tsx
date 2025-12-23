'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { City } from '@/types/api';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cityId, setCityId] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    api.getCities().then(setCities).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormError('');

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    if (!cityId) {
      setFormError('Please select a city');
      return;
    }

    try {
      await register(email, username, password, cityId);
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
            <h1 className="text-2xl font-bold text-[var(--accent)]">Join StudyMMO</h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">Start your educational journey!</p>
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
              id="username"
              type="text"
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              minLength={3}
              maxLength={20}
              placeholder="Choose a username"
            />
            <Input
              id="password"
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
              placeholder="At least 6 characters"
            />
            <Input
              id="confirmPassword"
              type="password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Repeat password"
            />

            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
              >
                Select City
              </label>
              <select
                id="city"
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                required
              >
                <option value="" className="bg-[var(--bg-card)]">Choose a city...</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id} className="bg-[var(--bg-card)]">
                    {city.name}, {city.country}
                  </option>
                ))}
              </select>
            </div>

            {(error || formError) && (
              <p className="text-sm text-[var(--danger)] text-center bg-[var(--danger-bg)] p-2 rounded-lg">
                {formError || error}
              </p>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Create Account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--accent)] hover:text-[var(--accent-light)] font-medium">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
