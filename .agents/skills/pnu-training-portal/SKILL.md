---
name: pnu-training-portal
description: >-
  Comprehensive guide, architecture, templates, and automated workflow for creating a responsive 2-page
  institutional job training portal (Main Catalog & Detail Page) with real-time Google Sheets CSV (GViz)
  synchronization, multi-faceted filtering, instant search, PapaParse, and GitHub Pages deployment.
---

# PNU Training Portal (직무연수 웹사이트 구축 스킬)

부산대학교(PNU) 및 교육·공공기관의 직무연수 과정을 소개하는 **메인 카탈로그(`index.html`)와 세부 안내(`detail.html`) 2페이지 웹사이트**를 구글 스프레드시트 실시간 연동 및 깃허브 페이지(GitHub Pages) 배포까지 원스톱으로 구축하는 표준 워크플로우 가이드입니다.

---

## 1. 아키텍처 및 핵심 원칙

```
[Google Spreadsheet (공개 뷰어)]
        │
        ▼ (GViz API: ?tqx=out:csv&sheet=data&headers=1&_t=Date.now())
  PapaParse 5.4+ (CSV 파싱 및 공백 정제)
        │
        ├──▶ index.html (메인 페이지)
        │      ├── 실시간 KPI 통계 요약 (총 과정수, 법정의무, AI 등)
        │      ├── 10개 분야별 가로 스크롤 탭 (카운트 뱃지)
        │      ├── 실시간 검색 (디바운스, 검색어 즉시 삭제)
        │      ├── 다중 드롭다운 필터 (이수구분, 방식, 대상)
        │      ├── 4종 정렬 (코드순, 교육시간순, 가나다순)
        │      └── 연수 카드 그리드 (뱃지, 메타, '상세보기' 버튼)
        │
        └──▶ detail.html (상세 페이지: ?code=PNU-2026-XXX)
               ├── 브레드크럼 및 뒤로가기 내비게이션
               ├── 과정 히어로 배너 (코드, 이수, 방식, 분야 태그)
               ├── 본문 4대 블록 (개요, 학습목표, 커리큘럼, 이수안내)
               ├── 우측 스티키 사이드바 (신청 바로가기, 요약표, 문의전화)
               └── 연계 추천 연수 (동일 분야 타 과정 추천)
```

---

## 2. 기술적 핵심 주의사항 (Golden Rules)

### 2.1 Google Sheets GViz CSV 호출 시 `&headers=1` 필수 적용 (치명적 이슈 방지)
- **문제점**: 구글 시트 GViz CSV URL(`.../gviz/tq?tqx=out:csv&sheet=data`) 기본 호출 시 구글 내부 알고리즘이 1행부터 데이터 중간(예: 13행)까지를 헤더로 오인하여 컬럼명으로 뭉뚱그려버려 10여 개 이상의 과정이 누락되는 치명적 버그가 발생함.
- **해결책**: 반드시 URL 끝에 **`&headers=1`**을 명시하여 정확히 1행만 헤더로 인식되도록 지정.
- **표준 URL 패턴**:
  ```javascript
  const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}&headers=1&_t=${Date.now()}`;
  ```

### 2.2 실시간 캐시 버스팅 (Cache Busting)
- 구글 시트의 값을 변경한 뒤 사용자가 브라우저를 새로고침하면 변경 사항이 즉각 반영되도록, 요청 시마다 `&_t=${Date.now()}` 쿼리 파라미터를 동적으로 추가하여 브라우저 및 CDN 캐시를 무효화함.

### 2.3 PapaParse 안전 파싱
- 쉼표(`,`)가 포함된 문장, 줄바꿈, 따옴표가 안전하게 파싱되도록 `Papa.parse(csvText, { header: true, skipEmptyLines: 'greedy' })`를 사용하고, 각 필드의 앞뒤 공백을 트림(`trim()`) 처리함.

---

## 3. 표준 개발 절차 (7-Step Runbook)

1. **1단계: 데이터 분석 & 기준 확립**
   - 구글 시트의 공개 상태(뷰어) 확인 및 컬럼 매핑 (과정코드, 과정명, 분야, 대상, 이수구분, 방식, 시간, 정원, 기간, 신청링크, 문의 등 17개 필드).
   - `scripts/verify_gviz.py`를 실행하여 누락 없이 전 행이 파싱되는지 검증.
2. **2단계: 작업 기획서(`PLAN.md`) 작성**
   - 작업 날짜 폴더(`YYYY-MM-DD`)를 생성하고 기능 분해, 디렉터리, UI 디자인 시스템을 md로 정의.
3. **3단계: 메인 페이지(`index.html`, `main.js`, `api.js`, `style.css`) 제작**
   - PNU Identity 컬러(`#004B97`) 기반 레이아웃 구성.
   - KPI 통계 카드, 실시간 검색, 분야별 가로 탭, 다중 필터(이수·방식·대상), 정렬 구현.
   - 로딩 스켈레톤 및 검색 결과 0건 시 빈 상태(Empty state) 처리.
4. **4단계: 상세 페이지(`detail.html`, `detail.js`) 제작**
   - URL 쿼리 파라미터(`?code=...`) 기반 데이터 로드 및 404 폴백 처리.
   - 브레드크럼, 히어로 배너, 커리큘럼 타임라인, 스티키 사이드바(수강신청 CTA, 전화 바로걸기, 공유 링크 복사).
   - 하단 동일 분야 관련 연수 카드 2~3개 추천.
5. **5단계: 구글 시트 실시간 동기화 검증**
   - 시트 내 특정 칸 수정 후 새로고침 시 화면에 즉각 반영되는지 확인.
6. **6단계: Git 커밋 & GitHub Pages 배포**
   - 배포 폴더 내 git 초기화 후 원격 저장소(`main` 브랜치) 푸시.
   - GitHub Pages (`Deploy from a branch` -> `main` / `root`) 활성화.
7. **7단계: 최종 라이브 접속 검증 & 보고**
   - 배포된 실제 URL 접속 테스트(HTTP 200 확인) 및 결과 보고.

---

## 4. UI/UX 디자인 시스템 사양 (Frontend Design)

- **브랜드 컬러**:
  - Primary (PNU Navy): `#004B97` (호버: `#003770`, 연한 배경: `#EBF3FA`)
  - Accent (Amber/Gold): `#D97706` (필수 과정 뱃지)
  - Success (Emerald): `#059669` (온라인 수강, 실시간 동기화)
  - Surface: `#FFFFFF`, Background: `#F8FAFC`, Border: `#E2E8F0`
- **타이포그래피**: `Pretendard Variable` (가독성이 우수한 모던 산세리프).
- **아이콘**: `Lucide Icons` (일관된 라인 아이콘: search, clock, calendar, building-2, arrow-right 등).
- **인터랙션**:
  - 카드 호버 시 부드러운 엘리베이션(`translateY(-4px)` + 그림자 확대).
  - 실시간 동기화 상태 표시등(초록 펄스 애니메이션).
  - 데이터 로딩 시 세련된 스켈레톤 쉬머(`@keyframes shimmer`).

---

## 5. 헬퍼 스크립트 및 템플릿 참조

- **데이터 수신 검증 스크립트**: [`scripts/verify_gviz.py`](./scripts/verify_gviz.py)
  - 구글 시트 GViz CSV URL의 행 파싱 및 컬럼 정상성 자동 점검.
- **GitHub Pages 자동 활성화 스크립트**: [`scripts/deploy_pages.py`](./scripts/deploy_pages.py)
  - GitHub REST API를 통해 Pages 배포를 원클릭으로 활성화.
- **템플릿 에셋**: [`templates/`](./templates/)
  - `index.html`, `detail.html`, `style.css`, `api.js`, `main.js`, `detail.js`, `logo.svg`.
