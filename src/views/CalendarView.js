// src/views/CalendarView.js
const CalendarView = {
  name: 'CalendarView',
  components: { CalendarGrid },
  inject: ['modeState'],
  data() {
    return {
      allSchedules: [],
      mySubjects: [],
      loading: true,
      unsubscribe: null,
      selectedDay: null,
      showModal: false,
      filterSubject: '',
      filterConflictOnly: false,
    };
  },
  computed: {
    // 사용자가 접근 가능한 모든 일정 (학생은 수강과목 기준, 교사는 전체)
    baseSchedules() {
      if (modeState.current === 'student' && this.mySubjects.length > 0) {
        return this.allSchedules.filter(s => this.mySubjects.includes(s.classRoom));
      }
      return this.allSchedules;
    },
    // 필터가 적용된 일정 (캘린더에 표시됨)
    filteredSchedules() {
      return this.baseSchedules.filter(s => {
        if (this.filterSubject && s.subject !== this.filterSubject) return false;
        if (this.filterConflictOnly && !s.conflict && !s.studentOverlapWarning) return false;
        return true;
      });
    },
    calEvents() {
      return this.filteredSchedules.map(s => ({
        id: s.id,
        date: s.date,
        subject: s.subject,
        classRoom: s.classRoom,
        title: s.title,
        teacher: s.teacher,
        conflict: s.conflict,
        studentOverlapWarning: Boolean(s.studentOverlapWarning),
      }));
    },
    selectedDateKey() {
      if (!this.selectedDay) return '';
      const d = this.selectedDay;
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    },
    selectedSchedules() {
      if (!this.selectedDateKey) return [];
      return this.filteredSchedules.filter(s => s.date === this.selectedDateKey);
    },
    selectedDateLabel() {
      if (!this.selectedDay) return '';
      const d = this.selectedDay;
      const days = ['일','월','화','수','목','금','토'];
      return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} (${days[d.getDay()]})`;
    },
    // 통계 요약 (필터링된 결과 기준)
    stats() {
      const total = this.filteredSchedules.length;
      const conflicts = this.filteredSchedules.filter(s => s.conflict || s.studentOverlapWarning).length;
      return { total, conflicts };
    },
    // 고유 과목 목록 (필터 드롭다운용)
    availableSubjects() {
      const subjects = new Set(this.baseSchedules.map(s => s.subject));
      return Array.from(subjects).sort();
    }
  },
  async mounted() {
    const user = auth.currentUser;
    if (user && modeState.current === 'student') {
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
      if (school) query = query.where('school', '==', school);
      this.unsubscribe = query.onSnapshot(
        (snap) => {
          this.allSchedules = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          this.loading = false;
        },
        (err) => { console.error(err); this.loading = false; }
      );
    },
    onDayClick(day) {
      this.selectedDay = day.date;
      this.showModal = true;
    },
    subjectColor(subject) {
      const map = { 국어:'var(--navy)', 수학:'var(--navy)', 영어:'var(--navy)', 과학:'var(--navy)', 사회:'var(--navy)' };
      return map[subject] || 'var(--navy)'; // 색상 단순화 요청에 따라 기본 네이비로 통일 (또는 필요시 약간의 명도 차이만)
    },
    ddayLabel(dateStr) {
      const today = new Date(); today.setHours(0,0,0,0);
      const target = new Date(dateStr); target.setHours(0,0,0,0);
      const d = Math.ceil((target - today) / 86400000);
      if (d === 0) return 'D-Day';
      return d > 0 ? `D-${d}` : `D+${Math.abs(d)}`;
    },
    ddayClass(dateStr) {
      // 색상 떡칠을 방지하기 위해 심플한 뱃지 스타일 사용
      const today = new Date(); today.setHours(0,0,0,0);
      const target = new Date(dateStr); target.setHours(0,0,0,0);
      const d = Math.ceil((target - today) / 86400000);
      if (d <= 7) return 'badge-red'; // 임박한 경우만 강조
      return 'badge'; // 나머지는 기본 무채색 뱃지
    },
  },
  template: `
    <main style="height:calc(100vh - 64px);display:flex;flex-direction:column;padding:24px;box-sizing:border-box;background:var(--bg)">
      
      <div class="page-header" style="margin-bottom:20px;flex-shrink:0;display:flex;justify-content:space-between;align-items:flex-end">
        <div class="page-header__title">
          <h1>일정 캘린더</h1>
          <p class="page-header__subtitle">전체 일정을 검색하고 조율하세요</p>
        </div>
        
        <!-- 통계 요약 -->
        <div style="display:flex;gap:16px;background:var(--white);padding:12px 20px;border-radius:var(--radius-md);border:1px solid var(--border)">
          <div style="display:flex;flex-direction:column;align-items:center">
            <span style="font-size:0.75rem;color:var(--text-muted);font-weight:600">표시된 일정</span>
            <span style="font-size:1.1rem;color:var(--navy);font-weight:700;font-family:var(--font-mono)">{{ stats.total }}</span>
          </div>
          <div style="width:1px;background:var(--border)"></div>
          <div style="display:flex;flex-direction:column;align-items:center">
            <span style="font-size:0.75rem;color:var(--text-muted);font-weight:600">충돌 발생</span>
            <span style="font-size:1.1rem;color:#C0392B;font-weight:700;font-family:var(--font-mono)">{{ stats.conflicts }}</span>
          </div>
        </div>
      </div>

      <!-- 필터 컨트롤 -->
      <div style="display:flex;gap:12px;margin-bottom:16px;align-items:center">
        <select v-model="filterSubject" class="form-control" style="width:160px;padding:6px 10px;font-size:0.85rem">
          <option value="">모든 과목</option>
          <option v-for="sub in availableSubjects" :key="sub" :value="sub">{{ sub }}</option>
        </select>
        
        <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;color:var(--navy);font-weight:600;cursor:pointer">
          <input type="checkbox" v-model="filterConflictOnly" style="cursor:pointer">
          충돌 발생 일정만 보기
        </label>
      </div>

      <div v-if="loading" style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-muted)">
        불러오는 중...
      </div>
      <div v-else style="flex:1;display:flex;flex-direction:column;min-height:0">
        <div class="ph-card" style="flex:1;display:flex;flex-direction:column;min-height:0">
          <div class="ph-card__body" style="flex:1;display:flex;flex-direction:column;min-height:0;padding:16px">
            <div style="flex:1;min-height:0;overflow:auto">
              <calendar-grid ref="cal" :events="calEvents" :height="'100%'" style="height:100%" @day-click="onDayClick" />
            </div>
          </div>
        </div>
      </div>

      <!-- 모달 (미니멀 디자인, 이모지 제거) -->
      <div v-if="showModal" style="position:fixed;inset:0;background:rgba(15,27,53,0.5);display:flex;align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(2px)" @click.self="showModal=false">
        <div style="background:var(--white);border-radius:var(--radius-md);width:100%;max-width:480px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 10px 25px rgba(0,0,0,0.1);overflow:hidden">
          
          <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
            <div>
              <div style="font-size:1.1rem;font-weight:700;color:var(--navy)">{{ selectedDateLabel }}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">
                {{ selectedSchedules.length > 0 ? '총 ' + selectedSchedules.length + '개의 일정' : '일정 없음' }}
              </div>
            </div>
            <button @click="showModal=false" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--text-muted)">✕</button>
          </div>
          
          <div style="overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:var(--bg)">
            <div v-if="selectedSchedules.length === 0" style="text-align:center;padding:40px;color:var(--text-muted);font-size:0.9rem">
              이 날짜에 예정된 일정이 없습니다.
            </div>
            
            <div v-for="s in selectedSchedules" :key="s.id" style="display:flex;flex-direction:column;gap:8px;padding:16px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--white)">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <div style="display:flex;align-items:center;gap:8px">
                  <span class="badge" :class="ddayClass(s.date)">{{ ddayLabel(s.date) }}</span>
                  <span style="font-weight:700;color:var(--navy);font-size:0.9rem">{{ s.subject }} · {{ s.classRoom }}</span>
                </div>
                <span v-if="s.conflict || s.studentOverlapWarning" style="font-size:0.7rem;color:#C0392B;font-weight:700;padding:2px 6px;background:#FDECEA;border-radius:4px">
                  충돌 주의
                </span>
              </div>
              
              <div style="font-size:0.95rem;color:var(--navy);font-weight:600">
                {{ s.title }}
              </div>
              
              <div style="font-size:0.75rem;color:var(--text-muted);display:flex;gap:12px">
                <span>담당: {{ s.teacher }} 선생님</span>
                <span>유형: {{ s.type }}</span>
              </div>
              
              <div v-if="s.description" style="font-size:0.8rem;color:var(--navy);margin-top:4px;padding:10px;background:var(--bg);border-radius:4px;line-height:1.5">
                {{ s.description }}
              </div>
            </div>
          </div>

        </div>
      </div>

    </main>
  `,
};