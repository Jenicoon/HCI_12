import { getDb } from './firebaseAdmin.mjs';

const parseNumber = value => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const safeDate = value => {
  try {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
    return null;
  } catch (_error) {
    return null;
  }
};

const summarizeProgress = entries => {
  if (entries.length === 0) {
    return {
      startWeight: null,
      latestWeight: null,
      weightDelta: null,
      averageBodyFat: null,
      averageMuscleMass: null,
    };
  }

  const startWeight = entries[0].weight ?? null;
  const latestWeight = entries[entries.length - 1].weight ?? null;
  const weightDelta = startWeight != null && latestWeight != null ? Number((latestWeight - startWeight).toFixed(1)) : null;

  const bodyFatValues = entries.map(entry => entry.bodyFat).filter(value => typeof value === 'number');
  const averageBodyFat = bodyFatValues.length > 0 ? Number((bodyFatValues.reduce((sum, val) => sum + val, 0) / bodyFatValues.length).toFixed(1)) : null;

  const muscleValues = entries.map(entry => entry.muscleMass).filter(value => typeof value === 'number');
  const averageMuscleMass = muscleValues.length > 0 ? Number((muscleValues.reduce((sum, val) => sum + val, 0) / muscleValues.length).toFixed(1)) : null;

  return {
    startWeight,
    latestWeight,
    weightDelta,
    averageBodyFat,
    averageMuscleMass,
  };
};

const summarizeWorkouts = logs => {
  if (logs.length === 0) {
    return {
      totalSessions: 0,
      completedSessions: 0,
      completionRate: 0,
      recentStreak: 0,
      weekBreakdown: [],
    };
  }

  const totalSessions = logs.length;
  const completedSessions = logs.filter(log => log.completed).length;
  const completionRate = totalSessions > 0 ? Number(((completedSessions / totalSessions) * 100).toFixed(1)) : 0;

  let recentStreak = 0;
  for (const log of logs) {
    if (log.completed) {
      recentStreak += 1;
    } else {
      break;
    }
  }

  const weekStats = logs.reduce((acc, log) => {
    const key = log.weekLabel ?? 'Recent';
    if (!acc[key]) {
      acc[key] = { total: 0, completed: 0 };
    }
    acc[key].total += 1;
    if (log.completed) {
      acc[key].completed += 1;
    }
    return acc;
  }, {});

  const weekBreakdown = Object.entries(weekStats).map(([weekLabel, stats]) => ({
    weekLabel,
    total: stats.total,
    completed: stats.completed,
    completionRate: stats.total > 0 ? Number(((stats.completed / stats.total) * 100).toFixed(1)) : 0,
  }));

  return {
    totalSessions,
    completedSessions,
    completionRate,
    recentStreak,
    weekBreakdown,
  };
};

export const fetchMemberProgressStats = async memberId => {
  if (!memberId) {
    throw new Error('memberId is required to fetch progress stats');
  }

  const db = getDb();
  const userRef = db.collection('users').doc(memberId);

  const [progressSnapshot, workoutSnapshot] = await Promise.all([
    userRef.collection('progressEntries').orderBy('recordedAt', 'asc').get(),
    userRef.collection('workoutLogs').orderBy('createdAt', 'desc').get(),
  ]);

  const progressEntries = progressSnapshot.docs.map(doc => {
    const data = doc.data() ?? {};
    return {
      id: doc.id,
      label: data.label ?? 'Progress',
      weight: parseNumber(data.weight),
      bodyFat: parseNumber(data.bodyFat),
      muscleMass: parseNumber(data.muscleMass),
      recordedAt: safeDate(data.recordedAt) ?? new Date().toISOString(),
    };
  });

  const workoutLogsDesc = workoutSnapshot.docs.map(doc => {
    const data = doc.data() ?? {};
    return {
      id: doc.id,
      weekLabel: data.weekLabel ?? 'Week',
      day: data.day ?? 'Day',
      focus: data.focus ?? 'Workout',
      completed: Boolean(data.completed),
      completedAt: safeDate(data.completedAt),
      createdAt: safeDate(data.createdAt) ?? new Date().toISOString(),
    };
  });

  const workoutLogs = [...workoutLogsDesc].sort((a, b) => {
    const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bDate - aDate;
  });

  const progressSummary = summarizeProgress(progressEntries);
  const workoutSummary = summarizeWorkouts(workoutLogs);

  return {
    memberId,
    progressEntries,
    progressSummary,
    workoutLogs,
    workoutSummary,
  };
};
