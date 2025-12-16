import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = resolve(__dirname, '../.secrets/serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('서비스 계정 키가 없습니다. 다음 위치에 JSON 파일을 저장하세요:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const memberId = process.argv[2];
if (!memberId) {
  console.error('사용법: node scripts/seedMemberProgress.mjs <memberId>');
  process.exit(1);
}

const isoDaysAgo = daysAgo => {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString();
};

const progressEntries = [
  { label: 'Week 1', weight: 78.2, bodyFat: 24.5, muscleMass: 32.1, recordedAt: isoDaysAgo(42) },
  { label: 'Week 2', weight: 77.4, bodyFat: 23.9, muscleMass: 32.6, recordedAt: isoDaysAgo(35) },
  { label: 'Week 3', weight: 76.8, bodyFat: 23.5, muscleMass: 33.0, recordedAt: isoDaysAgo(28) },
  { label: 'Week 4', weight: 76.1, bodyFat: 22.8, muscleMass: 33.4, recordedAt: isoDaysAgo(21) },
  { label: 'Week 5', weight: 75.3, bodyFat: 22.1, muscleMass: 33.9, recordedAt: isoDaysAgo(14) },
  { label: 'Week 6', weight: 74.8, bodyFat: 21.7, muscleMass: 34.2, recordedAt: isoDaysAgo(7) },
];

const workoutSeeds = [
  {
    weekLabel: 'Week of May 6',
    daysAgoStart: 25,
    sessions: [
      { day: 'Monday', focus: 'Lower Body Strength', completed: true },
      { day: 'Tuesday', focus: 'Mobility & Core', completed: true },
      { day: 'Thursday', focus: 'Upper Body Strength', completed: true },
      { day: 'Saturday', focus: 'Active Recovery', completed: true },
    ],
  },
  {
    weekLabel: 'Week of May 13',
    daysAgoStart: 18,
    sessions: [
      { day: 'Monday', focus: 'Lower Body Strength', completed: true },
      { day: 'Wednesday', focus: 'HIIT Conditioning', completed: true },
      { day: 'Friday', focus: 'Upper Body Power', completed: true },
      { day: 'Sunday', focus: 'Mobility Reset', completed: false },
    ],
  },
  {
    weekLabel: 'Week of May 20',
    daysAgoStart: 11,
    sessions: [
      { day: 'Monday', focus: 'Lower Body Strength', completed: true },
      { day: 'Tuesday', focus: 'Zone 2 Cardio', completed: true },
      { day: 'Thursday', focus: 'Upper Body Strength', completed: true },
      { day: 'Saturday', focus: 'Active Recovery', completed: true },
    ],
  },
  {
    weekLabel: 'Week of May 27',
    daysAgoStart: 4,
    sessions: [
      { day: 'Monday', focus: 'Lower Body Strength', completed: true },
      { day: 'Wednesday', focus: 'Core & Mobility', completed: true },
      { day: 'Friday', focus: 'Upper Body Hypertrophy', completed: true },
    ],
  },
];

const generateWorkoutLogs = () => {
  const logs = [];
  for (const seed of workoutSeeds) {
    seed.sessions.forEach((session, index) => {
      const daysAgo = seed.daysAgoStart - index * 2;
      const createdAt = isoDaysAgo(daysAgo);
      logs.push({
        weekLabel: seed.weekLabel,
        day: session.day,
        focus: session.focus,
        completed: session.completed,
        createdAt,
        completedAt: session.completed ? createdAt : null,
      });
    });
  }
  // 최근 세션이 먼저 오도록 정렬
  return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const progressCollection = db.collection('users').doc(memberId).collection('progressEntries');
const workoutCollection = db.collection('users').doc(memberId).collection('workoutLogs');

(async () => {
  try {
    const batch = db.batch();

    progressEntries.forEach((entry, index) => {
      const docRef = progressCollection.doc(`progress-week-${index + 1}`);
      batch.set(docRef, entry, { merge: true });
    });

    const workoutLogs = generateWorkoutLogs();
    workoutLogs.forEach((log, index) => {
      const docRef = workoutCollection.doc(`workout-${index + 1}`);
      batch.set(docRef, log, { merge: true });
    });

    await batch.commit();
    console.log(`회원 ${memberId}에 대한 체성분과 운동 로그 샘플 데이터가 추가되었습니다.`);
    process.exit(0);
  } catch (error) {
    console.error('샘플 데이터 시드 중 오류가 발생했습니다:', error);
    process.exit(1);
  }
})();
