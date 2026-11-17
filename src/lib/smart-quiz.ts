import { gql } from './quiz-session';

// V9 Smart Quiz (backend: smart-quiz). Choice answers send the CODE = option index + 1.

export interface SmartQuizQuestion {
  id: string;
  text: string;
  options: string[] | null;
  numeric: { min: number; max: number; unit: string } | null;
}

export interface SmartQuizStep {
  done: boolean;
  progress: number;
  question: SmartQuizQuestion | null;
}

export interface SmartQuizTopic {
  topic: string;
  displayLevel: string;
  levelNote: string;
  score: number | null;
  confidence: string;
  sourcesUsed: string;
  floorReason: string;
  stage: string;
}

export interface SmartQuizTopNutrient {
  rank: number;
  name: string;
  correctedNeed: number;
  mainTopic: string | null;
  perServing: number;
  supplied: number | null;
  suppliedText: string | null;
  unit: string;
}

// One of the engine's nutrients (Excel 42_영양소요구량): every nutrient in the config, not only the Top 5.
// correctedNeed 0–1 (보정 요구지수), target = daily target (0 when the need is under the Excel's supply line), rni = KDRI.
export interface SmartQuizNutrient {
  name: string;
  unit: string;
  correctedNeed: number;
  target: number;
  rni: number;
  // 24_설문영양소섭취지수 (0–100); null for minerals (the sheet has none) or when N01–N07 are not all answered
  intakeIndex: number | null;
}

// One row of 24_설문영양소섭취지수: relative intake index 0–100 (not an amount, not % of the recommended amount)
export interface SmartQuizIntakeIndex {
  key: string;
  value: number | null;
  // question ids (N01–N07) adding the most to this row for this user, top 2 (null on older results)
  sources?: string[] | null;
}

export interface SmartQuizInk {
  id: string;
  name: string;
  g: number;
  ml: number;
  note: string;
}

export interface SmartQuizProduct {
  offered1: string;
  offered2: string;
  combined: boolean;
  plan: string;
  lineupText: string;
}

// One checkup / watch item (Excel 11_검진입력 / 12_워치입력): 유효 / 미입력 / 범위 밖 / 검진 만료 / 측정일수 부족
export interface SmartQuizMeasuredRow {
  id: string;
  name: string;
  unit: string;
  value: number | null;
  days: number | null;
  status: string;
}

export interface SmartQuizResult {
  _id: string;
  // the quiz attempt it came from: an update makes a new result from the same attempt
  sessionId: string;
  createdAt: string;
  evalDate: string;
  // the member's newest result: only this one offers the product, the 28-day plan and an order
  isLatest: boolean;
  usedSources: string[];
  usedSourcesLabel: string;
  previousResultId: string | null;
  changesFromPrevious: { topic: string; from: string; to: string }[];
  result: {
    status: string;
    notice: string;
    bmi?: number | null;
    bmiSource?: string | null;
    // checkup / watch items as received; status 유효 = used (null on older results)
    measured?: { checkup: SmartQuizMeasuredRow[]; watch: SmartQuizMeasuredRow[] } | null;
    // report header: sex, age, the height / weight the BMI used, BMI cut-offs (null on older results)
    profile?: {
      sex: string | null;
      age: number | null;
      heightCm: number | null;
      weightKg: number | null;
      bmiCut: { low: number | null; border: number | null; high: number | null };
    } | null;
    topics: SmartQuizTopic[];
    topNutrientRows: SmartQuizTopNutrient[];
    nutrients: SmartQuizNutrient[];
    // every row of sheet 24 (carbs, fat, vitamin K… too); null on results saved before 2026-11-17
    intakeIndexes?: SmartQuizIntakeIndex[] | null;
    // names of the Excel Top-5 priority nutrients (02_결과요약 A18:A22)
    topNutrients: string[];
    ink: SmartQuizInk[];
    inkTotalG: number;
    product: SmartQuizProduct;
  };
  sources: {
    quizAnswers: number;
    checkup: { status: string; origin: string | null; source: string | null; year: string | null; examDate: string | null };
    watch: { from: string; to: string; items: { key: string; status: string; days: number }[] };
  };
}

export interface SmartQuizState {
  sessionId: string;
  answeredCount: number;
  step: SmartQuizStep;
  result: SmartQuizResult | null;
  lastAnswerValue: number | null;
}

interface RawState {
  session: { _id: string; answers: { questionId: string }[] };
  step: SmartQuizStep;
  result: SmartQuizResult | null;
  lastAnswerValue: number | null;
}

export const RESULT_FIELDS = `_id sessionId createdAt evalDate isLatest usedSources usedSourcesLabel previousResultId
  changesFromPrevious { topic from to }
  result {
    status notice bmi bmiSource
    measured { checkup { id name unit value days status } watch { id name unit value days status } }
    profile { sex age heightCm weightKg bmiCut { low border high } }
    topics { topic displayLevel levelNote score confidence sourcesUsed floorReason stage }
    topNutrientRows { rank name correctedNeed mainTopic perServing supplied suppliedText unit }
    nutrients { name unit correctedNeed target rni intakeIndex }
    intakeIndexes { key value sources }
    topNutrients
    ink { id name g ml note }
    inkTotalG
    product { offered1 offered2 combined plan lineupText }
  }
  sources { quizAnswers checkup { status origin source year examDate } watch { from to items { key status days } } }`;

const STATE_FIELDS = `session { _id answers { questionId } }
  step { done progress question { id text options numeric { min max unit } } }
  result { ${RESULT_FIELDS} }
  lastAnswerValue`;

const toState = (raw: RawState): SmartQuizState => ({
  sessionId: raw.session._id,
  answeredCount: raw.session.answers.length,
  step: raw.step,
  result: raw.result,
  lastAnswerValue: raw.lastAnswerValue,
});

export async function startSmartQuiz(): Promise<SmartQuizState> {
  const data = await gql<{ startSmartQuiz: RawState }>(`mutation { startSmartQuiz { ${STATE_FIELDS} } }`);
  return toState(data.startSmartQuiz);
}

export async function restartSmartQuiz(): Promise<SmartQuizState> {
  const data = await gql<{ restartSmartQuiz: RawState }>(`mutation { restartSmartQuiz { ${STATE_FIELDS} } }`);
  return toState(data.restartSmartQuiz);
}

export async function answerSmartQuiz(sessionId: string, questionId: string, value: number): Promise<SmartQuizState> {
  const data = await gql<{ answerSmartQuiz: RawState }>(
    `mutation Answer($input: SmartQuizAnswerInput!) { answerSmartQuiz(input: $input) { ${STATE_FIELDS} } }`,
    { input: { sessionId, questionId, value } },
  );
  return toState(data.answerSmartQuiz);
}

export async function undoSmartQuiz(sessionId: string): Promise<SmartQuizState> {
  const data = await gql<{ undoSmartQuiz: RawState }>(
    `mutation Undo($sessionId: String!) { undoSmartQuiz(sessionId: $sessionId) { ${STATE_FIELDS} } }`,
    { sessionId },
  );
  return toState(data.undoSmartQuiz);
}

// New result from the latest finished quiz and the data connected FOR THAT QUIZ (connectSmartQuizSource).
export async function createMySmartQuizResult(): Promise<SmartQuizResult> {
  const data = await gql<{ createMySmartQuizResult: SmartQuizResult }>(
    `mutation { createMySmartQuizResult { ${RESULT_FIELDS} } }`,
  );
  return data.createMySmartQuizResult;
}

export async function getMySmartQuizResults(page = 1, limit = 20): Promise<{ list: SmartQuizResult[]; total: number }> {
  const data = await gql<{ getMySmartQuizResults: { list: SmartQuizResult[]; metaData: { total: number } } }>(
    `query MyResults($input: SmartQuizResultsInquiry!) { getMySmartQuizResults(input: $input) { list { ${RESULT_FIELDS} } metaData { total } } }`,
    { input: { page, limit } },
  );
  return { list: data.getMySmartQuizResults.list, total: data.getMySmartQuizResults.metaData.total };
}

export interface SmartQuizCheckupStatus {
  // usable / too-old / no-label-map / bad-exam-date / none
  status: string;
  year: string | null;
  examDate: string | null;
  monthsOld: number | null;
  validUntil: string | null;
}

export interface SmartQuizWatchStatus {
  connected: boolean;
  platform: string | null;
  lastSyncAt: string | null;
  from: string;
  to: string;
  items: { key: string; status: string; days: number }[];
  // a watch item is used only with at least this many of the 7 days (Excel 60_파라미터 B65)
  minDays: number;
}

// What a new result would use (engine run on my current data, not saved) and what it adds to a result.
// Only data connected for the latest quiz attempt counts (each attempt starts with nothing connected).
export interface SmartQuizNewData {
  checkup: boolean;
  watch: boolean;
  // 설문 / 검진 / 워치
  wouldUse: string[];
  // connected for THIS quiz attempt in its report (the account's NHIS lookup / linked app alone does not count)
  checkupConnected: boolean;
  watchConnected: boolean;
}

const NEW_DATA_FIELDS = 'checkup watch wouldUse checkupConnected watchConnected';

// Read only: my latest NHIS checkup and whether it can be used (only the latest one counts; over 24 months it cannot).
export async function getMySmartQuizCheckupStatus(): Promise<SmartQuizCheckupStatus> {
  const data = await gql<{ getMySmartQuizCheckupStatus: SmartQuizCheckupStatus }>(
    `query { getMySmartQuizCheckupStatus { status year examDate monthsOld validUntil } }`,
  );
  return data.getMySmartQuizCheckupStatus;
}

// Read only: my watch link and the 7-day watch inputs the next result would use.
export async function getMySmartQuizWatchStatus(): Promise<SmartQuizWatchStatus> {
  const data = await gql<{ getMySmartQuizWatchStatus: SmartQuizWatchStatus }>(
    `query { getMySmartQuizWatchStatus { connected platform lastSyncAt from to items { key status days } minDays } }`,
  );
  return data.getMySmartQuizWatchStatus;
}

// Read only: what a new result would use, and whether that adds anything to this result (default: my latest).
export async function getSmartQuizNewData(resultId: string | null = null): Promise<SmartQuizNewData> {
  const data = await gql<{ getSmartQuizNewData: SmartQuizNewData }>(
    `query NewData($resultId: String) { getSmartQuizNewData(resultId: $resultId) { ${NEW_DATA_FIELDS} } }`,
    { resultId },
  );
  return data.getSmartQuizNewData;
}

// In the latest result's report: connect the checkup or the watch for THIS quiz attempt (when its connect sheet
// closes). Only then can 결과 업데이트 use it. Returns the check against the latest result.
// resultId: the report the user connects from; refused unless it is still the member's latest result.
export async function connectSmartQuizSource(source: 'checkup' | 'watch', resultId: string): Promise<SmartQuizNewData> {
  const data = await gql<{ connectSmartQuizSource: SmartQuizNewData }>(
    `mutation Connect($source: String!, $resultId: String!) { connectSmartQuizSource(source: $source, resultId: $resultId) { ${NEW_DATA_FIELDS} } }`,
    { source, resultId },
  );
  return data.connectSmartQuizSource;
}

export async function getSmartQuizResult(resultId: string): Promise<SmartQuizResult> {
  const data = await gql<{ getSmartQuizResult: SmartQuizResult }>(
    `query One($resultId: String!) { getSmartQuizResult(resultId: $resultId) { ${RESULT_FIELDS} } }`,
    { resultId },
  );
  return data.getSmartQuizResult;
}
