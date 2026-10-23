/**
 * 2026 부산대학교 직무연수 포털 - 메인 페이지 컨트롤러 (main.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 상태 관리 객체
  const state = {
    allCourses: [],
    selectedCategory: '전체',
    selectedRequirement: '전체',
    selectedMethod: '전체',
    selectedTarget: '전체',
    searchQuery: '',
    sortOrder: 'code-asc'
  };

  // DOM 요소 캐싱
  const elements = {
    kpiTotal: document.getElementById('kpi-total'),
    kpiMandatory: document.getElementById('kpi-mandatory'),
    kpiAi: document.getElementById('kpi-ai'),
    categoryPills: document.getElementById('category-pills'),
    courseGrid: document.getElementById('course-grid'),
    resultCount: document.getElementById('result-count'),
    searchInput: document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    filterRequirement: document.getElementById('filter-requirement'),
    filterMethod: document.getElementById('filter-method'),
    filterTarget: document.getElementById('filter-target'),
    sortSelect: document.getElementById('sort-select'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    emptyState: document.getElementById('empty-state'),
    errorState: document.getElementById('error-state'),
    emptyResetBtn: document.getElementById('empty-reset-btn'),
    errorRetryBtn: document.getElementById('error-retry-btn'),
    refreshBtn: document.getElementById('refresh-btn')
  };

  // 1. 초기 로딩 및 데이터 패치
  init();

  async function init(forceRefresh = false) {
    showSkeletons(6);
    elements.emptyState.style.display = 'none';
    elements.errorState.style.display = 'none';

    try {
      const courses = await fetchTrainingCourses(forceRefresh);
      state.allCourses = courses;

      // KPI 지표 계산 및 렌더링
      updateKpiStats(courses);

      // 분야 탭 필터 렌더링
      renderCategoryPills(courses);

      // 필터 적용 및 목록 렌더링
      applyFilters();

      // Lucide 아이콘 초기화
      if (window.lucide) {
        lucide.createIcons();
      }
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      showError();
    }
  }

  // 2. KPI 요약 카드 수치 업데이트
  function updateKpiStats(courses) {
    const totalCount = courses.length;
    const mandatoryCount = courses.filter(c => (c['이수구분'] || '').includes('필수')).length;
    const aiCount = courses.filter(c => (c['분야'] || '').includes('AI') || (c['과정명'] || '').includes('AI') || (c['분야'] || '').includes('정보화')).length;

    animateNumber(elements.kpiTotal, totalCount);
    animateNumber(elements.kpiMandatory, mandatoryCount);
    animateNumber(elements.kpiAi, aiCount);
  }

  function animateNumber(element, target) {
    if (!element) return;
    let current = 0;
    const step = Math.max(1, Math.floor(target / 20));
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        element.textContent = target;
        clearInterval(timer);
      } else {
        element.textContent = current;
      }
    }, 25);
  }

  // 3. 분야 탭 필터 동적 생성
  function renderCategoryPills(courses) {
    // 분야별 카운트 산출
    const categoryCounts = { '전체': courses.length };
    courses.forEach(c => {
      const cat = c['분야'] || '기타';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const categories = Object.keys(categoryCounts);

    elements.categoryPills.innerHTML = categories.map(cat => {
      const isActive = cat === state.selectedCategory ? 'active' : '';
      return `
        <button type="button" class="category-pill ${isActive}" data-category="${escapeHtml(cat)}">
          <span>${escapeHtml(cat)}</span>
          <span class="count">${categoryCounts[cat]}</span>
        </button>
      `;
    }).join('');

    // 이벤트 바인딩
    elements.categoryPills.querySelectorAll('.category-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        elements.categoryPills.querySelectorAll('.category-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedCategory = btn.dataset.category;
        applyFilters();
      });
    });
  }

  // 4. 복합 필터링 및 정렬 처리
  function applyFilters() {
    let filtered = [...state.allCourses];

    // [1] 분야 필터
    if (state.selectedCategory !== '전체') {
      filtered = filtered.filter(c => c['분야'] === state.selectedCategory);
    }

    // [2] 이수구분 필터
    if (state.selectedRequirement !== '전체') {
      filtered = filtered.filter(c => (c['이수구분'] || '').includes(state.selectedRequirement));
    }

    // [3] 교육방식 필터
    if (state.selectedMethod !== '전체') {
      filtered = filtered.filter(c => (c['교육방식'] || '').includes(state.selectedMethod));
    }

    // [4] 수강대상 필터
    if (state.selectedTarget !== '전체') {
      filtered = filtered.filter(c => (c['대상'] || '').includes(state.selectedTarget));
    }

    // [5] 검색어 필터 (대소문자 무관 및 공백 제거)
    const q = state.searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(c => {
        const title = (c['과정명'] || '').toLowerCase();
        const code = (c['과정코드'] || '').toLowerCase();
        const summary = (c['한줄소개'] || '').toLowerCase();
        const dept = (c['담당부서'] || '').toLowerCase();
        const content = (c['주요내용'] || '').toLowerCase();
        return title.includes(q) || code.includes(q) || summary.includes(q) || dept.includes(q) || content.includes(q);
      });
    }

    // [6] 정렬 로직
    filtered.sort((a, b) => {
      switch (state.sortOrder) {
        case 'hours-desc':
          return parseHours(b['교육시간']) - parseHours(a['교육시간']);
        case 'hours-asc':
          return parseHours(a['교육시간']) - parseHours(b['교육시간']);
        case 'title-asc':
          return (a['과정명'] || '').localeCompare(b['과정명'] || '', 'ko');
        case 'code-asc':
        default:
          return (a['과정코드'] || '').localeCompare(b['과정코드'] || '');
      }
    });

    // 결과 수 표시
    elements.resultCount.innerHTML = `검색 결과 <strong>${filtered.length}</strong>개 과정`;

    // 렌더링
    if (filtered.length === 0) {
      elements.courseGrid.innerHTML = '';
      elements.emptyState.style.display = 'block';
    } else {
      elements.emptyState.style.display = 'none';
      renderCourseCards(filtered);
    }
  }

  // 5. 연수 과정 카드 목록 렌더링
  function renderCourseCards(courses) {
    elements.courseGrid.innerHTML = courses.map(course => {
      const code = escapeHtml(course['과정코드'] || '');
      const title = escapeHtml(course['과정명'] || '과정명 미정');
      const category = escapeHtml(course['분야'] || '직무연수');
      const requirement = course['이수구분'] || '선택';
      const method = course['교육방식'] || '온라인';
      const summary = escapeHtml(course['한줄소개'] || course['상세소개'] || '');
      const time = escapeHtml(course['교육시간'] || '미정');
      const period = escapeHtml(course['교육기간'] || '상시');
      const dept = escapeHtml(course['담당부서'] || '인재개발원');

      const reqBadgeClass = getRequirementBadgeClass(requirement);
      const methodBadgeClass = getMethodBadgeClass(method);

      return `
        <article class="course-card" data-code="${code}">
          <div class="card-top">
            <div class="card-badge-row">
              <div class="badge-group">
                <span class="badge ${reqBadgeClass}">${escapeHtml(requirement)}</span>
                <span class="badge ${methodBadgeClass}">${escapeHtml(method)}</span>
              </div>
              <span class="course-code">${code}</span>
            </div>

            <span class="course-category-tag">${category}</span>
            <h3 class="course-title">
              <a href="detail.html?code=${encodeURIComponent(code)}">${title}</a>
            </h3>
            <p class="course-summary">${summary}</p>
          </div>

          <div class="card-bottom">
            <div class="course-meta">
              <div class="meta-item">
                <i data-lucide="clock"></i>
                <span class="meta-label">교육시간</span>
                <span class="meta-value">${time}</span>
              </div>
              <div class="meta-item">
                <i data-lucide="calendar"></i>
                <span class="meta-label">교육기간</span>
                <span class="meta-value">${period}</span>
              </div>
              <div class="meta-item">
                <i data-lucide="building-2"></i>
                <span class="meta-label">담당부서</span>
                <span class="meta-value">${dept}</span>
              </div>
            </div>

            <a href="detail.html?code=${encodeURIComponent(code)}" class="card-action-btn">
              <span>과정 상세보기</span>
              <i data-lucide="arrow-right"></i>
            </a>
          </div>
        </article>
      `;
    }).join('');

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // 6. 스켈레톤 로딩 렌더링
  function showSkeletons(count = 6) {
    elements.courseGrid.innerHTML = Array(count).fill(0).map(() => `
      <div class="skeleton-card">
        <div style="display:flex; justify-content:space-between;">
          <div class="skeleton-shimmer skeleton-badge"></div>
          <div class="skeleton-shimmer" style="width:70px; height:18px;"></div>
        </div>
        <div class="skeleton-shimmer" style="width:100px; height:16px;"></div>
        <div class="skeleton-shimmer skeleton-title"></div>
        <div class="skeleton-shimmer skeleton-desc"></div>
        <div class="skeleton-shimmer skeleton-meta"></div>
        <div class="skeleton-shimmer skeleton-btn"></div>
      </div>
    `).join('');
  }

  // 7. 에러 처리
  function showError() {
    elements.courseGrid.innerHTML = '';
    elements.emptyState.style.display = 'none';
    elements.errorState.style.display = 'block';
  }

  // 8. 뱃지 스타일 매핑 헬퍼
  function getRequirementBadgeClass(req) {
    if (req.includes('필수')) return 'badge-mandatory';
    if (req.includes('권장')) return 'badge-recommended';
    return 'badge-optional';
  }

  function getMethodBadgeClass(method) {
    if (method.includes('온라인')) return 'badge-online';
    if (method.includes('집합')) return 'badge-offline';
    return 'badge-hybrid';
  }

  // 시간 파싱 헬퍼 (예: "24시간(8일)" -> 24)
  function parseHours(timeStr) {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+)\s*시간/);
    return match ? parseInt(match[1], 10) : 0;
  }

  // HTML 이스케이프 헬퍼
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 9. 사용자 인터랙션 이벤트 리스너 등록
  // 검색어 입력
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    elements.searchClearBtn.style.display = state.searchQuery ? 'inline-flex' : 'none';
    applyFilters();
  });

  // 검색어 삭제 버튼
  elements.searchClearBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.searchClearBtn.style.display = 'none';
    elements.searchInput.focus();
    applyFilters();
  });

  // 드롭다운 필터 변경
  elements.filterRequirement.addEventListener('change', (e) => {
    state.selectedRequirement = e.target.value;
    applyFilters();
  });

  elements.filterMethod.addEventListener('change', (e) => {
    state.selectedMethod = e.target.value;
    applyFilters();
  });

  elements.filterTarget.addEventListener('change', (e) => {
    state.selectedTarget = e.target.value;
    applyFilters();
  });

  elements.sortSelect.addEventListener('change', (e) => {
    state.sortOrder = e.target.value;
    applyFilters();
  });

  // 전체 필터 초기화
  function resetAllFilters() {
    state.selectedCategory = '전체';
    state.selectedRequirement = '전체';
    state.selectedMethod = '전체';
    state.selectedTarget = '전체';
    state.searchQuery = '';
    state.sortOrder = 'code-asc';

    elements.searchInput.value = '';
    elements.searchClearBtn.style.display = 'none';
    elements.filterRequirement.value = '전체';
    elements.filterMethod.value = '전체';
    elements.filterTarget.value = '전체';
    elements.sortSelect.value = 'code-asc';

    if (elements.categoryPills) {
      elements.categoryPills.querySelectorAll('.category-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === '전체');
      });
    }

    applyFilters();
  }

  elements.resetFiltersBtn.addEventListener('click', resetAllFilters);
  elements.emptyResetBtn.addEventListener('click', resetAllFilters);
  elements.errorRetryBtn.addEventListener('click', () => init(true));

  // 상단 실시간 동기화/새로고침 버튼
  if (elements.refreshBtn) {
    elements.refreshBtn.addEventListener('click', () => {
      init(true);
    });
  }
});
