// src/store/mode.js
// 전역 모드 상태 — provide/inject로 모든 컴포넌트에서 접근 가능
const modeState = Vue.reactive({
  current: null,  // null | 'teacher' | 'student' | 'admin'
  isAuthenticated: false,
  selectedSchool: null, // { id, name, region, address }
});

const modeLabels = {
  teacher: '선생님',
  student: '학생',
  admin:   '관리자',
};

const modeBadgeColors = {
  teacher: '#34D1BF',
  student: '#F0B429',
  admin:   '#FF5F47',
};

const ADMIN_PASSWORD = 'admin1234';

function setMode(mode) {
  modeState.current = mode;
  modeState.isAuthenticated = true;
}

function setSchool(school) {
  modeState.selectedSchool = school;
}

function clearMode() {
  modeState.current = null;
  modeState.isAuthenticated = false;
  modeState.selectedSchool = null;
}

function checkAdminPassword(pw) {
  return pw === ADMIN_PASSWORD;
}