export type UserRole = 'owner' | 'member';

export interface UserProfile {
  goal: 'weightLoss' | 'muscleGain' | 'rehab' | string;
  height: number;
  weight: number;
  bodyFat?: number;
  healthConditions?: string;
  workoutPreference: 'home' | 'gym';
  availableEquipment?: string;
}

export interface AccountBase {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface OwnerAccount extends AccountBase {
  role: 'owner';
  phone?: string;
  businessName?: string;
}

export interface MemberAccount extends AccountBase {
  role: 'member';
  profile?: UserProfile | null;
}

export type UserAccount = OwnerAccount | MemberAccount;

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
  quantity?: number;
}

export interface OperatingHours {
  weekdays: string;
  weekends: string;
  holidays?: string;
}

export interface Gym {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  description?: string;
  photos: string[];
  amenities: string[];
  equipment: Equipment[];
  operatingHours: OperatingHours;
  createdAt: string;
  updatedAt: string;
  distanceKm?: number;
}

export interface Reservation {
  id: string;
  gymId: string;
  equipmentId: string;
  timeSlot: string;
  date: string;
  memberId: string;
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
