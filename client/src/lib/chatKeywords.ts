/**
 * chatKeywords.ts
 * 반려몬 키워드 대화 시스템
 * 입력 텍스트에서 키워드를 감지하고 반려몬 캐릭터에 맞는 한국어 응답 반환
 */

export interface ChatResponse {
  text: string;
  emotion?: 'happy' | 'love' | 'surprised' | 'sad' | 'normal';
  moodEffect?: number; // 기분 수치 변화 (선택)
}

interface KeywordRule {
  keywords: string[];
  responses: ChatResponse[];
}

/** 키워드 규칙 목록 (우선순위 순) */
const KEYWORD_RULES: KeywordRule[] = [
  // 이름/정체성
  {
    keywords: ['이름', '누구', '뭐야', '뭐니', '넌 뭐', '정체'],
    responses: [
      { text: '저는 포코예요! 당신의 소중한 반려몬이에요! 😊', emotion: 'happy' },
      { text: '포코라고 해요~ 잘 부탁해요!', emotion: 'happy' },
      { text: '저요? 포코예요! 헤헤~', emotion: 'happy' },
    ],
  },
  // 좋아하는 것
  {
    keywords: ['좋아해', '사랑해', '좋아', '사랑', '최고야', '최고'],
    responses: [
      { text: '저도 좋아해요! 정말 정말요! 💕', emotion: 'love', moodEffect: 5 },
      { text: '헤헤~ 저도요! 항상 함께해요!', emotion: 'love', moodEffect: 5 },
      { text: '우와, 저도 사랑해요! 최고예요!', emotion: 'love', moodEffect: 5 },
    ],
  },
  // 배고픔
  {
    keywords: ['배고파', '밥', '먹고싶', '먹을것', '음식', '뭐먹', '간식'],
    responses: [
      { text: '저도 배고파요! 밥 줘요~ 꼬르륵~', emotion: 'sad' },
      { text: '냠냠! 뭔가 맛있는 거 주세요!', emotion: 'normal' },
      { text: '먹이주기 버튼 눌러줘요! 배고파요~', emotion: 'sad' },
    ],
  },
  // 피곤함/졸림
  {
    keywords: ['피곤', '졸려', '자고싶', '잠', '수면', '쉬고싶', '쉬어'],
    responses: [
      { text: '저도 조금 졸려요... 재워줄래요?', emotion: 'sad' },
      { text: '으음~ 눈이 자꾸 감겨요...', emotion: 'sad' },
      { text: '휴식 버튼 눌러주면 잘 잘게요~ 💤', emotion: 'normal' },
    ],
  },
  // 목욕/청결
  {
    keywords: ['씻어', '목욕', '청결', '더러워', '씻고'],
    responses: [
      { text: '목욕시켜 주세요! 깨끗해지고 싶어요~', emotion: 'normal' },
      { text: '목욕 버튼 눌러줘요! 시원해질 것 같아요!', emotion: 'happy' },
      { text: '으, 씻고 싶어요. 목욕 부탁해요!', emotion: 'sad' },
    ],
  },
  // 놀이
  {
    keywords: ['놀자', '놀아', '같이놀', '게임', '놀이', '심심'],
    responses: [
      { text: '같이 놀아요! 신나요! 🎾', emotion: 'happy', moodEffect: 3 },
      { text: '놀이 버튼 눌러줘요! 재밌는 거 하고 싶어요!', emotion: 'happy' },
      { text: '와, 저도 심심했어요! 같이 놀아요~', emotion: 'happy', moodEffect: 3 },
    ],
  },
  // 기분/상태 질문
  {
    keywords: ['기분', '어때', '괜찮아', '건강', '상태'],
    responses: [
      { text: '지금 기분 좋아요! 당신 덕분이에요~ 😊', emotion: 'happy' },
      { text: '네, 괜찮아요! 같이 있으면 항상 행복해요!', emotion: 'happy' },
      { text: '오늘 기분 최고예요! 헤헤~', emotion: 'happy' },
    ],
  },
  // 나이/레벨
  {
    keywords: ['몇살', '레벨', '나이', '얼마나', '성장'],
    responses: [
      { text: '열심히 성장하고 있어요! 더 강해질 거예요!', emotion: 'happy' },
      { text: '레벨 올리려면 많이 돌봐줘야 해요! 부탁해요~', emotion: 'normal' },
      { text: '아직 어려요! 많이 돌봐주세요!', emotion: 'normal' },
    ],
  },
  // 진화
  {
    keywords: ['진화', '변신', '성장', '커져'],
    responses: [
      { text: '저도 빨리 진화하고 싶어요! 열심히 할게요!', emotion: 'happy' },
      { text: '많이 먹고 놀면 진화할 수 있어요! 기대돼요~', emotion: 'happy' },
      { text: '진화하면 더 멋있어질 거예요! 기다려줘요!', emotion: 'happy' },
    ],
  },
  // 날씨/오늘
  {
    keywords: ['날씨', '오늘', '요즘', '밖에'],
    responses: [
      { text: '저는 항상 당신 곁에 있을게요! 날씨가 어떻든요~', emotion: 'love' },
      { text: '오늘도 같이 있어줘서 고마워요!', emotion: 'love', moodEffect: 2 },
      { text: '밖은 몰라도 여기는 항상 따뜻해요! 헤헤~', emotion: 'happy' },
    ],
  },
  // 칭찬
  {
    keywords: ['잘했어', '착해', '귀여워', '예뻐', '멋있어', '대단해'],
    responses: [
      { text: '헤헤~ 칭찬해줘서 고마워요! 기분 최고예요!', emotion: 'love', moodEffect: 5 },
      { text: '정말요? 너무 기뻐요! 더 열심히 할게요!', emotion: 'happy', moodEffect: 5 },
      { text: '우와, 저 진짜 귀여워요? 헤헤~', emotion: 'happy', moodEffect: 3 },
    ],
  },
  // 슬픔/위로
  {
    keywords: ['슬퍼', '힘들어', '지쳐', '우울', '속상', '화나'],
    responses: [
      { text: '제가 옆에 있을게요! 힘내요! 💕', emotion: 'love', moodEffect: 3 },
      { text: '괜찮아요? 같이 있어줄게요!', emotion: 'love' },
      { text: '슬프면 저랑 놀아요! 기분 좋아질 거예요!', emotion: 'happy', moodEffect: 2 },
    ],
  },
  // 작별/안녕
  {
    keywords: ['안녕', '잘가', '바이', '또봐', '다음에'],
    responses: [
      { text: '또 와줘요! 기다리고 있을게요~ 👋', emotion: 'happy' },
      { text: '안녕히 가세요! 빨리 돌아와요!', emotion: 'sad' },
      { text: '잘 가요! 저 잊지 마세요~', emotion: 'sad' },
    ],
  },
  // 감사
  {
    keywords: ['고마워', '감사', '고맙'],
    responses: [
      { text: '저야말로 고마워요! 항상 돌봐줘서요~', emotion: 'love', moodEffect: 3 },
      { text: '헤헤~ 저도 고마워요!', emotion: 'happy', moodEffect: 2 },
      { text: '천만에요! 앞으로도 잘 부탁해요!', emotion: 'happy' },
    ],
  },
  // 미래/꿈
  {
    keywords: ['꿈', '미래', '나중에', '커서', '목표'],
    responses: [
      { text: '저의 꿈은 최강 반려몬이 되는 거예요!', emotion: 'happy' },
      { text: '나중에 더 강해져서 당신을 지킬 거예요!', emotion: 'love' },
      { text: '열심히 성장해서 꿈을 이룰 거예요!', emotion: 'happy' },
    ],
  },
];

/** 기본 응답 (키워드 매칭 실패 시) */
const DEFAULT_RESPONSES: ChatResponse[] = [
  { text: '잘 모르겠어요~ 같이 놀아요! 🎾', emotion: 'normal' },
  { text: '헤헤, 무슨 말인지 모르겠지만 좋아요!', emotion: 'happy' },
  { text: '저는 그냥 당신이랑 있는 게 좋아요!', emotion: 'love', moodEffect: 1 },
  { text: '음... 어려운 말이에요! 밥이나 줘요~', emotion: 'normal' },
  { text: '그게 뭔지 몰라도 괜찮아요! 같이 있어요!', emotion: 'happy' },
];

/** 랜덤 응답 선택 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 입력 텍스트에서 키워드를 감지하고 응답 반환
 * @param input 사용자 입력 텍스트
 * @param petName 반려몬 이름 (응답에 삽입 가능)
 */
export function getChatResponse(input: string, petName: string = '포코'): ChatResponse {
  const normalized = input.trim().toLowerCase();

  // 빈 입력 처리
  if (!normalized) {
    return { text: `${petName}이(가) 당신을 바라보고 있어요~ 😊`, emotion: 'happy' };
  }

  // 이름 직접 호출 처리
  if (normalized === petName.toLowerCase() || normalized === '포코') {
    return pickRandom([
      { text: '네! 불렀어요? 헤헤~', emotion: 'happy', moodEffect: 2 },
      { text: '왜요왜요? 저 여기 있어요!', emotion: 'happy' },
      { text: `${petName}이에요! 뭔가 필요한 거 있어요?`, emotion: 'happy' },
    ]);
  }

  // 키워드 매칭
  for (const rule of KEYWORD_RULES) {
    const matched = rule.keywords.some(kw => normalized.includes(kw));
    if (matched) {
      const response = pickRandom(rule.responses);
      // 응답 텍스트에서 '포코' → 실제 이름으로 치환
      return {
        ...response,
        text: response.text.replace(/포코/g, petName),
      };
    }
  }

  // 기본 응답
  const defaultResp = pickRandom(DEFAULT_RESPONSES);
  return {
    ...defaultResp,
    text: defaultResp.text.replace(/포코/g, petName),
  };
}
