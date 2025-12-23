'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export default function SettingsPage() {
  const { user, loadUser, logout } = useAuthStore();
  const [gradeSystem, setGradeSystem] = useState<'letter' | 'five_point' | 'twelve_point'>(
    (user?.gradeDisplaySystem as 'letter' | 'five_point' | 'twelve_point') || 'letter',
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await api.updateSettings({ gradeDisplaySystem: gradeSystem });
      await loadUser();
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {user && (
            <>
              <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                <p className="text-sm text-[var(--text-muted)]">Email</p>
                <p className="font-medium text-[var(--text-primary)]">{user.email}</p>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                <p className="text-sm text-[var(--text-muted)]">Username</p>
                <p className="font-medium text-[var(--accent)]">{user.username}</p>
              </div>
              <div className="flex items-center justify-between py-2">
                <p className="text-sm text-[var(--text-muted)]">Member since</p>
                <p className="font-medium text-[var(--text-primary)]">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grade Display</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Choose how grades are displayed in the game
          </p>

          <div className="space-y-2">
            {[
              { value: 'letter', label: 'Letter (A-F)' },
              { value: 'five_point', label: '5-point scale (1-5)' },
              { value: 'twelve_point', label: '12-point scale (1-12)' },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                  gradeSystem === option.value
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] hover:border-[var(--border-light)] bg-[var(--bg-secondary)]'
                }`}
              >
                <input
                  type="radio"
                  name="gradeSystem"
                  value={option.value}
                  checked={gradeSystem === option.value}
                  onChange={(e) => setGradeSystem(e.target.value as 'letter' | 'five_point' | 'twelve_point')}
                  className="sr-only"
                />
                <span className={`font-medium ${gradeSystem === option.value ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                  {option.label}
                </span>
              </label>
            ))}
          </div>

          <Button
            onClick={handleSaveSettings}
            isLoading={isSaving}
            className="w-full"
          >
            Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <Button
            variant="danger"
            onClick={logout}
            className="w-full"
          >
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
