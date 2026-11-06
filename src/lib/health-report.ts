import { gql, REPORT_FIELDS, type SavedReport } from './quiz-session';

// Combined result: latest quiz + NHIS + watch (backend: components/health-report).

export type DataSource = 'QUIZ' | 'NHIS' | 'WATCH';
export type DataSourceStatus = 'USED' | 'NOT_USED' | 'NOT_CONNECTED';

export interface HealthDataSource {
  source: DataSource;
  status: DataSourceStatus;
  note: string;
}

// A quiz answer that measured data replaced; detail explains the data ("평균 6시간 40분 (7일 중 6일 기록)").
export interface HealthDataAnswer {
  questionId: string;
  source: DataSource;
  detail: string;
}

export interface HealthReport extends SavedReport {
  sources: HealthDataSource[];
  dataAnswers: HealthDataAnswer[];
  watchRulesApproved: boolean;
  // Demo account with FAKE data, unapproved rules and the demo NHIS mapping.
  preview: boolean;
}

const HEALTH_FIELDS = `${REPORT_FIELDS}
  sources { source status note }
  dataAnswers { questionId source detail }
  watchRulesApproved
  preview`;

// Makes a new combined result from the member's latest finished quiz and connected data.
export async function createMyHealthReport(): Promise<HealthReport> {
  const data = await gql<{ createMyHealthReport: HealthReport }>(`mutation { createMyHealthReport { ${HEALTH_FIELDS} } }`);
  return data.createMyHealthReport;
}

export async function getMyHealthReports(page = 1, limit = 20): Promise<{ list: HealthReport[]; total: number }> {
  const data = await gql<{ getMyHealthReports: { list: HealthReport[]; metaData: { total: number } } }>(
    `query MyHealthReports($input: HealthReportsInquiry!) { getMyHealthReports(input: $input) { list { ${HEALTH_FIELDS} } metaData { total } } }`,
    { input: { page, limit } },
  );
  return { list: data.getMyHealthReports.list, total: data.getMyHealthReports.metaData.total };
}
