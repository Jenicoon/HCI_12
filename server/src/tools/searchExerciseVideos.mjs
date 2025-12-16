import fetch from 'node-fetch';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import '../lib/loadEnv.mjs';

const { YOUTUBE_API_KEY } = process.env;

if (!YOUTUBE_API_KEY) {
  console.warn('[youtube] YOUTUBE_API_KEY 가 설정되지 않았습니다. 운동 영상 검색 기능이 제한됩니다.');
}

export const searchExerciseVideos = async ({ query, maxResults = 3, language = 'ko' }) => {
  if (!YOUTUBE_API_KEY) {
    return { error: 'YouTube API 키가 없어 영상을 검색할 수 없습니다. 관리자에게 문의하세요.' };
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('q', query);
  url.searchParams.set('relevanceLanguage', language);
  url.searchParams.set('key', YOUTUBE_API_KEY);

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    return { error: `YouTube 검색 실패 (${response.status}): ${text}` };
  }

  const payload = await response.json();
  if (!payload.items?.length) {
    return { error: '검색 결과가 없습니다. 다른 키워드로 다시 시도해 주세요.' };
  }

  const results = payload.items.map(item => {
    const title = item.snippet?.title ?? '제목 없음';
    const channel = item.snippet?.channelTitle ?? '채널 정보 없음';
    const videoId = item.id?.videoId;
    const url = videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
    return {
      title,
      channel,
      url,
      description: item.snippet?.description ?? '',
      thumbnails: item.snippet?.thumbnails ?? null,
    };
  });

  return { results };
};

export const searchExerciseVideosTool = new DynamicStructuredTool({
  name: 'search_exercise_videos',
  description: '사용자가 특정 운동 방법을 묻거나 동영상 예시를 요청할 때 YouTube 에서 관련 영상을 찾아 링크를 제공합니다.',
  schema: z.object({
    query: z.string().describe('찾고 싶은 운동 또는 동작 이름. 예: "데드리프트 운동법"'),
    maxResults: z.number().int().min(1).max(5).default(3).optional(),
    language: z.string().describe('검색 언어 코드. 기본값은 ko').optional(),
  }),
  func: async ({ query, maxResults = 3, language = 'ko' }) => {
    const response = await searchExerciseVideos({ query, maxResults, language });
    if (response.error) {
      return response.error;
    }
    return response.results
      .map(item => `${item.title} (${item.channel})\n${item.url ?? '링크 없음'}`)
      .join('\n\n');
  },
});
