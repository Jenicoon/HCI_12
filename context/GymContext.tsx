import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { Equipment, Gym, OperatingHours } from '../types';

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
  createGym: (ownerId: string, payload: GymPayload) => Gym;
  updateGym: (ownerId: string, gymId: string, payload: Partial<GymPayload>) => Gym | null;
  deleteGym: (ownerId: string, gymId: string) => void;
  getGymsByOwner: (ownerId: string) => Gym[];
}

const GymContext = createContext<GymContextValue | undefined>(undefined);

const STORAGE_KEY = 'fitness-gym-state';
const DEFAULT_HOURS: OperatingHours = {
  weekdays: '06:00 - 23:00',
  weekends: '08:00 - 22:00',
};

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `gym-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
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

const loadInitialGyms = (): Gym[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map(normalizeGym)
      .filter((gym: Gym | null): gym is Gym => Boolean(gym));
  } catch (error) {
    console.warn('Failed to parse gyms from storage:', error);
    return [];
  }
};

export const GymProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gyms, setGyms] = useState<Gym[]>(loadInitialGyms);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(gyms));
    } catch (error) {
      console.warn('Failed to persist gyms:', error);
    }
  }, [gyms]);

  const createGym = useCallback((ownerId: string, payload: GymPayload): Gym => {
    const timestamp = new Date().toISOString();
    const newGym: Gym = {
      id: createId(),
      ownerId,
      name: payload.name.trim(),
      address: payload.address.trim(),
      latitude: payload.latitude,
      longitude: payload.longitude,
      description: payload.description?.trim(),
      photos: payload.photos,
      amenities: payload.amenities,
      equipment: payload.equipment,
      operatingHours: payload.operatingHours,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setGyms(prev => [...prev, newGym]);
    return newGym;
  }, []);

  const updateGym = useCallback((ownerId: string, gymId: string, payload: Partial<GymPayload>): Gym | null => {
    let updatedGym: Gym | null = null;
    setGyms(prev =>
      prev.map(gym => {
        if (gym.id !== gymId || gym.ownerId !== ownerId) {
          return gym;
        }
        updatedGym = {
          ...gym,
          ...payload,
          name: payload.name !== undefined ? payload.name.trim() : gym.name,
          address: payload.address !== undefined ? payload.address.trim() : gym.address,
          description: payload.description !== undefined ? payload.description.trim() : gym.description,
          updatedAt: new Date().toISOString(),
        } as Gym;
        if (payload.latitude !== undefined) {
          updatedGym.latitude = payload.latitude;
        }
        if (payload.longitude !== undefined) {
          updatedGym.longitude = payload.longitude;
        }
        if (payload.photos !== undefined) {
          updatedGym.photos = payload.photos;
        }
        if (payload.amenities !== undefined) {
          updatedGym.amenities = payload.amenities;
        }
        if (payload.equipment !== undefined) {
          updatedGym.equipment = payload.equipment;
        }
        if (payload.operatingHours !== undefined) {
          updatedGym.operatingHours = payload.operatingHours;
        }
        return updatedGym;
      })
    );
    return updatedGym;
  }, []);

  const deleteGym = useCallback((ownerId: string, gymId: string) => {
    setGyms(prev => prev.filter(gym => !(gym.id === gymId && gym.ownerId === ownerId)));
  }, []);

  const getGymsByOwner = useCallback(
    (ownerId: string) => gyms.filter(gym => gym.ownerId === ownerId),
    [gyms]
  );

  const value = useMemo<GymContextValue>(
    () => ({ gyms, createGym, updateGym, deleteGym, getGymsByOwner }),
    [gyms, createGym, updateGym, deleteGym, getGymsByOwner]
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
