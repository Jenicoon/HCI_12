import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Equipment, Gym } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useGyms, type GymPayload } from '../../context/GymContext';
import { geocodeKoreanAddress, searchKoreanAddresses, type AddressSuggestion } from '../../services/geocodingService';
import { uploadGymPhoto, deleteGymPhoto } from '../../services/mediaService';
import { loadKakaoMaps, DEFAULT_KAKAO_CENTER } from '../../services/kakaoMaps';

interface EquipmentDraft {
  name: string;
  category: Equipment['category'];
  quantity: number;
}

const defaultEquipmentDraft: EquipmentDraft = {
  name: '',
  category: 'cardio',
  quantity: 1,
};

const defaultHoursDraft = {
  weekdayOpen: '06:00',
  weekdayClose: '23:00',
  weekendOpen: '08:00',
  weekendClose: '22:00',
};

const CLOSED_DAY_OPTIONS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Public holidays'] as const;
type ClosedDayOption = (typeof CLOSED_DAY_OPTIONS)[number];

interface FormState {
  name: string;
  address: string;
  description: string;
  photos: string[];
  amenities: string[];
  weekdayOpen: string;
  weekdayClose: string;
  weekendOpen: string;
  weekendClose: string;
  closedDays: ClosedDayOption[];
}

const emptyForm: FormState = {
  name: '',
  address: '',
  description: '',
  photos: [],
  amenities: [],
  ...defaultHoursDraft,
  closedDays: [],
};

const parseHourRange = (value: string | undefined, fallbackOpen: string, fallbackClose: string) => {
  if (!value) {
    return { open: fallbackOpen, close: fallbackClose };
  }
  const match = value.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!match) {
    return { open: fallbackOpen, close: fallbackClose };
  }
  const [, openRaw, closeRaw] = match;
  const normalize = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = hours.padStart(2, '0');
    return `${h}:${minutes}`;
  };
  return { open: normalize(openRaw), close: normalize(closeRaw) };
};

const formatHourRange = (open: string, close: string) => {
  if (!open || !close) {
    return '';
  }
  return `${open} - ${close}`;
};

const parseClosedDays = (value: string | undefined): ClosedDayOption[] => {
  if (!value) {
    return [];
  }
  const normalized = value.replace(/^Closed on\s*/i, '').trim();
  if (!normalized) {
    return [];
  }
  return normalized
    .split(',')
    .map(item => item.trim())
    .filter((item): item is ClosedDayOption => CLOSED_DAY_OPTIONS.includes(item as ClosedDayOption));
};

const formatClosedDays = (days: ClosedDayOption[]): string | undefined => {
  if (days.length === 0) {
    return undefined;
  }
  return `Closed on ${days.join(', ')}`;
};

export const OwnerDashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { createGym, updateGym, deleteGym, getGymsByOwner, loading: gymsLoading } = useGyms();
  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [equipmentDraft, setEquipmentDraft] = useState<EquipmentDraft>(defaultEquipmentDraft);
  const [amenityInput, setAmenityInput] = useState('');
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [resolvedLocation, setResolvedLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const skipAutoSelectRef = useRef(false);
  const suspendAddressLookupRef = useRef(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const kakaoMapsRef = useRef<any>(null);
  const addressMapRef = useRef<any>(null);
  const addressMarkerRef = useRef<any>(null);
  const addressMapContainerRef = useRef<HTMLDivElement | null>(null);
  const [addressMapReady, setAddressMapReady] = useState(false);

  const ownerGyms: Gym[] = useMemo(() => {
    if (!currentUser || currentUser.role !== 'owner') {
      return [];
    }
    return getGymsByOwner(currentUser.id);
  }, [currentUser, getGymsByOwner]);

  useEffect(() => {
    let cancelled = false;
    if (addressMapRef.current) {
      setAddressMapReady(true);
      return;
    }

    loadKakaoMaps()
      .then(maps => {
        if (cancelled || !addressMapContainerRef.current) {
          return;
        }
        kakaoMapsRef.current = maps;
        const center = new maps.LatLng(DEFAULT_KAKAO_CENTER.lat, DEFAULT_KAKAO_CENTER.lng);
        const map = new maps.Map(addressMapContainerRef.current, {
          center,
          level: 5,
        });
        map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
        addressMapRef.current = map;
        setAddressMapReady(true);
      })
      .catch(error => {
        console.error('Failed to load Kakao Maps for owner dashboard:', error);
      });

    return () => {
      cancelled = true;
      if (addressMarkerRef.current) {
        addressMarkerRef.current.setMap(null);
        addressMarkerRef.current = null;
      }
      addressMapRef.current = null;
      kakaoMapsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (gymsLoading) {
      return;
    }
    if (!ownerGyms.length) {
      setSelectedGymId(null);
      setFormState(emptyForm);
      setEquipmentList([]);
      setResolvedLocation(null);
      suspendAddressLookupRef.current = true;
      setAddressInput(emptyForm.address);
      skipAutoSelectRef.current = false;
      return;
    }
    const currentSelection = selectedGymId ? ownerGyms.find(gym => gym.id === selectedGymId) : undefined;
    if (currentSelection) {
      skipAutoSelectRef.current = false;
      return;
    }
    if (skipAutoSelectRef.current) {
      return;
    }
    setSelectedGymId(ownerGyms[0].id);
  }, [ownerGyms, selectedGymId, gymsLoading]);

  useEffect(() => {
    if (gymsLoading) {
      return;
    }
    if (!selectedGymId) {
      setFormState(emptyForm);
      setEquipmentList([]);
      setResolvedLocation(null);
      suspendAddressLookupRef.current = true;
      setAddressInput(emptyForm.address);
      setPhotoUploadError(null);
      setIsUploadingPhoto(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
      setAddressSuggestions([]);
      setAddressSearchError(null);
      return;
    }
    const gym = ownerGyms.find(item => item.id === selectedGymId);
    if (!gym) return;
    const weekday = parseHourRange(gym.operatingHours.weekdays, defaultHoursDraft.weekdayOpen, defaultHoursDraft.weekdayClose);
    const weekend = parseHourRange(gym.operatingHours.weekends, defaultHoursDraft.weekendOpen, defaultHoursDraft.weekendClose);
    const closedDays = parseClosedDays(gym.operatingHours.holidays);
    setFormState({
      name: gym.name,
      address: gym.address,
      description: gym.description ?? '',
      photos: gym.photos,
      amenities: gym.amenities,
      weekdayOpen: weekday.open,
      weekdayClose: weekday.close,
      weekendOpen: weekend.open,
      weekendClose: weekend.close,
      closedDays,
    });
    setEquipmentList(gym.equipment);
    setResolvedLocation({ latitude: gym.latitude, longitude: gym.longitude, address: gym.address });
    suspendAddressLookupRef.current = true;
    setAddressInput(gym.address);
    setPhotoUploadError(null);
    setIsUploadingPhoto(false);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
    setAddressSuggestions([]);
    setAddressSearchError(null);
    setFeedback(null);
    setError(null);
  }, [ownerGyms, selectedGymId]);

  useEffect(() => {
    if (suspendAddressLookupRef.current) {
      suspendAddressLookupRef.current = false;
      return;
    }

    const query = addressInput.trim();
    if (query.length < 2) {
      setAddressSuggestions([]);
      setAddressSearchError(null);
      setIsSearchingAddress(false);
      return;
    }

    setIsSearchingAddress(true);
    setAddressSearchError(null);

    let cancelled = false;
    const handler = window.setTimeout(async () => {
      try {
        const results = await searchKoreanAddresses(query);
        if (cancelled) {
          return;
        }
        setAddressSuggestions(results.slice(0, 6));
        if (results.length === 0) {
          setAddressSearchError('No addresses found. Try a different road name or building number.');
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to search for addresses. Please try again.';
          setAddressSearchError(message);
          setAddressSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearchingAddress(false);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(handler);
    };
  }, [addressInput]);

  useEffect(() => {
    const maps = kakaoMapsRef.current;
    const map = addressMapRef.current;
    if (!maps || !map || !addressMapReady) {
      return;
    }

    if (resolvedLocation) {
      const position = new maps.LatLng(resolvedLocation.latitude, resolvedLocation.longitude);
      if (!addressMarkerRef.current) {
        addressMarkerRef.current = new maps.Marker({
          map,
          position,
        });
      } else {
        addressMarkerRef.current.setPosition(position);
        addressMarkerRef.current.setMap(map);
      }
      map.panTo(position);
      if (typeof map.getLevel === 'function' && typeof map.setLevel === 'function') {
        const level = map.getLevel();
        if (level > 4) {
          map.setLevel(4);
        }
      }
    } else if (addressMarkerRef.current) {
      addressMarkerRef.current.setMap(null);
      addressMarkerRef.current = null;
      const fallback = new maps.LatLng(DEFAULT_KAKAO_CENTER.lat, DEFAULT_KAKAO_CENTER.lng);
      map.panTo(fallback);
      if (typeof map.setLevel === 'function') {
        map.setLevel(5);
      }
    } else {
      const fallback = new maps.LatLng(DEFAULT_KAKAO_CENTER.lat, DEFAULT_KAKAO_CENTER.lng);
      map.panTo(fallback);
    }
  }, [resolvedLocation, addressMapReady]);

  if (!currentUser || currentUser.role !== 'owner') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-white">
        <p className="text-lg">Owner dashboard unavailable. Please sign in as a gym owner.</p>
      </div>
    );
  }

  const resetForm = () => {
    skipAutoSelectRef.current = true;
    setFormState(emptyForm);
    setEquipmentList([]);
    setEquipmentDraft(defaultEquipmentDraft);
    setAmenityInput('');
    setSelectedGymId(null);
    setResolvedLocation(null);
    suspendAddressLookupRef.current = true;
    setAddressInput(emptyForm.address);
    setAddressSuggestions([]);
    setAddressSearchError(null);
    setPhotoUploadError(null);
    setIsUploadingPhoto(false);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }

    setFeedback(null);
    setError(null);
    setIsSaving(false);
  };

  const handleSelectExistingGym = useCallback((gymId: string) => {
    skipAutoSelectRef.current = false;
    setSelectedGymId(gymId);
  }, []);

  const handleSelectAddress = useCallback((suggestion: AddressSuggestion) => {
    const displayAddress = suggestion.roadAddressName ?? suggestion.addressName;
    suspendAddressLookupRef.current = true;
    setAddressInput(displayAddress);
    setFormState(prev => ({ ...prev, address: displayAddress }));
    setResolvedLocation({ latitude: suggestion.latitude, longitude: suggestion.longitude, address: displayAddress });
    setAddressSuggestions([]);
    setAddressSearchError(null);
  }, []);

  const handleToggleClosedDay = useCallback((day: ClosedDayOption) => {
    setFormState(prev => {
      const isSelected = prev.closedDays.includes(day);
      const closedDays = isSelected
        ? prev.closedDays.filter(item => item !== day)
        : [...prev.closedDays, day].sort((a, b) => CLOSED_DAY_OPTIONS.indexOf(a) - CLOSED_DAY_OPTIONS.indexOf(b));
      return { ...prev, closedDays };
    });
  }, []);

  const handlePhotoUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!currentUser) {
        return;
      }

      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      setIsUploadingPhoto(true);
      setPhotoUploadError(null);

      try {
        const downloadUrl = await uploadGymPhoto(currentUser.id, file);
        setFormState(prev => ({ ...prev, photos: [...prev.photos, downloadUrl] }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload the photo. Please try again.';
        setPhotoUploadError(message);
      } finally {
        setIsUploadingPhoto(false);
        if (photoInputRef.current) {
          photoInputRef.current.value = '';
        }
      }
    },
    [currentUser]
  );

  const handleRemovePhoto = useCallback(async (photoUrl: string) => {
    setFormState(prev => ({ ...prev, photos: prev.photos.filter(url => url !== photoUrl) }));
    await deleteGymPhoto(photoUrl);
  }, []);

  const handleAddAmenity = () => {
    if (!amenityInput.trim()) return;
    setFormState(prev => ({ ...prev, amenities: [...prev.amenities, amenityInput.trim()] }));
    setAmenityInput('');
  };

  const handleRemoveAmenity = (index: number) => {
    setFormState(prev => ({ ...prev, amenities: prev.amenities.filter((_, idx) => idx !== index) }));
  };

  const handleAddEquipment = () => {
    if (!equipmentDraft.name.trim()) return;
    const id = `eq-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const newEquipment: Equipment = {
      id,
      name: equipmentDraft.name.trim(),
      category: equipmentDraft.category,
      quantity: equipmentDraft.quantity,
    };
    setEquipmentList(prev => [...prev, newEquipment]);
    setEquipmentDraft(defaultEquipmentDraft);
  };

  const handleRemoveEquipment = (id: string) => {
    setEquipmentList(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    if (!formState.name.trim() || !formState.address.trim()) {
      setError('Name and address are required.');
      setFeedback(null);
      return;
    }
    const weekdayRange = formatHourRange(formState.weekdayOpen, formState.weekdayClose);
    const weekendRange = formatHourRange(formState.weekendOpen, formState.weekendClose);
    const closedDaysSummary = formatClosedDays(formState.closedDays);

    if (!weekdayRange || !weekendRange) {
      setError('Please provide opening and closing times for both weekdays and weekends.');
      setFeedback(null);
      return;
    }
    if (equipmentList.length === 0) {
      setError('Add at least one equipment item so members know what can be reserved.');
      setFeedback(null);
      return;
    }

    try {
      setIsSaving(true);
      const trimmedAddress = formState.address.trim();
      const geocoded =
        resolvedLocation && resolvedLocation.address === trimmedAddress
          ? resolvedLocation
          : await geocodeKoreanAddress(trimmedAddress);
      if (!geocoded) {
        throw new Error('Could not derive coordinates for this address. Please double-check the road name.');
      }
      const payload: GymPayload = {
        name: formState.name,
        address: geocoded.addressName || trimmedAddress,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        description: formState.description,
        photos: formState.photos,
        amenities: formState.amenities,
        equipment: equipmentList,
        operatingHours: {
          weekdays: weekdayRange,
          weekends: weekendRange,
          holidays: closedDaysSummary,
        },
      };
      if (selectedGymId) {
        await updateGym(currentUser.id, selectedGymId, payload);
        setFeedback('Gym details updated successfully.');
      } else {
        const created = await createGym(currentUser.id, payload);
        setSelectedGymId(created.id);
        setFeedback('Your gym has been published for members.');
      }
      setError(null);
      setResolvedLocation({ latitude: payload.latitude, longitude: payload.longitude, address: payload.address });
      suspendAddressLookupRef.current = true;
      setAddressInput(payload.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save gym.');
      setFeedback(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (gymId: string) => {
    if (!window.confirm('Delete this gym listing? This cannot be undone.')) {
      return;
    }
    try {
      await deleteGym(currentUser.id, gymId);
      setFeedback('Gym removed successfully.');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete gym.');
      setFeedback(null);
    }
    if (selectedGymId === gymId) {
      resetForm();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-white p-6 lg:p-10 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-cyan-500 font-semibold">Owner Console</p>
            <h1 className="text-3xl font-extrabold">Manage Your Gym Presence</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Publish detailed gym information so members can discover and reserve equipment.
            </p>
          </div>
          <button
            onClick={logout}
            className="self-start px-4 py-2 rounded-lg bg-slate-800 text-white font-semibold hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            Log Out
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6">
          <aside className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6 ring-1 ring-gray-200 dark:ring-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-cyan-600 dark:text-cyan-400">Your Listings</h2>
                <button
                  onClick={resetForm}
                  className="text-sm font-semibold text-cyan-600 hover:text-cyan-500"
                >
                  New Gym
                </button>
              </div>
              {gymsLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading your gyms…</p>
              ) : ownerGyms.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No gyms published yet. Create your first listing to reach members nearby.
                </p>
              ) : (
                <ul className="space-y-3">
                  {ownerGyms.map(gym => (
                    <li key={gym.id}>
                      <button
                        onClick={() => handleSelectExistingGym(gym.id)}
                        className={`w-full text-left p-3 rounded-xl transition ${
                          selectedGymId === gym.id
                            ? 'bg-cyan-500 text-white shadow'
                            : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        <p className="font-semibold">{gym.name}</p>
                        <p className="text-xs opacity-80">{gym.address}</p>
                      </button>
                      <button
                        onClick={() => handleDelete(gym.id)}
                        className="mt-1 text-xs text-red-500 hover:text-red-400"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6 ring-1 ring-gray-200 dark:ring-white/10">
              <h3 className="text-lg font-semibold mb-2 text-cyan-600 dark:text-cyan-400">Tips for Better Visibility</h3>
              <ul className="text-sm space-y-2 text-slate-500 dark:text-slate-400">
                <li>• Provide high-quality photos for each training zone.</li>
                <li>• Keep equipment quantities accurate to avoid overbooking.</li>
                <li>• Update operating hours during holidays or special events.</li>
              </ul>
            </div>
          </aside>

          <main className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg p-6 lg:p-8 ring-1 ring-gray-200 dark:ring-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                {selectedGymId ? 'Edit Gym Details' : 'Create a New Gym'}
              </h2>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving…' : selectedGymId ? 'Save Changes' : 'Publish Gym'}
              </button>
            </div>

            {feedback && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
                {feedback}
              </div>
            )}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="gymName">Gym Name</label>
                  <input
                    id="gymName"
                    type="text"
                    value={formState.name}
                    onChange={event => setFormState(prev => ({ ...prev, name: event.target.value }))}
                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    placeholder="Enter the official gym name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="gymAddress">Address</label>
                  <textarea
                    id="gymAddress"
                    rows={3}
                    value={addressInput}
                    onChange={event => {
                      const value = event.target.value;
                      setAddressInput(value);
                      setFormState(prev => ({ ...prev, address: value }));
                      setResolvedLocation(null);
                    }}
                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    placeholder="Street, city, building details"
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    The selected address is geocoded automatically when you save the gym details.
                  </p>
                  {(isSearchingAddress || addressSuggestions.length > 0 || addressSearchError) && (
                    <div className="mt-3 space-y-2">
                      {isSearchingAddress && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">Searching for matching addresses…</p>
                      )}
                      {addressSuggestions.length > 0 && (
                        <ul className="divide-y divide-gray-200 dark:divide-white/10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 shadow-sm">
                          {addressSuggestions.map(suggestion => (
                            <li key={suggestion.id}>
                              <button
                                type="button"
                                onClick={() => handleSelectAddress(suggestion)}
                                className="w-full text-left px-4 py-3 hover:bg-cyan-50 dark:hover:bg-slate-700"
                              >
                                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                                  {suggestion.roadAddressName ?? suggestion.addressName}
                                </p>
                                {suggestion.roadAddressName && (
                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Lot-based address: {suggestion.addressName}
                                  </p>
                                )}
                                {suggestion.postalCode && (
                                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Postal code {suggestion.postalCode}</p>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {addressSearchError && !isSearchingAddress && (
                        <p className="text-xs text-red-500 dark:text-red-400">{addressSearchError}</p>
                      )}
                    </div>
                  )}
                  {resolvedLocation && (
                    <div className="mt-3 rounded-lg bg-gray-100 dark:bg-slate-700 p-3 text-xs text-slate-600 dark:text-slate-300">
                      <p className="font-semibold text-slate-700 dark:text-white">Resolved Location</p>
                      <p>Address: {resolvedLocation.address}</p>
                      <p>Latitude: {resolvedLocation.latitude.toFixed(6)}</p>
                      <p>Longitude: {resolvedLocation.longitude.toFixed(6)}</p>
                    </div>
                  )}
                  <div className="mt-3 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                    <div ref={addressMapContainerRef} className="h-48 w-full" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    The marker confirms the address using Kakao Maps. Select a suggestion above to place it accurately.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="gymDescription">Description</label>
                  <textarea
                    id="gymDescription"
                    rows={4}
                    value={formState.description}
                    onChange={event => setFormState(prev => ({ ...prev, description: event.target.value }))}
                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    placeholder="Highlight your unique programs, coaching, or atmosphere"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Operating Hours</label>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Weekdays</p>
                      <div className="flex items-center gap-3">
                        <input
                          type="time"
                          value={formState.weekdayOpen}
                          onChange={event => setFormState(prev => ({ ...prev, weekdayOpen: event.target.value }))}
                          className="p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                        />
                        <span className="text-sm text-slate-500 dark:text-slate-400">~</span>
                        <input
                          type="time"
                          value={formState.weekdayClose}
                          onChange={event => setFormState(prev => ({ ...prev, weekdayClose: event.target.value }))}
                          className="p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Weekends</p>
                      <div className="flex items-center gap-3">
                        <input
                          type="time"
                          value={formState.weekendOpen}
                          onChange={event => setFormState(prev => ({ ...prev, weekendOpen: event.target.value }))}
                          className="p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                        />
                        <span className="text-sm text-slate-500 dark:text-slate-400">~</span>
                        <input
                          type="time"
                          value={formState.weekendClose}
                          onChange={event => setFormState(prev => ({ ...prev, weekendClose: event.target.value }))}
                          className="p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Closed Days</p>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">Leave empty if the gym is open every day.</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {CLOSED_DAY_OPTIONS.map(day => {
                          const isSelected = formState.closedDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleToggleClosedDay(day)}
                              className={`flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                                isSelected
                                  ? 'border-cyan-600 bg-cyan-50 text-cyan-700 dark:border-cyan-400 dark:bg-cyan-400/10 dark:text-cyan-200'
                                  : 'border-gray-200 bg-white text-slate-500 hover:border-cyan-400 hover:text-cyan-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Gym Photos</label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Upload interior or exterior photos so members can preview the space and key equipment.</p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-white file:font-semibold file:hover:bg-cyan-500"
                    />
                    {isUploadingPhoto && <span className="text-xs text-slate-500 dark:text-slate-400">Uploading…</span>}
                  </div>
                  {photoUploadError && (
                    <p className="mt-2 text-xs text-red-500 dark:text-red-400">{photoUploadError}</p>
                  )}
                  {formState.photos.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {formState.photos.map((photo, index) => (
                        <div key={`${photo}-${index}`} className="relative group overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-800">
                          <img src={photo} alt="Gym" className="h-32 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(photo)}
                            className="absolute top-2 right-2 rounded-full bg-black/60 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Amenities</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={amenityInput}
                      onChange={event => setAmenityInput(event.target.value)}
                      className="flex-1 p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                      placeholder="e.g., Parking"
                    />
                    <button
                      type="button"
                      onClick={handleAddAmenity}
                      className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-semibold hover:bg-cyan-500"
                    >
                      Add
                    </button>
                  </div>
                  {formState.amenities.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {formState.amenities.map((amenity, index) => (
                        <li key={`${amenity}-${index}`} className="bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full text-xs">
                          <span>{amenity}</span>
                          <button onClick={() => handleRemoveAmenity(index)} className="ml-2 text-red-500 hover:text-red-400">×</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <section className="bg-gray-50 dark:bg-slate-900/60 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400">Equipment Inventory</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Add each piece of equipment so members can reserve the correct station.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    value={equipmentDraft.name}
                    onChange={event => setEquipmentDraft(prev => ({ ...prev, name: event.target.value }))}
                    className="flex-1 p-3 rounded-xl bg-white dark:bg-slate-800 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    placeholder="Equipment name"
                  />
                  <select
                    value={equipmentDraft.category}
                    onChange={event => setEquipmentDraft(prev => ({ ...prev, category: event.target.value as Equipment['category'] }))}
                    className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  >
                    <option value="cardio">Cardio</option>
                    <option value="machine">Machine</option>
                    <option value="freeWeight">Free Weight</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={equipmentDraft.quantity}
                    onChange={event => setEquipmentDraft(prev => ({ ...prev, quantity: Number(event.target.value) || 1 }))}
                    className="w-20 p-3 rounded-xl bg-white dark:bg-slate-800 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    placeholder="Qty"
                  />
                  <button
                    type="button"
                    onClick={handleAddEquipment}
                    className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-semibold hover:bg-cyan-500"
                  >
                    Add
                  </button>
                </div>
              </div>

              {equipmentList.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No equipment added yet. Members need this information to reserve stations.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {equipmentList.map(item => (
                    <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-xs uppercase tracking-wide text-slate-400">{item.category}</p>
                          {item.quantity !== undefined && (
                            <p className="text-xs text-slate-500">Quantity: {item.quantity}</p>
                          )}
                        </div>
                        <button onClick={() => handleRemoveEquipment(item.id)} className="text-xs text-red-500 hover:text-red-400">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};
