import { DynamicTool } from '@langchain/core/tools';
import { getDb } from '../lib/firebaseAdmin.mjs';

export const createGetMemberPlanTool = memberId => {
  return new DynamicTool({
    name: 'get_member_plan',
    description: '사용자의 최신 운동/식단 플랜을 Firestore에서 가져옵니다. 플랜이 없으면 빈 응답을 반환하세요.',
    func: async () => {
      if (!memberId) {
        return '회원 정보를 찾을 수 없습니다.';
      }
      const db = getDb();
      const snapshot = await db.collection('plans').doc(memberId).get();
      if (!snapshot.exists) {
        return '저장된 플랜이 없습니다.';
      }
      const data = snapshot.data();
      return JSON.stringify(data.plan ?? {});
    },
  });
};
