import { DynamicTool } from '@langchain/core/tools';
import { Timestamp } from 'firebase-admin/firestore';
import { getDb } from '../lib/firebaseAdmin.mjs';

export const createGetUpcomingReservationsTool = memberId => {
  return new DynamicTool({
    name: 'get_upcoming_reservations',
    description: '회원의 다가오는 기구 예약 목록을 조회합니다. 일정이 없으면 "예약 없음"이라고 알려주세요.',
    func: async () => {
      if (!memberId) {
        return '회원 정보를 찾을 수 없습니다.';
      }
      const db = getDb();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const snapshot = await db
        .collection('reservations')
        .where('memberId', '==', memberId)
        .where('date', '>=', Timestamp.fromDate(today))
        .orderBy('date', 'asc')
        .orderBy('timeSlot', 'asc')
        .get();

      if (snapshot.empty) {
        return '다가오는 예약이 없습니다.';
      }

      const lines = snapshot.docs.map(doc => {
        const data = doc.data();
        const date = data.date?.toDate?.() ?? new Date(data.date);
        const formattedDate = date.toISOString().split('T')[0];
        return `${formattedDate} ${data.timeSlot} - ${data.gymId} (${data.equipmentId})`;
      });

      return lines.join('\n');
    },
  });
};
