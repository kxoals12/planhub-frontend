// src/views/TimetableTab.js
const TimetableTab = {
  name: 'TimetableTab',
  inject: ['modeState'],
  data() {
    return {
      weekStart: this.mondayOf(new Date()),
      grade: '',
      classNm: '',
      myDefaultGrade: '',
      myDefaultClass: '',
      grid: {},           // { 'YYYYMMDD': { '1': '수학', '2': '영어', ... } }
      loading: false,
      errorMsg: '',
      gradeOptions: ['1', '2', '3'],
      classOptions: Array.from({ length: 10 }, (_, i) => String(i + 1)),
    };
  },
  computed: {
    schoolName() {
      return this.modeState.selectedSchool?.name || '';
    },
    weekDates() {
      const dayLabels = ['월', '화', '수', '목', '금'];
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return dayLabels.map((label, i) => {
        const d = new Date(this.weekStart);
        d.setDate(d.getDate() + i);
        return {
          date: d,
          key: this.toYMD(d),
          label,
          dateLabel: `${d.getMonth() + 1}/${d.getDate()}`,
          isToday: d.getTime() === today.getTime(),
        };
      });
    },
    weekLabel() {
      if (this.weekDates.length === 0) return '';
      const s = this.weekDates[0].date, e = this.weekDates[4].date;
      const fmt = (d) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
      return `${fmt(s)} ~ ${fmt(e)}`;
    },
    periodList() {
      const periods = new Set();
      Object.values(this.grid).forEach(dayMap => {
        Object.keys(dayMap).forEach(p => periods.add(Number(p)));
      });
      if (periods.size === 0) return [1, 2, 3, 4, 5, 6, 7];
      return Array.from(periods).sort((a, b) => a - b);
    },
    isMyClass() {
      return this.modeState.current === 'student'
        && this.grade === this.myDefaultGrade
        && this.classNm === this.myDefaultClass;
    },
  },
  async mounted() {
    await this.initGradeClass();
    this.loadTimetable();
  },
  methods: {
    mondayOf(date) {
      const d = new Date(date);
      const day = d.getDay(); // 0=Sun, 6=Sat
      // 주말에는 이미 지나간 주(월~금)보다 다가오는 주를 보여주는 게 실용적이므로
      // 토/일에는 다음 주 월요일로 이동
      let diff;
      if (day === 0) diff = 1;       // 일요일 → 내일(다음주 월)
      else if (day === 6) diff = 2;  // 토요일 → 모레(다음주 월)
      else diff = 1 - day;           // 월~금 → 이번주 월요일
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    },
    toYMD(date) {
      return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    },
    async initGradeClass() {
      if (modeState.current === 'student') {
        const user = auth.currentUser;
        if (user) {
          try {
            const snap = await db.collection('students').doc(user.uid).get();
            if (snap.exists) {
              const data = snap.data();
              const g = (data.grade || '').replace(/[^0-9]/g, '');
              const c = (data.classRoom || '').replace(/[^0-9]/g, '');
              this.grade = g || '1';
              this.classNm = c || '1';
              this.myDefaultGrade = this.grade;
              this.myDefaultClass = this.classNm;
            }
          } catch (e) {
            console.error('학년/반 정보 로드 실패:', e);
          }
        }
      }
      // 선생님, 혹은 학생 정보 로드 실패 시 기본값
      if (!this.grade) this.grade = '1';
      if (!this.classNm) this.classNm = '1';
    },
    resetToMyClass() {
      if (!this.myDefaultGrade || !this.myDefaultClass) return;
      this.grade = this.myDefaultGrade;
      this.classNm = this.myDefaultClass;
      this.loadTimetable();
    },
    prevWeek() {
      const d = new Date(this.weekStart);
      d.setDate(d.getDate() - 7);
      this.weekStart = d;
      this.loadTimetable();
    },
    nextWeek() {
      const d = new Date(this.weekStart);
      d.setDate(d.getDate() + 7);
      this.weekStart = d;
      this.loadTimetable();
    },
    goThisWeek() {
      this.weekStart = this.mondayOf(new Date());
      this.loadTimetable();
    },
    parseTimetable(json) {
      const map = {};
      try {
        const rows = json.hisTimetable[1].row;
        rows.forEach(r => {
          const date = r.ALL_TI_YMD;
          const period = r.PERIO;
          if (!map[date]) map[date] = {};
          map[date][period] = r.ITRT_CNTNT;
        });
      } catch {
        // 해당 주간에 데이터가 없는 경우 등 — 빈 시간표로 처리
      }
      return map;
    },
    async loadTimetable() {
      this.errorMsg = '';
      const school = this.modeState.selectedSchool;
      if (!school?.officeCode || !school?.schoolCode) {
        this.errorMsg = '학교 정보가 없습니다. 학교를 다시 선택해 주세요.';
        return;
      }
      if (!this.grade || !this.classNm) return;

      this.loading = true;
      this.grid = {};
      const from = this.toYMD(this.weekDates[0].date);
      const to = this.toYMD(this.weekDates[4].date);
      try {
        const res = await fetch(
          `http://localhost:8080/api/timetable?officeCode=${school.officeCode}&schoolCode=${school.schoolCode}&grade=${this.grade}&classNm=${this.classNm}&fromDate=${from}&toDate=${to}`
        );
        if (!res.ok) throw new Error('서버 오류');
        const json = await res.json();
        this.grid = this.parseTimetable(json);
      } catch (e) {
        console.error(e);
        this.errorMsg = '시간표를 불러오는 중 오류가 발생했습니다.';
      }
      this.loading = false;
    },
    cell(dateKey, period) {
      return this.grid[dateKey]?.[String(period)] || '';
    },
  },
  watch: {
    grade() { this.loadTimetable(); },
    classNm() { this.loadTimetable(); },
  },
  template: `
    <main class="ph-main">
      <div class="page-header">
        <div class="page-header__title">
          <h1>시간표 <em>Timetable</em></h1>
          <p class="page-header__subtitle">{{ schoolName }} · {{ grade }}학년 {{ classNm }}반 시간표</p>
        </div>
      </div>

      <div class="ph-card">
        <div class="ph-card__header" style="flex-wrap:wrap;gap:10px">
          <span class="ph-card__title">주간 시간표</span>
          <div style="display:flex;gap:8px;align-items:center">
            <select class="form-control" v-model="grade" style="width:88px">
              <option v-for="g in gradeOptions" :key="g" :value="g">{{ g }}학년</option>
            </select>
            <select class="form-control" v-model="classNm" style="width:88px">
              <option v-for="c in classOptions" :key="c" :value="c">{{ c }}반</option>
            </select>
            <button
              v-if="modeState.current === 'student' && !isMyClass"
              class="btn btn-ghost btn-sm"
              @click="resetToMyClass"
            >내 시간표로</button>
            <span v-else-if="modeState.current === 'student' && isMyClass" class="badge badge-blue">내 시간표</span>
          </div>
        </div>

        <div class="ph-card__body">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm" @click="prevWeek">◀ 이전주</button>
            <span class="mono" style="font-weight:600;color:var(--navy)">{{ weekLabel }}</span>
            <button class="btn btn-ghost btn-sm" @click="nextWeek">다음주 ▶</button>
            <button class="btn btn-outline btn-sm" @click="goThisWeek">이번주</button>
          </div>

          <div v-if="errorMsg" class="conflict-alert" style="margin-bottom:16px">
            <span class="conflict-alert__icon">⚠️</span>
            <div class="conflict-alert__text">{{ errorMsg }}</div>
          </div>

          <div v-else-if="loading" style="text-align:center;padding:40px;color:var(--text-muted)">불러오는 중...</div>

          <div v-else style="overflow-x:auto">
            <table class="ph-table tt-table">
              <thead>
                <tr>
                  <th style="width:56px;text-align:center">교시</th>
                  <th v-for="d in weekDates" :key="d.key" :class="{ 'tt-today': d.isToday }" style="text-align:center">
                    <span :class="{ 'tt-today-label': d.isToday }">{{ d.label }}</span><br/>
                    <span class="text-muted mono" style="font-weight:400;font-size:0.72rem">{{ d.dateLabel }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in periodList" :key="p">
                  <td class="mono" style="text-align:center;font-weight:700;color:var(--navy)">{{ p }}</td>
                  <td v-for="d in weekDates" :key="d.key + '-' + p" :class="{ 'tt-today': d.isToday }" style="text-align:center">
                    <span v-if="cell(d.key, p)" class="tt-cell">{{ cell(d.key, p) }}</span>
                    <span v-else class="tt-empty">–</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  `,
};