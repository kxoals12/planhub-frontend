// src/views/TeacherPanel.js
const TeacherPanel = {
  name: 'TeacherPanel',
  components: { CalendarGrid, ScheduleCard, ConflictBadge },
  inject: ['modeState'],
  data() {
    return {
      schedules: [],       
      mySubject: '',
      myName: '',
      mySchool: '',
      schoolStatus: '활성', // 💡 학교의 현재 구독/이용 상태 (활성, 정지, 미납 등)
      schoolPlan: '베이직',  // 💡 학교의 구독 플랜 (베이직, 스탠다드, 프리미엄)
      loading: true,
      loadError: '',
      saving: false,
      form: {
        subject: '',
        title: '',
        date: '',
        classRoom: '',
        teacher: '',
        type: '서술형',
        description: '',
      },
      conflicts: [],
      studentOverlapWarnings: [],
      _problematicAssessmentIds: {},
      reactions: {},
      editMode: false,
      editId: null,
      types: ['서술형','지필','발표','보고서','실기','포트폴리오'],
      classes: [
        '공통국어1', '공통국어2', '문학', '화법과 언어', '독서와 작문', '독서 토론과 글쓰기', '매체 의사소통', 
        '공통영어1', '공통영어2', '영어I', '영어II', '영어 독해와 작문', 
        '공통수학1', '공통수학2', '기본수학1', '기본수학2', '대수', '미적분Ⅰ', '확률과 통계', '미적분Ⅱ', '기하', 
        '통합사회1', '통합사회2', '사회와 문화', '정치', '세계시민과 지리', '지리 부도', 
        '한국사1', '한국사2', '역사 부도', '세계사', '현대사회와 윤리', 
        '통합과학1', '통합과학2', '과학탐구실험1', '과학탐구실험2', 
        '물리학', '역학과 에너지', '전자기와 양자', '화학', '물질과 에너지', '화학 반응의 세계', 
        '생명과학', '세포와 물질대사', '생물의 유전', '지구과학', '지구시스템과학', '행성우주과학', 
        '기술·가정', '정보', '일본어', '일본 문화', '중국어', '한문', 
        '음악', '음악 감상과 비평', '미술', '미술 창작', '체육1', '체육2', '스포츠 생활1', '스포츠 생활2', 
        '인공지능 기초', '진로와 직업'
      ],
      unsubscribe: null,
      reactionUnsubscribe: null,
      schoolUnsubscribe: null, // 💡 학교 상태 실시간 리스너 차단용
      selectedDay: null,
      showModal: false,
    };
  },
  computed: {
    mySchedules() {
      return this.schedules.filter(s => s.subject === this.mySubject);
    },
    calEvents() {
      return this.schedules.map(s => ({
        id: s.id, date: s.date, subject: s.subject, classRoom: s.classRoom,
        title: s.title, teacher: s.teacher, conflict: s.conflict,
        studentOverlapWarning: Boolean(this._problematicAssessmentIds?.[s.id]),
      }));
    },
    // 💡 구독 제한으로 인해 서비스 사용이 불가능한지 여부
    isServiceRestricted() {
      return this.schoolStatus === '정지' || this.schoolStatus === '미납';
    },
    selectedDateKey() {
      if (!this.selectedDay) return '';
      const d = this.selectedDay;
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    },
    selectedSchedules() {
      if (!this.selectedDateKey) return [];
      return this.schedules.filter(s => s.date === this.selectedDateKey);
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
    if (!user) {
      this.$router.push('/teacher-auth');
      return;
    }
    try {
      const snap = await db.collection('teachers').doc(user.uid).get();
      if (snap.exists) {
        const data = snap.data();
        this.mySubject = data.subject || '';
        this.myName = data.name || '';
        this.mySchool = data.school || this.modeState?.selectedSchool?.name || '';
        
        // 💡 선생님의 학교 정보가 확인되면, 해당 학교의 구독/결제 상태를 실시간 감시합니다.
        if (this.mySchool) {
          this.listenSchoolStatus();
        }
      } else {
        this.loadError = '선생님 프로필을 찾을 수 없습니다. 다시 로그인해 주세요.';
      }
    } catch (e) {
      console.error(e);
      this.loadError = '프로필을 불러오는 중 오류가 발생했습니다.';
    }
    this.resetForm();
    this.listenAssessments();
  },
  beforeUnmount() {
    if (this.unsubscribe) this.unsubscribe();
    if (this.reactionUnsubscribe) this.reactionUnsubscribe();
    if (this.schoolUnsubscribe) this.schoolUnsubscribe(); // 💡 리스너 해제
  },
  methods: {
    // 💡 AdminPanel의 결제/구독 설정과 동기화되는 실시간 함수
    listenSchoolStatus() {
      this.schoolUnsubscribe = db.collection('schools').doc(this.mySchool).onSnapshot(
        (doc) => {
          if (doc.exists) {
            const schoolData = doc.data();
            this.schoolStatus = schoolData.status || '활성';
            this.schoolPlan = schoolData.plan || '베이직';
            
            if (this.isServiceRestricted) {
              this.loadError = `현재 [${this.mySchool}]은 이용이 제한된 상태입니다. (사유: ${this.schoolStatus})`;
            } else {
              this.loadError = ''; // 상태가 정상이면 에러 텍스트 제거
            }
          }
        },
        (err) => {
          console.error("학교 상태를 가져오지 못했습니다:", err);
        }
      );
    },
    listenAssessments() {
      this.loading = true;
      let query = db.collection('assessments');
      if (this.mySchool) query = query.where('school', '==', this.mySchool);
      this.unsubscribe = query.onSnapshot(
        (snap) => {
          this.schedules = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          this.loading = false;
          if (!this.reactionUnsubscribe) {
            this.listenReactions();
          }
          this.checkConflicts();
        },
        (err) => {
          console.error(err);
          this.loadError = '수행평가 목록을 불러오는 중 오류가 발생했습니다.';
          this.loading = false;
        }
      );
    },
    listenReactions() {
      if (!this.mySchool) return;
      if (this.reactionUnsubscribe) return;
      this.reactionUnsubscribe = db.collection('schedule-reactions')
        .where('school', '==', this.mySchool)
        .onSnapshot((snap) => {
          const next = {};
          snap.docs.forEach((doc) => {
            const data = doc.data();
            if (!data.scheduleId) return;
            if (!next[data.scheduleId]) next[data.scheduleId] = { good: 0, hard: 0 };
            if (data.reaction === '괜찮아요') next[data.scheduleId].good += 1;
            if (data.reaction === '힘들어요') next[data.scheduleId].hard += 1;
          });
          this.reactions = next;
        });
    },
    async checkConflicts() {
      if (!this.form.date || !this.form.classRoom) {
        this.conflicts = [];
        this.studentOverlapWarnings = [];
        this._problematicAssessmentIds = {};
        return;
      }

      const same = this.schedules.filter(
        s => s.date === this.form.date &&
             s.classRoom === this.form.classRoom &&
             s.id !== this.editId
      );
      if (same.length > 0) {
        this.conflicts = [{
          classRoom: this.form.classRoom,
          date: this.form.date,
          subjects: same.map(s => s.subject),
        }];
      } else {
        this.conflicts = [];
      }

      if (!this.mySchool) {
        this.studentOverlapWarnings = [];
        this._problematicAssessmentIds = {};
        return;
      }

      try {
        const snapshot = await db.collection('students').where('school', '==', this.mySchool).get();
        const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const existingAssessments = this.schedules.filter(s => s.date === this.form.date && s.id !== this.editId);
        const warnings = assessmentConflictUtils.buildStudentSubjectOverlapWarnings({
          assessments: existingAssessments,
          students,
          targetDate: this.form.date,
          currentSubject: this.form.subject || this.mySubject,
          threshold: 4,
        });
        this.studentOverlapWarnings = warnings;

        const problematicAssessmentIds = {};
        const sameDayEntries = this.schedules.filter(s => s.date === this.form.date && s.id !== this.editId);
        sameDayEntries.forEach((entry) => {
          const entryWarnings = warnings.filter((warning) => warning.subjects.includes(entry.subject));
          if (entryWarnings.length > 0) {
            problematicAssessmentIds[entry.id] = true;
          }
        });
        this._problematicAssessmentIds = problematicAssessmentIds;
      } catch (e) {
        console.error(e);
        this.studentOverlapWarnings = [];
      }
    },
    async submitForm() {
      // 💡 서비스 제한 상태일 경우 등록/수정 원천 차단
      if (this.isServiceRestricted) {
        alert(`학교의 구독 상태가 [${this.schoolStatus}]이므로 일정을 등록하거나 수정할 수 없습니다. 관리자에게 문의하세요.`);
        return;
      }
      if (!this.form.title || !this.form.date || !this.form.classRoom) {
        alert('필수 항목을 모두 입력해 주세요.');
        return;
      }
      if (!this.mySubject) {
        alert('담당 과목 정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
        return;
      }

      const hasConflict = this.conflicts.length > 0;
      const hasStudentOverlapWarning = this.studentOverlapWarnings.length > 0;
      let warningMessage = '';
      if (hasStudentOverlapWarning) {
        warningMessage = `이 수행평가는 학생 선택과목 기준으로 같은 날에 4개 이상 과목이 겹칠 수 있어요. 등록 전에 학생 부담을 확인해 주세요.`;
      } else if (hasConflict) {
        warningMessage = '이 수행평가는 같은 날짜/학급에 이미 등록된 평가와 겹칩니다.';
      }

      if (warningMessage && !confirm(`${warningMessage}\n\n그래도 등록하시겠습니까?`)) return;

      this.saving = true;
      const payload = {
        subject: this.mySubject,
        title: this.form.title,
        date: this.form.date,
        classRoom: this.form.classRoom,
        teacher: this.form.teacher || this.myName,
        type: this.form.type,
        description: this.form.description || '',
        school: this.mySchool,
        conflict: hasConflict || hasStudentOverlapWarning,
        teacherUid: auth.currentUser?.uid || null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      try {
        if (this.editMode) {
          await db.collection('assessments').doc(this.editId).update(payload);
        } else {
          payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          await db.collection('assessments').add(payload);
        }
        this.resetForm();
      } catch (e) {
        console.error(e);
        alert('저장 중 오류가 발생했습니다.');
      }
      this.saving = false;
    },
    editSchedule(s) {
      if (this.isServiceRestricted) {
        alert('구독이 제한되어 수정할 수 없습니다.');
        return;
      }
      this.form = {
        subject: s.subject,
        title: s.title,
        date: s.date,
        classRoom: s.classRoom,
        teacher: s.teacher,
        type: s.type,
        description: s.description || '',
      };
      this.editMode = true;
      this.editId = s.id;
      this.checkConflicts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    async deleteSchedule(s) {
      if (this.isServiceRestricted) {
        alert('구독이 제한되어 삭제할 수 없습니다.');
        return;
      }
      if (!confirm(`"${s.title}"을(를) 삭제하시겠습니까?`)) return;
      try {
        await db.collection('assessments').doc(s.id).delete();
      } catch (e) {
        console.error(e);
        alert('삭제 중 오류가 발생했습니다.');
      }
    },
    resetForm() {
      this.form = {
        subject: this.mySubject,
        title: '',
        date: '',
        classRoom: '',
        teacher: this.myName,
        type: '서술형',
        description: '',
      };
      this.editMode = false; this.editId = null;
      this.conflicts = [];
      this.studentOverlapWarnings = [];
      this._problematicAssessmentIds = {};
    },
    // 💡 캘린더에서 이벤트를 드래그해 날짜를 옮겼을 때 (editable일 때만 CalendarGrid가 이 이벤트를 emit)
    async onScheduleDrop({ id, date }) {
      if (this.isServiceRestricted || !id) return;
      try {
        await db.collection('assessments').doc(id).update({
          date,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        console.error(e);
        alert('일정 이동 중 오류가 발생했습니다.');
      }
    },
    onDayClick(day) {
      this.selectedDay = day.date;
      this.showModal = true;
    },
    subjectColor(subject) {
      const map = { 국어:'#EF4444', 수학:'#3B82F6', 영어:'#10B981', 과학:'#8B5CF6', 사회:'#F59E0B' };
      return map[subject] || '#6B7A99';
    },
    ddayLabel(dateStr) {
      const today = new Date(); today.setHours(0,0,0,0);
      const target = new Date(dateStr); target.setHours(0,0,0,0);
      const d = Math.ceil((target - today) / 86400000);
      if (d === 0) return 'D-Day';
      return d > 0 ? `D-${d}` : `D+${Math.abs(d)}`;
    },
    ddayClass(dateStr) {
      const today = new Date(); today.setHours(0,0,0,0);
      const target = new Date(dateStr); target.setHours(0,0,0,0);
      const d = Math.ceil((target - today) / 86400000);
      if (d <= 3) return 'badge-red';
      if (d <= 7) return 'badge-yellow';
      return 'badge-blue';
    },
  },
  template: `
    <main class="ph-main">
      <div class="page-header">
        <div class="page-header__title">
          <h1>선생님 <em>패널</em></h1>
          <p class="page-header__subtitle">
            {{ mySchool }} · {{ myName }} 선생님 ({{ schoolPlan }} 플랜 이용 중)
          </p>
        </div>
      </div>

      <!-- 서비스 제한 상황 시 알림바 노출 -->
      <div v-if="loadError || isServiceRestricted" class="conflict-alert" style="margin-bottom:20px; background-color: #FFEBEA; color: #FF5F47;">
        <span class="conflict-alert__icon">⚠️</span>
        <div class="conflict-alert__text">{{ loadError || '학교의 서비스 이용이 정지되었습니다. 관리자에게 문의하세요.' }}</div>
      </div>

      <div class="teacher-layout" :style="{ opacity: isServiceRestricted ? '0.7' : '1' }">
        <!-- Form Section -->
        <div>
          <div class="ph-card" style="margin-bottom:24px">
            <div class="ph-card__header">
              <span class="ph-card__title">{{ editMode ? '일정 수정' : '새 수행평가 등록' }}</span>
              <button v-if="editMode" class="btn btn-ghost btn-sm" @click="resetForm">취소</button>
            </div>
            <div class="ph-card__body">
              <div style="margin-bottom:16px">
                <conflict-badge :conflicts="conflicts" :student-overlap-warnings="studentOverlapWarnings" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">과목</label>
                  <div class="form-control" style="background:var(--cream);color:var(--navy);cursor:default">
                    📘 {{ mySubject || '과목 정보 없음' }}
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">평가 유형 *</label>
                  <select class="form-control" v-model="form.type" :disabled="isServiceRestricted">
                    <option v-for="t in types" :key="t">{{ t }}</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">수행평가 제목 *</label>
                <input class="form-control" v-model="form.title" :disabled="isServiceRestricted" placeholder="예: 2단원 서술형 평가" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">날짜 *</label>
                  <input type="date" class="form-control" v-model="form.date" :disabled="isServiceRestricted" @change="checkConflicts" />
                </div>
                <div class="form-group">
                  <label class="form-label">학급 *</label>
                  <select class="form-control" v-model="form.classRoom" :disabled="isServiceRestricted" @change="checkConflicts">
                    <option value="" disabled>선택</option>
                    <option v-for="c in classes" :key="c">{{ c }}</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">담당 선생님</label>
                <input class="form-control" v-model="form.teacher" :disabled="isServiceRestricted" placeholder="이름 입력" />
              </div>

              <div class="form-group">
                <label class="form-label">메모 / 안내사항</label>
                <textarea class="form-control" v-model="form.description" :disabled="isServiceRestricted" rows="3" placeholder="학생 안내 사항을 입력하세요"></textarea>
              </div>

              <div style="display:flex;gap:12px;margin-top:8px">
                <button class="btn btn-primary w-full" @click="submitForm" :disabled="saving || isServiceRestricted">
                  {{ saving ? '저장 중...' : (editMode ? '✏ 수정 완료' : '＋ 등록하기') }}
                </button>
              </div>
            </div>
          </div>

          <div class="ph-card">
            <div class="ph-card__body">
              <calendar-grid :events="calEvents" :editable="!isServiceRestricted" @update-schedule="onScheduleDrop" @day-click="onDayClick" />
            </div>
          </div>
        </div>

        <!-- Schedule List -->
        <div>
          <div class="ph-card">
            <div class="ph-card__header">
              <span class="ph-card__title">등록된 수행평가 <span class="text-muted" style="font-weight:400;font-size:0.78rem">· {{ mySubject }}</span></span>
              <span class="badge badge-blue mono">{{ mySchedules.length }}건</span>
            </div>
            <div class="ph-card__body">
              <div v-if="loading" class="text-muted" style="text-align:center;padding:32px">불러오는 중...</div>
              <div v-else class="upcoming-list">
                <div v-for="s in mySchedules.slice().sort((a,b) => a.date.localeCompare(b.date))" :key="s.id">
                  <schedule-card
                    :schedule="s"
                    :show-actions="!isServiceRestricted"
                    :reactions="reactions"
                    @edit="editSchedule"
                    @delete="deleteSchedule"
                  />
                </div>
                <p v-if="mySchedules.length === 0" class="text-muted" style="text-align:center;padding:32px">
                  등록된 수행평가가 없습니다.
                </p>
              </div>
            </div>
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
                  <span v-if="s.conflict || s.studentOverlapWarning" style="font-size:0.72rem;color:#FF5F47;font-weight:600">⚠ 충돌</span>
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