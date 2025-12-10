import React from 'react';
import type { UserProfile } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { SunIcon, MoonIcon } from '../icons';

interface MyPageScreenProps {
  user: UserProfile;
  accountName: string;
  email: string;
  onLogout: () => void;
}

export const MyPageScreen: React.FC<MyPageScreenProps> = ({ user, accountName, email, onLogout }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen text-slate-800 dark:text-white p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">My Page</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your profile and settings.</p>
        </header>
        
        <div className="space-y-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10">
              <h3 className="text-xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Profile Information</h3>
                <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Account Name:</span>
                  <span className="font-semibold">{accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Email:</span>
                  <span className="font-semibold">{email}</span>
                </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Goal:</span>
                        <span className="font-semibold">{user.goal === 'weightLoss' ? 'Weight Loss' : user.goal === 'muscleGain' ? 'Muscle Gain' : 'Rehab/Mobility'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Height:</span>
                        <span className="font-semibold">{user.height} cm</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Weight:</span>
                        <span className="font-semibold">{user.weight} kg</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Body Fat %:</span>
                        <span className="font-semibold">{user.bodyFat || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10">
                <h3 className="text-xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Settings</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <span className="font-medium">Theme</span>
                        <button 
                            onClick={toggleTheme} 
                            className="p-2 rounded-full bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors duration-200"
                            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        >
                            {theme === 'light' ? <MoonIcon className="w-5 h-5 text-slate-800" /> : <SunIcon className="w-5 h-5 text-yellow-400" />}
                        </button>
                    </div>
                    <button className="w-full text-left p-3 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition">Edit Profile</button>
                    <button className="w-full text-left p-3 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition">Notification Settings</button>
                    <button className="w-full text-left p-3 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition">Terms of Service</button>
                    <button
                      onClick={onLogout}
                      className="w-full text-left p-3 text-red-500 bg-gray-50 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-slate-600 rounded-lg transition"
                    >
                      Log Out
                    </button>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};