/**
 * 2026 부산대학교 직무연수 포털 - Google Sheets GViz CSV 연동 모듈
 */

const SHEET_ID = '1Yk8qswzzQJw0UVYCneCPEd5jNWUqAr7q';
const SHEET_NAME = 'data';

// Google Sheets GViz CSV URL (&headers=1 명시로 32개 전체 행 정확히 파싱)
const GVIZ_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}&headers=1`;

// 메모리 캐시 (동일 세션 내 빠른 필터링 및 상세페이지 전환 지원)
let cachedCourses = null;
let lastFetchTime = null;

/**
 * 실시간 구글 스프레드시트 데이터 불러오기
 * @param {boolean} forceRefresh - 캐시를 무시하고 실시간 재조회할지 여부
 * @returns {Promise<Array<Object>>} 연수 과정 객체 배열
 */
async function fetchTrainingCourses(forceRefresh = false) {
  // 60초 이내의 동일 세션 요청이며 forceRefresh가 아니면 캐시 반환
  if (!forceRefresh && cachedCourses && lastFetchTime && (Date.now() - lastFetchTime < 60000)) {
    return cachedCourses;
  }

  // 브라우저 캐시 방지를 위한 타임스탬프 파라미터 추가
  const requestUrl = `${GVIZ_CSV_URL}&_t=${Date.now()}`;

  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv,text/plain,*/*'
      }
    });

    if (!response.ok) {
      throw new Error(`구글 시트 응답 오류: HTTP ${response.status}`);
    }

    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            console.warn('CSV 파싱 경고:', results.errors);
          }

          // 데이터 정제 및 유효성 검사
          const courses = results.data
            .map((row) => {
              const cleanRow = {};
              for (const [key, value] of Object.entries(row)) {
                cleanRow[key.trim()] = typeof value === 'string' ? value.trim() : value;
              }
              return cleanRow;
            })
            .filter((item) => item['과정코드'] && item['과정코드'].startsWith('PNU-'));

          if (courses.length === 0) {
            reject(new Error('유효한 연수 과정 데이터를 찾을 수 없습니다.'));
            return;
          }

          cachedCourses = courses;
          lastFetchTime = Date.now();
          console.log(`[PNU HRD] 실시간 연수 데이터 ${courses.length}건 로드 완료 (${new Date().toLocaleTimeString()})`);
          resolve(courses);
        },
        error: (err) => {
          console.error('PapaParse 파싱 실패:', err);
          reject(err);
        }
      });
    });
  } catch (error) {
    console.error('[PNU HRD] 구글 시트 연동 실패:', error);
    throw error;
  }
}

/**
 * 과정코드로 특정 연수 과정 상세 정보 찾기
 * @param {string} code - 과정코드 (예: PNU-2026-001)
 * @returns {Promise<Object|null>}
 */
async function getCourseByCode(code) {
  if (!code) return null;
  const courses = await fetchTrainingCourses();
  return courses.find((c) => c['과정코드'] === code.trim()) || null;
}

/**
 * 동일 분야의 관련 연수 추천 (최대 limit개)
 * @param {string} category - 분야명
 * @param {string} currentCode - 현재 보고 있는 과정코드
 * @param {number} limit - 추천 개수
 * @returns {Promise<Array<Object>>}
 */
async function getRelatedCourses(category, currentCode, limit = 3) {
  const courses = await fetchTrainingCourses();
  return courses
    .filter((c) => c['분야'] === category && c['과정코드'] !== currentCode)
    .slice(0, limit);
}
