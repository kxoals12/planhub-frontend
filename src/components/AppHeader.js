// src/components/AppHeader.js
const AppHeader = {
  name: 'AppHeader',
  inject: ['modeState'],
  data() {
    return {
      mobileNavOpen: false,
    };
  },
  computed: {
    modeLabel() {
      return modeLabels[this.modeState.current] ?? '';
    },
    modeBadgeColor() {
      return modeBadgeColors[this.modeState.current] ?? '#6B7A99';
    },
    navLinks() {
      const mode = this.modeState.current;
      if (mode === 'teacher') return [{ to: '/',        label: '대시보드' }, { to: '/teacher', label: '일정 관리' }, { to: '/calendar',  label: '캘린더' }, { to: '/timetable', label: '시간표' }, { to: '/meal',    label: '급식' },];
      if (mode === 'student') return [{ to: '/',        label: '대시보드' }, { to: '/student', label: '내 일정'   }, { to: '/calendar',  label: '캘린더' }, { to: '/timetable', label: '시간표' }, { to: '/meal',    label: '급식' },];
      if (mode === 'admin')   return [{ to: '/',        label: '대시보드' }, { to: '/admin',   label: '관리자'   }];
      return [];
    },
  },
  methods: {
    switchMode() {
      clearMode();
      this.mobileNavOpen = false;
      this.$router.push('/');
    },
  },
  template: `
    <header class="ph-header">
      <a class="ph-header__logo" href="#/">
        <svg class="ph-header__logo-icon" viewBox="0 0 36 36" fill="none">
          <rect width="36" height="36" rx="8" fill="#FF5F47"/>
          <rect x="8" y="10" width="20" height="2.5" rx="1.25" fill="white"/>
          <rect x="8" y="16.75" width="14" height="2.5" rx="1.25" fill="white"/>
          <rect x="8" y="23.5" width="17" height="2.5" rx="1.25" fill="white"/>
          <circle cx="27" cy="23.5" r="5" fill="#0F1B35" stroke="white" stroke-width="2"/>
          <path d="M25 23.5l1.5 1.5 2.5-2.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="ph-header__logo-text">Plan<span>Hub</span></span>
      </a>

      <!-- 네비게이션 -->
      <nav class="ph-header__nav">
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="ph-nav-link"
          active-class="active"
          exact
        >{{ link.label }}</router-link>
      </nav>

      <!-- 모드 뱃지 + 전환 버튼 -->
      <div style="display:flex;align-items:center;gap:12px">
        <div v-if="modeState.current" class="ph-header__role-badge">
          <span class="role-dot" :style="{ background: modeBadgeColor }"></span>
          {{ modeLabel }} 모드
        </div>
        <button
          v-if="modeState.current"
          @click="switchMode"
          style="
            padding:6px 14px;border-radius:100px;border:1px solid rgba(255,255,255,0.3);
            background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.8);
            font-size:0.78rem;cursor:pointer;font-family:var(--font-sans);
            transition:var(--transition);
          "
          @mouseenter="e => e.currentTarget.style.background='rgba(255,255,255,0.2)'"
          @mouseleave="e => e.currentTarget.style.background='rgba(255,255,255,0.1)'"
        >
          모드 전환
        </button>
      </div>

      <!-- 모바일 햄버거 -->
      <button class="ph-header__burger" @click="mobileNavOpen = true" aria-label="메뉴 열기">
        <span></span><span></span><span></span>
      </button>

      <!-- 모바일 오버레이 -->
      <div class="mobile-nav-overlay" :class="{ open: mobileNavOpen }">
        <button class="mobile-close-btn" @click="mobileNavOpen = false">✕</button>
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="ph-nav-link"
          @click="mobileNavOpen = false"
        >{{ link.label }}</router-link>
        <button
          v-if="modeState.current"
          @click="switchMode"
          class="ph-nav-link"
          style="background:rgba(255,95,71,0.2);margin-top:16px"
        >모드 전환</button>
      </div>
    </header>
  `,
};