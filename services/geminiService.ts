
import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { UserProfile, FitnessPlan } from '../types';

// Vite exposes env vars via import.meta.env (must be prefixed with VITE_)
const API_KEY: string | undefined = (import.meta as any).env?.VITE_API_KEY;

// Initialize client only if key exists; avoid throwing at module load time
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

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
  // Return fallback plan if API key is missing
  if (!API_KEY || !ai) {
    return getFallbackPlan();
  }
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
    // Return fallback instead of throwing
    return getFallbackPlan();
  }
};

let chat: Chat | null = null;

export const getChatSession = () => {
    if (!API_KEY || !ai) {
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
        return "Chat is not available. Please set up your API key.";
    }
    try {
        const response = await chatSession.sendMessage({ message });
        return response.text;
    } catch (error) {
        console.error("Error sending message to chat:", error);
        return "I'm sorry, I'm having trouble connecting right now. Please try again later.";
    }
}

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