
import type { UserProfile, FitnessPlan, ChatMessage } from '../types';

const rawApiBase = ((import.meta as any).env?.VITE_COACH_API_URL as string | undefined)?.trim();
const API_BASE = rawApiBase ? rawApiBase.replace(/\/$/, '') : '';
const buildUrl = (path: string) => `${API_BASE}${path}`;

export const generateFitnessPlan = async (memberId: string, userProfile: UserProfile): Promise<FitnessPlan> => {
  try {
    const response = await fetch(buildUrl('/api/coach/generate-plan'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ memberId, profile: userProfile }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Failed to generate plan');
    }

    const payload = await response.json();
    if (payload?.plan) {
      return payload.plan as FitnessPlan;
    }
    throw new Error('Invalid plan payload received from AI coach server');
  } catch (error) {
    console.error('generateFitnessPlan fallback due to error:', error);
    return getFallbackPlan();
  }
};

interface SendChatPayload {
  memberId?: string | null;
  message: string;
  history: ChatMessage[];
}

export const sendMessageToChat = async ({ memberId, message, history }: SendChatPayload): Promise<string> => {
  try {
    const response = await fetch(buildUrl('/api/coach/chat'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        memberId,
        message,
        history: history.map(item => ({
          role: item.role === 'model' ? 'assistant' : 'user',
          content: item.text,
        })),
      }),
    });

    if (!response.ok) {
      const messageText = await response.text();
      throw new Error(messageText || 'Failed to converse with AI coach');
    }

    const payload = await response.json();
    if (payload?.reply) {
      return payload.reply as string;
    }
    return 'Sorry, I could not understand that. Please try again.';
  } catch (error) {
    console.error('sendMessageToChat error:', error);
    return 'There was a problem talking to the AI coach. Please try again soon.';
  }
};

// Fallback plan when API is unavailable
function getFallbackPlan(): FitnessPlan {
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  return {
    workoutPlan: days.map((day, i) => ({
      day,
      focus: i % 2 === 0 ? 'Full Body' : 'Cardio & Rest',
      exercises: [
        { name: 'Bodyweight Squats', sets: 3, reps: '12-15', rest: '60s', description: 'Keep back straight, lower until thighs parallel.' },
        { name: 'Push-ups', sets: 3, reps: '10-12', rest: '60s', description: 'Hands shoulder-width, lower chest to floor.' },
        { name: 'Plank', sets: 3, reps: '30s', rest: '45s', description: 'Keep body straight, engage core.' }
      ]
    })),
    dietPlan: days.map(day => ({
      day,
      meals: {
        breakfast: { name: 'Oatmeal & Fruit', calories: 350, description: 'Oats with banana and berries', recipe: 'Cook oats, top with sliced fruit.' },
        lunch: { name: 'Chicken Salad', calories: 500, description: 'Grilled chicken with greens', recipe: 'Grill chicken, toss with mixed greens.' },
        dinner: { name: 'Salmon & Vegetables', calories: 600, description: 'Baked salmon with steamed veggies', recipe: 'Bake salmon, steam broccoli and carrots.' },
        snacks: { name: 'Greek Yogurt', calories: 150, description: 'Plain yogurt with honey', recipe: 'Add honey to yogurt.' }
      },
      dailyTotal: { calories: 1600, protein: '120g', carbs: '150g', fat: '50g' }
    }))
  } as FitnessPlan;
}