/**
 * 2026 부산대학교 직무연수 포털 - 상세 페이지 컨트롤러 (detail.js)
 */

document.addEventListener('DOMContentLoaded', async () => {
  // URL 파라미터에서 과정코드 추출
  const urlParams = new URLSearchParams(window.location.search);
  const courseCode = (urlParams.get('code') || '').trim();

  // DOM 요소 캐싱
  const elements = {
    detailContent: document.getElementById('detail-content'),
    notFoundState: document.getElementById('not-found-state'),
    loadingState: document.getElementById('detail-loading'),
    
    // Breadcrumb
    breadcrumbCategory: document.getElementById('breadcrumb-category'),
    breadcrumbCurrent: document.getElementById('breadcrumb-current'),
    backBtn: document.getElementById('back-btn'),
    
    // Hero Elements
    badgeRequirement: document.getElementById('badge-requirement'),
    badgeMethod: document.getElementById('badge-method'),
    badgeCategory: document.getElementById('badge-category'),
    badgeCode: document.getElementById('badge-code'),
    detailTitle: document.getElementById('detail-title'),
    detailOneLine: document.getElementById('detail-one-line'),
    
    // Content Blocks
    detailDesc: document.getElementById('detail-desc'),
    objectiveList: document.getElementById('objective-list'),
    curriculumList: document.getElementById('curriculum-list'),
    
    // Sidebar Elements
    applyBtn: document.getElementById('apply-btn'),
    tableTarget: document.getElementById('table-target'),
    tableHours: document.getElementById('table-hours'),
    tableCapacity: document.getElementById('table-capacity'),
    tablePeriod: document.getElementById('table-period'),
    tableApplyPeriod: document.getElementById('table-apply-period'),
    tableDept: document.getElementById('table-dept'),
    tableInquiry: document.getElementById('table-inquiry'),
    copyUrlBtn: document.getElementById('copy-url-btn'),
    toastNotice: document.getElementById('toast-notice'),
    
    // Related Section
    relatedSection: document.getElementById('related-section'),
    relatedCategoryName: document.getElementById('related-category-name'),
    relatedGrid: document.getElementById('related-grid'),
    
    refreshBtn: document.getElementById('refresh-btn')
  };

  // 과정코드 미입력 시 바로 Not Found 표시
  if (!courseCode) {
    showNotFound('과정 코드가 지정되지 않았습니다.');
    return;
  }

  // 데이터 로드
  await loadCourseDetail(courseCode);

  async function loadCourseDetail(code, forceRefresh = false) {
    elements.loadingState.style.display = 'block';
    elements.detailContent.style.display = 'none';
    elements.notFoundState.style.display = 'none';

    try {
      const course = await getCourseByCode(code);
      if (!course) {
        showNotFound(`과정코드 [${code}]에 해당하는 연수 정보를 찾을 수 없습니다.`);
        return;
      }

      renderCourseDetail(course);
      await loadRelatedCourses(course['분야'], course['과정코드']);

      elements.loadingState.style.display = 'none';
      elements.detailContent.style.display = 'block';

      if (window.lucide) {
        lucide.createIcons();
      }
    } catch (err) {
      console.error('상세 정보 로드 실패:', err);
      showNotFound('데이터를 불러오는 중 오류가 발생했습니다.');
    }
  }

  function renderCourseDetail(course) {
    const title = course['과정명'] || '과정명 미정';
    const code = course['과정코드'] || '';
    const category = course['분야'] || '직무연수';
    const requirement = course['이수구분'] || '선택';
    const method = course['교육방식'] || '온라인';
    const oneLine = course['한줄소개'] || '';
    const fullDesc = course['상세소개'] || oneLine || '상세 소개 내용이 준비 중입니다.';
    const objectives = course['학습목표'] || '';
    const curriculum = course['주요내용'] || '';
    const applyLink = course['신청링크'] || '#';
    const target = course['대상'] || '전 직원';
    const hours = course['교육시간'] || '미정';
    const capacity = course['정원'] || '무제한';
    const period = course['교육기간'] || '상시';
    const applyPeriod = course['신청기간'] || '상시';
    const dept = course['담당부서'] || '인재개발원';
    const inquiry = course['문의'] || '-';

    // 브라우저 탭 타이틀 업데이트
    document.title = `${title} | 2026 부산대학교 교직원 직무연수`;

    // 1. Breadcrumbs
    elements.breadcrumbCategory.textContent = category;
    elements.breadcrumbCurrent.textContent = title;

    // 2. Hero Badges & Titles
    elements.badgeCode.textContent = code;
    elements.badgeRequirement.textContent = requirement;
    elements.badgeRequirement.className = `badge ${getRequirementBadgeClass(requirement)}`;
    
    elements.badgeMethod.textContent = method;
    elements.badgeMethod.className = `badge ${getMethodBadgeClass(method)}`;

    elements.badgeCategory.textContent = category;
    elements.detailTitle.textContent = title;
    elements.detailOneLine.textContent = oneLine;

    // 3. Main Content Blocks
    elements.detailDesc.textContent = fullDesc;

    // 학습목표 (· 또는 줄바꿈으로 분리)
    const objItems = splitItems(objectives);
    if (objItems.length > 0) {
      elements.objectiveList.innerHTML = objItems.map(item => `
        <div class="objective-item">
          <i data-lucide="check-circle-2"></i>
          <span>${escapeHtml(item)}</span>
        </div>
      `).join('');
    } else {
      elements.objectiveList.innerHTML = `<p class="desc-text" style="color:var(--text-muted);">등록된 세부 학습목표가 없습니다.</p>`;
    }

    // 주요내용/커리큘럼 (· 또는 줄바꿈으로 분리)
    const curItems = splitItems(curriculum);
    if (curItems.length > 0) {
      elements.curriculumList.innerHTML = curItems.map((item, idx) => `
        <div class="curriculum-step">
          <span class="step-num">${idx + 1}</span>
          <span class="step-text">${escapeHtml(item)}</span>
        </div>
      `).join('');
    } else {
      elements.curriculumList.innerHTML = `<p class="desc-text" style="color:var(--text-muted);">등록된 세부 커리큘럼이 없습니다.</p>`;
    }

    // 4. Sidebar Elements
    if (applyLink && applyLink !== '#') {
      elements.applyBtn.href = applyLink;
      elements.applyBtn.target = '_blank';
      elements.applyBtn.rel = 'noopener noreferrer';
      elements.applyBtn.style.pointerEvents = 'auto';
      elements.applyBtn.style.opacity = '1';
    } else {
      elements.applyBtn.href = 'javascript:void(0)';
      elements.applyBtn.style.opacity = '0.6';
      elements.applyBtn.textContent = '신청 기간 준비 중';
    }

    elements.tableTarget.textContent = target;
    elements.tableHours.textContent = hours;
    elements.tableCapacity.textContent = capacity;
    elements.tablePeriod.textContent = period;
    elements.tableApplyPeriod.textContent = applyPeriod;
    elements.tableDept.textContent = dept;

    // 문의처 전화번호 링크 처리
    const phoneMatch = inquiry.match(/(\d{2,4}-\d{3,4}-\d{4})/);
    if (phoneMatch) {
      elements.tableInquiry.innerHTML = `<a href="tel:${phoneMatch[1]}">${escapeHtml(inquiry)}</a>`;
    } else {
      elements.tableInquiry.textContent = inquiry;
    }
  }

  // 동일 분야 추천 과정 로드
  async function loadRelatedCourses(category, currentCode) {
    try {
      const related = await getRelatedCourses(category, currentCode, 3);
      if (related.length === 0) {
        elements.relatedSection.style.display = 'none';
        return;
      }

      elements.relatedSection.style.display = 'block';
      elements.relatedCategoryName.textContent = category;

      elements.relatedGrid.innerHTML = related.map(c => {
        const code = escapeHtml(c['과정코드'] || '');
        const title = escapeHtml(c['과정명'] || '');
        const requirement = c['이수구분'] || '선택';
        const method = c['교육방식'] || '온라인';
        const summary = escapeHtml(c['한줄소개'] || '');
        const time = escapeHtml(c['교육시간'] || '미정');
        const dept = escapeHtml(c['담당부서'] || '인재개발원');

        return `
          <article class="course-card">
            <div class="card-top">
              <div class="card-badge-row">
                <div class="badge-group">
                  <span class="badge ${getRequirementBadgeClass(requirement)}">${escapeHtml(requirement)}</span>
                  <span class="badge ${getMethodBadgeClass(method)}">${escapeHtml(method)}</span>
                </div>
                <span class="course-code">${code}</span>
              </div>
              <h4 class="course-title" style="font-size:1.0625rem;">
                <a href="detail.html?code=${encodeURIComponent(code)}">${title}</a>
              </h4>
              <p class="course-summary" style="font-size:0.8125rem;">${summary}</p>
            </div>
            <div class="card-bottom">
              <div class="course-meta" style="padding:10px; margin-bottom:12px;">
                <div class="meta-item">
                  <i data-lucide="clock"></i>
                  <span class="meta-label">교육시간</span>
                  <span class="meta-value">${time}</span>
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
    } catch (e) {
      console.warn('추천 연수 로드 오류:', e);
      elements.relatedSection.style.display = 'none';
    }
  }

  function showNotFound(msg) {
    elements.loadingState.style.display = 'none';
    elements.detailContent.style.display = 'none';
    elements.notFoundState.style.display = 'block';
    const desc = document.getElementById('not-found-desc');
    if (desc) desc.textContent = msg;
    if (window.lucide) lucide.createIcons();
  }

  // 문자열 분리 헬퍼 (구분자 '·' 또는 줄바꿈)
  function splitItems(text) {
    if (!text) return [];
    return text
      .split(/[·\n\r]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 뒤로가기 버튼
  elements.backBtn.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'index.html';
    }
  });

  // URL 복사 버튼
  elements.copyUrlBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast('연수 링크가 클립보드에 복사되었습니다.');
    }).catch(() => {
      showToast('주소를 복사할 수 없습니다.');
    });
  });

  function showToast(msg) {
    const toast = elements.toastNotice;
    const textEl = document.getElementById('toast-text');
    if (textEl) textEl.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // 상단 새로고침 버튼
  if (elements.refreshBtn) {
    elements.refreshBtn.addEventListener('click', () => {
      loadCourseDetail(courseCode, true);
    });
  }
});
