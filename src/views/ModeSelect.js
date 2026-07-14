// src/views/ModeSelect.js
const ModeSelect = {
  name: 'ModeSelect',
  inject: ['modeState'],
  data() {
    return {
      step: 'root', // 'root' | 'school-search' | 'payment' | 'role-select'
      showAdminModal: false,
      adminPw: '',
      adminError: '',
      adminLoading: false,
      searchQuery: '',
      selectedSchool: null,
      schools: [],          // 💡 [변경] 가짜 데이터 대신, 백엔드에서 받아온 실시간 학교 목록이 들어갑니다.
      searchLoading: false, // 💡 로딩 상태 추가
      searchError: '',      // 💡 에러 메시지 상태 추가
      paymentLoading: false,
      paymentDone: false,
    };
  },
  computed: {
    filteredSchools() {
      // 💡 백엔드가 검색어에 맞는 결과만 이미 정제해서 주기 때문에, 
      // 필터링 없이 그대로 schools를 반환해 줍니다.
      return this.schools;
    },
  },
  methods: {
    isPaidPlan(plan) {
      if (!plan) return false;
      return String(plan).trim() !== '무료' && String(plan).trim().toLowerCase() !== 'free';
    },
    normalizeText(value) {
      return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim();
    },
    async searchSchools() {
      const query = this.searchQuery.trim();
      if (!query) { this.schools = []; return; }
      
      this.searchLoading = true;
      this.searchError = '';
      
      try {
        const schoolSnap = await db.collection('schools').get();
        const registeredSchools = schoolSnap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          region: doc.data().address || '',
          address: doc.data().address || '',
          plan: doc.data().plan || '무료',
          status: doc.data().status || '활성',
          subscribed: this.isPaidPlan(doc.data().plan),
        }));

        const keyword = this.normalizeText(query);
        const matchedAdminSchools = registeredSchools.filter(s =>
          this.normalizeText(s.name).includes(keyword) || this.normalizeText(s.address).includes(keyword)
        );

        const res = await fetch(`https://planhub-lulh.onrender.com/api/schools/search?keyword=${keyword}`);
        if (!res.ok) throw new Error('서버 응답에 실패했습니다.');

        const data = await res.json();
        const publicResults = data.schoolInfo ? data.schoolInfo[1].row.map(s => ({
          id: s.SD_SCHUL_CODE,
          name: s.SCHUL_NM,
          region: s.LCTN_SC_NM,
          address: s.ORG_RDNMA,
          schoolCode: s.SD_SCHUL_CODE,
          officeCode: s.ATPT_OFCDC_SC_CODE,
          subscribed: false,
        })) : [];

        const merged = [];
        const seen = new Set();

        [...publicResults, ...matchedAdminSchools].forEach(item => {
          const key = this.normalizeText(item.name);
          if (!key || seen.has(key)) return;
          seen.add(key);

          const adminMatch = registeredSchools.find(s => this.normalizeText(s.name) === key);
          merged.push({
            ...item,
            id: item.id || adminMatch?.id,
            name: item.name || adminMatch?.name,
            region: item.region || adminMatch?.region || adminMatch?.address || '',
            address: item.address || adminMatch?.address || '',
            plan: adminMatch?.plan || '무료',
            status: adminMatch?.status || '활성',
            subscribed: Boolean(adminMatch?.subscribed),
          });
        });

        this.schools = merged.filter(item =>
          this.normalizeText(item.name).includes(keyword) || this.normalizeText(item.address).includes(keyword)
        );
      } catch (err) {
        console.error(err);
        this.searchError = '학교 목록을 불러오는 중 오류가 발생했습니다.';
      } finally {
        this.searchLoading = false;
      }
    },

    selectSchool(school) {
      this.selectedSchool = school;
      setSchool(school); // 전역 modeState에 저장
      if (school.subscribed || this.paymentDone) this.step = 'role-select';
      else this.step = 'payment';
    },
    doPayment() {
      this.paymentLoading = true;
      setTimeout(() => {
        this.paymentDone = true;
        this.paymentLoading = false;
        setTimeout(() => { this.step = 'role-select'; }, 1000);
      }, 1200);
    },
    selectTeacher() { this.$router.push('/teacher-auth'); },
    selectStudent()  { this.$router.push('/student-auth'); },
    openAdminModal() {
      this.showAdminModal = true; this.adminPw = ''; this.adminError = '';
      this.$nextTick(() => { if (this.$refs.pwInput) this.$refs.pwInput.focus(); });
    },
    closeAdminModal() { this.showAdminModal = false; },
    submitAdmin() {
      if (!this.adminPw) { this.adminError = '비밀번호를 입력해주세요.'; return; }
      this.adminLoading = true;
      setTimeout(() => {
        if (typeof checkAdminPassword === 'function' && checkAdminPassword(this.adminPw)) { 
          if (typeof setMode === 'function') setMode('admin'); 
          this.$router.push('/admin'); 
        }
        else { this.adminError = '비밀번호가 올바르지 않습니다.'; this.adminPw = ''; }
        this.adminLoading = false;
      }, 400);
    },
    goBack() {
      if (this.step === 'role-select') { this.step = 'school-search'; this.paymentDone = false; }
      else if (this.step === 'payment') { this.step = 'school-search'; }
      else if (this.step === 'school-search') { this.step = 'root'; this.searchQuery = ''; this.schools = []; this.selectedSchool = null; }
    },
  },
  template: `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--cream);padding:24px">

      <div style="text-align:center;margin-bottom:40px">
        <svg width="56" height="56" viewBox="0 0 36 36" fill="none" style="margin-bottom:12px">
          <rect width="36" height="36" rx="8" fill="#FF5F47"/>
          <rect x="8" y="10" width="20" height="2.5" rx="1.25" fill="white"/>
          <rect x="8" y="16.75" width="14" height="2.5" rx="1.25" fill="white"/>
          <rect x="8" y="23.5" width="17" height="2.5" rx="1.25" fill="white"/>
          <circle cx="27" cy="23.5" r="5" fill="#0F1B35" stroke="white" stroke-width="2"/>
          <path d="M25 23.5l1.5 1.5 2.5-2.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h1 style="font-family:var(--font-serif);font-size:2.2rem;color:var(--navy);margin-bottom:4px">Plan<span style="color:var(--coral)">Hub</span></h1>
        <p style="color:var(--text-muted);font-size:0.9rem">수행평가 일정 관리 플랫폼</p>
      </div>

      <div v-if="step==='root'" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:520px;width:100%">
        <button @click="step='school-search'" style="background:var(--white);border:2px solid var(--border);border-radius:var(--radius-lg);padding:48px 24px;cursor:pointer;transition:var(--transition);text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px"
          @mouseenter="e=>{e.currentTarget.style.borderColor='#34D1BF';e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 12px 32px rgba(52,209,191,0.18)'}"
          @mouseleave="e=>{e.currentTarget.style.borderColor='rgba(15,27,53,0.12)';e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}">
          <div style="width:72px;height:72px;border-radius:50%;background:#E6FAF8;display:flex;align-items:center;justify-content:center;font-size:2.2rem">🏫</div>
          <div>
            <div style="font-family:var(--font-serif);font-size:1.5rem;color:var(--navy);margin-bottom:6px">학교</div>
            <div style="font-size:0.8rem;color:var(--text-muted);line-height:1.6">선생님 · 학생<br>학교를 먼저 선택하세요</div>
          </div>
          <div style="padding:7px 20px;border-radius:100px;background:#34D1BF;color:white;font-size:0.78rem;font-weight:700">학교 선택</div>
        </button>

        <button @click="openAdminModal" style="background:var(--white);border:2px solid var(--border);border-radius:var(--radius-lg);padding:48px 24px;cursor:pointer;transition:var(--transition);text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px"
          @mouseenter="e=>{e.currentTarget.style.borderColor='#FF5F47';e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 12px 32px rgba(255,95,71,0.18)'}"
          @mouseleave="e=>{e.currentTarget.style.borderColor='rgba(15,27,53,0.12)';e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}">
          <div style="width:72px;height:72px;border-radius:50%;background:#FEF2F0;display:flex;align-items:center;justify-content:center;font-size:2.2rem">🔐</div>
          <div>
            <div style="font-family:var(--font-serif);font-size:1.5rem;color:var(--navy);margin-bottom:6px">관리자</div>
            <div style="font-size:0.8rem;color:var(--text-muted);line-height:1.6">학교 · 결제<br>운영 총괄</div>
          </div>
          <div style="padding:7px 20px;border-radius:100px;background:#FF5F47;color:white;font-size:0.78rem;font-weight:700">비밀번호 입력</div>
        </button>
      </div>

      <div v-if="step==='school-search'" style="width:100%;max-width:500px">
        <button @click="goBack" style="background:none;border:none;color:var(--text-muted);font-size:0.85rem;cursor:pointer;margin-bottom:20px;font-family:var(--font-sans);padding:0;display:flex;align-items:center;gap:6px">← 뒤로</button>
        <div class="ph-card" style="border-radius:var(--radius-lg)">
          <div class="ph-card__header"><span class="ph-card__title">학교 검색</span></div>
          <div class="ph-card__body">
            <input class="form-control" v-model="searchQuery" @keyup.enter="searchSchools" placeholder="🔍 학교 이름 입력 후 [Enter]를 누르세요" style="margin-bottom:16px"/>
            
            <div style="display:flex;flex-direction:column;gap:8px;max-height:320px;overflow-y:auto">
              <div v-if="searchLoading" style="text-align:center;padding:32px;color:var(--text-muted)">검색 중입니다...</div>
              <div v-else-if="searchError" style="text-align:center;padding:32px;color:#EF4444">{{ searchError }}</div>
              <div v-else-if="filteredSchools.length===0" style="text-align:center;padding:32px;color:var(--text-muted)">검색 결과가 없습니다</div>
              
              <button v-if="!searchLoading" v-for="school in filteredSchools" :key="school.id" @click="selectSchool(school)"
                style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border:2px solid var(--border);border-radius:var(--radius-sm);background:var(--white);cursor:pointer;transition:var(--transition);text-align:left"
                @mouseenter="e=>{e.currentTarget.style.borderColor='var(--coral)';e.currentTarget.style.background='var(--cream)'}"
                @mouseleave="e=>{e.currentTarget.style.borderColor='rgba(15,27,53,0.12)';e.currentTarget.style.background='var(--white)'}">
                <div>
                  <div style="font-weight:700;color:var(--navy);font-size:0.95rem">{{ school.name }}</div>
                  <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">{{ school.region }}</div>
                </div>
                <span class="badge" :class="school.subscribed ? 'badge-green' : 'badge-yellow'">{{ school.subscribed ? '구독 중' : '구독 아님' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="step==='payment'" style="width:100%;max-width:460px">
        <button @click="goBack" style="background:none;border:none;color:var(--text-muted);font-size:0.85rem;cursor:pointer;margin-bottom:20px;font-family:var(--font-sans);padding:0;display:flex;align-items:center;gap:6px">← 뒤로</button>
        <div class="ph-card" style="border-radius:var(--radius-lg)">
          <div class="ph-card__body" style="text-align:center;padding:40px">
            <div style="font-size:2.5rem;margin-bottom:16px">🏫</div>
            <h2 style="font-family:var(--font-serif);font-size:1.6rem;color:var(--navy);margin-bottom:8px">{{ selectedSchool?.name }}</h2>
            <p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:32px">해당 학교는 아직 구독을 시작하지 않았습니다.<br>구독 후 서비스를 이용할 수 있습니다.</p>
            <div style="background:var(--navy);border-radius:var(--radius-md);padding:24px;margin-bottom:24px;text-align:left">
              <div style="color:var(--coral);font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">스탠다드 플랜</div>
              <div style="color:var(--white);font-family:var(--font-mono);font-size:2rem;font-weight:700">49,000<span style="font-size:1rem">원/월</span></div>
              <div style="color:rgba(255,255,255,0.6);font-size:0.8rem;margin-top:12px;line-height:1.8">✓ 전체 선생님 · 학생 무제한<br>✓ 수행평가 충돌 감지<br>✓ D-Day 알림</div>
            </div>
            <div v-if="!paymentDone">
              <button class="btn btn-primary w-full" @click="doPayment" :disabled="paymentLoading" style="height:48px;font-size:1rem;justify-content:center">
                {{ paymentLoading ? '결제 처리 중...' : '구독 결제하기' }}
              </button>
              <p style="font-size:0.75rem;color:var(--text-muted);margin-top:12px">※ 실제 결제 연동 전 테스트 화면입니다</p>
            </div>
            <div v-else style="padding:16px;background:#D1FAE5;border-radius:var(--radius-sm);color:#065F46;font-weight:700">✓ 결제 완료! 잠시 후 이동합니다...</div>
          </div>
        </div>
      </div>

      <div v-if="step==='role-select'" style="width:100%;max-width:520px">
        <button @click="goBack" style="background:none;border:none;color:var(--text-muted);font-size:0.85rem;cursor:pointer;margin-bottom:20px;font-family:var(--font-sans);padding:0;display:flex;align-items:center;gap:6px">← 뒤로</button>
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:4px">선택된 학교</div>
          <div style="font-family:var(--font-serif);font-size:1.4rem;color:var(--navy)">🏫 {{ selectedSchool?.name }}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <button @click="selectTeacher" style="background:var(--white);border:2px solid var(--border);border-radius:var(--radius-lg);padding:40px 20px;cursor:pointer;transition:var(--transition);text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px"
            @mouseenter="e=>{e.currentTarget.style.borderColor='#34D1BF';e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 12px 32px rgba(52,209,191,0.18)'}"
            @mouseleave="e=>{e.currentTarget.style.borderColor='rgba(15,27,53,0.12)';e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}">
            <div style="width:64px;height:64px;border-radius:50%;background:#E6FAF8;display:flex;align-items:center;justify-content:center;font-size:2rem">📝</div>
            <div>
              <div style="font-family:var(--font-serif);font-size:1.3rem;color:var(--navy);margin-bottom:4px">선생님</div>
              <div style="font-size:0.78rem;color:var(--text-muted)">로그인 / 회원가입</div>
            </div>
          </button>
          <button @click="selectStudent" style="background:var(--white);border:2px solid var(--border);border-radius:var(--radius-lg);padding:40px 20px;cursor:pointer;transition:var(--transition);text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px"
            @mouseenter="e=>{e.currentTarget.style.borderColor='#F0B429';e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 12px 32px rgba(240,180,41,0.18)'}"
            @mouseleave="e=>{e.currentTarget.style.borderColor='rgba(15,27,53,0.12)';e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}">
            <div style="width:64px;height:64px;border-radius:50%;background:#FEF9EC;display:flex;align-items:center;justify-content:center;font-size:2rem">🎒</div>
            <div>
              <div style="font-family:var(--font-serif);font-size:1.3rem;color:var(--navy);margin-bottom:4px">학생</div>
              <div style="font-size:0.78rem;color:var(--text-muted)">바로 입장</div>
            </div>
          </button>
        </div>
      </div>

      <div v-if="showAdminModal" style="position:fixed;inset:0;background:rgba(15,27,53,0.6);display:flex;align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(4px)" @click.self="closeAdminModal">
        <div style="background:var(--white);border-radius:var(--radius-lg);padding:40px;width:100%;max-width:400px;box-shadow:var(--shadow-lg)">
          <div style="text-align:center;margin-bottom:28px">
            <div style="font-size:2.5rem;margin-bottom:12px">🔐</div>
            <h2 style="font-family:var(--font-serif);font-size:1.6rem;color:var(--navy);margin-bottom:6px">관리자 로그인</h2>
            <p style="font-size:0.85rem;color:var(--text-muted)">관리자 비밀번호를 입력하세요</p>
          </div>
          <div class="form-group">
            <label class="form-label">비밀번호</label>
            <input ref="pwInput" type="password" class="form-control" v-model="adminPw" placeholder="비밀번호 입력" @keyup.enter="submitAdmin"/>
            <div v-if="adminError" style="color:#EF4444;font-size:0.82rem;margin-top:6px">⚠ {{ adminError }}</div>
          </div>
          <div style="display:flex;gap:12px;margin-top:8px">
            <button class="btn btn-outline" style="flex:1" @click="closeAdminModal">취소</button>
            <button class="btn btn-primary" style="flex:2;justify-content:center" @click="submitAdmin" :disabled="adminLoading">{{ adminLoading?'확인 중...':'입장하기' }}</button>
          </div>
        </div>
      </div>

    </div>
  `,
};
