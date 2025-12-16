import React, { useState, useCallback, useEffect } from 'react';
import { Onboarding } from './components/Onboarding';
import { generateFitnessPlan } from './services/geminiService';
import type { UserProfile, FitnessPlan } from './types';
import { HomeScreen } from './components/screens/HomeScreen';
import { ReservationScreen } from './components/screens/ReservationScreen';
import { LogScreen } from './components/screens/LogScreen';
import { MyPageScreen } from './components/screens/MyPageScreen';
import { BottomNav } from './components/BottomNav';
import { Chatbot } from './components/Chatbot';
import { ChatBubbleIcon } from './components/icons';
import { AuthScreen } from './components/auth/AuthScreen';
import { OwnerDashboard } from './components/owner/OwnerDashboard';
import { useAuth } from './context/AuthContext';
import { getStoredPlanForMember } from './services/planService';

type AppState = 'onboarding' | 'loading' | 'dashboard' | 'error';
export type Tab = 'home' | 'reservations' | 'log' | 'mypage';


const LoadingSpinner: React.FC<{ message?: string; helperText?: string }> = ({
  message = '잠시만 기다려 주세요…',
  helperText = 'This might take a moment.',
}) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-white">
    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-cyan-500"></div>
    <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">{message}</p>
    <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">{helperText}</p>
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
  const { currentUser, loading, logout, updateMemberProfile } = useAuth();
  const [appState, setAppState] = useState<AppState>('onboarding');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [fitnessPlan, setFitnessPlan] = useState<FitnessPlan | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [planOwnerId, setPlanOwnerId] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const isMember = currentUser?.role === 'member';
  const memberId = isMember ? currentUser.id : null;
  const memberProfile = isMember ? currentUser.profile ?? null : null;

  useEffect(() => {
    if (!isMember || !memberId) {
      setUserProfile(null);
      setFitnessPlan(null);
      setPlanOwnerId(null);
      setActiveTab('home');
      setAppState('onboarding');
      setIsChatOpen(false);
      return;
    }

    setActiveTab('home');
    setIsChatOpen(false);
    setUserProfile(memberProfile);

    if (!memberProfile) {
      setFitnessPlan(null);
      setPlanOwnerId(null);
      setAppState('onboarding');
      return;
    }

    if (planOwnerId && planOwnerId !== memberId) {
      setFitnessPlan(null);
      setPlanOwnerId(null);
    }

    if (planOwnerId === memberId && fitnessPlan) {
      setAppState('dashboard');
      return;
    }

    if (isGeneratingPlan) {
      setAppState('loading');
      return;
    }

    let cancelled = false;

    // Hydrate existing plans from Firestore so members land on their dashboard immediately.
    const loadStoredPlan = async () => {
      setAppState('loading');
      try {
        const storedPlan = await getStoredPlanForMember(memberId);
        if (cancelled) {
          return;
        }
        if (storedPlan) {
          setFitnessPlan(storedPlan);
          setPlanOwnerId(memberId);
          setAppState('dashboard');
        } else {
          setFitnessPlan(null);
          setPlanOwnerId(null);
          setAppState('onboarding');
        }
      } catch (error) {
        console.error('Failed to load stored fitness plan:', error);
        if (!cancelled) {
          setFitnessPlan(null);
          setPlanOwnerId(null);
          setAppState('onboarding');
        }
      }
    };

    loadStoredPlan();

    return () => {
      cancelled = true;
    };
  }, [isMember, memberId, memberProfile, planOwnerId, fitnessPlan, isGeneratingPlan]);

  const handleOnboardingComplete = useCallback(async (profile: UserProfile) => {
    if (!memberId) {
      return;
    }
    setIsGeneratingPlan(true);
    setAppState('loading');
    setUserProfile(profile);
    try {
      await updateMemberProfile(profile);
      const plan = await generateFitnessPlan(memberId, profile);
      setFitnessPlan(plan);
      setPlanOwnerId(memberId);
      setAppState('dashboard');
    } catch (error) {
      console.error(error);
      setAppState('error');
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [memberId, updateMemberProfile]);
  
  const handleRetry = () => {
    setAppState('onboarding');
    setUserProfile(null);
    setFitnessPlan(null);
    setPlanOwnerId(null);
    setIsGeneratingPlan(false);
  };

  if (!currentUser) {
    if (loading) {
      return <LoadingSpinner message="세션을 확인하는 중입니다..." helperText="곧 로그인 상태를 불러올게요." />;
    }
    return <AuthScreen />;
  }

  if (currentUser.role === 'owner') {
    return <OwnerDashboard />;
  }

  const renderContent = () => {
    switch (appState) {
      case 'onboarding':
        return <Onboarding onComplete={handleOnboardingComplete} />;
      case 'loading':
        return (
          <LoadingSpinner
            message="맞춤형 운동 플랜을 생성하고 있어요."
            helperText="AI가 프로필을 반영해 일주일 일정을 작성 중입니다."
          />
        );
      case 'dashboard':
        if (fitnessPlan && userProfile) {
          return (
            <div className="flex flex-col h-screen">
              <main className="flex-1 overflow-y-auto pb-20 bg-gray-50 dark:bg-slate-900">
                {activeTab === 'home' && <HomeScreen plan={fitnessPlan} user={userProfile} />}
                {activeTab === 'reservations' && <ReservationScreen />}
                {activeTab === 'log' && <LogScreen />}
                {activeTab === 'mypage' && (
                  <MyPageScreen
                    user={userProfile}
                    accountName={currentUser?.name ?? ''}
                    email={currentUser?.email ?? ''}
                    onLogout={logout}
                  />
                )}
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
      {appState === 'dashboard' && (
        <>
          <button
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-30 w-16 h-16 bg-cyan-600 rounded-full text-white flex items-center justify-center shadow-lg hover:bg-cyan-500 transition-transform transform hover:scale-110"
            aria-label="Open AI Chat"
          >
            <ChatBubbleIcon className="w-8 h-8" />
          </button>
          {isChatOpen && <Chatbot onClose={() => setIsChatOpen(false)} memberId={memberId} />}
        </>
      )}
    </div>
  );
}

export default App;