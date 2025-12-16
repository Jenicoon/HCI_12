import React, { useCallback, useMemo, useState } from 'react';
import type { FitnessPlan, UserProfile, Exercise, Meal } from '../../types';
import type { ExerciseVideo } from '../../services/exerciseVideoService';
import { fetchExerciseVideos } from '../../services/exerciseVideoService';
import { addWorkoutLog } from '../../services/progressService';

interface HomeScreenProps {
  plan: FitnessPlan;
  user: UserProfile;
  memberId: string | null;
}

interface VideoState {
  exercise: string | null;
  videos: ExerciseVideo[];
  loading: boolean;
  error: string | null;
}

const TodaysWorkout: React.FC<{
  workout: FitnessPlan['workoutPlan'][0];
  videoState: VideoState;
  onVideoRequest: (exercise: string) => void;
  onCompleteExercise: (exercise: Exercise) => void;
  completedExercises: Record<string, boolean>;
  savingExerciseKey: string | null;
  canLogExercise: boolean;
}> = ({ workout, videoState, onVideoRequest, onCompleteExercise, completedExercises, savingExerciseKey, canLogExercise }) => (
  <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10">
    <h3 className="text-lg sm:text-xl font-bold mb-1 text-cyan-600 dark:text-cyan-400">Today's Workout: {workout.focus}</h3>
    <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mb-4">{workout.day}</p>
    {workout.exercises && workout.exercises.length > 0 ? (
      <div className="space-y-3">
        {workout.exercises.map((ex: Exercise, index: number) => {
          const isActive = videoState.exercise === ex.name;
          const exerciseKey = `${workout.day}-${ex.name}`.toLowerCase();
          const isCompleted = Boolean(completedExercises[exerciseKey]);
          const isSaving = savingExerciseKey === exerciseKey;
          return (
            <div key={index} className="bg-gray-50 dark:bg-slate-700 p-3 rounded-lg space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="font-semibold text-slate-800 dark:text-white break-words">{ex.name}</h4>
                <span className="text-xs sm:text-sm font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded text-cyan-600 dark:text-cyan-400 ring-1 ring-gray-200 dark:ring-slate-600 whitespace-nowrap">{ex.sets}x{ex.reps}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-words">{ex.description}</p>
                <button
                  onClick={() => onVideoRequest(ex.name)}
                  className="px-3 py-1 text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-white rounded-full self-start sm:self-auto"
                >
                  {isActive ? 'Replay video' : 'Watch video'}
                </button>
              </div>
              <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isCompleted}
                  disabled={!canLogExercise || isCompleted || isSaving}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    if (event.target.checked && !isCompleted) {
                      onCompleteExercise(ex);
                    }
                  }}
                  className="h-4 w-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                />
                {isCompleted ? 'Logged to history' : isSaving ? 'Saving…' : canLogExercise ? 'Mark complete' : 'Sign in to log workouts'}
              </label>
              {isActive && (
                <div className="bg-white/70 dark:bg-slate-800/80 p-3 rounded-lg space-y-2">
                  {videoState.loading && <p className="text-sm text-slate-500 dark:text-slate-300">Loading videos…</p>}
                  {videoState.error && <p className="text-sm text-red-500">{videoState.error}</p>}
                  {!videoState.loading && !videoState.error && videoState.videos.length > 0 && (
                    <ul className="space-y-2">
                      {videoState.videos.map(video => (
                        <li key={video.url ?? video.title}>
                          <a
                            href={video.url ?? '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-cyan-600 dark:text-cyan-300 underline"
                          >
                            {video.title} <span className="text-xs text-slate-500">({video.channel})</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!videoState.loading && !videoState.error && videoState.videos.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-300">No videos available.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    ) : (
      <p className="text-slate-500 dark:text-slate-400">Rest day! Enjoy your recovery.</p>
    )}
  </div>
);

const TodaysDiet: React.FC<{ diet: FitnessPlan['dietPlan'][0] }> = ({ diet }) => (
  <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10">
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 sm:gap-2 mb-4">
        <div>
            <h3 className="text-lg sm:text-xl font-bold text-cyan-600 dark:text-cyan-400">Today's Diet</h3>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">Total: {diet.dailyTotal.calories} kcal</p>
        </div>
        <div className="text-left sm:text-right text-xs text-slate-600 dark:text-slate-300 font-mono">
            <span>P:{diet.dailyTotal.protein}</span> | <span>C:{diet.dailyTotal.carbs}</span> | <span>F:{diet.dailyTotal.fat}</span>
        </div>
    </div>
    <div className="space-y-3">
      {(Object.entries(diet.meals) as [string, Meal | undefined][]).map(([mealType, meal]) => meal && (
          <div key={mealType} className="bg-gray-50 dark:bg-slate-700 p-3 rounded-lg">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-semibold capitalize text-slate-800 dark:text-white">{mealType}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 break-words sm:flex-1 sm:text-center">{meal.name}</p>
                  <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 whitespace-nowrap">{meal.calories} kcal</p>
              </div>
          </div>
      ))}
    </div>
  </div>
);


const getCurrentWeekLabel = () => {
  const now = new Date();
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const numberOfDays = Math.floor((now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.max(1, Math.ceil((now.getDay() + 1 + numberOfDays) / 7));
  return `Week ${weekNumber}`;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ plan, user, memberId }) => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaysWorkout = plan.workoutPlan.find(d => d.day === today) || plan.workoutPlan[0];
  const todaysDiet = plan.dietPlan.find(d => d.day === today) || plan.dietPlan[0];
  const [videoState, setVideoState] = useState<VideoState>({ exercise: null, videos: [], loading: false, error: null });
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [savingExerciseKey, setSavingExerciseKey] = useState<string | null>(null);
  const [completionFeedback, setCompletionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const currentWeekLabel = useMemo(() => getCurrentWeekLabel(), []);

  const handleVideoRequest = useCallback(async (exerciseName: string) => {
    setVideoState(prev => ({ ...prev, exercise: exerciseName, videos: [], loading: true, error: null }));
    try {
      const videos = await fetchExerciseVideos(exerciseName, 3);
      setVideoState({ exercise: exerciseName, videos, loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load video suggestions.';
      setVideoState({ exercise: exerciseName, videos: [], loading: false, error: message });
    }
  }, []);

  const handleExerciseCompletion = useCallback(
    async (exercise: Exercise) => {
      if (!memberId) {
        setCompletionFeedback({ type: 'error', message: 'You need a member account to log workouts.' });
        return;
      }
      const exerciseKey = `${todaysWorkout.day}-${exercise.name}`.toLowerCase();
      if (completedExercises[exerciseKey] || savingExerciseKey === exerciseKey) {
        return;
      }
      setSavingExerciseKey(exerciseKey);
      setCompletionFeedback(null);
      try {
        await addWorkoutLog(memberId, {
          weekLabel: currentWeekLabel,
          day: todaysWorkout.day,
          focus: todaysWorkout.focus,
          exerciseName: exercise.name,
          completed: true,
        });
        setCompletedExercises(prev => ({ ...prev, [exerciseKey]: true }));
        setCompletionFeedback({ type: 'success', message: `${exercise.name} logged to your history.` });
      } catch (error) {
        console.error('Failed to log workout exercise:', error);
        setCompletionFeedback({ type: 'error', message: 'Could not record this exercise. Try again in a moment.' });
      } finally {
        setSavingExerciseKey(null);
      }
    },
    [memberId, todaysWorkout.day, todaysWorkout.focus, completedExercises, savingExerciseKey, currentWeekLabel]
  );

  return (
    <div className="min-h-screen text-slate-800 dark:text-white p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="max-w-4xl lg:max-w-6xl mx-auto space-y-6 sm:space-y-8">
        <header className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">Hello!</h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">Ready to crush your goals today?</p>
        </header>

        {completionFeedback && (
          <div
            className={`p-3 rounded-lg text-sm font-medium ${
              completionFeedback.type === 'success'
                ? 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-200'
                : 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-200'
            }`}
          >
            {completionFeedback.message}
          </div>
        )}

        <div className="mb-4 sm:mb-6 bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-6 sm:px-6 sm:py-7 rounded-xl text-center shadow-lg">
          <p className="text-base sm:text-lg font-semibold text-slate-800">Workout Streak</p>
          <p className="text-4xl sm:text-5xl font-bold text-white">5 <span className="text-xl sm:text-2xl font-medium">days</span></p>
          <p className="text-xs sm:text-sm text-slate-700 mt-1">You're on fire! Keep it up.</p>
        </div>
        
        <div className="space-y-6 sm:space-y-8">
          <TodaysWorkout
            workout={todaysWorkout}
            videoState={videoState}
            onVideoRequest={handleVideoRequest}
            onCompleteExercise={handleExerciseCompletion}
            completedExercises={completedExercises}
            savingExerciseKey={savingExerciseKey}
            canLogExercise={Boolean(memberId)}
          />
          <TodaysDiet diet={todaysDiet} />
        </div>
      </div>
    </div>
  );
};