import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore';
import type { Equipment, Reservation } from '../../types';
import { useGyms } from '../../context/GymContext';
import { useAuth } from '../../context/AuthContext';
import { firestore } from '../../services/firebase';
import { loadKakaoMaps, DEFAULT_KAKAO_CENTER } from '../../services/kakaoMaps';

type Category = 'cardio' | 'machine' | 'freeWeight';

type Coordinates = {
    lat: number;
    lng: number;
};

type GymOverlayRecord = {
    gymId: string;
    overlay: any;
    element: HTMLButtonElement;
    cleanup: () => void;
};

const DEFAULT_LOCATION: Coordinates = DEFAULT_KAKAO_CENTER;

const RESERVATION_INTERVAL_MINUTES = 30;

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

const timeSlots = generateTimeSlots(6, 23, RESERVATION_INTERVAL_MINUTES);

const getEndTime = (startTime: string | null): string => {
    if (!startTime) return '';
    const [hour, minute] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hour, minute + RESERVATION_INTERVAL_MINUTES, 0, 0);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const parseOperatingRange = (range?: string): { start: number; end: number } => {
    if (!range) {
        return { start: 0, end: 24 * 60 };
    }
    const match = range.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!match) {
        return { start: 0, end: 24 * 60 };
    }
    const [, startHour, startMinute, endHour, endMinute] = match;
    const start = Number(startHour) * 60 + Number(startMinute);
    const end = Number(endHour) * 60 + Number(endMinute);
    return { start, end };
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
    const { gyms, loading: gymsLoading } = useGyms();
    const { currentUser } = useAuth();
    const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [reservationsLoading, setReservationsLoading] = useState(true);

    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const kakaoMapsRef = useRef<any>(null);
    const mapRef = useRef<any>(null);
    const mapLoadedRef = useRef(false);
    const userMarkerRef = useRef<any>(null);
    const gymMarkersRef = useRef<GymOverlayRecord[]>([]);
    const hasFittedBoundsRef = useRef(false);
    const centerOnUserRef = useRef(false);

    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported on this device.');
            setUserLocation(DEFAULT_LOCATION);
            return;
        }
        setIsLocating(true);
        hasFittedBoundsRef.current = false;
        centerOnUserRef.current = true;
        setSelectedGymId(null);
        setSelectedCategory(null);
        setSelectedEquipment(null);
        setSelectedTime(null);
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
        if (gymsLoading) {
            return [];
        }
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
        if (gymsLoading) {
            return;
        }
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
    }, [gymsWithDistance, selectedGymId, gymsLoading]);

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

    const operatingRange = useMemo(() => {
        if (!selectedGym) {
            return { start: 0, end: 24 * 60 };
        }
        const today = new Date();
        const isWeekend = today.getDay() === 0 || today.getDay() === 6;
        const hours = isWeekend ? selectedGym.operatingHours.weekends : selectedGym.operatingHours.weekdays;
        const parsed = parseOperatingRange(hours);
        if (parsed.end <= parsed.start) {
            return { start: 0, end: 24 * 60 };
        }
        return parsed;
    }, [selectedGym]);

    const availableTimeSlots = useMemo(() => {
        if (!selectedGym) {
            return [] as string[];
        }

        const inRangeSlots = timeSlots.filter(time => {
            const minutes = toMinutes(time);
            return minutes >= operatingRange.start && minutes + RESERVATION_INTERVAL_MINUTES <= operatingRange.end;
        });

        if (!selectedEquipment) {
            return inRangeSlots;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayMs = today.getTime();

        const reservedSet = new Set(
            reservations
                .filter(res => res.gymId === selectedGym.id && res.equipmentId === selectedEquipment.id && res.date.toDate().getTime() === todayMs)
                .map(res => res.timeSlot)
        );

        return inRangeSlots.filter(time => !reservedSet.has(time));
    }, [selectedGym, selectedEquipment, reservations, operatingRange]);

    useEffect(() => {
        if (selectedTime && !availableTimeSlots.includes(selectedTime)) {
            setSelectedTime(null);
        }
    }, [availableTimeSlots, selectedTime]);

    const handleSelectGym = useCallback((gymId: string) => {
        setSelectedGymId(gymId);
        setSelectedCategory(null);
        setSelectedEquipment(null);
        setSelectedTime(null);
    }, []);

    const handleBook = async () => {
        if (!selectedGym || !selectedEquipment || !selectedTime) return;
        if (!currentUser || currentUser.role !== 'member') {
            alert('Please log in as a member to make a reservation.');
            return;
        }
        try {
            const now = Timestamp.now();
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const reservationDate = Timestamp.fromDate(startOfDay);
            await addDoc(collection(firestore, 'reservations'), {
                gymId: selectedGym.id,
                equipmentId: selectedEquipment.id,
                timeSlot: selectedTime,
                date: reservationDate,
                memberId: currentUser.id,
                createdAt: now,
            });
            alert(`Reserved ${selectedEquipment.name} at ${selectedGym.name} for ${selectedTime} - ${getEndTime(selectedTime)}!`);
            setSelectedEquipment(null);
            setSelectedTime(null);
            setSelectedCategory(null);
        } catch (error) {
            console.error('Failed to create reservation:', error);
            alert('Unable to create the reservation right now. Please try again in a moment.');
        }
    };

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'member') {
            setReservations([]);
            setReservationsLoading(false);
            return;
        }

        setReservationsLoading(true);
        const reservationsRef = collection(firestore, 'reservations');
        const todayStart = (() => {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            return Timestamp.fromDate(now);
        })();

        const reservationsQuery = query(
            reservationsRef,
            where('memberId', '==', currentUser.id),
            where('date', '>=', todayStart),
            orderBy('date', 'asc'),
            orderBy('timeSlot', 'asc')
        );

        const unsubscribe = onSnapshot(
            reservationsQuery,
            snapshot => {
                const nextReservations: Reservation[] = snapshot.docs.map(docSnapshot => {
                    const data = docSnapshot.data();
                    const rawDate = data.date;
                    const rawCreatedAt = data.createdAt;
                    const normalizeTimestamp = (value: any, fallback: Timestamp) => {
                        if (value instanceof Timestamp) {
                            return value;
                        }
                        if (value instanceof Date) {
                            return Timestamp.fromDate(value);
                        }
                        if (typeof value === 'string' || typeof value === 'number') {
                            const parsed = new Date(value);
                            if (!Number.isNaN(parsed.getTime())) {
                                return Timestamp.fromDate(parsed);
                            }
                        }
                        return fallback;
                    };

                    const date = normalizeTimestamp(rawDate, Timestamp.now());
                    const createdAt = normalizeTimestamp(rawCreatedAt, Timestamp.now());

                    return {
                        id: docSnapshot.id,
                        gymId: data.gymId,
                        equipmentId: data.equipmentId,
                        timeSlot: data.timeSlot,
                        date,
                        memberId: data.memberId,
                        createdAt,
                    } satisfies Reservation;
                });
                setReservations(nextReservations);
                setReservationsLoading(false);
            },
            error => {
                console.error('Failed to subscribe to reservations:', error);
                setReservations([]);
                setReservationsLoading(false);
            }
        );

        return unsubscribe;
    }, [currentUser]);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) {
            return;
        }

        let cancelled = false;

        loadKakaoMaps()
            .then(maps => {
                if (cancelled || !mapContainerRef.current) {
                    return;
                }
                kakaoMapsRef.current = maps;
                const center = new maps.LatLng(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
                const map = new maps.Map(mapContainerRef.current, {
                    center,
                    level: 5,
                });
                map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
                mapRef.current = map;
                mapLoadedRef.current = true;
            })
            .catch(error => {
                console.error('Failed to initialise Kakao Maps:', error);
            });

        return () => {
            cancelled = true;
            gymMarkersRef.current.forEach(record => {
                record.overlay.setMap(null);
                record.cleanup();
            });
            gymMarkersRef.current = [];
            if (userMarkerRef.current) {
                userMarkerRef.current.setMap(null);
                userMarkerRef.current = null;
            }
            mapRef.current = null;
            kakaoMapsRef.current = null;
            mapLoadedRef.current = false;
        };
    }, []);

    useEffect(() => {
        const maps = kakaoMapsRef.current;
        const map = mapRef.current;
        if (!maps || !map || !mapLoadedRef.current) {
            return;
        }

        const target = userLocation ?? DEFAULT_LOCATION;
        const position = new maps.LatLng(target.lat, target.lng);

        if (!userMarkerRef.current) {
            userMarkerRef.current = new maps.Marker({
                map,
                position,
                zIndex: 3,
            });
        } else {
            userMarkerRef.current.setPosition(position);
            userMarkerRef.current.setMap(map);
        }

        if (userLocation || centerOnUserRef.current) {
            map.panTo(position);
            if (typeof map.getLevel === 'function' && typeof map.setLevel === 'function') {
                const currentLevel = map.getLevel();
                if (currentLevel > 5) {
                    map.setLevel(5);
                }
            }
            centerOnUserRef.current = false;
        }
    }, [userLocation]);

    useEffect(() => {
        const maps = kakaoMapsRef.current;
        const map = mapRef.current;
        if (!maps || !map || !mapLoadedRef.current) {
            return;
        }

        gymMarkersRef.current.forEach(record => {
            record.overlay.setMap(null);
            record.cleanup();
        });
        gymMarkersRef.current = [];

        if (!gymsWithDistance.length) {
            return;
        }

        gymMarkersRef.current = gymsWithDistance.map(gym => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `gym-marker${selectedGymId === gym.id ? ' is-active' : ''}`;
            button.title = gym.name;
            button.setAttribute('aria-label', `Select ${gym.name}`);
            const handleClick = () => handleSelectGym(gym.id);
            button.addEventListener('click', handleClick);

            const overlay = new maps.CustomOverlay({
                map,
                position: new maps.LatLng(gym.latitude, gym.longitude),
                yAnchor: 1,
                content: button,
            });

            return {
                gymId: gym.id,
                overlay,
                element: button,
                cleanup: () => {
                    button.removeEventListener('click', handleClick);
                },
            } satisfies GymOverlayRecord;
        });

        return () => {
            gymMarkersRef.current.forEach(record => {
                record.overlay.setMap(null);
                record.cleanup();
            });
            gymMarkersRef.current = [];
        };
    }, [gymsWithDistance, selectedGymId, handleSelectGym]);

    useEffect(() => {
        hasFittedBoundsRef.current = false;
    }, [gymsWithDistance.length, userLocation?.lat, userLocation?.lng]);

    useEffect(() => {
        const maps = kakaoMapsRef.current;
        const map = mapRef.current;
        if (!maps || !map || !mapLoadedRef.current || hasFittedBoundsRef.current) {
            return;
        }
        if (!gymsWithDistance.length && !userLocation) {
            return;
        }

        const bounds = new maps.LatLngBounds();
        const base = userLocation ?? DEFAULT_LOCATION;
        bounds.extend(new maps.LatLng(base.lat, base.lng));
        gymsWithDistance.forEach(gym => bounds.extend(new maps.LatLng(gym.latitude, gym.longitude)));

        map.setBounds(bounds, 60, 60, 60, 60);
        hasFittedBoundsRef.current = true;
    }, [gymsWithDistance, userLocation]);

    useEffect(() => {
        const maps = kakaoMapsRef.current;
        const map = mapRef.current;
        if (!maps || !map || !mapLoadedRef.current || !selectedGym) {
            return;
        }

        const position = new maps.LatLng(selectedGym.latitude, selectedGym.longitude);
        map.panTo(position);
        if (typeof map.getLevel === 'function' && typeof map.setLevel === 'function') {
            const currentLevel = map.getLevel();
            if (currentLevel > 5) {
                map.setLevel(5);
            }
        }
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
                                    {gymsLoading ? (
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Loading gyms…</p>
                                    ) : gymsWithDistance.length === 0 ? (
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
                                    {availableTimeSlots.length > 0 ? (
                                        <select
                                            value={selectedTime || ''}
                                            onChange={e => setSelectedTime(e.target.value)}
                                            className="w-full p-3 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 font-mono"
                                        >
                                            <option value="" disabled>Select a time</option>
                                            {availableTimeSlots.map(time => (
                                                <option key={time} value={time}>
                                                    {time}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-sm text-red-500 dark:text-red-400">
                                            No available time slots. Try another machine or time.
                                        </p>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleBook}
                                disabled={!selectedGym || !selectedEquipment || !selectedTime || availableTimeSlots.length === 0}
                                className="w-full p-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-white disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                            >
                                Confirm Reservation
                            </button>
                        </section>
                    </div>

                    <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10">
                        <h3 className="text-xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Your Upcoming Reservations</h3>
                        {reservationsLoading ? (
                            <p className="text-slate-500 dark:text-slate-400 text-center mt-8">Loading reservations…</p>
                        ) : reservations.length > 0 ? (
                            <ul className="space-y-3">
                                {reservations.map(res => {
                                    const gym = gyms.find(g => g.id === res.gymId);
                                    const equipment = gym?.equipment.find(e => e.id === res.equipmentId);
                                    const endTime = getEndTime(res.timeSlot);
                                    return (
                                        <li key={res.id} className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                                            <p className="font-bold text-slate-800 dark:text-white">{equipment?.name ?? 'Equipment unavailable'}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-300">{gym?.name ?? 'Gym removed'}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500">{res.date.toDate().toLocaleDateString('en-US')}</p>
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
