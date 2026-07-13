// src/views/StudentAuth.js
const StudentAuth = {
  name: 'StudentAuth',
  inject: ['modeState'],
  data() {
    return {
      tab: 'login',
      login: { studentId: '', password: '', error: '', loading: false },
      signup: { name: '', studentId: '', password: '', passwordConfirm: '', error: '', loading: false },
      showPw: false,
      grades: ['1학년','2학년','3학년'],
      classes: ['1반','2반','3반','4반','5반','6반','7반','8반','9반','10반'],
      selectedGrade: '',
      selectedClass: '',
      selectedSubjects: [],
      subjectSearchQuery: '',
      subjects: [
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
    };
  },
  computed: {
    classRoomLabel() {
      if (!this.selectedGrade || !this.selectedClass) return '';
      return `${this.selectedGrade} ${this.selectedClass}`;
    },
    filteredSubjects() {
      if (!this.subjectSearchQuery) return this.subjects;
      return this.subjects.filter(s => s.includes(this.subjectSearchQuery));
    },
  },
  methods: {
    async submitLogin() {
      this.login.error = '';
      if (!this.login.studentId || !this.login.password) {
        this.login.error = '학번과 비밀번호를 입력해주세요.'; return;
      }
      this.login.loading = true;
      try {
        const email = `${this.login.studentId}@planhub.student`;
        await auth.signInWithEmailAndPassword(email, this.login.password);
        setMode('student');
        this.$router.push('/student');
      } catch (e) {
        this.login.error = '학번 또는 비밀번호가 올바르지 않습니다.';
      }
      this.login.loading = false;
    },
    async submitSignup() {
      this.signup.error = '';
      const { name, studentId, password, passwordConfirm } = this.signup;
      if (!name || !studentId || !this.selectedGrade || !this.selectedClass || !password) {
        this.signup.error = '모든 항목을 입력해주세요.'; return;
      }
      if (this.selectedSubjects.length === 0) {
        this.signup.error = '수강 과목을 1개 이상 선택해주세요.'; return;
      }
      if (password !== passwordConfirm) {
        this.signup.error = '비밀번호가 일치하지 않습니다.'; return;
      }
      if (password.length < 8) {
        this.signup.error = '비밀번호는 8자 이상이어야 합니다.'; return;
      }
      this.signup.loading = true;
      try {
        const email = `${studentId}@planhub.student`;
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('students').doc(cred.user.uid).set({
          name,
          studentId,
          grade: this.selectedGrade,
          classRoom: this.selectedClass,
          subjects: this.selectedSubjects,
          school: modeState.selectedSchool?.name || '',
          role: 'student',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        setMode('student');
        this.$router.push('/student');
      } catch (e) {
        if (e.code === 'auth/email-already-in-use') {
          this.signup.error = '이미 가입된 학번입니다.';
        } else {
          this.signup.error = '회원가입 중 오류가 발생했습니다.';
        }
      }
      this.signup.loading = false;
    },
    goBack() {
      this.$router.go(-1);
    },
  },
  template: `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--cream);padding:24px">
      <div style="width:100%;max-width:480px">

        <button @click="goBack" style="background:none;border:none;color:var(--text-muted);font-size:0.85rem;cursor:pointer;margin-bottom:24px;font-family:var(--font-sans);padding:0;display:flex;align-items:center;gap:6px">
          ← 뒤로
        </button>

        <div class="ph-card" style="border-radius:var(--radius-lg)">
          <div style="padding:32px 32px 0">

            <div style="text-align:center;margin-bottom:28px">
              <div style="width:56px;height:56px;border-radius:50%;background:#FEF9EC;display:flex;align-items:center;justify-content:center;font-size:1.8rem;margin:0 auto 14px">🎒</div>
              <h2 style="font-family:var(--font-serif);font-size:1.8rem;color:var(--navy);margin-bottom:4px">학생 {{ tab==='login'?'로그인':'회원가입' }}</h2>
              <p style="font-size:0.83rem;color:var(--text-muted)">플랜 허브 학생 계정</p>
            </div>

            <!-- 탭 -->
            <div style="display:grid;grid-template-columns:1fr 1fr;background:var(--cream);border-radius:var(--radius-sm);padding:4px;margin-bottom:28px">
              <button @click="tab='login'" style="padding:10px;border:none;border-radius:6px;cursor:pointer;font-family:var(--font-sans);font-size:0.875rem;font-weight:600;transition:var(--transition)"
                :style="tab==='login'?'background:white;color:var(--navy);box-shadow:0 2px 8px rgba(0,0,0,0.08)':'background:transparent;color:var(--text-muted)'">로그인</button>
              <button @click="tab='signup'" style="padding:10px;border:none;border-radius:6px;cursor:pointer;font-family:var(--font-sans);font-size:0.875rem;font-weight:600;transition:var(--transition)"
                :style="tab==='signup'?'background:white;color:var(--navy);box-shadow:0 2px 8px rgba(0,0,0,0.08)':'background:transparent;color:var(--text-muted)'">회원가입</button>
            </div>
          </div>

          <!-- 로그인 폼 -->
          <div v-if="tab==='login'" style="padding:0 32px 32px">
            <div class="form-group">
              <label class="form-label">학번</label>
              <input class="form-control" v-model="login.studentId" placeholder="예: 20251101" @keyup.enter="submitLogin"/>
            </div>
            <div class="form-group">
              <label class="form-label">비밀번호</label>
              <input class="form-control" :type="showPw?'text':'password'" v-model="login.password" placeholder="비밀번호 입력" @keyup.enter="submitLogin"/>
              <label style="display:flex;align-items:center;gap:6px;margin-top:8px;cursor:pointer;font-size:0.8rem;color:var(--text-muted)">
                <input type="checkbox" v-model="showPw" style="width:14px;height:14px"> 비밀번호 표시
              </label>
            </div>
            <div v-if="login.error" style="color:#EF4444;font-size:0.82rem;margin-bottom:16px">⚠ {{ login.error }}</div>
            <button class="btn btn-primary w-full" @click="submitLogin" :disabled="login.loading" style="height:48px;font-size:1rem;justify-content:center;background:#F0B429;border-color:#F0B429">
              {{ login.loading?'로그인 중...':'로그인' }}
            </button>
            <p style="text-align:center;margin-top:16px;font-size:0.82rem;color:var(--text-muted)">
              계정이 없으신가요?
              <span @click="tab='signup'" style="color:#F0B429;cursor:pointer;font-weight:600">회원가입</span>
            </p>
          </div>

          <!-- 회원가입 폼 -->
          <div v-if="tab==='signup'" style="padding:0 32px 32px">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">이름 *</label>
                <input class="form-control" v-model="signup.name" placeholder="홍길동"/>
              </div>
              <div class="form-group">
                <label class="form-label">학번 *</label>
                <input class="form-control" v-model="signup.studentId" placeholder="20251101"/>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">학년 *</label>
                <select class="form-control" v-model="selectedGrade">
                  <option value="" disabled>선택</option>
                  <option v-for="g in grades" :key="g">{{ g }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">반 *</label>
                <select class="form-control" v-model="selectedClass">
                  <option value="" disabled>선택</option>
                  <option v-for="c in classes" :key="c">{{ c }}</option>
                </select>
              </div>
            </div>

            <!-- 수강 과목 선택 -->
            <div class="form-group">
              <label class="form-label">
                수강 과목 *
                <span style="font-weight:400;color:var(--text-muted);font-size:0.8rem">({{ selectedSubjects.length }}개 선택됨)</span>
              </label>
              <input class="form-control" v-model="subjectSearchQuery" placeholder="🔍 과목명 검색..." style="margin-bottom:8px"/>
              <div style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;display:flex;flex-wrap:wrap;gap:6px;background:var(--white)">
                <label
                  v-for="s in filteredSubjects" :key="s"
                  style="display:flex;align-items:center;gap:4px;padding:5px 12px;border-radius:100px;cursor:pointer;font-size:0.8rem;transition:var(--transition);user-select:none"
                  :style="selectedSubjects.includes(s) ? 'background:var(--navy);color:white' : 'background:var(--cream);color:var(--navy)'">
                  <input type="checkbox" :value="s" v-model="selectedSubjects" style="display:none"/>
                  {{ s }}
                </label>
              </div>
              <!-- 선택된 과목 미리보기 -->
              <div v-if="selectedSubjects.length > 0" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">
                <span
                  v-for="s in selectedSubjects" :key="s"
                  style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:100px;background:#E6FAF8;color:var(--navy);font-size:0.75rem;font-weight:600">
                  {{ s }}
                  <span @click="selectedSubjects = selectedSubjects.filter(x => x !== s)" style="cursor:pointer;font-size:0.9rem;line-height:1;color:#34D1BF">✕</span>
                </span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">비밀번호 *</label>
                <input class="form-control" type="password" v-model="signup.password" placeholder="8자 이상"/>
              </div>
              <div class="form-group">
                <label class="form-label">비밀번호 확인 *</label>
                <input class="form-control" type="password" v-model="signup.passwordConfirm" placeholder="동일하게 입력" @keyup.enter="submitSignup"/>
              </div>
            </div>
            <div v-if="signup.error" style="color:#EF4444;font-size:0.82rem;margin-bottom:16px">⚠ {{ signup.error }}</div>
            <button class="btn btn-primary w-full" @click="submitSignup" :disabled="signup.loading" style="height:48px;font-size:1rem;justify-content:center;background:#F0B429;border-color:#F0B429">
              {{ signup.loading?'가입 중...':'회원가입' }}
            </button>
            <p style="text-align:center;margin-top:16px;font-size:0.82rem;color:var(--text-muted)">
              이미 계정이 있으신가요?
              <span @click="tab='login'" style="color:#F0B429;cursor:pointer;font-weight:600">로그인</span>
            </p>
          </div>
        </div>

      </div>
    </div>
  `,
};