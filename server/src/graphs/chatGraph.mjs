import { MessagesAnnotation, StateGraph } from '@langchain/langgraph';
import { createGeminiChatModel } from '../lib/geminiClient.mjs';
import { createGetMemberPlanTool } from '../tools/getMemberPlan.mjs';
import { createGetUpcomingReservationsTool } from '../tools/getUpcomingReservations.mjs';
import { searchExerciseVideosTool } from '../tools/searchExerciseVideos.mjs';
import { createGetMemberProgressStatsTool } from '../tools/getMemberProgressStats.mjs';

const ChatState = MessagesAnnotation;

const callModelNode = async (state, config) => {
  const configurable = config?.configurable ?? {};
  const memberId = configurable.memberId;
  const tools = [
    createGetMemberPlanTool(memberId),
    createGetMemberProgressStatsTool(memberId),
    createGetUpcomingReservationsTool(memberId),
    searchExerciseVideosTool,
  ];
  const model = createGeminiChatModel({ temperature: 0.6, maxOutputTokens: 2048 }).bindTools(tools);
  const response = await model.invoke(state.messages, {
    configurable: { memberId },
  });
  return {
    messages: [response],
  };
};

const chatGraph = new StateGraph(ChatState)
  .addNode('callModel', callModelNode)
  .addEdge('__start__', 'callModel')
  .addEdge('callModel', '__end__');

export const chatGraphApp = chatGraph.compile({ runName: 'fitness-coach-chat' });

const SYSTEM_PROMPT = `You are "AI Fitness Coach", a friendly bilingual assistant that understands Korean and English.
- Use tools when the user asks for existing plans, reservations, or exercise videos.
- Provide concise, actionable advice with safety reminders when needed.
- When sharing YouTube links, format them as bullet lists with the video title and URL.
- Keep a motivating, professional tone.`;

export const runChatGraph = async ({ memberId, message, history = [] }) => {
  if (!message) {
    throw new Error('message is required for chat.');
  }
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: message }];
  const result = await chatGraphApp.invoke(
    { messages },
    { configurable: { memberId } }
  );
  const latest = result.messages[result.messages.length - 1];
  return {
    response: latest,
    messages: result.messages,
  };
};
