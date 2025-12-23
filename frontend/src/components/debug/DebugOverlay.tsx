'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useCharacterStore } from '@/stores/characterStore';
import { useDebugStore } from '@/stores/debugStore';

interface Subject {
  id: string;
  name: string;
  category: string;
}

export function DebugOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { refreshCharacter } = useCharacterStore();
  const { cooldownDisabled, toggleCooldown, loadConfig } = useDebugStore();

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [, subs] = await Promise.all([
        loadConfig(),
        api.getDebugSubjects(),
      ]);
      setSubjects(subs);
      if (subs.length > 0 && !selectedSubject) {
        setSelectedSubject(subs[0].id);
      }
    } catch (err) {
      console.error('Failed to load debug data:', err);
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  };

  const handleToggleCooldown = async () => {
    setLoading(true);
    try {
      const newState = await toggleCooldown();
      showMessage(newState ? 'Cooldown OFF' : 'Cooldown ON');
    } catch (err) {
      showMessage('Error!');
    }
    setLoading(false);
  };

  const handleRenewEnergy = async () => {
    setLoading(true);
    try {
      const result = await api.renewEnergy();
      await refreshCharacter();
      showMessage(`Energy: Q${result.questEnergy} O${result.olympiadEnergy}`);
    } catch (err) {
      showMessage('Error!');
    }
    setLoading(false);
  };

  const handleGrantGrade = async () => {
    if (!selectedSubject) return;
    setLoading(true);
    try {
      const result = await api.grantGrade(selectedSubject);
      await refreshCharacter();
      showMessage(`${result.subjectName}: ${result.score}`);
    } catch (err) {
      showMessage('Error!');
    }
    setLoading(false);
  };

  // Keyboard shortcut to toggle overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`' && e.ctrlKey) {
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 w-10 h-10 bg-red-600/80 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
        title="Debug Menu (Ctrl+`)"
      >
        DBG
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 w-full max-w-sm shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-red-400">Debug Menu</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-3 p-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm text-center">
            {message}
          </div>
        )}

        <div className="space-y-3">
          {/* Toggle Cooldown */}
          <button
            onClick={handleToggleCooldown}
            disabled={loading}
            className={`w-full py-2.5 px-4 rounded-xl font-medium transition-all ${
              cooldownDisabled
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)]'
            }`}
          >
            Cooldown: {cooldownDisabled ? 'DISABLED' : 'Enabled'}
          </button>

          {/* Renew Energy */}
          <button
            onClick={handleRenewEnergy}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white transition-all"
          >
            Renew All Energy
          </button>

          {/* Grant Grade */}
          <div className="space-y-2">
            <label className="text-sm text-[var(--text-secondary)]">Grant Grade</label>
            <div className="flex gap-2">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="flex-1 py-2 px-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-sm"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleGrantGrade}
                disabled={loading || !selectedSubject}
                className="py-2 px-4 rounded-xl font-medium bg-purple-600 hover:bg-purple-700 text-white transition-all"
              >
                Grant
              </button>
            </div>
          </div>

          {/* Reset Account */}
          <button
            onClick={async () => {
              if (!confirm('Reset account to Prep School? All progress will be lost!')) return;
              setLoading(true);
              try {
                await api.resetAccount();
                await refreshCharacter();
                showMessage('Account reset!');
              } catch (err) {
                showMessage('Error!');
              }
              setLoading(false);
            }}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl font-medium bg-red-600 hover:bg-red-700 text-white transition-all"
          >
            Reset Account
          </button>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)] text-center">
            Press Ctrl+` to toggle
          </p>
        </div>
      </div>
    </div>
  );
}
