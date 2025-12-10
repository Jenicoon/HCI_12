

import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { UserProfile, FitnessPlan } from '../types';

// Prefer Vite env var `VITE_API_KEY`. In the browser `process.env` is not available,
// and exposing a secret in frontend is unsafe. For quick dev convenience we
// provide a mock fallback when the key is not present so the app doesn't crash
// on module load. Long-term: move calls to a secure server-side endpoint.
const API_KEY = (import.meta as any).env?.VITE_API_KEY as string | undefined;

let ai: InstanceType<typeof GoogleGenAI> | null = null;
let chat: Chat | null = null;

if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

const fitnessPlanSchema = {
  type: Type.OBJECT,
  properties: {
    workoutPlan: {
      type: Type.ARRAY,
      description: "A 7-day workout plan.",
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING, description: "Day of the week (e.g., Monday)." },
          focus: { type: Type.STRING, description: "Main muscle group or workout type for the day (e.g., Chest & Triceps, Cardio, Rest)." },
          exercises: {
            type: Type.ARRAY,
            description: "List of exercises for the day.",
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Name of the exercise." },
                sets: { type: Type.INTEGER, description: "Number of sets." },
                reps: { type: Type.STRING, description: "Number of repetitions per set (e.g., '8-12 reps' or '30 seconds')." },
                rest: { type: Type.STRING, description: "Rest time between sets (e.g., '60 seconds')." },
                description: { type: Type.STRING, description: "A brief, clear description of how to perform the exercise correctly." }
              },
              required: ["name", "sets", "reps", "rest", "description"],
            },
          },
        },
        required: ["day", "focus", "exercises"],
      },
    },
    dietPlan: {
      type: Type.ARRAY,
      description: "A 7-day diet plan.",
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING, description: "Day of the week (e.g., Monday)." },
          meals: {
            type: Type.OBJECT,
            properties: {
              breakfast: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  calories: { type: Type.INTEGER },
                  description: { type: Type.STRING },
                  recipe: { type: Type.STRING, description: "Simple recipe instructions." }
                },
                required: ["name", "calories", "description", "recipe"],
              },
              lunch: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  calories: { type: Type.INTEGER },
                  description: { type: Type.STRING },
                  recipe: { type: Type.STRING, description: "Simple recipe instructions." }
                },
                required: ["name", "calories", "description", "recipe"],
              },
              dinner: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  calories: { type: Type.INTEGER },
                  description: { type: Type.STRING },
                  recipe: { type: Type.STRING, description: "Simple recipe instructions." }
                },
                 required: ["name", "calories", "description", "recipe"],
              },
              snacks: {
                type: Type.OBJECT,
                 properties: {
                  name: { type: Type.STRING },
                  calories: { type: Type.INTEGER },
                  description: { type: Type.STRING },
                   recipe: { type: Type.STRING, description: "Simple recipe instructions." }
                },
                 required: ["name", "calories", "description", "recipe"],
              }
            },
            required: ["breakfast", "lunch", "dinner"],
          },
          dailyTotal: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.INTEGER },
              protein: { type: Type.STRING, description: "e.g., 150g" },
              carbs: { type: Type.STRING, description: "e.g., 200g" },
              fat: { type: Type.STRING, description: "e.g., 60g" },
            },
            required: ["calories", "protein", "carbs", "fat"],
          },
        },
        required: ["day", "meals", "dailyTotal"],
      },
    },
  },
  required: ["workoutPlan", "dietPlan"],
};

export const generateFitnessPlan = async (userProfile: UserProfile): Promise<FitnessPlan> => {
  const goalMap = {
    weightLoss: 'Weight Loss',
    muscleGain: 'Muscle Gain',
    rehab: 'Rehabilitation and mobility improvement'
  };

  const prompt = `
    Create a highly personalized 7-day fitness and diet plan for a user with the following profile. 
    The plan should be safe, effective, and tailored to their specific needs.

    User Profile:
    - Primary Goal: ${goalMap[userProfile.goal as keyof typeof goalMap]}
    - Height: ${userProfile.height} cm
    - Weight: ${userProfile.weight} kg
    - Body Fat Percentage: ${userProfile.bodyFat ? `${userProfile.bodyFat}%` : 'Not provided'}
    - Health Conditions: ${userProfile.healthConditions || 'None specified'}
    - Workout Location Preference: ${userProfile.workoutPreference === 'home' ? 'At home' : 'At the gym'}
    - Available Equipment: ${userProfile.availableEquipment || 'Basic bodyweight exercises'}

    Instructions:
    1.  **Workout Plan:** Design a balanced 7-day schedule, including rest days. For each workout day, provide a list of exercises with sets, reps, and rest times. Ensure the exercises are appropriate for the user's location and available equipment. For rehab goals, focus on low-impact and mobility exercises.
    2.  **Diet Plan:** Create a 7-day meal plan with breakfast, lunch, and dinner. Include estimated calories for each meal and a daily total for calories and macros (protein, carbs, fat). The diet should align with the user's primary goal (e.g., calorie deficit for weight loss, surplus for muscle gain). Provide simple recipes or meal ideas.
    3.  **Safety:** If the user mentioned health conditions, adjust the plan accordingly (e.g., low-impact exercises for joint issues). Add a general disclaimer about consulting a doctor.
    4.  **Format:** Return the response in the specified JSON format.
  `;

  // If the API client isn't available (no API key), return a lightweight mock
  // plan for local development instead of throwing at module import time.
  if (!ai) {
    console.warn('VITE_API_KEY not set — returning mock fitness plan for dev');
    const mockPlan: FitnessPlan = {
      workoutPlan: [
        {
          day: 'Monday',
          focus: 'Full Body',
          exercises: [
            { name: 'Bodyweight Squat', sets: 3, reps: '12', rest: '60s', description: 'Standard squat focusing on depth and form.' },
            { name: 'Push-ups', sets: 3, reps: '8-12', rest: '60s', description: 'Keep a straight line from head to heels.' }
          ]
        }
      ],
      dietPlan: [
        {
          day: 'Monday',
          meals: {
            breakfast: { name: 'Oatmeal', calories: 350, description: 'Oats with banana and milk', recipe: 'Mix oats with milk and top with banana.' },
            lunch: { name: 'Chicken Salad', calories: 500, description: 'Grilled chicken with greens', recipe: 'Grill chicken and toss with salad.' },
            dinner: { name: 'Rice & Veg', calories: 600, description: 'Rice with mixed vegetables', recipe: 'Stir-fry veggies and serve with rice.' },
            snacks: { name: 'Yogurt', calories: 150, description: 'Plain yogurt with honey', recipe: 'Serve yogurt with a drizzle of honey.' }
          },
          dailyTotal: { calories: 1600, protein: '110g', carbs: '180g', fat: '50g' }
        }
      ]
    } as unknown as FitnessPlan;
    return new Promise(resolve => setTimeout(() => resolve(mockPlan), 300));
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: fitnessPlanSchema,
      },
    });

    const jsonText = response.text.trim();
    const plan = JSON.parse(jsonText) as FitnessPlan;
    return plan;
  } catch (error) {
    console.error("Error generating fitness plan:", error);
    throw new Error("Failed to generate a fitness plan. Please try again.");
  }
};

// Lightweight, deterministic quick plan generator for immediate UX feedback.
// This returns a simple 7-day plan synchronously (fast) so the UI can show
// something while a refined plan is generated in the background.
export const generateQuickPlan = (userProfile: UserProfile): FitnessPlan => {
  const goal = userProfile.goal || 'weightLoss';
  const pref = userProfile.workoutPreference || 'home';

  const baseCalories = goal === 'muscleGain' ? 2500 : goal === 'rehab' ? 1800 : 1600;

  const exercisesFor = (focus: string) => {
    if (pref === 'gym') {
      if (focus === 'Cardio') return [
        { name: 'Treadmill Jog', sets: 1, reps: '20 min', rest: '—', description: 'Light to moderate jog.' }
      ];
      return [
        { name: 'Barbell Squat', sets: 3, reps: '8-10', rest: '90s', description: 'Keep chest up, drive through heels.' },
        { name: 'Dumbbell Bench Press', sets: 3, reps: '8-12', rest: '90s', description: 'Control the weight on the way down.' }
      ];
    }
    // home / bodyweight
    if (focus === 'Cardio') return [
      { name: 'Jumping Jacks', sets: 3, reps: '60', rest: '30s', description: 'Moderate pace to raise heart rate.' }
    ];
    return [
      { name: 'Bodyweight Squat', sets: 3, reps: '12', rest: '60s', description: 'Sit back into your hips.' },
      { name: 'Push-ups', sets: 3, reps: '8-12', rest: '60s', description: 'Keep a straight plank position.' }
    ];
  };

  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  const workoutPlan = days.map((day, i) => {
    const focus = i % 3 === 0 ? 'Full Body' : i % 3 === 1 ? 'Upper Body' : 'Cardio';
    return {
      day,
      focus,
      exercises: exercisesFor(focus),
    };
  });

  const dietPlan = days.map(day => ({
    day,
    meals: {
      breakfast: { name: 'Oatmeal & Fruit', calories: Math.round(baseCalories * 0.22), description: 'Quick oats with fruit', recipe: 'Mix oats with milk and add fruit.' },
      lunch: { name: 'Lean Protein Bowl', calories: Math.round(baseCalories * 0.34), description: 'Protein with veggies and grain', recipe: 'Combine grilled protein with vegetables and rice.' },
      dinner: { name: 'Simple Stir-fry', calories: Math.round(baseCalories * 0.38), description: 'Veggies and protein', recipe: 'Stir-fry vegetables and serve with protein.' },
      snacks: { name: 'Greek Yogurt', calories: Math.round(baseCalories * 0.06), description: 'Yogurt or a small snack', recipe: 'Serve plain yogurt with a drizzle of honey.' }
    },
    dailyTotal: { calories: baseCalories, protein: '100g', carbs: '200g', fat: '60g' }
  }));

  return {
    workoutPlan,
    dietPlan,
  } as unknown as FitnessPlan;
};

export const getChatSession = () => {
  if (!ai) {
    return null;
  }
  if (!chat) {
    chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are a friendly and encouraging AI fitness coach. You provide helpful advice on workouts, nutrition, and healthy habits. Keep your answers concise and easy to understand."
      },
    });
  }
  return chat;
}

export const sendMessageToChat = async (message: string): Promise<string> => {
  const chatSession = getChatSession();
  if (!chatSession) {
    // Fallback mock response for dev when API key is not present
    return Promise.resolve("Hi — this is a local mock response. Set VITE_API_KEY to use the real chat.");
  }
  try {
    const response = await chatSession.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Error sending message to chat:", error);
    return "I'm sorry, I'm having trouble connecting right now. Please try again later.";
  }
}