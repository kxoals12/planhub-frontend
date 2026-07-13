// src/views/TeacherAuth.js
const TeacherAuth = {
  name: 'TeacherAuth',
  inject: ['modeState'],
  data() {
    return {
      tab: 'login',  // 'login' | 'signup'
      login: {
        email: '',
        password: '',
        error: '',
        loading: false,
      },
      signup: {
        name: '',
        email: '',
        subject: '',
        password: '',
        passwordConfirm: '',
        error: '',
        loading: false,
      },
      subjects: ['국어', '수학', '영어', '미술', '음악', '과학', '사회', '체육', '진로'],
      showPw: false,
    };
  },
  methods: {
    // ── 로그인 ──────────────────────────────
    async submitLogin() {
      this.login.error = '';
      if (!this.login.email || !this.login.password) {
        this.login.error = '이메일과 비밀번호를 입력해주세요.';
        return;
      }
      this.login.loading = true;
      try {
        await auth.signInWithEmailAndPassword(this.login.email, this.login.password);
        setMode('teacher');
        this.$router.push('/teacher');
      } catch (e) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
          this.login.error = '이메일 또는 비밀번호가 올바르지 않습니다.';
        } else {
          this.login.error = '로그인 중 오류가 발생했습니다.';
        }
      }
      this.login.loading = false;
    },

    // ── 회원가입 ─────────────────────────────
    async submitSignup() {
      this.signup.error = '';
      const { name, email, subject, password, passwordConfirm } = this.signup;
      const school = modeState.selectedSchool?.name || '';
      if (!name || !email || !subject || !password) {
        this.signup.error = '모든 항목을 입력해주세요.';
        return;
      }
      if (password !== passwordConfirm) {
        this.signup.error = '비밀번호가 일치하지 않습니다.';
        return;
      }
      if (password.length < 8) {
        this.signup.error = '비밀번호는 8자 이상이어야 합니다.';
        return;
      }
      this.signup.loading = true;
      try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('teachers').doc(cred.user.uid).set({
          name, email, school, subject,
          role: 'teacher',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        setMode('teacher');
        this.$router.push('/teacher');
      } catch (e) {
        if (e.code === 'auth/email-already-in-use') {
          this.signup.error = '이미 사용 중인 이메일입니다.';
        } else {
          this.signup.error = '회원가입 중 오류가 발생했습니다.';
        }
      }
      this.signup.loading = false;
    },

    goBack() {
      clearMode();
      this.$router.push('/');
    },
  },
  template: `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--cream);padding:24px">

      <div style="width:100%;max-width:460px">

        <!-- 뒤로가기 -->
        <button @click="goBack" style="
          display:flex;align-items:center;gap:6px;background:none;border:none;
          color:var(--text-muted);font-size:0.85rem;cursor:pointer;margin-bottom:24px;
          font-family:var(--font-sans);padding:0;
        ">
          ← 모드 선택으로
        </button>

        <!-- 카드 -->
        <div class="ph-card" style="border-radius:var(--radius-lg)">
          <div style="padding:32px 32px 0">

            <!-- 헤더 -->
            <div style="text-align:center;margin-bottom:28px">
              <div style="width:56px;height:56px;border-radius:50%;background:#E6FAF8;display:flex;align-items:center;justify-content:center;font-size:1.8rem;margin:0 auto 14px">
                📝
              </div>
              <h2 style="font-family:var(--font-serif);font-size:1.8rem;color:var(--navy);margin-bottom:4px">선생님 {{ tab === 'login' ? '로그인' : '회원가입' }}</h2>
              <p style="font-size:0.83rem;color:var(--text-muted)">플랜 허브 선생님 계정</p>
            </div>

            <!-- 탭 -->
            <div style="display:grid;grid-template-columns:1fr 1fr;background:var(--cream);border-radius:var(--radius-sm);padding:4px;margin-bottom:28px">
              <button @click="tab='login'" style="
                padding:10px;border:none;border-radius:6px;cursor:pointer;
                font-family:var(--font-sans);font-size:0.875rem;font-weight:600;transition:var(--transition);
              "
              :style="tab==='login' ? 'background:white;color:var(--navy);box-shadow:0 2px 8px rgba(0,0,0,0.08)' : 'background:transparent;color:var(--text-muted)'"
              >로그인</button>
              <button @click="tab='signup'" style="
                padding:10px;border:none;border-radius:6px;cursor:pointer;
                font-family:var(--font-sans);font-size:0.875rem;font-weight:600;transition:var(--transition);
              "
              :style="tab==='signup' ? 'background:white;color:var(--navy);box-shadow:0 2px 8px rgba(0,0,0,0.08)' : 'background:transparent;color:var(--text-muted)'"
              >회원가입</button>
            </div>
          </div>

          <!-- ── 로그인 폼 ── -->
          <div v-if="tab === 'login'" style="padding:0 32px 32px">
            <div class="form-group">
              <label class="form-label">이메일</label>
              <input class="form-control" type="email" v-model="login.email"
                placeholder="teacher@school.kr" @keyup.enter="submitLogin"/>
            </div>
            <div class="form-group">
              <label class="form-label">비밀번호</label>
              <input class="form-control" :type="showPw ? 'text' : 'password'"
                v-model="login.password" placeholder="비밀번호 입력" @keyup.enter="submitLogin"/>
              <label style="display:flex;align-items:center;gap:6px;margin-top:8px;cursor:pointer;font-size:0.8rem;color:var(--text-muted)">
                <input type="checkbox" v-model="showPw" style="width:14px;height:14px"> 비밀번호 표시
              </label>
            </div>
            <div v-if="login.error" style="color:#EF4444;font-size:0.82rem;margin-bottom:16px">⚠ {{ login.error }}</div>
            <button class="btn btn-primary w-full" @click="submitLogin" :disabled="login.loading"
              style="height:48px;font-size:1rem;justify-content:center">
              {{ login.loading ? '로그인 중...' : '로그인' }}
            </button>
            <p style="text-align:center;margin-top:16px;font-size:0.82rem;color:var(--text-muted)">
              계정이 없으신가요?
              <span @click="tab='signup'" style="color:var(--coral);cursor:pointer;font-weight:600">회원가입</span>
            </p>
          </div>

          <!-- ── 회원가입 폼 ── -->
          <div v-if="tab === 'signup'" style="padding:0 32px 32px">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">이름 *</label>
                <input class="form-control" v-model="signup.name" placeholder="홍길동"/>
              </div>
              <div class="form-group">
                <label class="form-label">담당 과목 *</label>
                <select class="form-control" v-model="signup.subject">
                  <option value="" disabled>선택</option>
                  <option v-for="s in subjects" :key="s">{{ s }}</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">학교</label>
              <div class="form-control" style="background:var(--cream);color:var(--navy);cursor:default">
                🏫 {{ modeState.selectedSchool?.name || '학교 미선택' }}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">이메일 *</label>
              <input class="form-control" type="email" v-model="signup.email" placeholder="teacher@school.kr"/>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">비밀번호 *</label>
                <input class="form-control" type="password" v-model="signup.password" placeholder="8자 이상"/>
              </div>
              <div class="form-group">
                <label class="form-label">비밀번호 확인 *</label>
                <input class="form-control" type="password" v-model="signup.passwordConfirm" placeholder="동일하게 입력"
                  @keyup.enter="submitSignup"/>
              </div>
            </div>
            <div v-if="signup.error" style="color:#EF4444;font-size:0.82rem;margin-bottom:16px">⚠ {{ signup.error }}</div>
            <button class="btn btn-primary w-full" @click="submitSignup" :disabled="signup.loading"
              style="height:48px;font-size:1rem;justify-content:center">
              {{ signup.loading ? '가입 중...' : '회원가입' }}
            </button>
            <p style="text-align:center;margin-top:16px;font-size:0.82rem;color:var(--text-muted)">
              이미 계정이 있으신가요?
              <span @click="tab='login'" style="color:var(--coral);cursor:pointer;font-weight:600">로그인</span>
            </p>
          </div>
        </div>

      </div>
    </div>
  `,
};