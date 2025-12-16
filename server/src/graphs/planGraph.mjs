import { Annotation, StateGraph } from '@langchain/langgraph';
import { z } from 'zod';
import { createGeminiChatModel } from '../lib/geminiClient.mjs';
import { FitnessPlanSchema } from '../schemas/fitnessPlanSchema.mjs';
import { UserProfileSchema } from '../schemas/userProfileSchema.mjs';
import { getDb } from '../lib/firebaseAdmin.mjs';

const PlanState = Annotation.Root({
  memberId: Annotation(),
  profile: Annotation(),
  prompt: Annotation(),
  plan: Annotation(),
});

const goalLabels = {
  weightLoss: 'Weight Loss',
  muscleGain: 'Muscle Gain',
  rehab: 'Rehabilitation & Mobility',
};

const sanitizeProfileNode = async state => {
  const profileInput = state.profile ?? {};
  const parsed = UserProfileSchema.parse({
    ...profileInput,
    goal: String(profileInput.goal ?? 'weightLoss').trim(),
    healthConditions: profileInput.healthConditions?.trim() || undefined,
    availableEquipment: profileInput.availableEquipment?.trim() || undefined,
  });

  return { profile: parsed };
};

const buildPromptNode = async state => {
  const profile = state.profile;
  const goalLabel = goalLabels[profile.goal] ?? profile.goal;
  const prompt = [
    `Primary Goal: ${goalLabel}`,
    `Height: ${profile.height} cm`,
    `Weight: ${profile.weight} kg`,
    `Body Fat: ${profile.bodyFat ?? 'Not provided'}%`,
    `Health Considerations: ${profile.healthConditions ?? 'None'}`,
    `Workout Preference: ${profile.workoutPreference === 'home' ? 'At home' : 'At the gym'}`,
    `Equipment: ${profile.availableEquipment ?? 'Basic bodyweight'}`,
  ].join('\n');

  return {
    prompt,
  };
};

const generatePlanNode = async state => {
  const model = createGeminiChatModel({ temperature: 0.4, maxOutputTokens: 6000 });
  const structuredModel = model.withStructuredOutput(FitnessPlanSchema);

  const systemInstruction = `You are an experienced bilingual (Korean & English) fitness coach.
Respond with a JSON object matching the provided schema.
Keep workouts safe based on the user's health conditions, include rest days, and ensure diets align with the goal.`;

  const response = await structuredModel.invoke([
    { role: 'system', content: systemInstruction },
    { role: 'user', content: `사용자 프로필 정보입니다:\n${state.prompt}\n위 정보를 토대로 7일 운동/식단 플랜을 JSON 형식으로 생성하세요.` },
  ]);

  const plan = FitnessPlanSchema.parse(response);

  return {
    plan,
  };
};

const persistPlanNode = async state => {
  const db = getDb();
  const memberId = state.memberId;
  const docRef = db.collection('plans').doc(memberId);
  const payload = {
    plan: state.plan,
    updatedAt: new Date().toISOString(),
  };
  await docRef.set(payload, { merge: true });
  return {};
};

const graph = new StateGraph(PlanState)
  .addNode('sanitizeProfile', sanitizeProfileNode)
  .addNode('buildPrompt', buildPromptNode)
  .addNode('generatePlan', generatePlanNode)
  .addNode('persistPlan', persistPlanNode)
  .addEdge('__start__', 'sanitizeProfile')
  .addEdge('sanitizeProfile', 'buildPrompt')
  .addEdge('buildPrompt', 'generatePlan')
  .addEdge('generatePlan', 'persistPlan')
  .addEdge('persistPlan', '__end__');

export const planGraphApp = graph.compile({ runName: 'plan-generation-graph' });

export const runPlanGraph = async ({ memberId, profile }) => {
  if (!memberId) {
    throw new Error('memberId is required to generate a plan.');
  }
  const result = await planGraphApp.invoke({ memberId, profile });
  return { plan: result.plan };
};
