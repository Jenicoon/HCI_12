import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Equipment, Gym } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useGyms, type GymPayload } from '../../context/GymContext';

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

const defaultHours = {
  weekdays: '06:00 - 23:00',
  weekends: '08:00 - 22:00',
  holidays: '',
};

interface FormState {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  description: string;
  photos: string[];
  amenities: string[];
  weekdayHours: string;
  weekendHours: string;
  holidayHours: string;
}

const emptyForm: FormState = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  description: '',
  photos: [],
  amenities: [],
  weekdayHours: defaultHours.weekdays,
  weekendHours: defaultHours.weekends,
  holidayHours: defaultHours.holidays,
};

export const OwnerDashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { createGym, updateGym, deleteGym, getGymsByOwner } = useGyms();
  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [equipmentDraft, setEquipmentDraft] = useState<EquipmentDraft>(defaultEquipmentDraft);
  const [photoInput, setPhotoInput] = useState('');
  const [amenityInput, setAmenityInput] = useState('');
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const skipAutoSelectRef = useRef(false);

  const ownerGyms: Gym[] = useMemo(() => {
    if (!currentUser || currentUser.role !== 'owner') {
      return [];
    }
    return getGymsByOwner(currentUser.id);
  }, [currentUser, getGymsByOwner]);

  useEffect(() => {
    if (!ownerGyms.length) {
      setSelectedGymId(null);
      setFormState(emptyForm);
      setEquipmentList([]);
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
  }, [ownerGyms, selectedGymId]);

  useEffect(() => {
    if (!selectedGymId) {
      setFormState(emptyForm);
      setEquipmentList([]);
      return;
    }
    const gym = ownerGyms.find(item => item.id === selectedGymId);
    if (!gym) return;
    setFormState({
      name: gym.name,
      address: gym.address,
      latitude: gym.latitude.toString(),
      longitude: gym.longitude.toString(),
      description: gym.description ?? '',
      photos: gym.photos,
      amenities: gym.amenities,
      weekdayHours: gym.operatingHours.weekdays,
      weekendHours: gym.operatingHours.weekends,
      holidayHours: gym.operatingHours.holidays ?? '',
    });
    setEquipmentList(gym.equipment);
    setFeedback(null);
    setError(null);
  }, [ownerGyms, selectedGymId]);

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
    setPhotoInput('');
    setAmenityInput('');
    setSelectedGymId(null);

    setFeedback(null);
    setError(null);
  };

  const handleSelectExistingGym = useCallback((gymId: string) => {
    skipAutoSelectRef.current = false;
    setSelectedGymId(gymId);
  }, []);

  const handleAddPhoto = () => {
    if (!photoInput.trim()) return;
    setFormState(prev => ({ ...prev, photos: [...prev.photos, photoInput.trim()] }));
    setPhotoInput('');
  };

  const handleRemovePhoto = (index: number) => {
    setFormState(prev => ({ ...prev, photos: prev.photos.filter((_, idx) => idx !== index) }));
  };

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

  const parseCoordinate = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return NaN;
    return Number(trimmed);
  };

  const handleSave = () => {
    if (!formState.name.trim() || !formState.address.trim()) {
      setError('Name and address are required.');
      setFeedback(null);
      return;
    }
    const latitude = parseCoordinate(formState.latitude);
    const longitude = parseCoordinate(formState.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError('Latitude and longitude must be valid numbers.');
      setFeedback(null);
      return;
    }
    if (equipmentList.length === 0) {
      setError('Add at least one equipment item so members know what can be reserved.');
      setFeedback(null);
      return;
    }

    const payload: GymPayload = {
      name: formState.name,
      address: formState.address,
      latitude,
      longitude,
      description: formState.description,
      photos: formState.photos,
      amenities: formState.amenities,
      equipment: equipmentList,
      operatingHours: {
        weekdays: formState.weekdayHours || defaultHours.weekdays,
        weekends: formState.weekendHours || defaultHours.weekends,
        holidays: formState.holidayHours || undefined,
      },
    };

    try {
      if (selectedGymId) {
        const updated = updateGym(currentUser.id, selectedGymId, payload);
        if (!updated) {
          throw new Error('Unable to update gym.');
        }
        setFeedback('Gym details updated successfully.');
      } else {
        const created = createGym(currentUser.id, payload);
        setSelectedGymId(created.id);
        setFeedback('Your gym has been published for members.');
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save gym.');
      setFeedback(null);
    }
  };

  const handleDelete = (gymId: string) => {
    if (!window.confirm('Delete this gym listing? This cannot be undone.')) {
      return;
    }
    deleteGym(currentUser.id, gymId);
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
              {ownerGyms.length === 0 ? (
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
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-500"
              >
                {selectedGymId ? 'Save Changes' : 'Publish Gym'}
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
                    value={formState.address}
                    onChange={event => setFormState(prev => ({ ...prev, address: event.target.value }))}
                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    placeholder="Street, city, building details"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Coordinates</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={formState.latitude}
                      onChange={event => setFormState(prev => ({ ...prev, latitude: event.target.value }))}
                      className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                      placeholder="Latitude"
                    />
                    <input
                      type="text"
                      value={formState.longitude}
                      onChange={event => setFormState(prev => ({ ...prev, longitude: event.target.value }))}
                      className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                      placeholder="Longitude"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Use decimal degrees, e.g., 37.5665 / 126.9780</p>
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
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={formState.weekdayHours}
                      onChange={event => setFormState(prev => ({ ...prev, weekdayHours: event.target.value }))}
                      className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                      placeholder="Weekdays e.g., 06:00 - 23:00"
                    />
                    <input
                      type="text"
                      value={formState.weekendHours}
                      onChange={event => setFormState(prev => ({ ...prev, weekendHours: event.target.value }))}
                      className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                      placeholder="Weekends e.g., 08:00 - 22:00"
                    />
                    <input
                      type="text"
                      value={formState.holidayHours}
                      onChange={event => setFormState(prev => ({ ...prev, holidayHours: event.target.value }))}
                      className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                      placeholder="Holidays (optional)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Photo URLs</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="url"
                      value={photoInput}
                      onChange={event => setPhotoInput(event.target.value)}
                      className="flex-1 p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                      placeholder="https://"
                    />
                    <button
                      type="button"
                      onClick={handleAddPhoto}
                      className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-semibold hover:bg-cyan-500"
                    >
                      Add
                    </button>
                  </div>
                  {formState.photos.length > 0 && (
                    <ul className="space-y-2">
                      {formState.photos.map((photo, index) => (
                        <li key={photo} className="flex items-center justify-between bg-gray-100 dark:bg-slate-700 px-3 py-2 rounded-xl text-xs">
                          <span className="truncate mr-3">{photo}</span>
                          <button onClick={() => handleRemovePhoto(index)} className="text-red-500 hover:text-red-400">Remove</button>
                        </li>
                      ))}
                    </ul>
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
