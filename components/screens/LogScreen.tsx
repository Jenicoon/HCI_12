import React from 'react';
import type { ProgressData } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const mockProgressData: ProgressData[] = [
  { name: 'Week 1', weight: 80, bodyFat: 20, muscleMass: 35 },
  { name: 'Week 2', weight: 79.5, bodyFat: 19.8, muscleMass: 35.2 },
  { name: 'Week 3', weight: 79, bodyFat: 19.5, muscleMass: 35.5 },
  { name: 'Week 4', weight: 78, bodyFat: 19.1, muscleMass: 35.8 },
];

const mockWorkoutHistory = {
    'Last Week': [
        { day: 'Monday', focus: 'Chest & Triceps', completed: true },
        { day: 'Tuesday', focus: 'Back & Biceps', completed: true },
        { day: 'Wednesday', focus: 'Legs & Core', completed: false },
        { day: 'Thursday', focus: 'Cardio', completed: true },
    ],
    '2 Weeks Ago': [
        { day: 'Monday', focus: 'Full Body', completed: true },
        { day: 'Tuesday', focus: 'Cardio', completed: true },
    ]
}


const ProgressTracker: React.FC = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const tooltipBg = isDark ? '#1e293b' : '#ffffff';
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10">
            <h3 className="text-xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Body Composition</h3>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockProgressData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="name" stroke={textColor} />
                        <YAxis yAxisId="left" stroke="#0891b2" />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                        <Tooltip 
                            contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }} 
                            labelStyle={{ color: textColor }}
                        />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="weight" name="Weight (kg)" stroke="#0891b2" strokeWidth={2} />
                        <Line yAxisId="right" type="monotone" dataKey="bodyFat" name="Body Fat %" stroke="#10b981" strokeWidth={2} />
                        <Line yAxisId="right" type="monotone" dataKey="muscleMass" name="Muscle (kg)" stroke="#ec4899" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const WorkoutHistory: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10">
        <h3 className="text-xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Past Workouts</h3>
        <div className="space-y-6">
            {Object.entries(mockWorkoutHistory).map(([week, workouts]) => (
                <div key={week}>
                    <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">{week}</h4>
                    <ul className="space-y-2">
                        {workouts.map(workout => (
                           <li key={workout.day} className={`flex justify-between items-center p-3 rounded-lg ${workout.completed ? 'bg-gray-50 dark:bg-slate-700' : 'bg-gray-50/70 dark:bg-slate-700/50'}`}>
                                <div>
                                    <p className="font-medium text-slate-800 dark:text-white">{workout.day}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{workout.focus}</p>
                                </div>
                                {workout.completed ? 
                                    <span className="text-xs font-bold text-green-500">DONE</span> :
                                    <span className="text-xs font-bold text-yellow-500">SKIPPED</span>
                                }
                           </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    </div>
);


export const LogScreen: React.FC = () => {
  return (
    <div className="min-h-screen text-slate-800 dark:text-white p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">Your Journey</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track your progress and stay consistent.</p>
        </header>

        <div className="space-y-8">
            <ProgressTracker />
            <WorkoutHistory />
        </div>
      </div>
    </div>
  );
};