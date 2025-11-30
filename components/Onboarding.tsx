import React, { useState } from 'react';
import type { UserProfile } from '../types';
import { TargetIcon, BodyIcon, HeartPulseIcon, CheckCircleIcon } from './icons';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const steps = [
  { id: 'goal', title: 'Your Goal', icon: <TargetIcon className="w-8 h-8" /> },
  { id: 'body', title: 'Your Body', icon: <BodyIcon className="w-8 h-8" /> },
  { id: 'health', title: 'Health & Lifestyle', icon: <HeartPulseIcon className="w-8 h-8" /> },
];

const healthOptions = ['None', 'Knee Pain', 'Back Pain', 'Shoulder Injury', 'Asthma', 'Gluten Intolerance', 'Lactose Intolerance', 'Other'];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    goal: 'weightLoss',
    workoutPreference: 'home'
  });
  
  const [selectedHealth, setSelectedHealth] = useState<string[]>(['None']);
  const [otherHealth, setOtherHealth] = useState('');
  const showOtherHealthInput = selectedHealth.includes('Other');

  const handleHealthToggle = (option: string) => {
    setSelectedHealth(prev => {
      if (option === 'None') {
        setOtherHealth('');
        return ['None'];
      }
      const newSelection = prev.filter(item => item !== 'None');
      if (newSelection.includes(option)) {
        if(option === 'Other') setOtherHealth('');
        return newSelection.filter(item => item !== option);
      } else {
        return [...newSelection, option];
      }
    });
  };

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const { name, value } = e.target;
     setProfile(prev => ({ ...prev, [name]: value === '' ? undefined : Number(value) }));
  };
  
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      const finalProfile = { ...profile };
      
      let finalHealthConditions = selectedHealth.filter(h => h !== 'Other' && h !== 'None');
      if (showOtherHealthInput && otherHealth.trim() !== '') {
        finalHealthConditions.push(otherHealth.trim());
      }
      
      finalProfile.healthConditions = finalHealthConditions.length > 0 ? finalHealthConditions.join(', ') : 'None';
      
      delete finalProfile.availableEquipment;

      onComplete(finalProfile as UserProfile);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-white flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-2 text-cyan-600 dark:text-cyan-400">Welcome to Fitness Assistant</h1>
        <p className="text-center text-slate-500 dark:text-slate-400 mb-8">Let's personalize your fitness journey.</p>
        
        <div className="mb-8">
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
            <div className="bg-cyan-500 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}></div>
          </div>
          <ol className="flex justify-between w-full mt-4">
            {steps.map((step, index) => (
              <li key={step.id} className={`flex flex-col items-center text-center ${index <= currentStep ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-500'}`}>
                <span className={`flex items-center justify-center w-12 h-12 rounded-full ${index <= currentStep ? 'bg-cyan-500 text-white dark:text-slate-900' : 'bg-gray-200 dark:bg-slate-700'} ring-4 ring-white dark:ring-slate-800 mb-2`}>
                   {index < currentStep ? <CheckCircleIcon className="w-8 h-8" /> : step.icon}
                </span>
                <span className="font-medium text-sm">{step.title}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-2xl ring-1 ring-gray-200 dark:ring-white/10">
          {currentStep === 0 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-semibold text-center">What's your primary fitness goal?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['weightLoss', 'muscleGain', 'rehab'].map(goal => (
                   <button key={goal} onClick={() => setProfile(p => ({...p, goal}))} className={`p-4 rounded-lg text-center font-semibold transition-all duration-200 ${profile.goal === goal ? 'bg-cyan-500 text-white dark:text-slate-900 ring-2 ring-cyan-300' : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                    {goal === 'weightLoss' ? 'Lose Weight' : goal === 'muscleGain' ? 'Gain Muscle' : 'Rehab/Mobility'}
                   </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-semibold text-center">Tell us about yourself</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="height" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Height (cm)</label>
                  <input type="number" name="height" id="height" value={profile.height || ''} onChange={handleNumericChange} className="w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500" placeholder="e.g., 175" required />
                </div>
                 <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Weight (kg)</label>
                  <input type="number" name="weight" id="weight" value={profile.weight || ''} onChange={handleNumericChange} className="w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500" placeholder="e.g., 70" required />
                </div>
                 <div className="md:col-span-2">
                  <label htmlFor="bodyFat" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Body Fat % (Optional)</label>
                  <input type="number" name="bodyFat" id="bodyFat" value={profile.bodyFat || ''} onChange={handleNumericChange} className="w-full bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500" placeholder="e.g., 15" />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-2xl font-semibold text-center">Almost there...</h2>
              <div>
                <label htmlFor="health" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Any health conditions or allergies? (Multiple choices possible)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {healthOptions.map(option => (
                        <button 
                            key={option} 
                            onClick={() => handleHealthToggle(option)}
                            className={`p-3 rounded-lg text-sm font-semibold transition ${selectedHealth.includes(option) ? 'bg-cyan-500 text-white dark:bg-cyan-600 dark:text-white' : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
                {showOtherHealthInput && (
                    <input type="text" value={otherHealth} onChange={(e) => setOtherHealth(e.target.value)} placeholder="Please specify" className="mt-2 w-full bg-gray-100 dark:bg-slate-600 border-gray-300 dark:border-slate-500 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Where do you prefer to work out?</label>
                <div className="flex gap-4">
                  <button onClick={() => setProfile(p => ({...p, workoutPreference: 'home'}))} className={`flex-1 p-3 rounded-lg font-semibold transition ${profile.workoutPreference === 'home' ? 'bg-cyan-500 text-white dark:text-slate-900' : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>Home</button>
                  <button onClick={() => setProfile(p => ({...p, workoutPreference: 'gym'}))} className={`flex-1 p-3 rounded-lg font-semibold transition ${profile.workoutPreference === 'gym' ? 'bg-cyan-500 text-white dark:text-slate-900' : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>Gym</button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <button onClick={prevStep} disabled={currentStep === 0} className="px-6 py-2 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
              Back
            </button>
            <button onClick={nextStep} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md font-semibold">
              {currentStep === steps.length - 1 ? 'Generate My Plan' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};