export interface UserProfile {
  goal: 'weightLoss' | 'muscleGain' | 'rehab' | string;
  height: number;
  weight: number;
  bodyFat?: number;
  healthConditions?: string;
  workoutPreference: 'home' | 'gym';
  availableEquipment?: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  description: string;
}

export interface WorkoutDay {
  day: string;
  focus: string;
  exercises: Exercise[];
}

export interface Meal {
  name: string;
  calories: number;
  description: string;
  recipe: string;
}

export interface DietDay {
  day: string;
  meals: {
    breakfast: Meal;
    lunch: Meal;
    dinner: Meal;
    snacks?: Meal;
  };
  dailyTotal: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
  };
}

export interface FitnessPlan {
  workoutPlan: WorkoutDay[];
  dietPlan: DietDay[];
}

export interface Equipment {
  id: string;
  name: string;
  category: 'cardio' | 'machine' | 'freeWeight';
}

export interface Gym {
  id: string;
  name: string;
  address: string;
  equipment: Equipment[];
}

export interface Reservation {
  id: string;
  gymId: string;
  equipmentId: string;
  timeSlot: string;
  date: string;
}

export interface ProgressData {
    name: string;
    weight: number;
    bodyFat: number;
    muscleMass: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
