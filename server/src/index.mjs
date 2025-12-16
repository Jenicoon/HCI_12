import express from 'express';
import cors from 'cors';
import './lib/loadEnv.mjs';
import { runPlanGraph } from './graphs/planGraph.mjs';
import { runChatGraph } from './graphs/chatGraph.mjs';
import { searchExerciseVideos } from './tools/searchExerciseVideos.mjs';
import { fetchMemberProgressStats } from './lib/progressStats.mjs';

const PORT = process.env.PORT || 4000;
const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ?.split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

console.log('[cors] allowed origins:', allowedOrigins?.length ? allowedOrigins : '*');

app.use(
  cors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) {
        return callback(null, true);
      }
      if (!allowedOrigins?.length || allowedOrigins.includes(requestOrigin)) {
        return callback(null, true);
      }
      console.warn(`[cors] blocked origin: ${requestOrigin}`);
      return callback(new Error('Not allowed by CORS'));
    },
  }),
);
app.options('*', cors());
app.use(express.json({ limit: '2mb' }));

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, message: 'AI Fitness Coach server running' });
});

app.post('/api/coach/generate-plan', async (req, res) => {
  try {
    const { memberId, profile } = req.body ?? {};
    if (!memberId || !profile) {
      return res.status(400).json({ error: 'memberId와 profile이 모두 필요합니다.' });
    }
    const result = await runPlanGraph({ memberId, profile });
    return res.json({ plan: result.plan });
  } catch (error) {
    console.error('[generate-plan] failed:', error);
    return res.status(500).json({ error: error.message ?? '플랜 생성 중 오류가 발생했습니다.' });
  }
});

app.post('/api/coach/chat', async (req, res) => {
  try {
    const { memberId, message, history } = req.body ?? {};
    if (!message) {
      return res.status(400).json({ error: 'message 필드는 필수입니다.' });
    }
    const normalizedHistory = Array.isArray(history)
      ? history
          .filter(item => item && typeof item.role === 'string' && typeof item.content === 'string')
          .map(item => ({ role: item.role, content: item.content }))
      : [];

    const result = await runChatGraph({ memberId, message, history: normalizedHistory });
    const latestMessage = result.response;
    const textContent = Array.isArray(latestMessage.content)
      ? latestMessage.content.map(chunk => chunk.text ?? '').join('\n').trim()
      : latestMessage.content;

    return res.json({
      reply: textContent,
      messages: result.messages.map(msg => ({
        role: msg.role,
        content: Array.isArray(msg.content) ? msg.content.map(chunk => chunk.text ?? '').join('\n') : msg.content,
      })),
    });
  } catch (error) {
    console.error('[chat] failed:', error);
    return res.status(500).json({ error: error.message ?? '코치와의 대화 중 오류가 발생했습니다.' });
  }
});

app.get('/api/coach/members/:memberId/stats', async (req, res) => {
  try {
    const memberId = req.params.memberId?.trim();
    if (!memberId) {
      return res.status(400).json({ error: 'memberId 파라미터가 필요합니다.' });
    }
    const stats = await fetchMemberProgressStats(memberId);
    return res.json({ stats });
  } catch (error) {
    console.error('[member-stats] failed:', error);
    return res.status(500).json({ error: error.message ?? '회원 통계를 불러오는 중 오류가 발생했습니다.' });
  }
});

app.get('/api/coach/exercises/videos', async (req, res) => {
  try {
    const query = req.query.q?.toString();
    const maxResults = req.query.maxResults ? Number(req.query.maxResults) : undefined;
    if (!query) {
      return res.status(400).json({ error: 'q 파라미터로 검색어를 전달하세요.' });
    }
    const result = await searchExerciseVideos({ query, maxResults });
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    return res.json({ videos: result.results });
  } catch (error) {
    console.error('[exercise-videos] failed:', error);
    return res.status(500).json({ error: '운동 영상 검색 중 오류가 발생했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`AI Fitness Coach server listening on port ${PORT}`);
});
