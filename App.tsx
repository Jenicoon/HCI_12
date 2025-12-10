import React, { useState, useCallback } from 'react';
import { Onboarding } from './components/Onboarding';
import { generateFitnessPlan, generateQuickPlan } from './services/geminiService';
import type { UserProfile, FitnessPlan } from './types';
import { HomeScreen } from './components/screens/HomeScreen';
import { ReservationScreen } from './components/screens/ReservationScreen';
import { LogScreen } from './components/screens/LogScreen';
import { MyPageScreen } from './components/screens/MyPageScreen';
import { BottomNav } from './components/BottomNav';
import { Chatbot } from './components/Chatbot';
import { ChatBubbleIcon } from './components/icons';

type AppState = 'onboarding' | 'loading' | 'dashboard' | 'error';
export type Tab = 'home' | 'reservations' | 'log' | 'mypage';


const LoadingSpinner: React.FC = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-white">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-cyan-500"></div>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">Generating your personalized plan...</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">This might take a moment.</p>
    </div>
);

const ErrorDisplay: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-white p-4">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Oops! Something went wrong.</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-center">We couldn't generate your fitness plan. Please try again.</p>
        <button
            onClick={onRetry}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md font-semibold"
        >
            Retry
        </button>
    </div>
);


function App() {
  const [appState, setAppState] = useState<AppState>('onboarding');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [fitnessPlan, setFitnessPlan] = useState<FitnessPlan | null>(null);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleOnboardingComplete = useCallback(async (profile: UserProfile) => {
    setUserProfile(profile);
    // Immediately show a quick generated plan to reduce perceived wait time
    try {
      const quick = generateQuickPlan(profile);
      setFitnessPlan(quick);
      setAppState('dashboard');
      setIsUpdatingPlan(true);
      // Generate the refined plan in the background and swap when ready
      generateFitnessPlan(profile)
        .then(plan => {
          setFitnessPlan(plan);
        })
        .catch(err => {
          console.error('Background plan generation failed', err);
          setErrorMessage(err instanceof Error ? err.message : String(err));
        })
        .finally(() => setIsUpdatingPlan(false));
    } catch (error) {
      console.error(error);
      setAppState('error');
    }
  }, []);
  
  const handleRetry = () => {
      setAppState('onboarding');
      setUserProfile(null);
      setFitnessPlan(null);
      setErrorMessage(null);
  }

  const renderContent = () => {
    switch (appState) {
      case 'onboarding':
        return <Onboarding onComplete={handleOnboardingComplete} />;
      case 'loading':
        return <LoadingSpinner />;
      case 'dashboard':
        if (fitnessPlan && userProfile) {
          return (
            <div className="flex flex-col h-screen">
              <main className="flex-1 overflow-y-auto pb-20 bg-gray-50 dark:bg-slate-900">
                {activeTab === 'home' && <HomeScreen plan={fitnessPlan} user={userProfile} />}
                {activeTab === 'reservations' && <ReservationScreen />}
                {activeTab === 'log' && <LogScreen />}
                {activeTab === 'mypage' && <MyPageScreen user={userProfile} />}
              </main>
              <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
          );
        }
        setAppState('error');
        return <ErrorDisplay onRetry={handleRetry} />;
      case 'error':
        return <ErrorDisplay onRetry={handleRetry} />;
      default:
        return <Onboarding onComplete={handleOnboardingComplete} />;
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      {renderContent()}
      {appState === 'dashboard' && isUpdatingPlan && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 px-4 py-2 rounded shadow">
          Updating plan with personalized suggestions...
        </div>
      )}
       {appState === 'dashboard' && (
            <>
              <button
                onClick={() => setIsChatOpen(true)}
                className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-30 w-16 h-16 bg-cyan-600 rounded-full text-white flex items-center justify-center shadow-lg hover:bg-cyan-500 transition-transform transform hover:scale-110"
                aria-label="Open AI Chat"
              >
                <ChatBubbleIcon className="w-8 h-8" />
              </button>
              {isChatOpen && <Chatbot onClose={() => setIsChatOpen(false)} />}
            </>
        )}
    </div>
  );
}

export default App;