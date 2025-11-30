import React from 'react';
import type { FitnessPlan, UserProfile, Exercise, Meal } from '../../types';

interface HomeScreenProps {
  plan: FitnessPlan;
  user: UserProfile;
}

const TodaysWorkout: React.FC<{ workout: FitnessPlan['workoutPlan'][0] }> = ({ workout }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10">
    <h3 className="text-xl font-bold mb-1 text-cyan-600 dark:text-cyan-400">Today's Workout: {workout.focus}</h3>
    <p className="text-slate-500 dark:text-slate-400 mb-4">{workout.day}</p>
    {workout.exercises && workout.exercises.length > 0 ? (
      <div className="space-y-3">
        {workout.exercises.map((ex: Exercise, index: number) => (
          <div key={index} className="bg-gray-50 dark:bg-slate-700 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-slate-800 dark:text-white">{ex.name}</h4>
              <span className="text-sm font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded text-cyan-600 dark:text-cyan-400 ring-1 ring-gray-200 dark:ring-slate-600">{ex.sets}x{ex.reps}</span>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-slate-500 dark:text-slate-400">Rest day! Enjoy your recovery.</p>
    )}
  </div>
);

const TodaysDiet: React.FC<{ diet: FitnessPlan['dietPlan'][0] }> = ({ diet }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10">
    <div className="flex justify-between items-baseline mb-4">
        <div>
            <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400">Today's Diet</h3>
            <p className="text-slate-500 dark:text-slate-400">Total: {diet.dailyTotal.calories} kcal</p>
        </div>
        <div className="text-right text-xs text-slate-600 dark:text-slate-300 font-mono">
            <span>P:{diet.dailyTotal.protein}</span> | <span>C:{diet.dailyTotal.carbs}</span> | <span>F:{diet.dailyTotal.fat}</span>
        </div>
    </div>
    <div className="space-y-3">
      {(Object.entries(diet.meals) as [string, Meal | undefined][]).map(([mealType, meal]) => meal && (
          <div key={mealType} className="bg-gray-50 dark:bg-slate-700 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                  <p className="font-semibold capitalize text-slate-800 dark:text-white">{mealType}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{meal.name}</p>
                  <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">{meal.calories} kcal</p>
              </div>
          </div>
      ))}
    </div>
  </div>
);


export const HomeScreen: React.FC<HomeScreenProps> = ({ plan, user }) => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaysWorkout = plan.workoutPlan.find(d => d.day === today) || plan.workoutPlan[0];
  const todaysDiet = plan.dietPlan.find(d => d.day === today) || plan.dietPlan[0];

  return (
    <div className="min-h-screen text-slate-800 dark:text-white p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">Hello!</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Ready to crush your goals today?</p>
        </header>

        <div className="mb-8 bg-gradient-to-r from-cyan-400 to-blue-500 p-6 rounded-xl text-center shadow-lg">
          <p className="text-lg font-semibold text-slate-800">Workout Streak</p>
          <p className="text-5xl font-bold text-white">5 <span className="text-2xl font-medium">days</span></p>
          <p className="text-sm text-slate-700 mt-1">You're on fire! Keep it up.</p>
        </div>
        
        <div className="space-y-8">
          <TodaysWorkout workout={todaysWorkout} />
          <TodaysDiet diet={todaysDiet} />
        </div>
      </div>
    </div>
  );
};