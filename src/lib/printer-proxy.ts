// Printer proxy on the admin's PC -> Moonraker printer on the LAN. Same app and flow as iink v1, TriD and goyoo:
// the Foodian Printer Proxy (https://localhost:9443, opened with FoodianPrinterProxy://open, installer release.zip).
// Our own build (iink_v2_proxy) is blocked by Windows Application Control until it is code-signed (2026-11-16).
// Connect / open / download logic follows TriD's print dialog (trid-fe printDialog/tempPrint.js).

export const PROXY_BASE = 'https://localhost:9443';
export const PROXY_OPEN_LINK = 'FoodianPrinterProxy://open';
// same installer link as iink v1 and TriD
export const PROXY_DOWNLOAD_URL = 'https://s3.ap-northeast-2.amazonaws.com/goyoo.storage/release.zip';

const MOONRAKER_PORT = 7125;
const STATUS_TIMEOUT_MS = 8000;
// TriD / goyoo: 60 s for the upload (the proxy keeps uploading after a browser timeout)
const UPLOAD_TIMEOUT_MS = 60000;
// proxy 2.0.2 has no /printers: the list is kept in this browser (TriD / goyoo fallback)
const LOCAL_PRINTERS_KEY = 'iink_printers';

export interface SavedPrinter {
  name: string;
  ip: string;
}

export type PrinterState = 'checking' | 'idle' | 'busy' | 'offline';

// "192.168.0.10" -> http://192.168.0.10:7125; a saved "ip:port" keeps its port
export const printerUrl = (ip: string) => (/:\d+$/.test(ip) ? `http://${ip}` : `http://${ip}:${MOONRAKER_PORT}`);

// private IPv4 (each part 0-255), optional :port
export function isPrinterAddress(value: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(:\d{1,5})?$/.exec(value.trim());
  if (!m) return false;
  const [a, b, c, d] = m.slice(1, 5).map(Number);
  if ([a, b, c, d].some((n) => n > 255)) return false;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export async function isProxyRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${PROXY_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ---- printer list: the proxy's /printers when it has one, else this browser ----
function readLocal(): SavedPrinter[] {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_PRINTERS_KEY) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeLocal(list: SavedPrinter[]): SavedPrinter[] {
  try {
    localStorage.setItem(LOCAL_PRINTERS_KEY, JSON.stringify(list));
  } catch {
    // storage blocked: the list lasts until the page reloads
  }
  return list;
}

let proxyHasList: boolean | null = null;

export async function listPrinters(): Promise<SavedPrinter[]> {
  try {
    const res = await fetch(`${PROXY_BASE}/printers`);
    if (res.status === 404) {
      proxyHasList = false;
      return readLocal();
    }
    if (res.ok) {
      proxyHasList = true;
      return ((await res.json()).printers ?? []) as SavedPrinter[];
    }
  } catch {
    // fall through to the browser list
  }
  proxyHasList = false;
  return readLocal();
}

export async function addPrinter(name: string, ip: string): Promise<SavedPrinter[]> {
  if (proxyHasList) {
    const res = await fetch(`${PROXY_BASE}/printers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ip }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? '프린터를 추가하지 못했습니다.');
    return body.printers as SavedPrinter[];
  }
  return writeLocal([...readLocal().filter((p) => p.name !== name), { name, ip }]);
}

export async function removePrinter(name: string): Promise<SavedPrinter[]> {
  if (proxyHasList) {
    const res = await fetch(`${PROXY_BASE}/printers/${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('프린터를 삭제하지 못했습니다.');
    return ((await res.json()).printers ?? []) as SavedPrinter[];
  }
  return writeLocal(readLocal().filter((p) => p.name !== name));
}

export async function printerStatus(ip: string): Promise<PrinterState> {
  try {
    const res = await fetch(`${PROXY_BASE}/status?printerUrl=${encodeURIComponent(printerUrl(ip))}`, {
      signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
    });
    const data = await res.json();
    if (!res.ok || data.printer !== 'ok') return 'offline';
    // a newer proxy also says what the printer is doing
    return ['printing', 'paused'].includes(data.print_state) ? 'busy' : 'idle';
  } catch {
    return 'offline';
  }
}

// Live print state from the proxy's read-only /print-status (TriD's status panel). Only the printer's own values,
// no time estimate (TriD rule: times stay off until checked once against the printer screen).
export interface PrintProgress {
  state: string | null; // standby | printing | paused | complete | cancelled | error
  filename: string | null;
  progress: number | null; // 0-1
  currentLayer: number | null;
  totalLayer: number | null;
  extruder: { temperature: number | null; target: number | null } | null;
}

// 'unsupported' = proxy without /print-status (Foodian proxy 2.0.2 installed today); 'offline' = no answer
export async function getPrintProgress(ip: string): Promise<PrintProgress | 'unsupported' | 'offline'> {
  try {
    const res = await fetch(`${PROXY_BASE}/print-status?printerUrl=${encodeURIComponent(printerUrl(ip))}`, {
      signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
    });
    if (res.status === 404) return 'unsupported';
    const d = await res.json();
    if (!res.ok || d.printer !== 'ok') return 'offline';
    return {
      state: d.state ?? null,
      filename: d.filename ?? null,
      progress: typeof d.display_progress === 'number' ? d.display_progress : (d.progress ?? null),
      currentLayer: d.current_layer ?? null,
      totalLayer: d.total_layer ?? null,
      extruder: d.extruder ?? null,
    };
  } catch {
    return 'offline';
  }
}

// Upload + start. Throws an Error with a message for the admin.
export async function sendToPrinter(ip: string, fileName: string, gcode: string): Promise<void> {
  const form = new FormData();
  // encoded so a Korean name survives multipart; the proxy decodes it (2.0.1+)
  form.append('file', new File([gcode], encodeURIComponent(fileName)));
  let res: Response;
  try {
    res = await fetch(`${PROXY_BASE}/upload?printerUrl=${encodeURIComponent(printerUrl(ip))}`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') {
      throw new Error('프린터 응답이 늦습니다. 출력이 이미 시작됐을 수 있으니 프린터 화면을 확인한 뒤 다시 시도해 주세요.');
    }
    throw new Error('프록시와 통신하지 못했습니다. Foodian Printer Proxy가 실행 중인지 확인해 주세요.');
  }
  if (res.status === 403) throw new Error('프린터가 이미 출력 중입니다. 현재 출력이 끝난 뒤 다시 시도해 주세요.');
  if (!res.ok) throw new Error('출력에 실패했습니다. 프린터가 출력 중이거나 준비되지 않았을 수 있습니다. 프린터 화면을 확인해 주세요.');
}
