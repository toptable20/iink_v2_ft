import { gql } from './quiz-session';
import { RESULT_FIELDS, type SmartQuizResult } from './smart-quiz';

// Admin only (backend: ADMIN role guard on every query here).

export interface AdminLatestOrder {
  _id: string;
  customerName: string | null;
  orderStatus: string;
  orderPaymentStatus: string;
  orderDeliveryStatus: string;
  orderFinalPrice: number;
  createdAt: string;
}

export interface AdminDashboardStats {
  totalMembers: number;
  userMembers: number;
  adminMembers: number;
  blockedMembers: number;
  deletedMembers: number;
  openOrders: number;
  latestOrders: AdminLatestOrder[];
}

export type AdminResult = SmartQuizResult & { memberNick: string | null };

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const data = await gql<{ getAdminDashboardStats: AdminDashboardStats }>(
    `query { getAdminDashboardStats {
      totalMembers userMembers adminMembers blockedMembers deletedMembers openOrders
      latestOrders { _id customerName orderStatus orderPaymentStatus orderDeliveryStatus orderFinalPrice createdAt }
    } }`,
  );
  return data.getAdminDashboardStats;
}

// Every member's results, newest first.
export async function getAllResults(page = 1, limit = 20): Promise<{ list: AdminResult[]; total: number }> {
  const data = await gql<{ getAllSmartQuizResultsByAdmin: { list: AdminResult[]; metaData: { total: number } } }>(
    `query All($input: SmartQuizResultsInquiry!) { getAllSmartQuizResultsByAdmin(input: $input) { list { ${RESULT_FIELDS} memberNick } metaData { total } } }`,
    { input: { page, limit } },
  );
  return { list: data.getAllSmartQuizResultsByAdmin.list, total: data.getAllSmartQuizResultsByAdmin.metaData.total };
}

// G-code for a result from the Foodian slicer (backend print module, sheet B11 settings). Two methods:
// 'model' = STL picked by 푸디언 출력 합계; 'infill' = iink_cylinder.stl, infill density by the Daily Balance Level.
export type PrintMethod = 'model' | 'infill';
export interface PrintGcode { fileName: string; gcode: string; lines: number; method: PrintMethod; model: string; inkTotalG: number; dailyBalanceLevel: number | null; infillDensity: number | null }
export async function createPrintGcode(resultId: string, method: PrintMethod = 'model'): Promise<PrintGcode> {
  const data = await gql<{ createPrintGcode: PrintGcode }>(
    `mutation Gcode($resultId: String!, $method: String) { createPrintGcode(resultId: $resultId, method: $method) { fileName gcode lines method model inkTotalG dailyBalanceLevel infillDensity } }`,
    { resultId, method },
  );
  return data.createPrintGcode;
}

export async function getResultByAdmin(resultId: string): Promise<AdminResult> {
  const data = await gql<{ getSmartQuizResultByAdmin: AdminResult }>(
    `query One($resultId: String!) { getSmartQuizResultByAdmin(resultId: $resultId) { ${RESULT_FIELDS} memberNick } }`,
    { resultId },
  );
  return data.getSmartQuizResultByAdmin;
}
