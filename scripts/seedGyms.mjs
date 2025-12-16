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

const ownerId = process.argv[2];
if (!ownerId) {
  console.error('사용법: node scripts/seedGyms.mjs <ownerId>');
  process.exit(1);
}

const nowIso = new Date().toISOString();

const seoulLocations = [
  { label: '강남', address: '서울특별시 강남구 테헤란로 152', latitude: 37.498095, longitude: 127.02761 },
  { label: '서초', address: '서울특별시 서초구 반포대로 58', latitude: 37.502366, longitude: 127.01014 },
  { label: '송파', address: '서울특별시 송파구 올림픽로 300', latitude: 37.515317, longitude: 127.099041 },
  { label: '용산', address: '서울특별시 용산구 이태원로 29', latitude: 37.534508, longitude: 126.99462 },
  { label: '마포', address: '서울특별시 마포구 월드컵북로 400', latitude: 37.579621, longitude: 126.890913 },
  { label: '성동', address: '서울특별시 성동구 왕십리로 85', latitude: 37.561688, longitude: 127.038238 },
  { label: '광진', address: '서울특별시 광진구 아차산로 200', latitude: 37.538699, longitude: 127.070192 },
  { label: '영등포', address: '서울특별시 영등포구 국제금융로 8길 31', latitude: 37.525648, longitude: 126.925258 },
  { label: '노원', address: '서울특별시 노원구 동일로 1414', latitude: 37.654563, longitude: 127.060812 },
  { label: '은평', address: '서울특별시 은평구 통일로 715', latitude: 37.619005, longitude: 126.921512 },
];

const sampleAmenities = ['샤워실', '락커', '무료 Wi-Fi'];
const sampleEquipmentSets = [
  [
    { id: 'eq-cardio', name: '러닝머신', category: 'cardio', quantity: 8 },
    { id: 'eq-bike', name: '스피닝 자전거', category: 'cardio', quantity: 6 },
    { id: 'eq-rope', name: '배틀 로프', category: 'freeWeight', quantity: 4 },
  ],
  [
    { id: 'eq-squat', name: '스쿼트 랙', category: 'freeWeight', quantity: 3 },
    { id: 'eq-bench', name: '벤치 프레스', category: 'freeWeight', quantity: 4 },
    { id: 'eq-cable', name: '케이블 머신', category: 'machine', quantity: 2 },
  ],
  [
    { id: 'eq-row', name: '로잉 머신', category: 'cardio', quantity: 5 },
    { id: 'eq-legpress', name: '레그 프레스', category: 'machine', quantity: 3 },
    { id: 'eq-dumbbell', name: '덤벨 세트', category: 'freeWeight', quantity: 20 },
  ],
];

const gyms = Array.from({ length: 10 }).map((_, index) => {
  const location = seoulLocations[index % seoulLocations.length];
  const equipment = sampleEquipmentSets[index % sampleEquipmentSets.length]
    .map((item, eqIndex) => ({ ...item, id: `${item.id}-${index}-${eqIndex}` }));

  return {
    ownerId,
    name: `AI 피트니스 센터 - ${location.label}`,
    address: location.address,
    latitude: Number(location.latitude.toFixed(6)),
    longitude: Number(location.longitude.toFixed(6)),
    description: '자동으로 생성된 샘플 헬스장입니다.',
    photos: [],
    amenities: sampleAmenities,
    equipment,
    operatingHours: {
      weekdays: '06:00 - 23:00',
      weekends: '08:00 - 22:00',
      holidays: '연중무휴',
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  };
});

(async () => {
  try {
    const collectionRef = db.collection('gyms');
    await Promise.all(gyms.map(gym => collectionRef.add(gym)));
    console.log('샘플 헬스장 10개가 추가되었습니다.');
    process.exit(0);
  } catch (error) {
    console.error('헬스장 시드 작업 중 오류 발생:', error);
    process.exit(1);
  }
})();
