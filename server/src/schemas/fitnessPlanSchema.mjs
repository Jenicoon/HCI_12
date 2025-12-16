import { z } from 'zod';

export const ExerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().positive(),
  reps: z.string().min(1),
  rest: z.string().min(1),
  description: z.string().min(1),
});

export const WorkoutDaySchema = z.object({
  day: z.string().min(1),
  focus: z.string().min(1),
  exercises: z.array(ExerciseSchema).min(1),
});

export const MealSchema = z.object({
  name: z.string().min(1),
  calories: z.number().int().nonnegative(),
  description: z.string().min(1),
  recipe: z.string().min(1),
});

export const DietDaySchema = z.object({
  day: z.string().min(1),
  meals: z.object({
    breakfast: MealSchema,
    lunch: MealSchema,
    dinner: MealSchema,
    snacks: MealSchema.optional(),
  }),
  dailyTotal: z.object({
    calories: z.number().int().nonnegative(),
    protein: z.string().min(1),
    carbs: z.string().min(1),
    fat: z.string().min(1),
  }),
});

export const FitnessPlanSchema = z.object({
  workoutPlan: z.array(WorkoutDaySchema).min(1),
  dietPlan: z.array(DietDaySchema).min(1),
});
