import { DynamicTool } from '@langchain/core/tools';
import { fetchMemberProgressStats } from '../lib/progressStats.mjs';

export const createGetMemberProgressStatsTool = memberId =>
  new DynamicTool({
    name: 'get_member_progress_stats',
    description:
      '회원의 체성분 기록과 운동 로그를 분석하여 최근 추세를 요약합니다. 통계를 바탕으로 동기 부여 메시지를 작성할 때 활용하세요.',
    func: async () => {
      if (!memberId) {
        return '회원 정보를 찾을 수 없습니다.';
      }
      const stats = await fetchMemberProgressStats(memberId);
      return JSON.stringify(stats);
    },
  });
