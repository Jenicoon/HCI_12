

import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { UserProfile, FitnessPlan } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

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

let chat: Chat | null = null;

export const getChatSession = () => {
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
    try {
        const response = await chatSession.sendMessage({ message });
        return response.text;
    } catch (error) {
        console.error("Error sending message to chat:", error);
        return "I'm sorry, I'm having trouble connecting right now. Please try again later.";
    }
}