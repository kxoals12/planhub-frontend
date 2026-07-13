// src/router/index.js
const { createRouter, createWebHashHistory } = VueRouter;

const routes = [
  { path: '/',              name: 'ModeSelect',  component: ModeSelect  },
  { path: '/teacher-auth',  name: 'TeacherAuth', component: TeacherAuth },
  { path: '/student-auth',  name: 'StudentAuth', component: StudentAuth },
  { path: '/dashboard',     name: 'Dashboard',   component: Dashboard,    meta: { roles: ['teacher','student','admin'] } },
  { path: '/teacher',       name: 'Teacher',     component: TeacherPanel, meta: { roles: ['teacher'] } },
  { path: '/student',       name: 'Student',     component: StudentPanel, meta: { roles: ['student'] } },
  { path: '/admin',         name: 'Admin',       component: AdminPanel,   meta: { roles: ['admin'] } },
  { path: '/timetable',     name: 'Timetable',   component: TimetableTab, meta: { roles: ['teacher', 'student'] } },
  { path: '/meal',          name: 'Meal',        component: MealTab,      meta: { roles: ['teacher', 'student'] } },
  { path: '/calendar',      name: 'Calendar',    component: CalendarView, meta: { roles: ['teacher', 'student'] } },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() { return { top: 0 }; },
});

router.beforeEach((to) => {
  const open = ['ModeSelect', 'TeacherAuth', 'StudentAuth'];
  if (open.includes(to.name)) return true;
  if (!modeState.isAuthenticated) return { path: '/' };
  const allowed = to.meta?.roles;
  if (allowed && !allowed.includes(modeState.current)) return { path: '/' };
  return true;
});