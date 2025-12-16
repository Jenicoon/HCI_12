import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ProgressData, ProgressEntry, WorkoutLogEntry } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { addProgressEntry, addWorkoutLog, subscribeToProgressEntries, subscribeToWorkoutLogs, toggleWorkoutCompletion } from '../../services/progressService';

const ProgressTracker: React.FC<{ data: ProgressData[]; loading: boolean }> = ({ data, loading }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const tooltipBg = isDark ? '#1e293b' : '#ffffff';
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

    return (
                <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10 w-full min-w-0">
                        <h3 className="text-lg sm:text-xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Body Composition</h3>
                        {loading ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
                        ) : data.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">No body composition entries yet.</p>
                        ) : (
                                <div className="h-80 w-full min-w-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={data}>
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
                        )}
        </div>
    );
};

const WorkoutHistory: React.FC<{
        groupedWorkouts: Record<string, WorkoutLogEntry[]>;
        loading: boolean;
        onToggleCompletion: (workoutId: string, completed: boolean) => void;
}> = ({ groupedWorkouts, loading, onToggleCompletion }) => {
        const groupedEntries = Object.entries(groupedWorkouts) as [string, WorkoutLogEntry[]][];

        return (
                <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10">
                        <h3 className="text-lg sm:text-xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Past Workouts</h3>
                        {loading ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
                        ) : groupedEntries.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">No workout history yet.</p>
                        ) : (
                                <div className="space-y-6">
                                        {groupedEntries.map(([week, workouts]) => (
                                                <div key={week}>
                                                        <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">{week}</h4>
                                                        <ul className="space-y-2">
                                                                {workouts.map(workout => (
                                                                        <li
                                                                                key={workout.id}
                                                                                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg ${workout.completed ? 'bg-gray-50 dark:bg-slate-700' : 'bg-gray-50/70 dark:bg-slate-700/50'}`}
                                                                        >
                                                                                <div className="space-y-1">
                                                                                        <p className="font-medium text-slate-800 dark:text-white leading-tight break-words">{workout.day}</p>
                                                                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed break-words">{workout.focus}</p>
                                                                                        {workout.completedAt && (
                                                                                                <p className="text-xs text-slate-400 dark:text-slate-500">Completed: {new Date(workout.completedAt).toLocaleString()}</p>
                                                                                        )}
                                                                                </div>
                                                                                <button
                                                                                        onClick={() => onToggleCompletion(workout.id, !workout.completed)}
                                                                                        className={`self-start sm:self-end px-3 py-1 text-xs font-semibold rounded-full transition ${
                                                                                                workout.completed
                                                                                                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                                                                                        : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                                                                                        }`}
                                                                                        type="button"
                                                                                >
                                                                                        {workout.completed ? 'Undo complete' : 'Mark complete'}
                                                                                </button>
                                                                        </li>
                                                                ))}
                                                        </ul>
                                                </div>
                                        ))}
                                </div>
                        )}
                </div>
        );
};

export const LogScreen: React.FC = () => {
    const { currentUser } = useAuth();
    const memberId = currentUser?.role === 'member' ? currentUser.id : null;
    const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
    const [progressLoading, setProgressLoading] = useState(true);
    const [progressError, setProgressError] = useState<string | null>(null);
    const [progressForm, setProgressForm] = useState({ label: '', weight: '', bodyFat: '', muscleMass: '' });
    const [progressSubmitting, setProgressSubmitting] = useState(false);

    const [workoutLogs, setWorkoutLogs] = useState<WorkoutLogEntry[]>([]);
    const [workoutLoading, setWorkoutLoading] = useState(true);
    const [workoutError, setWorkoutError] = useState<string | null>(null);
    const [workoutForm, setWorkoutForm] = useState({ weekLabel: '', day: '', focus: '' });
    const [workoutSubmitting, setWorkoutSubmitting] = useState(false);

    useEffect(() => {
        if (!memberId) {
            setProgressEntries([]);
            setProgressLoading(false);
            return;
        }
        setProgressLoading(true);
        setProgressError(null);
        const unsubscribe = subscribeToProgressEntries(
            memberId,
            entries => {
                setProgressEntries(entries);
                setProgressLoading(false);
            },
            error => {
                console.error('Failed to load progress entries:', error);
                setProgressEntries([]);
                setProgressLoading(false);
                setProgressError('Could not load body composition data.');
            }
        );
        return unsubscribe;
    }, [memberId]);

    useEffect(() => {
        if (!memberId) {
            setWorkoutLogs([]);
            setWorkoutLoading(false);
            return;
        }
        setWorkoutLoading(true);
        setWorkoutError(null);
        const unsubscribe = subscribeToWorkoutLogs(
            memberId,
            entries => {
                setWorkoutLogs(entries);
                setWorkoutLoading(false);
            },
            error => {
                console.error('Failed to load workout logs:', error);
                setWorkoutLogs([]);
                setWorkoutLoading(false);
                setWorkoutError('Could not load workout history.');
            }
        );
        return unsubscribe;
    }, [memberId]);

    const progressData = useMemo<ProgressData[]>(
        () =>
            progressEntries.map(entry => ({
                name: entry.label,
                weight: entry.weight,
                bodyFat: typeof entry.bodyFat === 'number' ? entry.bodyFat : 0,
                muscleMass: typeof entry.muscleMass === 'number' ? entry.muscleMass : 0,
            })),
        [progressEntries]
    );

    const groupedWorkouts = useMemo(() => {
        return workoutLogs.reduce<Record<string, WorkoutLogEntry[]>>((acc, log) => {
            const key = log.weekLabel || 'Recent';
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(log);
            return acc;
        }, {});
    }, [workoutLogs]);

    const handleProgressInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setProgressForm(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleWorkoutInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setWorkoutForm(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleProgressSubmit = useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!memberId) {
                                setProgressError('You need a member account to record progress.');
                return;
            }
            const label = progressForm.label.trim() || `Week ${progressEntries.length + 1}`;
            const weightValue = Number(progressForm.weight);
            const bodyFatValue = progressForm.bodyFat ? Number(progressForm.bodyFat) : undefined;
            const muscleValue = progressForm.muscleMass ? Number(progressForm.muscleMass) : undefined;
            if (!Number.isFinite(weightValue)) {
                                setProgressError('Please enter weight as a number.');
                return;
            }
            if (progressForm.bodyFat && !Number.isFinite(bodyFatValue)) {
                                setProgressError('Please enter body fat as a number.');
                return;
            }
            if (progressForm.muscleMass && !Number.isFinite(muscleValue)) {
                                setProgressError('Please enter muscle mass as a number.');
                return;
            }
            setProgressSubmitting(true);
            setProgressError(null);
            try {
                await addProgressEntry(memberId, {
                    label,
                    weight: weightValue,
                    bodyFat: bodyFatValue,
                    muscleMass: muscleValue,
                });
                setProgressForm({ label: '', weight: '', bodyFat: '', muscleMass: '' });
            } catch (error) {
                console.error('Failed to add progress entry:', error);
                                setProgressError('Could not save body composition entry.');
            } finally {
                setProgressSubmitting(false);
            }
        },
        [memberId, progressEntries.length, progressForm]
    );

    const handleWorkoutSubmit = useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!memberId) {
                                setWorkoutError('You need a member account to record workouts.');
                return;
            }
            const weekLabel = workoutForm.weekLabel.trim() || 'This week';
            const day = workoutForm.day.trim();
            const focus = workoutForm.focus.trim();
            if (!day || !focus) {
                                setWorkoutError('Please enter both the workout day and focus.');
                return;
            }
            setWorkoutSubmitting(true);
            setWorkoutError(null);
            try {
                await addWorkoutLog(memberId, {
                    weekLabel,
                    day,
                    focus,
                });
                setWorkoutForm({ weekLabel: '', day: '', focus: '' });
            } catch (error) {
                console.error('Failed to add workout log:', error);
                                setWorkoutError('Could not save workout entry.');
            } finally {
                setWorkoutSubmitting(false);
            }
        },
        [memberId, workoutForm]
    );

    const handleToggleCompletion = useCallback(
        async (workoutId: string, completed: boolean) => {
            if (!memberId) {
                                setWorkoutError('You need a member account to update workouts.');
                return;
            }
            try {
                await toggleWorkoutCompletion(memberId, workoutId, completed);
            } catch (error) {
                console.error('Failed to toggle workout completion:', error);
                                setWorkoutError('Could not update completion status.');
            }
        },
        [memberId]
    );

    if (!memberId) {
        return (
            <div className="min-h-screen text-slate-800 dark:text-white p-4 sm:p-6 lg:p-8 transition-colors duration-300">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">Your Journey</h1>
                    <p className="text-slate-500 dark:text-slate-400">Progress tracking is available for member accounts.</p>
                </div>
            </div>
        );
    }

  return (
                <div className="min-h-screen text-slate-800 dark:text-white p-4 sm:p-6 lg:p-8 transition-colors duration-300">
                        <div className="max-w-4xl lg:max-w-6xl mx-auto">
                                <header className="mb-6 sm:mb-8">
                                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">Your Journey</h1>
                                        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">Track your progress and stay consistent.</p>
                                </header>

                <div className="space-y-8">
                        {progressError && <p className="text-sm text-red-500">{progressError}</p>}
                        <ProgressTracker data={progressData} loading={progressLoading} />
                        <form
                                onSubmit={handleProgressSubmit}
                                className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10 space-y-4"
                        >
                                <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400">Add body composition entry</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="sm:col-span-2 md:col-span-2">
                                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="label">Label</label>
                                                <input
                                                        id="label"
                                                        name="label"
                                                        value={progressForm.label}
                                                        onChange={handleProgressInputChange}
                                                        placeholder="Week 5"
                                                        className="w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"
                                                />
                                        </div>
                                        <div>
                                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="weight">Weight (kg)</label>
                                                <input
                                                        id="weight"
                                                        name="weight"
                                                        type="number"
                                                        step="0.1"
                                                        value={progressForm.weight}
                                                        onChange={handleProgressInputChange}
                                                        required
                                                        className="w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"
                                                />
                                        </div>
                                        <div>
                                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="bodyFat">Body fat (%)</label>
                                                <input
                                                        id="bodyFat"
                                                        name="bodyFat"
                                                        type="number"
                                                        step="0.1"
                                                        value={progressForm.bodyFat}
                                                        onChange={handleProgressInputChange}
                                                        className="w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"
                                                />
                                        </div>
                                        <div>
                                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="muscleMass">Muscle mass (kg)</label>
                                                <input
                                                        id="muscleMass"
                                                        name="muscleMass"
                                                        type="number"
                                                        step="0.1"
                                                        value={progressForm.muscleMass}
                                                        onChange={handleProgressInputChange}
                                                        className="w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"
                                                />
                                        </div>
                                </div>
                                <div className="flex justify-end">
                                        <button
                                                type="submit"
                                                disabled={progressSubmitting}
                                                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-400 text-white rounded-md font-semibold"
                                        >
                                                {progressSubmitting ? 'Saving…' : 'Save entry'}
                                        </button>
                                </div>
                        </form>

                        {workoutError && <p className="text-sm text-red-500">{workoutError}</p>}
                        <WorkoutHistory groupedWorkouts={groupedWorkouts} loading={workoutLoading} onToggleCompletion={handleToggleCompletion} />
                        <form
                                onSubmit={handleWorkoutSubmit}
                                className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10 space-y-4"
                        >
                                <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400">Add workout log</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        <div>
                                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="weekLabel">Week label</label>
                                                <input
                                                        id="weekLabel"
                                                        name="weekLabel"
                                                        value={workoutForm.weekLabel}
                                                        onChange={handleWorkoutInputChange}
                                                        placeholder="This week"
                                                        className="w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"
                                                />
                                        </div>
                                        <div>
                                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="day">Day</label>
                                                <input
                                                        id="day"
                                                        name="day"
                                                        value={workoutForm.day}
                                                        onChange={handleWorkoutInputChange}
                                                        placeholder="Monday"
                                                        required
                                                        className="w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"
                                                />
                                        </div>
                                        <div>
                                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="focus">Focus</label>
                                                <input
                                                        id="focus"
                                                        name="focus"
                                                        value={workoutForm.focus}
                                                        onChange={handleWorkoutInputChange}
                                                        placeholder="Chest & Triceps"
                                                        required
                                                        className="w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"
                                                />
                                        </div>
                                </div>
                                <div className="flex justify-end">
                                        <button
                                                type="submit"
                                                disabled={workoutSubmitting}
                                                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-400 text-white rounded-md font-semibold"
                                        >
                                                {workoutSubmitting ? 'Saving…' : 'Save entry'}
                                        </button>
                                </div>
                        </form>
                </div>
      </div>
    </div>
  );
};