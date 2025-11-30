import React, { useState } from 'react';
import type { Gym, Equipment, Reservation } from '../../types';

const mockGyms: Gym[] = [
    {
        id: 'gym1', name: 'Powerhouse Gym', address: '123 Fitness St, Fitville',
        equipment: [
            { id: 'tread1', name: 'Treadmill A', category: 'cardio' },
            { id: 'tread2', name: 'Treadmill B', category: 'cardio' },
            { id: 'legpress1', name: 'Leg Press Machine', category: 'machine' },
            { id: 'smith1', name: 'Smith Machine', category: 'machine' },
            { id: 'rack1', name: 'Squat Rack', category: 'freeWeight' },
            { id: 'bench1', name: 'Bench Press', category: 'freeWeight' },
        ]
    },
    {
        id: 'gym2', name: 'Iron Paradise', address: '456 Muscle Ave, Gainstown',
        equipment: [
            { id: 'elliptical1', name: 'Elliptical Trainer', category: 'cardio' },
            { id: 'latpulldown1', name: 'Lat Pulldown', category: 'machine' },
            { id: 'deadlift1', name: 'Deadlift Platform', category: 'freeWeight' },
        ]
    }
];

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

const timeSlots = generateTimeSlots(9, 17, 10); // 09:00 to 16:50

const getEndTime = (startTime: string | null): string => {
    if (!startTime) return '';
    const [hour, minute] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hour, minute + 10, 0, 0); // 10 minute slot
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

type Category = 'cardio' | 'machine' | 'freeWeight';

export const ReservationScreen: React.FC = () => {
    const [selectedGym, setSelectedGym] = useState<Gym | null>(mockGyms[0]);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [reservations, setReservations] = useState<Reservation[]>([]);

    const handleSelectGym = (gym: Gym) => {
        setSelectedGym(gym);
        setSelectedCategory(null);
        setSelectedEquipment(null);
        setSelectedTime(null);
    }
    
    const handleBook = () => {
        if (selectedGym && selectedEquipment && selectedTime) {
            const newReservation: Reservation = {
                id: `res-${Date.now()}`,
                gymId: selectedGym.id,
                equipmentId: selectedEquipment.id,
                timeSlot: selectedTime,
                date: new Date().toISOString().split('T')[0],
            };
            setReservations(prev => [...prev, newReservation]);
            alert(`Reserved ${selectedEquipment.name} at ${selectedGym.name} for ${selectedTime} - ${getEndTime(selectedTime)}!`);
            setSelectedEquipment(null);
            setSelectedTime(null);
            setSelectedCategory(null);
        }
    }
    
    const equipmentByCategory = selectedGym?.equipment.reduce((acc, eq) => {
        if (!acc[eq.category]) acc[eq.category] = [];
        acc[eq.category].push(eq);
        return acc;
    }, {} as Record<Category, Equipment[]>) || {};


    return (
        <div className="min-h-screen text-slate-800 dark:text-white p-4 sm:p-6 lg:p-8 transition-colors duration-300">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold">Reserve Equipment</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Book your spot and never wait for a machine again.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Reservation Flow */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10 space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400 mb-3">1. Select a Gym</h3>
                            <div className="space-y-2">
                                {mockGyms.map(gym => (
                                    <button key={gym.id} onClick={() => handleSelectGym(gym)} className={`w-full text-left p-3 rounded-lg transition ${selectedGym?.id === gym.id ? 'bg-cyan-500 text-white' : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                                        <p className="font-semibold">{gym.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-300">{gym.address}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedGym && (
                            <div className="animate-fade-in">
                                <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400 mb-3">2. Choose Equipment Category</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['cardio', 'machine', 'freeWeight'] as Category[]).map(cat => (
                                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`p-3 rounded-lg text-sm font-semibold capitalize transition ${selectedCategory === cat ? 'bg-cyan-500 text-white' : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
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
                                    {(equipmentByCategory[selectedCategory] || []).map(eq => (
                                        <button key={eq.id} onClick={() => setSelectedEquipment(eq)} className={`w-full text-left p-2 rounded-lg text-sm transition ${selectedEquipment?.id === eq.id ? 'bg-cyan-500 text-white' : 'bg-gray-100 dark:bg-slate-600 hover:bg-gray-200 dark:hover:bg-slate-500'}`}>
                                            {eq.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                         )}

                         {selectedEquipment && (
                             <div className="animate-fade-in">
                                <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400 mb-3">4. Select a Time Slot</h3>
                                 <select 
                                    value={selectedTime || ''} 
                                    onChange={(e) => setSelectedTime(e.target.value)} 
                                    className="w-full p-3 bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 font-mono"
                                >
                                    <option value="" disabled>Select a time</option>
                                    {timeSlots.map(time => (
                                        <option key={time} value={time}>{time}</option>
                                    ))}
                                </select>
                             </div>
                         )}
                         
                         <button onClick={handleBook} disabled={!selectedTime} className="w-full p-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-white disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed">
                            Confirm Reservation
                         </button>

                    </div>

                    {/* My Reservations */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md ring-1 ring-gray-200 dark:ring-white/10">
                        <h3 className="text-xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Your Upcoming Reservations</h3>
                        {reservations.length > 0 ? (
                            <ul className="space-y-3">
                                {reservations.map(res => {
                                    const gym = mockGyms.find(g => g.id === res.gymId);
                                    const equipment = gym?.equipment.find(e => e.id === res.equipmentId);
                                    const endTime = getEndTime(res.timeSlot);
                                    return (
                                        <li key={res.id} className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                                            <p className="font-bold text-slate-800 dark:text-white">{equipment?.name}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-300">{gym?.name}</p>
                                            <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 mt-1 font-mono">{res.timeSlot} - {endTime}</p>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-slate-500 dark:text-slate-400 text-center mt-8">You have no upcoming reservations.</p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};