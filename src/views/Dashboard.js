// src/views/Dashboard.js
const Dashboard = {
  name: 'Dashboard',
  components: { CalendarGrid, ScheduleCard },
  data() {
    return {
      events: [
        { date:'2025-06-02', subject:'수학', title:'2단원 수행평가', classRoom:'2-1', teacher:'김수학', conflict:false },
        { date:'2025-06-02', subject:'영어', title:'말하기 발표', classRoom:'2-1', teacher:'박영어', conflict:true },
        { date:'2025-06-02', subject:'국어', title:'독서토론', classRoom:'2-1', teacher:'이국어', conflict:true },
        { date:'2025-06-05', subject:'과학', title:'탐구보고서', classRoom:'1-3', teacher:'최과학', conflict:false },
        { date:'2025-06-10', subject:'사회', title:'모둠발표', classRoom:'3-2', teacher:'정사회', conflict:false },
        { date:'2025-06-12', subject:'수학', title:'연산 수행', classRoom:'1-1', teacher:'김수학', conflict:false },
        { date:'2025-06-15', subject:'국어', title:'시 창작', classRoom:'2-3', teacher:'이국어', conflict:false },
        { date:'2025-06-18', subject:'영어', title:'Writing 평가', classRoom:'3-1', teacher:'박영어', conflict:false },
      ],
      stats: [
        { value: 24, label: '이번 달 수행평가', color: 'coral' },
        { value: 3,  label: '충돌 일정', color: 'gold' },
        { value: 8,  label: '학급 수', color: 'mint' },
      ],
    };
  },
  computed: {
    upcomingSchedules() {
      const today = new Date().toISOString().split('T')[0];
      return this.events
        .filter(e => e.date >= today)
        .sort((a,b) => a.date.localeCompare(b.date))
        .slice(0, 5);
    },
  },
  template: `
    <main class="ph-main">
      <div class="page-header">
        <div class="page-header__title">
          <h1>대시보드 <em>Overview</em></h1>
          <p class="page-header__subtitle">전체 수행평가 일정을 한눈에 확인하세요</p>
        </div>
        <router-link to="/teacher" class="btn btn-primary">
          <span>＋</span> 수행평가 등록
        </router-link>
      </div>

      <!-- Stats Row -->
      <div class="stats-row">
        <div v-for="s in stats" :key="s.label" class="stat-card" :class="s.color">
          <div class="stat-card__value mono">{{ s.value }}</div>
          <div class="stat-card__label">{{ s.label }}</div>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="dashboard-grid">
        <!-- Calendar -->
        <section class="calendar-section">
          <div class="ph-card">
            <div class="ph-card__body">
              <calendar-grid :events="events" />
            </div>
          </div>
        </section>

        <!-- Stats/Alerts -->
        <section class="stats-section">
          <div class="ph-card">
            <div class="ph-card__header">
              <span class="ph-card__title">충돌 알림</span>
              <span class="badge badge-red">{{ events.filter(e=>e.conflict).length }}</span>
            </div>
            <div class="ph-card__body">
              <div class="conflict-alert">
                <span class="conflict-alert__icon">⚠️</span>
                <div class="conflict-alert__text">
                  <div class="conflict-alert__title">2-1반 · 2025-06-02</div>
                  수학, 영어, 국어 3과목이 같은 날 겹칩니다.
                </div>
              </div>
              <p class="text-muted" style="font-size:0.82rem;margin-top:8px">
                일정 조정이 필요합니다. 선생님 패널에서 날짜를 변경해 주세요.
              </p>
            </div>
          </div>
        </section>

        <!-- Upcoming -->
        <section class="upcoming-section">
          <div class="ph-card">
            <div class="ph-card__header">
              <span class="ph-card__title">다가오는 일정</span>
              <router-link to="/student" class="btn btn-ghost btn-sm">전체 보기</router-link>
            </div>
            <div class="ph-card__body">
              <div class="upcoming-list">
                <schedule-card
                  v-for="s in upcomingSchedules"
                  :key="s.date+s.subject"
                  :schedule="s"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  `,
};