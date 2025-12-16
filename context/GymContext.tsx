import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import type { Equipment, Gym, OperatingHours } from '../types';
import { firestore } from '../services/firebase';

export interface GymPayload {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  description?: string;
  photos: string[];
  amenities: string[];
  equipment: Equipment[];
  operatingHours: OperatingHours;
}

interface GymContextValue {
  gyms: Gym[];
  loading: boolean;
  createGym: (ownerId: string, payload: GymPayload) => Promise<Gym>;
  updateGym: (ownerId: string, gymId: string, payload: Partial<GymPayload>) => Promise<void>;
  deleteGym: (ownerId: string, gymId: string) => Promise<void>;
  getGymsByOwner: (ownerId: string) => Gym[];
}

const GymContext = createContext<GymContextValue | undefined>(undefined);
const DEFAULT_HOURS: OperatingHours = {
  weekdays: '06:00 - 23:00',
  weekends: '08:00 - 22:00',
};

const normalizeEquipment = (raw: any): Equipment | null => {
  if (!raw || typeof raw !== 'object') return null;
  const { id, name, category, quantity } = raw;
  if (typeof id !== 'string' || typeof name !== 'string') return null;
  if (category !== 'cardio' && category !== 'machine' && category !== 'freeWeight') return null;
  const normalized: Equipment = {
    id,
    name,
    category,
  };
  if (typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0) {
    normalized.quantity = quantity;
  }
  return normalized;
};

const normalizeGym = (raw: any): Gym | null => {
  if (!raw || typeof raw !== 'object') return null;
  const { id, ownerId, name, address, latitude, longitude } = raw;
  if (typeof id !== 'string' || typeof ownerId !== 'string') return null;
  if (typeof name !== 'string' || typeof address !== 'string') return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
  const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : createdAt;

  const operatingHoursRaw = raw.operatingHours ?? {};
  const operatingHours: OperatingHours = {
    weekdays: typeof operatingHoursRaw.weekdays === 'string' ? operatingHoursRaw.weekdays : DEFAULT_HOURS.weekdays,
    weekends: typeof operatingHoursRaw.weekends === 'string' ? operatingHoursRaw.weekends : DEFAULT_HOURS.weekends,
    holidays: typeof operatingHoursRaw.holidays === 'string' ? operatingHoursRaw.holidays : undefined,
  };

  const photos = Array.isArray(raw.photos) ? raw.photos.filter((url: unknown) => typeof url === 'string' && url.trim()) : [];
  const amenities = Array.isArray(raw.amenities)
    ? raw.amenities.filter((item: unknown) => typeof item === 'string' && item.trim())
    : [];
  const equipment: Equipment[] = Array.isArray(raw.equipment)
    ? raw.equipment.map(normalizeEquipment).filter((item: Equipment | null): item is Equipment => Boolean(item))
    : [];

  return {
    id,
    ownerId,
    name,
    address,
    latitude: lat,
    longitude: lng,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    photos,
    amenities,
    equipment,
    operatingHours,
    createdAt,
    updatedAt,
  };
};
const gymsCollection = collection(firestore, 'gyms');

export const GymProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(gymsCollection, snapshot => {
      const mapped = snapshot.docs
        .map(docSnapshot => {
          const data = docSnapshot.data();
          return normalizeGym({ ...data, id: docSnapshot.id });
        })
        .filter((gym): gym is Gym => Boolean(gym));
      setGyms(mapped);
      setLoading(false);
    }, error => {
      console.error('Failed to subscribe to gyms collection:', error);
      setGyms([]);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const createGym = useCallback(async (ownerId: string, payload: GymPayload) => {
    const timestamp = new Date().toISOString();
    const document = {
      ownerId,
      name: payload.name.trim(),
      address: payload.address.trim(),
      latitude: payload.latitude,
      longitude: payload.longitude,
      description: payload.description?.trim() ?? null,
      photos: payload.photos,
      amenities: payload.amenities,
      equipment: payload.equipment,
      operatingHours: payload.operatingHours,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const docRef = await addDoc(gymsCollection, document);
    const gym: Gym = {
      id: docRef.id,
      ownerId,
      name: document.name,
      address: document.address,
      latitude: document.latitude,
      longitude: document.longitude,
      description: payload.description?.trim(),
      photos: document.photos,
      amenities: document.amenities,
      equipment: document.equipment,
      operatingHours: document.operatingHours,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
    return gym;
  }, []);

  const updateGym = useCallback(async (ownerId: string, gymId: string, payload: Partial<GymPayload>) => {
    const gymRef = doc(firestore, 'gyms', gymId);
    const snapshot = await getDoc(gymRef);
    if (!snapshot.exists()) {
      throw new Error('해당 헬스장을 찾을 수 없습니다.');
    }
    const data = snapshot.data();
    if (data.ownerId !== ownerId) {
      throw new Error('이 헬스장을 수정할 권한이 없습니다.');
    }

    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (payload.name !== undefined) updatePayload.name = payload.name.trim();
    if (payload.address !== undefined) updatePayload.address = payload.address.trim();
    if (payload.description !== undefined) updatePayload.description = payload.description?.trim() ?? null;
    if (payload.latitude !== undefined) updatePayload.latitude = payload.latitude;
    if (payload.longitude !== undefined) updatePayload.longitude = payload.longitude;
    if (payload.photos !== undefined) updatePayload.photos = payload.photos;
    if (payload.amenities !== undefined) updatePayload.amenities = payload.amenities;
    if (payload.equipment !== undefined) updatePayload.equipment = payload.equipment;
    if (payload.operatingHours !== undefined) updatePayload.operatingHours = payload.operatingHours;

    await updateDoc(gymRef, updatePayload);
  }, []);

  const deleteGym = useCallback(async (ownerId: string, gymId: string) => {
    const gymRef = doc(firestore, 'gyms', gymId);
    const snapshot = await getDoc(gymRef);
    if (!snapshot.exists()) {
      return;
    }
    const data = snapshot.data();
    if (data.ownerId !== ownerId) {
      throw new Error('이 헬스장을 삭제할 권한이 없습니다.');
    }
    await deleteDoc(gymRef);
  }, []);

  const getGymsByOwner = useCallback(
    (ownerId: string) => gyms.filter(gym => gym.ownerId === ownerId),
    [gyms]
  );

  const value = useMemo<GymContextValue>(
    () => ({ gyms, loading, createGym, updateGym, deleteGym, getGymsByOwner }),
    [gyms, loading, createGym, updateGym, deleteGym, getGymsByOwner]
  );

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>;
};

export const useGyms = (): GymContextValue => {
  const context = useContext(GymContext);
  if (!context) {
    throw new Error('useGyms must be used within a GymProvider');
  }
  return context;
};
