import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { FitnessPlan } from '../types';
import { firestore } from './firebase';

const PLANS_COLLECTION = 'plans';

interface PlanDocument {
  plan: FitnessPlan;
  updatedAt: string;
}

export const getStoredPlanForMember = async (memberId: string): Promise<FitnessPlan | null> => {
  if (!memberId) {
    return null;
  }
  const planRef = doc(firestore, PLANS_COLLECTION, memberId);
  const snapshot = await getDoc(planRef);
  if (!snapshot.exists()) {
    return null;
  }
  const data = snapshot.data() as PlanDocument | { plan: FitnessPlan };
  return data.plan ?? null;
};

export const savePlanForMember = async (memberId: string, plan: FitnessPlan): Promise<void> => {
  if (!memberId) {
    return;
  }
  const planRef = doc(firestore, PLANS_COLLECTION, memberId);
  const payload: PlanDocument = {
    plan,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(planRef, payload, { merge: true });
};
