const rawApiBase = ((import.meta as any).env?.VITE_COACH_API_URL as string | undefined)?.trim();
const API_BASE = rawApiBase ? rawApiBase.replace(/\/$/, '') : '';
const buildUrl = (path: string) => `${API_BASE}${path}`;

export interface ExerciseVideo {
  title: string;
  channel: string;
  url: string | null;
  description?: string;
}

export const fetchExerciseVideos = async (query: string, maxResults = 3): Promise<ExerciseVideo[]> => {
  if (!query.trim()) {
    return [];
  }
  const response = await fetch(
    `${buildUrl('/api/coach/exercises/videos')}?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || '운동 영상을 불러오지 못했습니다.');
  }
  const payload = await response.json();
  return (payload?.videos ?? []) as ExerciseVideo[];
};
