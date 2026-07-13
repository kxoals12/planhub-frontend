// src/views/StudentPanel.js
const StudentPanel = {
  name: 'StudentPanel',
  components: { CalendarGrid, ScheduleCard },
  inject: ['modeState'],
  data() {
    return {
      mySubjects: [],
      allSchedules: [],
      loading: true,
      loadError: '',
      unsubscribe: null,
      selectedDay: null,
      showModal: false,
    };
  },
  computed: {
    mySchedules() {
      const today = new Date().toISOString().split('T')[0];
      return this.allSchedules
        .filter(s => this.mySubjects.includes(s.classRoom) && s.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    calEvents() {
      return this.allSchedules.filter(s => this.mySubjects.includes(s.classRoom));
    },
    selectedDateKey() {
      if (!this.selectedDay) return '';
      const d = this.selectedDay;
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    },
    selectedSchedules() {
      if (!this.selectedDateKey) return [];
      return this.allSchedules.filter(s => this.mySubjects.includes(s.classRoom) && s.date === this.selectedDateKey);
    },
    selectedDateLabel() {
      if (!this.selectedDay) return '';
      const d = this.selectedDay;
      const days = ['일','월','화','수','목','금','토'];
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} (${days[d.getDay()]})`;
    },
  },
  async mounted() {
    const user = auth.currentUser;
    if (user) {
      try {
        const snap = await db.collection('students').doc(user.uid).get();
        if (snap.exists) {
          this.mySubjects = snap.data().subjects || [];
        }
      } catch (e) {
        console.error('수강 과목 로드 실패:', e);
      }
    }
    this.listenAssessments();
  },
  beforeUnmount() {
    if (this.unsubscribe) this.unsubscribe();
  },
  methods: {
    listenAssessments() {
      this.loading = true;
      const school = this.modeState?.selectedSchool?.name;
      let query = db.collection('assessments');
      if (school) {
        query = query.where('school', '==', school);
      }
      this.unsubscribe = query.onSnapshot(
        (snap) => {
          this.allSchedules = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          this.loading = false;
        },
        (err) => {
          console.error(err);
          this.loadError = '수행평가 목록을 불러오는 중 오류가 발생했습니다.';
          this.loading = false;
        }
      );
    },
    onDayClick(day) {
      this.selectedDay = day.date;
      this.showModal = true;
    },
    ddayNum(dateStr) {
      const today = new Date(); today.setHours(0,0,0,0);
      const target = new Date(dateStr); target.setHours(0,0,0,0);
      return Math.ceil((target - today) / 86400000);
    },
    ddayLabel(dateStr) {
      const d = this.ddayNum(dateStr);
      if (d === 0) return 'D-Day';
      return d > 0 ? `D-${d}` : `D+${Math.abs(d)}`;
    },
    subjectColor(subject) {
      const map = {국어:'#EF4444',수학:'#3B82F6',영어:'#10B981',과학:'#8B5CF6',사회:'#F59E0B',음악:'#EC4899',미술:'#F97316'};
      return map[subject] || '#6B7A99';
    },
    ringDasharray(dday, maxDays = 30) {
      const r = 42;
      const circ = 2 * Math.PI * r;
      const progress = Math.max(0, Math.min(1, 1 - (dday / maxDays)));
      return `${progress * circ} ${circ}`;
    },
    urgencyClass(dday) {
      if (dday <= 3) return 'badge-red';
      if (dday <= 7) return 'badge-yellow';
      return 'badge-blue';
    },
  },
  template: `
    <main class="ph-main">
      <div class="page-header">
        <div class="page-header__title">
          <h1>학생 <em>패널</em></h1>
          <p class="page-header__subtitle">나의 수행평가 일정을 확인하세요</p>
        </div>
        <div v-if="mySubjects.length > 0" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
          <span style="font-size:0.78rem;color:var(--text-muted);font-weight:600">수강 과목</span>
          <span v-for="s in mySubjects" :key="s"
            style="padding:3px 10px;border-radius:100px;background:#E6FAF8;color:var(--navy);font-size:0.75rem;font-weight:600">
            {{ s }}
          </span>
        </div>
      </div>

      <div v-if="loadError" class="conflict-alert" style="margin-bottom:24px">
        <span class="conflict-alert__icon">⚠️</span>
        <div class="conflict-alert__text">{{ loadError }}</div>
      </div>

      <!-- D-Day SVG Ring Cards -->
      <div class="ph-card" style="margin-bottom:24px">
        <div class="ph-card__header">
          <span class="ph-card__title">내 수강 과목 수행평가 D-Day</span>
          <span class="badge badge-blue mono">{{ mySchedules.length }}건</span>
        </div>
        <div class="ph-card__body">
          <div v-if="loading" class="text-muted" style="text-align:center;padding:32px">불러오는 중...</div>
          <div v-else class="dday-ring-container">
            <div
              v-for="s in mySchedules"
              :key="s.id"
              style="display:flex;flex-direction:column;align-items:center;gap:8px;min-width:100px"
            >
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#E8E1D4" stroke-width="8"/>
                <circle cx="50" cy="50" r="42"
                  fill="none"
                  :stroke="subjectColor(s.subject)"
                  stroke-width="8"
                  stroke-linecap="round"
                  :stroke-dasharray="ringDasharray(ddayNum(s.date))"
                  stroke-dashoffset="0"
                  transform="rotate(-90 50 50)"
                  style="transition:stroke-dasharray 0.6s ease"
                />
                <text x="50" y="44" text-anchor="middle"
                  font-family="JetBrains Mono, monospace"
                  font-size="14" font-weight="700"
                  :fill="subjectColor(s.subject)">
                  {{ ddayLabel(s.date) }}
                </text>
                <text x="50" y="60" text-anchor="middle"
                  font-family="Noto Sans KR, sans-serif"
                  font-size="10" fill="#6B7A99">
                  {{ s.classRoom }}
                </text>
              </svg>
              <span style="font-size:0.78rem;font-weight:700;color:var(--navy);text-align:center;max-width:90px;line-height:1.3">
                {{ s.title }}
              </span>
              <span style="font-size:0.7rem;color:var(--text-muted)">{{ s.date }}</span>
            </div>
            <div v-if="mySchedules.length === 0" style="padding:40px;color:var(--text-muted);text-align:center;width:100%">
              예정된 수행평가가 없습니다 🎉
            </div>
          </div>
        </div>
      </div>

      <!-- List view -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px" class="student-grid">
        <div class="ph-card">
          <div class="ph-card__header">
            <span class="ph-card__title">일정 목록</span>
          </div>
          <div class="ph-card__body">
            <div class="upcoming-list">
              <schedule-card
                v-for="s in mySchedules"
                :key="s.id"
                :schedule="s"
              />
              <div v-if="!loading && mySchedules.length === 0" class="text-muted" style="text-align:center;padding:32px">
                예정된 수행평가가 없습니다.
              </div>
            </div>
          </div>
        </div>
        <div class="ph-card">
          <div class="ph-card__body">
            <calendar-grid :events="calEvents" @day-click="onDayClick" />
          </div>
        </div>
      </div>

      <!-- Calendar Day Detail Modal -->
      <div v-if="showModal" style="position:fixed;inset:0;background:rgba(15,27,53,0.6);display:flex;align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(4px)" @click.self="showModal=false">
        <div style="background:var(--white);border-radius:var(--radius-lg);width:100%;max-width:520px;max-height:80vh;display:flex;flex-direction:column;box-shadow:var(--shadow-lg);overflow:hidden">
          <div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
            <div>
              <div style="font-family:var(--font-serif);font-size:1.2rem;color:var(--navy)">{{ selectedDateLabel }}</div>
              <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">{{ selectedSchedules.length > 0 ? selectedSchedules.length + '개의 수행평가' : '수행평가 없음' }}</div>
            </div>
            <button @click="showModal=false" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--text-muted)">✕</button>
          </div>
          <div style="overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px">
            <div v-if="selectedSchedules.length === 0" style="text-align:center;padding:40px;color:var(--text-muted)">이 날짜에 수행평가가 없습니다 🎉</div>
            <div v-for="s in selectedSchedules" :key="s.id" style="display:flex;gap:14px;align-items:flex-start;padding:14px 16px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--cream)">
              <div style="width:4px;border-radius:4px;align-self:stretch;flex-shrink:0" :style="{ background: subjectColor(s.subject) }"></div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span class="badge" :class="ddayClass(s.date)">{{ ddayLabel(s.date) }}</span>
                  <span style="font-weight:700;color:var(--navy);font-size:0.95rem">{{ s.classRoom }}</span>
                  <span v-if="s.conflict" style="font-size:0.72rem;color:#FF5F47;font-weight:600">⚠ 충돌</span>
                </div>
                <div style="font-size:0.92rem;color:var(--navy);font-weight:600;margin-bottom:4px">{{ s.title }}</div>
                <div style="font-size:0.78rem;color:var(--text-muted);display:flex;gap:12px;flex-wrap:wrap">
                  <span>👤 {{ s.teacher }} 선생님</span>
                  <span>📝 {{ s.type }}</span>
                </div>
                <div v-if="s.description" style="font-size:0.8rem;color:var(--text-muted);margin-top:8px;padding:8px;background:white;border-radius:6px;line-height:1.5">{{ s.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  `,
};