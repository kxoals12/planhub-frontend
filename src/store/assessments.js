// src/store/assessments.js
// ------------------------------------------------------------------------
// 대시보드 ↔ 학생/선생님 패널을 오갈 때마다 목록이 비워지고 "불러오는 중"이
// 다시 뜨는 문제를 막기 위한 전역 스토어. modeState와 같은 패턴으로,
// 컴포넌트가 unmount 돼도 이 데이터와 Firestore 구독은 그대로 유지됩니다.
//
// 사용법 (컴포넌트에서):
//   mounted() { subscribeAssessments(this.mySchool); }
//   computed: {
//     store() { return getAssessments(this.mySchool); },
//     schedules() { return this.store.list; },
//     loading() { return !this.store.loaded; },
//   }
//
// 주의: 한 번 구독을 시작하면 페이지를 벗어나도 끊지 않고 계속 실시간으로
// 받습니다 (그래야 다시 돌아왔을 때 바로 최신 데이터가 보여요). 학교 규모
// 앱이라 데이터량이 적어서 괜찮지만, 학교가 아주 많아지면 이 부분을
// 나중에 손봐야 할 수 있어요.
// ------------------------------------------------------------------------

const assessmentsStore = Vue.reactive({
  bySchool: {}, // { [schoolKey]: { list: [], loaded: false, error: '' } }
});

const _assessmentListeners = {}; // { [schoolKey]: unsubscribe function }

function _schoolKey(school) {
  return school || '__all__';
}

function getAssessments(school) {
  const key = _schoolKey(school);
  if (!assessmentsStore.bySchool[key]) {
    assessmentsStore.bySchool[key] = { list: [], loaded: false, error: '' };
  }
  return assessmentsStore.bySchool[key];
}

function subscribeAssessments(school) {
  const key = _schoolKey(school);
  getAssessments(school); // 항목이 없으면 초기화

  // 이미 이 학교로 구독 중이면 다시 걸지 않음 — 기존 데이터를 그대로 둠
  if (_assessmentListeners[key]) return;

  let query = db.collection('assessments');
  if (school) query = query.where('school', '==', school);

  _assessmentListeners[key] = query.onSnapshot(
    (snap) => {
      const entry = getAssessments(school);
      entry.list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      entry.loaded = true;
      entry.error = '';
    },
    (err) => {
      console.error(err);
      const entry = getAssessments(school);
      entry.error = '수행평가 목록을 불러오는 중 오류가 발생했습니다.';
      entry.loaded = true;
    }
  );
}