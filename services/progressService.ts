import { addDoc, collection, doc, onSnapshot, orderBy, query, Unsubscribe, updateDoc } from 'firebase/firestore';
import type { ProgressEntry, WorkoutLogEntry } from '../types';
import { firestore } from './firebase';

const USERS_COLLECTION = 'users';

type ProgressEntryDocument = {
  label: string;
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
  recordedAt: string;
};

type WorkoutLogDocument = {
  weekLabel: string;
  day: string;
  focus: string;
  completed: boolean;
  completedAt?: string | null;
  createdAt: string;
};

export interface ProgressEntryPayload {
  label: string;
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
  recordedAt?: string;
}

export interface WorkoutLogPayload {
  weekLabel: string;
  day: string;
  focus: string;
  completed?: boolean;
  createdAt?: string;
}

const progressCollection = (memberId: string) => collection(firestore, USERS_COLLECTION, memberId, 'progressEntries');

const workoutCollection = (memberId: string) => collection(firestore, USERS_COLLECTION, memberId, 'workoutLogs');

export const subscribeToProgressEntries = (
  memberId: string,
  onData: (entries: ProgressEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const progressQuery = query(progressCollection(memberId), orderBy('recordedAt', 'asc'));
  return onSnapshot(
    progressQuery,
    snapshot => {
      const entries: ProgressEntry[] = snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data() as Partial<ProgressEntryDocument>;
        return {
          id: docSnapshot.id,
          label: data.label ?? 'Progress',
          weight: typeof data.weight === 'number' ? data.weight : 0,
          bodyFat: typeof data.bodyFat === 'number' ? data.bodyFat : null,
          muscleMass: typeof data.muscleMass === 'number' ? data.muscleMass : null,
          recordedAt: data.recordedAt ?? new Date().toISOString(),
        } satisfies ProgressEntry;
      });
      onData(entries);
    },
    error => {
      if (onError) {
        onError(error as Error);
      }
    }
  );
};

export const subscribeToWorkoutLogs = (
  memberId: string,
  onData: (entries: WorkoutLogEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const workoutQuery = query(workoutCollection(memberId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    workoutQuery,
    snapshot => {
      const entries: WorkoutLogEntry[] = snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data() as Partial<WorkoutLogDocument>;
        return {
          id: docSnapshot.id,
          weekLabel: data.weekLabel ?? 'Recent',
          day: data.day ?? 'Day',
          focus: data.focus ?? 'Workout',
          completed: typeof data.completed === 'boolean' ? data.completed : false,
          completedAt: data.completedAt ?? null,
          createdAt: data.createdAt ?? new Date().toISOString(),
        } satisfies WorkoutLogEntry;
      });
      onData(entries);
    },
    error => {
      if (onError) {
        onError(error as Error);
      }
    }
  );
};

export const addProgressEntry = async (memberId: string, payload: ProgressEntryPayload): Promise<void> => {
  const recordedAt = payload.recordedAt ?? new Date().toISOString();
  await addDoc(progressCollection(memberId), {
    label: payload.label.trim(),
    weight: payload.weight,
    bodyFat: typeof payload.bodyFat === 'number' ? payload.bodyFat : null,
    muscleMass: typeof payload.muscleMass === 'number' ? payload.muscleMass : null,
    recordedAt,
  } satisfies ProgressEntryDocument);
};

export const addWorkoutLog = async (memberId: string, payload: WorkoutLogPayload): Promise<void> => {
  const createdAt = payload.createdAt ?? new Date().toISOString();
  await addDoc(workoutCollection(memberId), {
    weekLabel: payload.weekLabel.trim(),
    day: payload.day.trim(),
    focus: payload.focus.trim(),
    completed: typeof payload.completed === 'boolean' ? payload.completed : false,
    completedAt: null,
    createdAt,
  } satisfies WorkoutLogDocument);
};

export const toggleWorkoutCompletion = async (memberId: string, workoutId: string, completed: boolean): Promise<void> => {
  const workoutRef = doc(workoutCollection(memberId), workoutId);
  await updateDoc(workoutRef, {
    completed,
    completedAt: completed ? new Date().toISOString() : null,
  });
};
