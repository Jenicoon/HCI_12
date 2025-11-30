import React from 'react';
import type { Tab } from '../App';
import { HomeIcon, CalendarIcon, HistoryIcon, UserIcon } from './icons';

interface BottomNavProps {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
}

const navItems = [
    { id: 'home', label: 'Main', icon: <HomeIcon className="w-6 h-6 mb-1" /> },
    { id: 'reservations', label: 'Reservation', icon: <CalendarIcon className="w-6 h-6 mb-1" /> },
    { id: 'log', label: 'Record', icon: <HistoryIcon className="w-6 h-6 mb-1" /> },
    { id: 'mypage', label: 'My Page', icon: <UserIcon className="w-6 h-6 mb-1" /> },
] as const;


export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex justify-around z-20 transition-colors duration-300">
            {navItems.map(item => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs font-medium transition-colors duration-200 ${
                        activeTab === item.id ? 'text-cyan-500 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400 hover:text-cyan-500 dark:hover:text-white'
                    }`}
                >
                    {item.icon}
                    {item.label}
                </button>
            ))}
        </nav>
    );
};