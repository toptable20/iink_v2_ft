const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export type Answers = Record<string, number>;

export interface NextStep {
  done: boolean;
  progress: number;
  question?: {
    id: string;
    text: string;
    options: string[] | null;
    numeric: { min: number; max: number; unit: string } | null;
  };
}

export interface NutrientConsumption {
  key: string;
  // energy, macro or vitamin; null on results saved before algorithm 2.0.0.
  group: 'energy' | 'macro' | 'vitamin' | null;
  label: string;
  labelKo: string;
  unit: string;
  dailyAmount: number;
  sources: { questionId: string; food: string; sharePercent: number }[];
}

export type TopicLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TopicScore {
  key: string;
  label: string;
  labelKo: string;
  // How much attention the topic needs. Null when nothing could be measured, or on results saved before 2.0.0.
  level: TopicLevel | null;
  // The same in 1–5 steps, for the diagram bar only.
  diagramLevel: number | null;
  reasons: { feature: string; attentionPercent: number }[];
}

export interface Profile {
  sex: string | null;
  sexLabel: string | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  bmiBand: { key: string; label: string; labelKo: string } | null;
}

export interface Report {
  // Null on results saved before algorithm 2.0.0.
  profile: Profile | null;
  consumption: { nutrients: NutrientConsumption[]; notes: string[] };
  topics: { topics: TopicScore[]; notes: string[] };
  safety: { questionId: string; question: string; answer: string; needsReview: boolean }[];
}

async function post<T>(path: string, answers: Answers): Promise<T> {
  const res = await fetch(`${API}/quiz/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const fetchNext = (answers: Answers) => post<NextStep>('next', answers);
export const fetchReport = (answers: Answers) => post<Report>('report', answers);
