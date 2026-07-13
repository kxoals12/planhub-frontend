(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.assessmentConflictUtils = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  // 같은 교과군에 속한 과목들은 학생 부담 카운트 시 하나로 묶음
  const SUBJECT_GROUPS = [
    // 국어
    ['공통국어1','공통국어2','문학','화법과 언어','독서와 작문','독서 토론과 글쓰기','매체 의사소통'],
    // 영어
    ['공통영어1','공통영어2','영어I','영어II','영어 독해와 작문'],
    // 수학
    ['공통수학1','공통수학2','기본수학1','기본수학2','대수','미적분Ⅰ','확률과 통계','미적분Ⅱ','기하'],
    // 사회 · 역사 (같은 교과군이므로 겹쳐도 문제 없음)
    ['통합사회1','통합사회2','사회와 문화','정치','세계시민과 지리','지리 부도',
     '한국사1','한국사2','역사 부도','세계사','현대사회와 윤리'],
    // 과학
    ['통합과학1','통합과학2','과학탐구실험1','과학탐구실험2',
     '물리학','역학과 에너지','전자기와 양자',
     '화학','물질과 에너지','화학 반응의 세계',
     '생명과학','세포와 물질대사','생물의 유전',
     '지구과학','지구시스템과학','행성우주과학'],
    // 예·체능
    ['음악','음악 감상과 비평','미술','미술 창작','체육1','체육2','스포츠 생활1','스포츠 생활2'],
    // 기타
    ['기술·가정','정보','일본어','일본 문화','중국어','한문','인공지능 기초','진로와 직업'],
  ];

  function getSubjectGroupKey(subject) {
    const s = String(subject || '').trim().replace(/\s+/g, '');
    for (let i = 0; i < SUBJECT_GROUPS.length; i++) {
      const group = SUBJECT_GROUPS[i];
      for (let j = 0; j < group.length; j++) {
        if (group[j].replace(/\s+/g, '') === s) return `group_${i}`;
      }
    }
    return s; // 그룹 없으면 과목명 자체를 키로
  }

  function subjectMatchesTeacherSubject(selectedSubject, teacherSubject) {
    const selected = String(selectedSubject || '').trim();
    const teacher = String(teacherSubject || '').trim();

    if (!selected || !teacher) return false;

    const normalizedSelected = selected.replace(/\s+/g, '');
    const normalizedTeacher = teacher.replace(/\s+/g, '');

    if (normalizedSelected === normalizedTeacher) return true;
    return normalizedSelected.includes(normalizedTeacher) || normalizedTeacher.includes(normalizedSelected);
  }

  function buildStudentSubjectOverlapWarnings({ assessments = [], students = [], targetDate, currentSubject, threshold = 4 }) {
    if (!targetDate || !currentSubject) return [];

    const normalizedSubject = String(currentSubject).trim();
    if (!normalizedSubject) return [];

    const sameDayAssessments = (assessments || []).filter((assessment) => assessment && assessment.date === targetDate && assessment.subject);

    return students
      .map((student) => {
        const selectedSubjects = Array.isArray(student.subjects) ? student.subjects.filter(Boolean) : [];
        const hasRelevantSubject = selectedSubjects.some((subject) => subjectMatchesTeacherSubject(subject, normalizedSubject));
        if (!hasRelevantSubject) return null;

        // 교과군 기준으로 중복 제거하여 카운트
        const overlappingGroupKeys = new Set([getSubjectGroupKey(normalizedSubject)]);
        const overlappingSubjects = new Set([normalizedSubject]);

        sameDayAssessments.forEach((assessment) => {
          if (selectedSubjects.some((subject) => subjectMatchesTeacherSubject(subject, assessment.subject))) {
            const groupKey = getSubjectGroupKey(assessment.subject);
            overlappingGroupKeys.add(groupKey);
            overlappingSubjects.add(assessment.subject);
          }
        });

        // 교과군 기준 count로 threshold 비교
        if (overlappingGroupKeys.size < threshold) return null;

        return {
          studentId: student.id || student.studentId || '',
          studentName: student.name || student.studentId || '학생',
          count: overlappingGroupKeys.size,
          subjects: Array.from(overlappingSubjects).sort(),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.count - a.count || a.studentName.localeCompare(b.studentName));
  }

  return {
    buildStudentSubjectOverlapWarnings,
  };
}));
