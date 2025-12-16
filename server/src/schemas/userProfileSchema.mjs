import { z } from 'zod';

export const UserProfileSchema = z.object({
  goal: z.string().min(1),
  height: z.number().positive(),
  weight: z.number().positive(),
  bodyFat: z.number().nonnegative().max(100).optional(),
  healthConditions: z.string().optional(),
  workoutPreference: z.enum(['home', 'gym']).default('home'),
  availableEquipment: z.string().optional(),
});
