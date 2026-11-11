import { getAccessToken } from './auth';

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export interface LinkCode {
  linkId: string;
  code: string;
  expiresAt: string;
}

export type WearableDay = {
  date: string;
  source: 'apple' | 'health_connect' | 'samsung_sdk';
  steps: number | null;
  sleepMinutes: number | null;
  activeMinutes: number | null;
  restingHr: number | null;
} & Partial<Record<SamsungMetricKey, number | null>>;

// Daily numbers only Samsung Health gives (source samsung_sdk), in Samsung's units.
// Same keys and order as the app (Metric.samsung) and the backend (SAMSUNG_METRICS).
// kind: clock = minutes after midnight shown as HH:mm; signs = Samsung's own check, 1 = signs found, 0 = none.
export const SAMSUNG_METRICS = [
  // Sleep
  { key: 'sleepScore', label: 'Sleep score', unit: '', decimals: 0, kind: 'number' },
  { key: 'sleepLightMinutes', label: 'Light sleep', unit: 'min', decimals: 0, kind: 'number' },
  { key: 'sleepDeepMinutes', label: 'Deep sleep', unit: 'min', decimals: 0, kind: 'number' },
  { key: 'sleepRemMinutes', label: 'REM sleep', unit: 'min', decimals: 0, kind: 'number' },
  { key: 'sleepAwakeMinutes', label: 'Awake in sleep', unit: 'min', decimals: 0, kind: 'number' },
  { key: 'skinTempMin', label: 'Skin temp. in sleep (lowest)', unit: '°C', decimals: 1, kind: 'number' },
  { key: 'skinTempMax', label: 'Skin temp. in sleep (highest)', unit: '°C', decimals: 1, kind: 'number' },
  { key: 'sleepApnea', label: 'Sleep apnea check (Samsung)', unit: '', decimals: 0, kind: 'signs' },
  // Heart
  { key: 'heartRateMin', label: 'Heart rate (lowest)', unit: 'bpm', decimals: 0, kind: 'number' },
  { key: 'heartRateMax', label: 'Heart rate (highest)', unit: 'bpm', decimals: 0, kind: 'number' },
  { key: 'irregularRhythmAlerts', label: 'Irregular rhythm alerts (Samsung)', unit: '', decimals: 0, kind: 'number' },
  { key: 'spo2Min', label: 'Blood oxygen (lowest)', unit: '%', decimals: 0, kind: 'number' },
  { key: 'spo2Max', label: 'Blood oxygen (highest)', unit: '%', decimals: 0, kind: 'number' },
  // 12_워치입력 W06: the app's own average of every reading taken during that night's sleep.
  { key: 'spo2Night', label: 'Blood oxygen (night average)', unit: '%', decimals: 1, kind: 'number' },
  // Activity
  { key: 'activeTimeMinutes', label: 'Active time', unit: 'min', decimals: 0, kind: 'number' },
  { key: 'activeCalories', label: 'Active calories', unit: 'kcal', decimals: 0, kind: 'number' },
  { key: 'totalCalories', label: 'Calories burned', unit: 'kcal', decimals: 0, kind: 'number' },
  { key: 'distanceMeters', label: 'Distance', unit: 'm', decimals: 0, kind: 'number' },
  { key: 'floors', label: 'Floors climbed', unit: '', decimals: 0, kind: 'number' },
  { key: 'energyScore', label: 'Energy score', unit: '', decimals: 0, kind: 'number' },
  { key: 'exerciseSessions', label: 'Workouts', unit: '', decimals: 0, kind: 'number' },
  { key: 'exerciseCalories', label: 'Workout calories', unit: 'kcal', decimals: 0, kind: 'number' },
  { key: 'exerciseDistanceMeters', label: 'Workout distance', unit: 'm', decimals: 0, kind: 'number' },
  { key: 'exerciseMaxHr', label: 'Workout heart rate (highest)', unit: 'bpm', decimals: 0, kind: 'number' },
  { key: 'vo2Max', label: 'VO2 max', unit: 'mL/kg/min', decimals: 1, kind: 'number' },
  // Measurements
  { key: 'systolic', label: 'Blood pressure (systolic)', unit: 'mmHg', decimals: 0, kind: 'number' },
  { key: 'diastolic', label: 'Blood pressure (diastolic)', unit: 'mmHg', decimals: 0, kind: 'number' },
  { key: 'meanBloodPressure', label: 'Blood pressure (mean)', unit: 'mmHg', decimals: 0, kind: 'number' },
  { key: 'pulseRate', label: 'Pulse with blood pressure', unit: 'bpm', decimals: 0, kind: 'number' },
  { key: 'bloodGlucose', label: 'Blood glucose', unit: 'mmol/L', decimals: 1, kind: 'number' },
  { key: 'bodyTemperature', label: 'Body temperature', unit: '°C', decimals: 1, kind: 'number' },
  // Body composition
  { key: 'weightKg', label: 'Weight', unit: 'kg', decimals: 1, kind: 'number' },
  { key: 'heightCm', label: 'Height', unit: 'cm', decimals: 1, kind: 'number' },
  { key: 'bmi', label: 'BMI', unit: '', decimals: 1, kind: 'number' },
  { key: 'bodyFatPercent', label: 'Body fat', unit: '%', decimals: 1, kind: 'number' },
  { key: 'bodyFatMassKg', label: 'Body fat mass', unit: 'kg', decimals: 1, kind: 'number' },
  { key: 'fatFreePercent', label: 'Fat-free mass', unit: '%', decimals: 1, kind: 'number' },
  { key: 'fatFreeMassKg', label: 'Fat-free mass', unit: 'kg', decimals: 1, kind: 'number' },
  { key: 'skeletalMusclePercent', label: 'Skeletal muscle', unit: '%', decimals: 1, kind: 'number' },
  { key: 'skeletalMuscleKg', label: 'Skeletal muscle', unit: 'kg', decimals: 1, kind: 'number' },
  { key: 'muscleMassPercent', label: 'Muscle mass', unit: '%', decimals: 1, kind: 'number' },
  { key: 'bodyWaterL', label: 'Body water', unit: 'L', decimals: 1, kind: 'number' },
  { key: 'bmr', label: 'BMR', unit: 'kcal/day', decimals: 0, kind: 'number' },
  // Food and water
  { key: 'waterMl', label: 'Water', unit: 'mL', decimals: 0, kind: 'number' },
  { key: 'foodCalories', label: 'Food', unit: 'kcal', decimals: 0, kind: 'number' },
  { key: 'proteinG', label: 'Protein', unit: 'g', decimals: 1, kind: 'number' },
  { key: 'carbsG', label: 'Carbohydrate', unit: 'g', decimals: 1, kind: 'number' },
  { key: 'sugarG', label: 'Sugar', unit: 'g', decimals: 1, kind: 'number' },
  { key: 'fiberG', label: 'Dietary fiber', unit: 'g', decimals: 1, kind: 'number' },
  { key: 'fatG', label: 'Fat', unit: 'g', decimals: 1, kind: 'number' },
  { key: 'saturatedFatG', label: 'Saturated fat', unit: 'g', decimals: 1, kind: 'number' },
  { key: 'monounsaturatedFatG', label: 'Monounsaturated fat', unit: 'g', decimals: 1, kind: 'number' },
  { key: 'polyunsaturatedFatG', label: 'Polyunsaturated fat', unit: 'g', decimals: 1, kind: 'number' },
  { key: 'transFatG', label: 'Trans fat', unit: 'g', decimals: 1, kind: 'number' },
  { key: 'cholesterolMg', label: 'Cholesterol', unit: 'mg', decimals: 0, kind: 'number' },
  { key: 'sodiumMg', label: 'Sodium', unit: 'mg', decimals: 0, kind: 'number' },
  { key: 'potassiumMg', label: 'Potassium', unit: 'mg', decimals: 0, kind: 'number' },
  { key: 'calciumMg', label: 'Calcium', unit: 'mg', decimals: 0, kind: 'number' },
  { key: 'ironMg', label: 'Iron', unit: 'mg', decimals: 1, kind: 'number' },
  { key: 'vitaminAUg', label: 'Vitamin A', unit: 'µg', decimals: 0, kind: 'number' },
  { key: 'vitaminCMg', label: 'Vitamin C', unit: 'mg', decimals: 0, kind: 'number' },
  // Goals set in Samsung Health
  { key: 'stepsGoal', label: 'Steps goal', unit: 'steps', decimals: 0, kind: 'number' },
  { key: 'activeTimeGoalMinutes', label: 'Active time goal', unit: 'min', decimals: 0, kind: 'number' },
  { key: 'activeCaloriesGoal', label: 'Active calories goal', unit: 'kcal', decimals: 0, kind: 'number' },
  { key: 'waterGoalMl', label: 'Water goal', unit: 'mL', decimals: 0, kind: 'number' },
  { key: 'foodCaloriesGoal', label: 'Food calories goal', unit: 'kcal', decimals: 0, kind: 'number' },
  { key: 'sleepGoalBedtime', label: 'Bedtime goal', unit: '', decimals: 0, kind: 'clock' },
  { key: 'sleepGoalWakeTime', label: 'Wake-up goal', unit: '', decimals: 0, kind: 'clock' },
] as const;

export type SamsungMetricKey = (typeof SAMSUNG_METRICS)[number]['key'];

export function formatSamsungMetric(m: (typeof SAMSUNG_METRICS)[number], v: number): string {
  if (m.kind === 'clock') return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
  if (m.kind === 'signs') return v > 0 ? 'Signs found' : 'No signs found';
  return `${v.toFixed(m.decimals)}${m.unit ? ` ${m.unit}` : ''}`;
}

// Samsung Health's user profile (nickname is not read).
export interface SamsungProfile {
  birthDate: string | null;
  gender: 'male' | 'female' | null;
  heightCm: number | null;
  weightKg: number | null;
}

export interface LinkStatus {
  linked: boolean;
  platform: WearableDay['source'] | null;
  linkedAt: string | null;
  unlinkedAt: string | null;
  lastSyncAt: string | null;
  samsungProfile: SamsungProfile | null;
  days: WearableDay[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}/wearables/${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// The link belongs to the logged-in member, so the watch data joins their quiz and checkups.
export async function createLinkCode() {
  const token = await getAccessToken();
  if (!token) throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.');
  return request<LinkCode>('link-code', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
}
export const fetchLinkStatus = (linkId: string) => request<LinkStatus>(linkId, { cache: 'no-store' });
