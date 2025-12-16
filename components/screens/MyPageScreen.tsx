import React, { useEffect, useMemo, useState } from 'react';
import type { UserProfile } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { SunIcon, MoonIcon } from '../icons';

interface MyPageScreenProps {
  user: UserProfile;
  accountName: string;
  email: string;
  onLogout: () => void;
  onUpdateProfile: (profile: UserProfile) => Promise<void>;
}

type MyPageView = 'overview' | 'edit' | 'notifications' | 'terms';

const goalLabel = (goal: string) => {
  if (goal === 'weightLoss') return 'Weight Loss';
  if (goal === 'muscleGain') return 'Muscle Gain';
  return 'Rehab / Mobility';
};

export const MyPageScreen: React.FC<MyPageScreenProps> = ({ user, accountName, email, onLogout, onUpdateProfile }) => {
  const { theme, toggleTheme } = useTheme();
  const [view, setView] = useState<MyPageView>('overview');
  const [editForm, setEditForm] = useState<UserProfile>(user);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<{ push: boolean; email: boolean; reminders: boolean }>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('notification-settings') : null;
    return stored ? JSON.parse(stored) : { push: true, email: false, reminders: true };
  });

  useEffect(() => {
    setEditForm(user);
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('notification-settings', JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  const profileStats = useMemo(
    () => [
      { label: 'Account Name', value: accountName || 'Not set' },
      { label: 'Email', value: email || 'Not set' },
      { label: 'Goal', value: goalLabel(user.goal) },
      { label: 'Height', value: `${user.height} cm` },
      { label: 'Weight', value: `${user.weight} kg` },
      { label: 'Body Fat %', value: typeof user.bodyFat === 'number' ? `${user.bodyFat}%` : 'N/A' },
      { label: 'Health Notes', value: user.healthConditions || 'None reported' },
      { label: 'Preference', value: user.workoutPreference === 'home' ? 'Home' : 'Gym' },
    ],
    [accountName, email, user]
  );

  const handleEditChange = (field: keyof UserProfile, value: string) => {
    if (field === 'height' || field === 'weight' || field === 'bodyFat') {
      const numericValue = value === '' ? undefined : Number(value);
      setEditForm(prev => ({ ...prev, [field]: numericValue as any }));
      return;
    }
    setEditForm(prev => ({ ...prev, [field]: value as any }));
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setSaveMessage(null);
    try {
      const normalized: UserProfile = {
        goal: editForm.goal,
        height: Number(editForm.height),
        weight: Number(editForm.weight),
        bodyFat: editForm.bodyFat === undefined || editForm.bodyFat === null ? undefined : Number(editForm.bodyFat),
        healthConditions: editForm.healthConditions?.trim() || 'None',
        workoutPreference: editForm.workoutPreference,
        availableEquipment: editForm.availableEquipment?.trim(),
      };
      await onUpdateProfile(normalized);
      setSaveMessage('Profile updated.');
      setView('overview');
    } catch (error) {
      console.error('Failed to update profile:', error);
      setSaveMessage('Could not save profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-800 dark:text-white p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">My Page</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your profile, notifications, and preferences.</p>
        </header>

        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold mb-2 text-cyan-600 dark:text-cyan-400">Profile Overview</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Keep your account details up to date.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors duration-200"
                  aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                  {theme === 'light' ? <MoonIcon className="w-5 h-5 text-slate-800" /> : <SunIcon className="w-5 h-5 text-yellow-400" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {profileStats.map(item => (
                <div key={item.label} className="flex justify-between bg-gray-50 dark:bg-slate-700/60 px-3 py-2 rounded-lg text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
                  <span className="font-semibold text-right break-words max-w-[60%]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10">
            <h3 className="text-xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => setView('edit')}
                className={`w-full text-left p-4 rounded-lg transition border ${view === 'edit' ? 'border-cyan-500 bg-cyan-50 dark:bg-slate-700/70 text-cyan-700 dark:text-cyan-200' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600'}`}
              >
                Edit Profile
              </button>
              <button
                onClick={() => setView('notifications')}
                className={`w-full text-left p-4 rounded-lg transition border ${view === 'notifications' ? 'border-cyan-500 bg-cyan-50 dark:bg-slate-700/70 text-cyan-700 dark:text-cyan-200' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600'}`}
              >
                Notification Settings
              </button>
              <button
                onClick={() => setView('terms')}
                className={`w-full text-left p-4 rounded-lg transition border ${view === 'terms' ? 'border-cyan-500 bg-cyan-50 dark:bg-slate-700/70 text-cyan-700 dark:text-cyan-200' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600'}`}
              >
                Terms of Service
              </button>
              <button
                onClick={onLogout}
                className="w-full text-left p-4 rounded-lg transition border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 dark:border-red-500/50 dark:bg-red-900/30 dark:text-red-200"
              >
                Log Out
              </button>
            </div>
          </div>

          {view === 'edit' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400">Edit Profile</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Update your fitness profile and preferences.</p>
                </div>
                <button onClick={() => setView('overview')} className="text-sm font-semibold text-slate-500 hover:text-cyan-600">Close</button>
              </div>
              <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1" htmlFor="goal">Goal</label>
                  <div className="flex gap-2">
                    {(['weightLoss', 'muscleGain', 'rehab'] as const).map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleEditChange('goal', option)}
                        className={`flex-1 p-3 rounded-lg text-sm font-semibold transition ${editForm.goal === option ? 'bg-cyan-500 text-white' : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                      >
                        {goalLabel(option)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1" htmlFor="height">Height (cm)</label>
                  <input
                    id="height"
                    type="number"
                    value={editForm.height || ''}
                    onChange={event => handleEditChange('height', event.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1" htmlFor="weight">Weight (kg)</label>
                  <input
                    id="weight"
                    type="number"
                    value={editForm.weight || ''}
                    onChange={event => handleEditChange('weight', event.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1" htmlFor="bodyFat">Body Fat % (optional)</label>
                  <input
                    id="bodyFat"
                    type="number"
                    value={editForm.bodyFat ?? ''}
                    onChange={event => handleEditChange('bodyFat', event.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1" htmlFor="workoutPreference">Workout Preference</label>
                  <div className="flex gap-2">
                    {(['home', 'gym'] as const).map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleEditChange('workoutPreference', option)}
                        className={`flex-1 p-3 rounded-lg text-sm font-semibold transition ${editForm.workoutPreference === option ? 'bg-cyan-500 text-white' : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                      >
                        {option === 'home' ? 'Home' : 'Gym'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1" htmlFor="healthConditions">Health Notes</label>
                  <textarea
                    id="healthConditions"
                    value={editForm.healthConditions ?? ''}
                    onChange={event => handleEditChange('healthConditions', event.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600"
                    rows={2}
                    placeholder="Allergies, injuries, or other notes"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1" htmlFor="availableEquipment">Available Equipment (optional)</label>
                  <input
                    id="availableEquipment"
                    type="text"
                    value={editForm.availableEquipment ?? ''}
                    onChange={event => handleEditChange('availableEquipment', event.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600"
                    placeholder="e.g., dumbbells, kettlebell, resistance bands"
                  />
                </div>

                {saveMessage && (
                  <div className="md:col-span-2 text-sm text-slate-600 dark:text-slate-300">{saveMessage}</div>
                )}

                <div className="md:col-span-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setView('overview')} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:opacity-70"
                  >
                    {savingProfile ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {view === 'notifications' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400">Notification Settings</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Control how we keep you updated.</p>
                </div>
                <button onClick={() => setView('overview')} className="text-sm font-semibold text-slate-500 hover:text-cyan-600">Close</button>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'push', label: 'Push alerts', description: 'Session reminders and schedule changes.' },
                  { key: 'email', label: 'Email updates', description: 'Weekly summaries and plan updates.' },
                  { key: 'reminders', label: 'Daily reminders', description: 'Motivational nudges and hydration checks.' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <div>
                      <p className="font-semibold">{item.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={notificationSettings[item.key as keyof typeof notificationSettings]}
                        onChange={event => setNotificationSettings(prev => ({ ...prev, [item.key]: event.target.checked }))}
                      />
                      <span
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                          notificationSettings[item.key as keyof typeof notificationSettings]
                            ? 'bg-cyan-500'
                            : 'bg-gray-300 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${
                            notificationSettings[item.key as keyof typeof notificationSettings] ? 'translate-x-5' : ''
                          }`}
                        />
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'terms' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400">Terms of Service</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Quick summary of how we handle your data.</p>
                </div>
                <button onClick={() => setView('overview')} className="text-sm font-semibold text-slate-500 hover:text-cyan-600">Close</button>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li>We store your profile securely to personalize training and nutrition guidance.</li>
                <li>You can update or delete your profile at any time from this page.</li>
                <li>Notifications are optional and you can opt out with the toggles above.</li>
                <li>We never sell your personal data. Third-party access is limited to services needed to run the app.</li>
                <li>Using the service means you agree to these terms and our fair-use policy.</li>
              </ol>
              <p className="text-xs text-slate-500 dark:text-slate-400">This is a placeholder summary. Replace with your legal text when ready.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};