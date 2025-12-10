import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Equipment, Reservation } from '../../types';
import { useGyms } from '../../context/GymContext';
import { useAuth } from '../../context/AuthContext';

declare global {
    interface Window {
        maplibregl?: any;
    }
}

type Category = 'cardio' | 'machine' | 'freeWeight';

type Coordinates = {
    lat: number;
    lng: number;
};

const DEFAULT_LOCATION: Coordinates = { lat: 37.5665, lng: 126.9780 };

const generateTimeSlots = (startHour: number, endHour: number, interval: number): string[] => {
    const slots: string[] = [];
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += interval) {
            const h = hour.toString().padStart(2, '0');
            const m = minute.toString().padStart(2, '0');
            slots.push(`${h}:${m}`);
        }
    }
    return slots;
};

const timeSlots = generateTimeSlots(9, 17, 10);

const getEndTime = (startTime: string | null): string => {
    if (!startTime) return '';
    const [hour, minute] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hour, minute + 10, 0, 0);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceKm = (from: Coordinates, to: Coordinates) => {
    const R = 6371;
    const dLat = toRadians(to.lat - from.lat);
    const dLon = toRadians(to.lng - from.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const ReservationScreen: React.FC = () => {
    const { gyms } = useGyms();
    const { currentUser } = useAuth();
    const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [reservations, setReservations] = useState<Reservation[]>([]);

    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const mapLoadedRef = useRef(false);
    const userMarkerRef = useRef<any>(null);
    const gymMarkersRef = useRef<any[]>([]);
    const hasFittedBoundsRef = useRef(false);

    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported on this device.');
            setUserLocation(DEFAULT_LOCATION);
            return;
        }
        setIsLocating(true);
        hasFittedBoundsRef.current = false;
        navigator.geolocation.getCurrentPosition(
            position => {
                setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                setLocationError(null);
                setIsLocating(false);
            },
            error => {
                setLocationError(error.message || 'Unable to detect your location. Using downtown Seoul as fallback.');
                setUserLocation(DEFAULT_LOCATION);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, maximumAge: 1000 * 60 * 5, timeout: 10_000 }
        );
    }, []);

    useEffect(() => {
        requestLocation();
    }, [requestLocation]);

    const gymsWithDistance = useMemo(() => {
        return gyms
            .map(gym => {
                const distance = userLocation ? getDistanceKm(userLocation, { lat: gym.latitude, lng: gym.longitude }) : undefined;
                return { ...gym, distanceKm: distance };
            })
            .sort((a, b) => {
                const aDist = a.distanceKm ?? Number.POSITIVE_INFINITY;
                const bDist = b.distanceKm ?? Number.POSITIVE_INFINITY;
                return aDist - bDist;
            });
    }, [gyms, userLocation]);

    useEffect(() => {
        if (!gymsWithDistance.length) {
            setSelectedGymId(null);
            setSelectedCategory(null);
            setSelectedEquipment(null);
            setSelectedTime(null);
            return;
        }
        const stillExists = selectedGymId ? gymsWithDistance.some(gym => gym.id === selectedGymId) : false;
        if (!stillExists) {
            setSelectedGymId(gymsWithDistance[0].id);
            setSelectedCategory(null);
            setSelectedEquipment(null);
            setSelectedTime(null);
        }
    }, [gymsWithDistance, selectedGymId]);

    const selectedGym = useMemo(() => gymsWithDistance.find(gym => gym.id === selectedGymId) ?? null, [gymsWithDistance, selectedGymId]);

    const equipmentByCategory = useMemo(() => {
        if (!selectedGym) {
            return {
                cardio: [],
                machine: [],
                freeWeight: [],
            } as Record<Category, Equipment[]>;
        }
        return selectedGym.equipment.reduce((acc, eq) => {
            if (!acc[eq.category]) acc[eq.category] = [];
            acc[eq.category].push(eq);
            return acc;
        }, { cardio: [], machine: [], freeWeight: [] } as Record<Category, Equipment[]>);
    }, [selectedGym]);

    const handleSelectGym = useCallback((gymId: string) => {
        setSelectedGymId(gymId);
        setSelectedCategory(null);
        setSelectedEquipment(null);
        setSelectedTime(null);
    }, []);

    const handleBook = () => {
        if (!selectedGym || !selectedEquipment || !selectedTime) return;
        if (!currentUser || currentUser.role !== 'member') {
            alert('Please log in as a member to make a reservation.');
            return;
        }
        const newReservation: Reservation = {
            id: `res-${Date.now()}`,
            gymId: selectedGym.id,
            equipmentId: selectedEquipment.id,
            timeSlot: selectedTime,
            date: new Date().toISOString().split('T')[0],
            memberId: currentUser.id,
        };
        setReservations(prev => [...prev, newReservation]);
        alert(`Reserved ${selectedEquipment.name} at ${selectedGym.name} for ${selectedTime} - ${getEndTime(selectedTime)}!`);
        setSelectedEquipment(null);
        setSelectedTime(null);
        setSelectedCategory(null);
    };

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current || !window.maplibregl) return;
        const map = new window.maplibregl.Map({
            container: mapContainerRef.current,
            style: 'https://demotiles.maplibre.org/style.json',
            center: [DEFAULT_LOCATION.lng, DEFAULT_LOCATION.lat],
            zoom: 13,
        });
        map.addControl(new window.maplibregl.NavigationControl(), 'top-right');
        map.on('load', () => {
            mapLoadedRef.current = true;
        });
        mapRef.current = map;
        return () => {
            map.remove();
            mapRef.current = null;
            mapLoadedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!mapRef.current || !mapLoadedRef.current || !window.maplibregl) return;
        const map = mapRef.current;
        const target = userLocation ?? DEFAULT_LOCATION;
        if (!userMarkerRef.current) {
            userMarkerRef.current = new window.maplibregl.Marker({ color: '#0ea5e9' })
                .setLngLat([target.lng, target.lat])
                .setPopup(new window.maplibregl.Popup({ offset: 25 }).setText('Your location'))
                .addTo(map);
        } else {
            userMarkerRef.current.setLngLat([target.lng, target.lat]);
        }
        if (userLocation) {
            map.easeTo({ center: [target.lng, target.lat], zoom: Math.max(map.getZoom(), 13), duration: 600 });
        }
    }, [userLocation]);

    useEffect(() => {
        if (!mapRef.current || !mapLoadedRef.current || !window.maplibregl) return;
        gymMarkersRef.current.forEach(marker => marker.remove());
        gymMarkersRef.current = gymsWithDistance.map(gym => {
            const el = document.createElement('button');
            el.type = 'button';
            el.className = `gym-marker${selectedGymId === gym.id ? ' is-active' : ''}`;
            el.title = gym.name;
            el.addEventListener('click', () => handleSelectGym(gym.id));
            const marker = new window.maplibregl.Marker({ element: el })
                .setLngLat([gym.longitude, gym.latitude])
                .setPopup(new window.maplibregl.Popup({ offset: 12 }).setHTML(`<strong>${gym.name}</strong><br/>${gym.address}`))
                .addTo(mapRef.current);
            return marker;
        });
        return () => {
            gymMarkersRef.current.forEach(marker => marker.remove());
            gymMarkersRef.current = [];
        };
    }, [gymsWithDistance, selectedGymId, handleSelectGym]);

    useEffect(() => {
        hasFittedBoundsRef.current = false;
    }, [gymsWithDistance.length]);

    useEffect(() => {
        if (!mapRef.current || !mapLoadedRef.current || !window.maplibregl || hasFittedBoundsRef.current) return;
        const bounds = new window.maplibregl.LngLatBounds();
        const base = userLocation ?? DEFAULT_LOCATION;
        bounds.extend([base.lng, base.lat]);
        gymsWithDistance.forEach(gym => bounds.extend([gym.longitude, gym.latitude]));
        if (bounds.isEmpty()) return;
        mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 1000 });
        hasFittedBoundsRef.current = true;
    }, [gymsWithDistance, userLocation]);

    useEffect(() => {
        if (!mapRef.current || !mapLoadedRef.current || !hasFittedBoundsRef.current || !selectedGym) return;
        mapRef.current.easeTo({ center: [selectedGym.longitude, selectedGym.latitude], zoom: 15, duration: 500 });
    }, [selectedGym]);

    return (
        <div className="min-h-screen text-slate-800 dark:text-white p-4 sm:p-6 lg:p-8 transition-colors duration-300">
            <div className="max-w-7xl mx-auto space-y-6">
                <header>
                    <h1 className="text-3xl md:text-4xl font-bold">Reserve Equipment</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Book your spot and never wait for a machine again.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6 lg:gap-8">
                    <div className="space-y-6">
                        <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">Your Location</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {isLocating
                                            ? 'Detecting current position...'
                                            : locationError
                                                ? locationError
                                                : userLocation
                                                    ? `Lat ${userLocation.lat.toFixed(4)}, Lng ${userLocation.lng.toFixed(4)}`
                                                    : 'Location unavailable, using downtown Seoul.'}
                                    </p>
                                </div>
                                <button
                                    onClick={requestLocation}
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-lg transition disabled:opacity-70"
                                    disabled={isLocating}
                                >
                                    {isLocating ? 'Locating...' : 'Use Current Location'}
                                </button>
                            </div>
                            <div ref={mapContainerRef} className="map-container" />
                            <p className="text-xs text-slate-500 dark:text-slate-400">Tap a marker to choose a gym. Blue marker shows your position.</p>
                        </section>

                        <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400 mb-3">1. Select a Gym</h3>
                                <div className="space-y-2">
                                    {gymsWithDistance.length === 0 ? (
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            No gyms are available yet. Once owners publish their facilities, they will appear here for reservation.
                                        </p>
                                    ) : (
                                        gymsWithDistance.map(gym => (
                                            <button
                                                key={gym.id}
                                                onClick={() => handleSelectGym(gym.id)}
                                                className={`w-full text-left p-3 rounded-lg transition ${selectedGym?.id === gym.id ? 'bg-cyan-500 text-white' : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                                            >
                                                <p className="font-semibold">{gym.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-300">{gym.address}</p>
                                                {gym.distanceKm !== undefined && (
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">≈ {gym.distanceKm.toFixed(1)} km away</p>
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {selectedGym && (
                                <div className="bg-gray-100 dark:bg-slate-700/60 rounded-xl p-4 space-y-3 animate-fade-in">
                                    {selectedGym.photos[0] && (
                                        <img
                                            src={selectedGym.photos[0]}
                                            alt={`${selectedGym.name} preview`}
                                            className="w-full h-48 object-cover rounded-lg"
                                        />
                                    )}
                                    {selectedGym.description && (
                                        <p className="text-sm text-slate-600 dark:text-slate-300">{selectedGym.description}</p>
                                    )}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-300">
                                        <div>
                                            <p className="font-semibold text-slate-700 dark:text-white">Weekdays</p>
                                            <p>{selectedGym.operatingHours.weekdays}</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700 dark:text-white">Weekends</p>
                                            <p>{selectedGym.operatingHours.weekends}</p>
                                        </div>
                                        {selectedGym.operatingHours.holidays && (
                                            <div className="sm:col-span-2">
                                                <p className="font-semibold text-slate-700 dark:text-white">Holidays</p>
                                                <p>{selectedGym.operatingHours.holidays}</p>
                                            </div>
                                        )}
                                    </div>
                                    {selectedGym.amenities.length > 0 && (
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            {selectedGym.amenities.map((amenity, index) => (
                                                <span key={`${amenity}-${index}`} className="bg-white/70 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-600 dark:text-slate-200">
                                                    {amenity}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedGym && (
                                <div className="animate-fade-in">
                                    <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400 mb-3">2. Choose Equipment Category</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['cardio', 'machine', 'freeWeight'] as Category[]).map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={`p-3 rounded-lg text-sm font-semibold capitalize transition ${selectedCategory === cat ? 'bg-cyan-500 text-white' : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedCategory && (
                                <div className="animate-fade-in">
                                    <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400 mb-3">3. Pick Your Equipment</h3>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                        {(equipmentByCategory[selectedCategory] || []).length === 0 ? (
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                No equipment listed in this category yet. Please select a different category or check back later.
                                            </p>
                                        ) : (
                                            (equipmentByCategory[selectedCategory] || []).map(eq => (
                                                <button
                                                    key={eq.id}
                                                    onClick={() => setSelectedEquipment(eq)}
                                                    className={`w-full text-left p-2 rounded-lg text-sm transition ${selectedEquipment?.id === eq.id ? 'bg-cyan-500 text-white' : 'bg-gray-100 dark:bg-slate-600 hover:bg-gray-200 dark:hover:bg-slate-500'}`}
                                                >
                                                    {eq.name}
                                                    {eq.quantity !== undefined && (
                                                        <span className="ml-2 text-xs text-slate-400">({eq.quantity} available)</span>
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedEquipment && (
                                <div className="animate-fade-in">
                                    <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400 mb-3">4. Select a Time Slot</h3>
                                    <select
                                        value={selectedTime || ''}
                                        onChange={e => setSelectedTime(e.target.value)}
                                        className="w-full p-3 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 font-mono"
                                    >
                                        <option value="" disabled>Select a time</option>
                                        {timeSlots.map(time => (
                                            <option key={time} value={time}>
                                                {time}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <button
                                onClick={handleBook}
                                disabled={!selectedGym || !selectedEquipment || !selectedTime}
                                className="w-full p-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-white disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                            >
                                Confirm Reservation
                            </button>
                        </section>
                    </div>

                    <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10">
                        <h3 className="text-xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Your Upcoming Reservations</h3>
                        {reservations.length > 0 ? (
                            <ul className="space-y-3">
                                {reservations.map(res => {
                                    const gym = gyms.find(g => g.id === res.gymId);
                                    const equipment = gym?.equipment.find(e => e.id === res.equipmentId);
                                    const endTime = getEndTime(res.timeSlot);
                                    return (
                                        <li key={res.id} className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                                            <p className="font-bold text-slate-800 dark:text-white">{equipment?.name ?? 'Equipment unavailable'}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-300">{gym?.name ?? 'Gym removed'}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500">{res.date}</p>
                                            <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 mt-1 font-mono">
                                                {res.timeSlot} - {endTime}
                                            </p>
                                            {gym?.operatingHours && (
                                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                                                    Hours: {gym.operatingHours.weekdays} (Weekdays)
                                                </p>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-slate-500 dark:text-slate-400 text-center mt-8">You have no upcoming reservations.</p>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};
