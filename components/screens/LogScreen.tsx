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
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10">
            <h3 className="text-xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Body Composition</h3>
                        {loading ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">불러오는 중입니다…</p>
                        ) : data.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">아직 기록된 체성분 데이터가 없습니다.</p>
                        ) : (
                                <div className="h-80">
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
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10">
                        <h3 className="text-xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Past Workouts</h3>
                        {loading ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">불러오는 중입니다…</p>
                        ) : groupedEntries.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">기록된 운동 히스토리가 없습니다.</p>
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
                                                                                <div>
                                                                                        <p className="font-medium text-slate-800 dark:text-white">{workout.day}</p>
                                                                                        <p className="text-sm text-slate-500 dark:text-slate-400">{workout.focus}</p>
                                                                                        {workout.completedAt && (
                                                                                                <p className="text-xs text-slate-400 dark:text-slate-500">완료: {new Date(workout.completedAt).toLocaleString()}</p>
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
                                                                                        {workout.completed ? '완료 취소' : '완료 표시'}
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
                setProgressError('체성분 데이터를 불러오지 못했습니다.');
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
                setWorkoutError('운동 기록을 불러오지 못했습니다.');
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
                setProgressError('멤버 계정에서만 기록할 수 있습니다.');
                return;
            }
            const label = progressForm.label.trim() || `Week ${progressEntries.length + 1}`;
            const weightValue = Number(progressForm.weight);
            const bodyFatValue = progressForm.bodyFat ? Number(progressForm.bodyFat) : undefined;
            const muscleValue = progressForm.muscleMass ? Number(progressForm.muscleMass) : undefined;
            if (!Number.isFinite(weightValue)) {
                setProgressError('체중을 숫자로 입력해 주세요.');
                return;
            }
            if (progressForm.bodyFat && !Number.isFinite(bodyFatValue)) {
                setProgressError('체지방률을 숫자로 입력해 주세요.');
                return;
            }
            if (progressForm.muscleMass && !Number.isFinite(muscleValue)) {
                setProgressError('골격근량을 숫자로 입력해 주세요.');
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
                setProgressError('체성분 데이터를 저장하지 못했습니다.');
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
                setWorkoutError('멤버 계정에서만 기록할 수 있습니다.');
                return;
            }
            const weekLabel = workoutForm.weekLabel.trim() || '이번 주';
            const day = workoutForm.day.trim();
            const focus = workoutForm.focus.trim();
            if (!day || !focus) {
                setWorkoutError('운동한 요일과 포커스를 모두 입력해 주세요.');
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
                setWorkoutError('운동 기록을 저장하지 못했습니다.');
            } finally {
                setWorkoutSubmitting(false);
            }
        },
        [memberId, workoutForm]
    );

    const handleToggleCompletion = useCallback(
        async (workoutId: string, completed: boolean) => {
            if (!memberId) {
                setWorkoutError('멤버 계정에서만 수정할 수 있습니다.');
                return;
            }
            try {
                await toggleWorkoutCompletion(memberId, workoutId, completed);
            } catch (error) {
                console.error('Failed to toggle workout completion:', error);
                setWorkoutError('완료 상태를 업데이트하지 못했습니다.');
            }
        },
        [memberId]
    );

    if (!memberId) {
        return (
            <div className="min-h-screen text-slate-800 dark:text-white p-4 sm:p-6 lg:p-8 transition-colors duration-300">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">Your Journey</h1>
                    <p className="text-slate-500 dark:text-slate-400">멤버 계정에서만 진행 상황을 확인할 수 있습니다.</p>
                </div>
            </div>
        );
    }

  return (
    <div className="min-h-screen text-slate-800 dark:text-white p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">Your Journey</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track your progress and stay consistent.</p>
        </header>

                <div className="space-y-8">
                        {progressError && <p className="text-sm text-red-500">{progressError}</p>}
                        <ProgressTracker data={progressData} loading={progressLoading} />
                        <form
                                onSubmit={handleProgressSubmit}
                                className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10 space-y-4"
                        >
                                <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400">새 체성분 기록 추가</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="label">라벨</label>
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
                                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="weight">체중 (kg)</label>
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
                                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="bodyFat">체지방률 (%)</label>
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
                                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="muscleMass">골격근량 (kg)</label>
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
                                                {progressSubmitting ? '저장 중…' : '기록 저장'}
                                        </button>
                                </div>
                        </form>

                        {workoutError && <p className="text-sm text-red-500">{workoutError}</p>}
                        <WorkoutHistory groupedWorkouts={groupedWorkouts} loading={workoutLoading} onToggleCompletion={handleToggleCompletion} />
                        <form
                                onSubmit={handleWorkoutSubmit}
                                className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10 space-y-4"
                        >
                                <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400">운동 기록 추가</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="weekLabel">주차 라벨</label>
                                                <input
                                                        id="weekLabel"
                                                        name="weekLabel"
                                                        value={workoutForm.weekLabel}
                                                        onChange={handleWorkoutInputChange}
                                                        placeholder="이번 주"
                                                        className="w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"
                                                />
                                        </div>
                                        <div>
                                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="day">요일</label>
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
                                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="focus">포커스</label>
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
                                                {workoutSubmitting ? '저장 중…' : '기록 저장'}
                                        </button>
                                </div>
                        </form>
                </div>
      </div>
    </div>
  );
};