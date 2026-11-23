// Korean names shown to users for the engine's English keys.
// Topics: the final design "261123_iink_결과분석지_최종" (CEO 2026-11-23, 9 Topic Korean names changed).
// Nutrients: the same design's nutrient labels.

export const TOPIC_KO: Record<string, string> = {
  'Daily Balance': '데일리 밸런스',
  BSS: '혈행 건강',
  Eye: '눈 건강',
  Liver: '간 건강',
  'Sleep & Recognize': '수면 건강',
  Digest: '소화 건강',
  'Amino & Energy': '에너지 건강',
  Woman: '여성 건강',
  Bone: '뼈 건강',
};

export const NUTRIENT_KO: Record<string, string> = {
  Protein: '단백질',
  Fiber: '식이섬유',
  'Vitamin A': '비타민 A',
  'Vitamin E': '비타민 E',
  'Vitamin D': '비타민 D',
  'Vitamin C': '비타민 C',
  'Thiamin B1': '비타민 B1',
  'Riboflavin B2': '비타민 B2',
  'Vitamin B6': '비타민 B6',
  'Vitamin B12': '비타민 B12',
  Niacin: '나이아신',
  Folate: '엽산',
  Calcium: '칼슘',
  Iron: '철',
  Magnesium: '마그네슘',
  Selenium: '셀레늄',
  Zinc: '아연',
};

export const topicKo = (t: string) => TOPIC_KO[t] ?? t;
export const nutrientKo = (n: string) => NUTRIENT_KO[n] ?? n;
