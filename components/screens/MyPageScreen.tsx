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
  const isDark = theme === 'dark';
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
    <div
      className={`min-h-screen p-4 sm:p-6 lg:p-8 transition-colors duration-300 ${
        isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-slate-800'
      }`}
    >
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">My Page</h1>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
            Manage your profile, notifications, and preferences.
          </p>
        </header>

        <div className="space-y-8">
          <div
            className={`${
              isDark ? 'bg-slate-800 ring-white/10' : 'bg-white ring-gray-200'
            } p-6 rounded-xl shadow-md ring-1 transition-colors duration-300`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>Profile Overview</h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Keep your account details up to date.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-full transition-colors duration-200 ${
                    isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                  {theme === 'light' ? (
                    <MoonIcon className="w-5 h-5 text-slate-800" />
                  ) : (
                    <SunIcon className="w-5 h-5 text-yellow-400" />
                  )}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {profileStats.map(item => (
                <div
                  key={item.label}
                  className={`flex justify-between px-3 py-2 rounded-lg text-sm transition-colors duration-300 ${
                    isDark ? 'bg-slate-700/60' : 'bg-gray-50'
                  }`}
                >
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{item.label}</span>
                  <span className="font-semibold text-right break-words max-w-[60%]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className={`${
              isDark ? 'bg-slate-800 ring-white/10' : 'bg-white ring-gray-200'
            } p-6 rounded-xl shadow-md ring-1 transition-colors duration-300`}
          >
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => setView('edit')}
                className={`w-full text-left p-4 rounded-lg transition border ${
                  view === 'edit'
                    ? isDark
                      ? 'border-cyan-400 bg-slate-700/70 text-cyan-200'
                      : 'border-cyan-500 bg-cyan-50 text-cyan-700'
                    : isDark
                    ? 'border-slate-700 bg-slate-700 hover:bg-slate-600 text-slate-200'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-slate-600'
                }`}
              >
                Edit Profile
              </button>
              <button
                onClick={() => setView('notifications')}
                className={`w-full text-left p-4 rounded-lg transition border ${
                  view === 'notifications'
                    ? isDark
                      ? 'border-cyan-400 bg-slate-700/70 text-cyan-200'
                      : 'border-cyan-500 bg-cyan-50 text-cyan-700'
                    : isDark
                    ? 'border-slate-700 bg-slate-700 hover:bg-slate-600 text-slate-200'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-slate-600'
                }`}
              >
                Notification Settings
              </button>
              <button
                onClick={() => setView('terms')}
                className={`w-full text-left p-4 rounded-lg transition border ${
                  view === 'terms'
                    ? isDark
                      ? 'border-cyan-400 bg-slate-700/70 text-cyan-200'
                      : 'border-cyan-500 bg-cyan-50 text-cyan-700'
                    : isDark
                    ? 'border-slate-700 bg-slate-700 hover:bg-slate-600 text-slate-200'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-slate-600'
                }`}
              >
                Terms of Service
              </button>
              <button
                onClick={onLogout}
                className={`w-full text-left p-4 rounded-lg transition border ${
                  isDark
                    ? 'border-red-500/50 bg-red-900/30 text-red-200 hover:bg-red-900/40'
                    : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                Log Out
              </button>
            </div>
          </div>

          {view === 'edit' && (
            <div
              className={`${
                isDark ? 'bg-slate-800 ring-white/10' : 'bg-white ring-gray-200'
              } p-6 rounded-xl shadow-md ring-1 space-y-4 animate-fade-in transition-colors duration-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>Edit Profile</h3>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Update your fitness profile and preferences.
                  </p>
                </div>
                <button
                  onClick={() => setView('overview')}
                  className={`text-sm font-semibold transition-colors ${
                    isDark ? 'text-slate-400 hover:text-cyan-300' : 'text-slate-500 hover:text-cyan-600'
                  }`}
                >
                  Close
                </button>
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
                        className={`flex-1 p-3 rounded-lg text-sm font-semibold transition ${
                          editForm.goal === option
                            ? 'bg-cyan-500 text-white'
                            : isDark
                            ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                            : 'bg-gray-100 hover:bg-gray-200 text-slate-700'
                        }`}
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
                    className={`w-full p-3 rounded-lg border transition-colors ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'
                    }`}
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
                    className={`w-full p-3 rounded-lg border transition-colors ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'
                    }`}
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
                    className={`w-full p-3 rounded-lg border transition-colors ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'
                    }`}
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
                        className={`flex-1 p-3 rounded-lg text-sm font-semibold transition ${
                          editForm.workoutPreference === option
                            ? 'bg-cyan-500 text-white'
                            : isDark
                            ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                            : 'bg-gray-100 hover:bg-gray-200 text-slate-700'
                        }`}
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
                    className={`w-full p-3 rounded-lg border transition-colors ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'
                    }`}
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
                    className={`w-full p-3 rounded-lg border transition-colors ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200'
                    }`}
                    placeholder="e.g., dumbbells, kettlebell, resistance bands"
                  />
                </div>

                {saveMessage && (
                  <div className={`md:col-span-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{saveMessage}</div>
                )}

                <div className="md:col-span-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setView('overview')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-slate-700'
                    }`}
                  >
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
            <div
              className={`${
                isDark ? 'bg-slate-800 ring-white/10' : 'bg-white ring-gray-200'
              } p-6 rounded-xl shadow-md ring-1 space-y-4 animate-fade-in transition-colors duration-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                    Notification Settings
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Control how we keep you updated.
                  </p>
                </div>
                <button
                  onClick={() => setView('overview')}
                  className={`text-sm font-semibold transition-colors ${
                    isDark ? 'text-slate-400 hover:text-cyan-300' : 'text-slate-500 hover:text-cyan-600'
                  }`}
                >
                  Close
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'push', label: 'Push alerts', description: 'Session reminders and schedule changes.' },
                  { key: 'email', label: 'Email updates', description: 'Weekly summaries and plan updates.' },
                  { key: 'reminders', label: 'Daily reminders', description: 'Motivational nudges and hydration checks.' },
                ].map(item => (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors duration-300 ${
                      isDark ? 'bg-slate-700' : 'bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{item.label}</p>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.description}</p>
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
                            : isDark
                            ? 'bg-slate-600'
                            : 'bg-gray-300'
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
            <div
              className={`${
                isDark ? 'bg-slate-800 ring-white/10' : 'bg-white ring-gray-200'
              } p-6 rounded-xl shadow-md ring-1 space-y-4 animate-fade-in transition-colors duration-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>Terms of Service</h3>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Quick summary of how we handle your data.
                  </p>
                </div>
                <button
                  onClick={() => setView('overview')}
                  className={`text-sm font-semibold transition-colors ${
                    isDark ? 'text-slate-400 hover:text-cyan-300' : 'text-slate-500 hover:text-cyan-600'
                  }`}
                >
                  Close
                </button>
              </div>
              <ol className={`list-decimal list-inside space-y-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <li>We store your profile securely to personalize training and nutrition guidance.</li>
                <li>You can update or delete your profile at any time from this page.</li>
                <li>Notifications are optional and you can opt out with the toggles above.</li>
                <li>We never sell your personal data. Third-party access is limited to services needed to run the app.</li>
                <li>Using the service means you agree to these terms and our fair-use policy.</li>
              </ol>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                This is a placeholder summary. Replace with your legal text when ready.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};