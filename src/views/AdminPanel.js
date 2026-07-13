// src/views/AdminPanel.js
const AdminPanel = {
  name: 'AdminPanel',
  data() {
    return {
      activeTab: 'overview',
      tabsMeta: [
        { key: 'overview', label: '개요' },
        { key: 'users',    label: '학교/사용자' },
        { key: 'billing',  label: '구독/결제' },
      ],

      // ── 실시간 데이터 (Firestore) ──────────────────────────
      schools: [],
      teachers: [],
      students: [],
      loadingSchools: true,
      unsubscribeSchools: null,
      unsubscribeTeachers: null,
      unsubscribeStudents: null,

      // ── 학교 추가/편집 모달 ──────────────────────────────────
      showAddSchoolModal: false,
      editMode: false,
      editingId: null,
      saving: false,
      addError: '',
      addForm: { name: '', address: '', plan: '무료', status: '활성' },
      planOptions: ['무료', '유료'],
      statusOptions: ['활성', '정지', '미납'],

      // ── ECharts 인스턴스 (월별 신규 가입 막대그래프) ─────────
      chart: null,
    };
  },
  computed: {
    // ── 학교별 교사/학생 수 집계 ────────────────────────────
    teacherCountsBySchool() {
      const counts = {};
      this.teachers.forEach(t => { if (t.school) counts[t.school] = (counts[t.school] || 0) + 1; });
      return counts;
    },
    studentCountsBySchool() {
      const counts = {};
      this.students.forEach(s => { if (s.school) counts[s.school] = (counts[s.school] || 0) + 1; });
      return counts;
    },
    usersRows() {
      return this.schools
        .map(s => ({
          id: s.id,
          school: s.name,
          address: s.address || '',
          plan: s.plan || '무료',
          isSubscribed: this.isPaidPlan(s.plan),
          teachers: this.teacherCountsBySchool[s.name] || 0,
          students: this.studentCountsBySchool[s.name] || 0,
          joined: this.formatDate(this.toDate(s.createdAt)),
          status: s.status || '활성',
        }))
        .sort((a, b) => a.school.localeCompare(b.school, 'ko'));
    },

    // ── 개요 통계 ────────────────────────────────────────────
    totalUsers() {
      return this.teachers.length + this.students.length;
    },
    activeSubscriptions() {
      return this.schools.filter(s => s.plan && s.plan !== '무료').length;
    },
    newSignupsThisMonth() {
      const now = new Date();
      return this.schools.filter(s => {
        const d = this.toDate(s.createdAt);
        return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }).length;
    },
    stats() {
      return [
        { num: this.schools.length,       label: '가입 학교',        color: 'var(--navy)' },
        { num: this.totalUsers,           label: '총 사용자',        color: 'var(--coral)' },
        { num: this.newSignupsThisMonth,  label: '이번 달 신규 가입', color: 'var(--gold)' },
        { num: this.activeSubscriptions,  label: '구독 학교',        color: 'var(--mint)' },
      ];
    },
    paidSchoolCount() {
      return this.schools.filter(s => this.isPaidPlan(s.plan) && s.status !== '미납').length;
    },
    unpaidSchoolCount() {
      return this.schools.filter(s => this.isPaidPlan(s.plan) && s.status === '미납').length;
    },
    monthlyRevenue() {
      return this.paidSchoolCount * 500000;
    },
    outstandingAmount() {
      return this.unpaidSchoolCount * 500000;
    },
    billingRows() {
      return this.schools
        .map(s => ({
          school: s.name || '-',
          plan: s.plan || '무료',
          amount: this.isPaidPlan(s.plan) ? '500,000원' : '0원',
          amountValue: this.isPaidPlan(s.plan) ? 500000 : 0,
          date: this.formatDate(this.toDate(s.createdAt)),
          status: s.status || (this.isPaidPlan(s.plan) ? '활성' : '무료'),
        }))
        .sort((a, b) => a.school.localeCompare(b.school, 'ko'));
    },
    // 최근 5개월 신규 가입 학교 수 (ECharts 막대그래프용)
    monthlySignups() {
      const now = new Date();
      const months = [];
      for (let i = 4; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ year: d.getFullYear(), month: d.getMonth(), label: `${d.getMonth() + 1}월`, count: 0 });
      }
      this.schools.forEach(s => {
        const d = this.toDate(s.createdAt);
        if (!d) return;
        const m = months.find(mm => mm.year === d.getFullYear() && mm.month === d.getMonth());
        if (m) m.count += 1;
      });
      return months;
    },
    // ECharts용 옵션 (디자인 토큰과 맞춘 색상/폰트)
    chartOption() {
      return {
        grid: { left: 40, right: 20, top: 34, bottom: 28, containLabel: true },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          valueFormatter: (v) => `${v}개교`,
        },
        xAxis: {
          type: 'category',
          data: this.monthlySignups.map(m => m.label),
          axisLine: { lineStyle: { color: 'rgba(15,27,53,0.10)' } },
          axisTick: { show: false },
          axisLabel: { color: '#6B7A99', fontFamily: 'Pretendard, Noto Sans KR, sans-serif', fontSize: 11 },
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          splitLine: { lineStyle: { color: 'rgba(15,27,53,0.08)', type: 'dashed' } },
          axisLabel: { color: '#6B7A99', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 },
        },
        series: [{
          type: 'bar',
          data: this.monthlySignups.map(m => m.count),
          barWidth: '46%',
          itemStyle: { color: '#FF5F47', borderRadius: [6, 6, 0, 0] },
          emphasis: { itemStyle: { color: '#E14B34' } },
          label: {
            show: true,
            position: 'top',
            color: '#0F1B35',
            fontWeight: 700,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
          },
        }],
      };
    },
  },
  watch: {
    // 탭이 다시 '개요'로 바뀔 때마다 차트 DOM이 새로 마운트되므로(v-if) 다시 초기화합니다.
    activeTab(newTab) {
      if (newTab === 'overview') {
        this.$nextTick(() => this.renderChart());
      } else {
        this.disposeChart();
      }
    },
    monthlySignups: {
      deep: true,
      handler() {
        if (this.activeTab === 'overview') {
          this.$nextTick(() => this.renderChart());
        }
      },
    },
  },
  mounted() {
    this.listenSchools();
    this.listenTeachers();
    this.listenStudents();
    this.$nextTick(() => this.renderChart());
    window.addEventListener('resize', this.handleChartResize);
  },
  beforeUnmount() {
    if (this.unsubscribeSchools) this.unsubscribeSchools();
    if (this.unsubscribeTeachers) this.unsubscribeTeachers();
    if (this.unsubscribeStudents) this.unsubscribeStudents();
    window.removeEventListener('resize', this.handleChartResize);
    this.disposeChart();
  },
  methods: {
    toDate(ts) {
      if (!ts) return null;
      return ts.toDate ? ts.toDate() : new Date(ts);
    },
    isPaidPlan(plan) {
      if (!plan) return false;
      return String(plan).trim() !== '무료' && String(plan).trim().toLowerCase() !== 'free';
    },
    // Apache ECharts로 월별 신규 가입 막대그래프를 그립니다 (CDN 전역 `echarts` 사용).
    disposeChart() {
      if (this.chart && !this.chart.isDisposed()) {
        this.chart.dispose();
      }
      this.chart = null;
    },
    renderChart() {
      const el = this.$refs.monthlyChartEl;
      if (!el || typeof echarts === 'undefined') return;

      if (this.chart && !this.chart.isDisposed()) {
        const currentDom = this.chart.getDom();
        if (currentDom !== el) {
          this.disposeChart();
        }
      }

      if (!this.chart || this.chart.isDisposed()) {
        this.chart = echarts.init(el);
      }

      this.chart.setOption(this.chartOption);
      this.$nextTick(() => {
        if (this.chart && !this.chart.isDisposed()) {
          this.chart.resize();
        }
      });
    },
    handleChartResize() {
      if (this.chart && !this.chart.isDisposed()) this.chart.resize();
    },
    formatDate(d) {
      if (!d) return '-';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },
    statusBadge(status) {
      return status === '완료' || status === '활성' ? 'badge-green'
           : status === '미납' ? 'badge-red'
           : status === '정지' ? 'badge-red'
           : 'badge-yellow';
    },

    listenSchools() {
      this.loadingSchools = true;
      this.unsubscribeSchools = db.collection('schools').onSnapshot(
        (snap) => {
          this.schools = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          this.loadingSchools = false;
        },
        (err) => { console.error(err); this.loadingSchools = false; }
      );
    },
    listenTeachers() {
      this.unsubscribeTeachers = db.collection('teachers').onSnapshot(
        (snap) => { this.teachers = snap.docs.map(d => ({ id: d.id, ...d.data() })); },
        (err) => console.error(err)
      );
    },
    listenStudents() {
      this.unsubscribeStudents = db.collection('students').onSnapshot(
        (snap) => { this.students = snap.docs.map(d => ({ id: d.id, ...d.data() })); },
        (err) => console.error(err)
      );
    },

    // ── 학교 추가 ────────────────────────────────────────────
    openAddSchoolModal() {
      this.editMode = false;
      this.editingId = null;
      this.addForm = { name: '', address: '', plan: '무료', status: '활성' };
      this.addError = '';
      this.showAddSchoolModal = true;
    },
    // ── 학교 편집 ────────────────────────────────────────────
    openEditSchoolModal(row) {
      this.editMode = true;
      this.editingId = row.id;
      this.addForm = { name: row.school, address: row.address, plan: row.plan, status: row.status };
      this.addError = '';
      this.showAddSchoolModal = true;
    },
    closeAddSchoolModal() {
      if (this.saving) return;
      this.showAddSchoolModal = false;
      this.editMode = false;
      this.editingId = null;
    },
    async submitAddSchool() {
      this.addError = '';
      const name = this.addForm.name.trim();
      if (!name) {
        this.addError = '학교명을 입력해주세요.';
        return;
      }
      const nameTaken = this.schools.some(s => s.name === name && s.id !== this.editingId);
      if (nameTaken) {
        this.addError = '이미 등록된 학교입니다.';
        return;
      }

      const isRename = this.editMode && name !== this.editingId;
      if (isRename) {
        const confirmed = confirm(
          `학교명을 "${this.editingId}"에서 "${name}"(으)로 변경합니다.\n` +
          `이 학교에 속한 교사·학생·수행평가 기록도 함께 이전됩니다. 계속할까요?`
        );
        if (!confirmed) return;
      }

      this.saving = true;
      try {
        if (this.editMode) {
          if (isRename) {
            await this.renameSchool(this.editingId, name, {
              address: this.addForm.address.trim(),
              plan: this.addForm.plan,
              status: this.addForm.status,
            });
          } else {
            await db.collection('schools').doc(this.editingId).update({
              address: this.addForm.address.trim(),
              plan: this.addForm.plan,
              status: this.addForm.status,
            });
          }
        } else {
          // 문서 ID를 학교명으로 사용 — TeacherPanel이 학교 상태를 조회할 때
          // db.collection('schools').doc(학교명) 형태로 참조하기 때문에 맞춰줍니다.
          await db.collection('schools').doc(name).set({
            name,
            address: this.addForm.address.trim(),
            plan: this.addForm.plan,
            status: this.addForm.status,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        }
        this.showAddSchoolModal = false;
        this.editMode = false;
        this.editingId = null;
      } catch (e) {
        console.error(e);
        this.addError = this.editMode ? '학교 정보 수정 중 오류가 발생했습니다.' : '학교 등록 중 오류가 발생했습니다.';
      }
      this.saving = false;
    },

    // 학교명(=문서 ID)을 바꾸면서, 'school' 필드로 이 학교를 참조하는
    // 다른 컬렉션(교사/학생/수행평가/반응)의 문서도 함께 새 이름으로 옮깁니다.
    // Firestore 배치는 한 번에 최대 500개 연산까지만 지원하므로 청크 단위로 커밋합니다.
    async renameSchool(oldName, newName, updatedFields) {
      const oldRef = db.collection('schools').doc(oldName);
      const newRef = db.collection('schools').doc(newName);

      const oldSnap = await oldRef.get();
      const oldData = oldSnap.exists ? oldSnap.data() : {};

      const relatedCollections = ['teachers', 'students', 'assessments', 'schedule-reactions'];
      const refsToRetarget = [];
      for (const col of relatedCollections) {
        const snap = await db.collection(col).where('school', '==', oldName).get();
        snap.forEach(doc => refsToRetarget.push(doc.ref));
      }

      const CHUNK = 450;
      let batch = db.batch();
      let opCount = 0;
      const flushIfFull = async () => {
        if (opCount >= CHUNK) {
          await batch.commit();
          batch = db.batch();
          opCount = 0;
        }
      };

      batch.set(newRef, { ...oldData, ...updatedFields, name: newName });
      opCount++;
      await flushIfFull();

      for (const ref of refsToRetarget) {
        batch.update(ref, { school: newName });
        opCount++;
        await flushIfFull();
      }

      batch.delete(oldRef);
      opCount++;

      await batch.commit();
    },

    // ── 학교 상태 관리 ───────────────────────────────────────
    async toggleSchoolStatus(row) {
      const next = row.status === '정지' ? '활성' : '정지';
      if (!confirm(`${row.school}의 상태를 '${next}'(으)로 변경할까요?`)) return;
      try {
        await db.collection('schools').doc(row.id).update({ status: next });
      } catch (e) {
        console.error(e);
        alert('상태 변경 중 오류가 발생했습니다.');
      }
    },
    async deleteSchool(row) {
      if (!confirm(`${row.school}을(를) 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
      try {
        await db.collection('schools').doc(row.id).delete();
      } catch (e) {
        console.error(e);
        alert('학교 삭제 중 오류가 발생했습니다.');
      }
    },
  },
  template: `
    <main class="ph-main">
      <div class="page-header">
        <div class="page-header__title">
          <h1>관리자 <em>Admin</em></h1>
          <p class="page-header__subtitle">플랜 허브 운영 현황을 총괄합니다</p>
        </div>

        <!-- 탭: 다른 화면(로그인/회원가입)과 동일한 필 세그먼트 스타일로 통일 -->
        <div style="display:inline-grid;grid-template-columns:repeat(3,1fr);background:var(--cream);border-radius:var(--radius-sm);padding:4px;gap:2px">
          <button
            v-for="t in tabsMeta" :key="t.key"
            @click="activeTab = t.key"
            style="padding:8px 18px;border:none;border-radius:6px;cursor:pointer;font-family:var(--font-sans);font-size:0.85rem;font-weight:600;transition:var(--transition);white-space:nowrap"
            :style="activeTab === t.key ? 'background:white;color:var(--navy);box-shadow:0 2px 8px rgba(0,0,0,0.08)' : 'background:transparent;color:var(--text-muted)'"
          >{{ t.label }}</button>
        </div>
      </div>

      <!-- Overview -->
      <div v-if="activeTab === 'overview'">
        <div class="admin-stats">
          <div v-for="s in stats" :key="s.label" class="admin-stat">
            <div class="admin-stat__num mono" :style="{ color: s.color }">{{ s.num.toLocaleString() }}</div>
            <div class="admin-stat__label">{{ s.label }}</div>
          </div>
        </div>

        <!-- Apache ECharts 막대그래프 - monthly signups (실데이터 기반) -->
        <div class="ph-card">
          <div class="ph-card__header">
            <span class="ph-card__title">월별 신규 가입 추이</span>
          </div>
          <div class="ph-card__body">
            <div ref="monthlyChartEl" style="width:100%;height:240px"></div>
          </div>
        </div>
      </div>

      <!-- Users tab -->
      <div v-if="activeTab === 'users'">
        <div class="ph-card">
          <div class="ph-card__header">
            <span class="ph-card__title">학교 · 사용자 현황</span>
            <button class="btn btn-primary btn-sm" @click="openAddSchoolModal">＋ 학교 추가</button>
          </div>
          <div class="ph-card__body" style="padding:0">
            <div v-if="loadingSchools" class="text-muted" style="text-align:center;padding:32px">불러오는 중...</div>
            <div v-else-if="usersRows.length === 0" class="text-muted" style="text-align:center;padding:40px">
              등록된 학교가 없습니다. 우측 상단의 '학교 추가'로 등록해보세요.
            </div>
            <div v-else style="overflow-x:auto">
              <table class="ph-table">
                <thead>
                  <tr>
                    <th>학교명</th><th>플랜</th><th>교사 수</th><th>학생 수</th><th>가입일</th><th>상태</th><th>액션</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="u in usersRows" :key="u.id">
                    <td><strong>{{ u.school }}</strong></td>
                    <td>
                      <span class="badge" :class="u.isSubscribed ? 'badge-green' : 'badge-yellow'">
                        {{ u.isSubscribed ? '구독 중' : '구독 아님' }}
                      </span>
                    </td>
                    <td class="mono">{{ u.teachers }}명</td>
                    <td class="mono">{{ u.students }}명</td>
                    <td class="mono">{{ u.joined }}</td>
                    <td><span class="badge" :class="statusBadge(u.status)">{{ u.status }}</span></td>
                    <td style="white-space:nowrap">
                      <button class="btn btn-ghost btn-sm" @click="openEditSchoolModal(u)">편집</button>
                      <button class="btn btn-ghost btn-sm" style="margin-left:4px" @click="toggleSchoolStatus(u)">
                        {{ u.status === '정지' ? '활성화' : '정지' }}
                      </button>
                      <button class="btn btn-danger btn-sm" style="margin-left:4px" @click="deleteSchool(u)">삭제</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Billing tab -->
      <div v-if="activeTab === 'billing'">
        <div class="stats-row" style="margin-bottom:24px">
          <div class="stat-card coral">
            <div class="stat-card__value mono">{{ monthlyRevenue.toLocaleString() }}<span style="font-size:1rem">원</span></div>
            <div class="stat-card__label">이번 달 총 수익</div>
          </div>
          <div class="stat-card gold">
            <div class="stat-card__value mono">{{ paidSchoolCount }}</div>
            <div class="stat-card__label">결제한 학교</div>
          </div>
          <div class="stat-card mint">
            <div class="stat-card__value mono">{{ outstandingAmount.toLocaleString() }}<span style="font-size:1rem">원</span></div>
            <div class="stat-card__label">미수금</div>
          </div>
        </div>

        <div class="text-muted" style="margin:-8px 0 16px; font-size:0.85rem">
          미납 학교 {{ unpaidSchoolCount }}개 · 50만원 단위 미납 {{ unpaidSchoolCount }}건
        </div>

        <div class="ph-card">
          <div class="ph-card__header">
            <span class="ph-card__title">결제 내역</span>
          </div>
          <div class="ph-card__body" style="padding:0">
            <div style="overflow-x:auto">
              <table class="ph-table">
                <thead>
                  <tr><th>학교</th><th>플랜</th><th>금액</th><th>결제일</th><th>상태</th></tr>
                </thead>
                <tbody>
                  <tr v-for="p in billingRows" :key="p.school+p.date">
                    <td><strong>{{ p.school }}</strong></td>
                    <td><span class="badge badge-blue">{{ p.plan }}</span></td>
                    <td class="mono">{{ p.amount }}</td>
                    <td class="mono">{{ p.date }}</td>
                    <td><span class="badge" :class="statusBadge(p.status)">{{ p.status }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- 학교 추가/편집 모달 (ChatModal / CalendarView 상세모달과 동일한 오버레이 패턴) -->
      <div v-if="showAddSchoolModal" style="position:fixed;inset:0;background:rgba(15,27,53,0.6);display:flex;align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(4px)" @click.self="closeAddSchoolModal">
        <div style="background:var(--white);border-radius:var(--radius-lg);width:100%;max-width:440px;max-height:85vh;display:flex;flex-direction:column;box-shadow:var(--shadow-lg);overflow:hidden">
          <div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
            <div style="font-family:var(--font-serif);font-size:1.2rem;color:var(--navy)">{{ editMode ? '학교 정보 수정' : '학교 추가' }}</div>
            <button @click="closeAddSchoolModal" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--text-muted)">✕</button>
          </div>

          <div style="overflow-y:auto;padding:20px 24px">
            <div class="form-group">
              <label class="form-label">학교명 *</label>
              <input class="form-control" v-model="addForm.name" placeholder="예: 한빛중학교" :disabled="saving" @keyup.enter="submitAddSchool"/>
              <p v-if="editMode" class="text-muted" style="font-size:0.72rem;margin:6px 0 0">
                이름을 바꾸면 이 학교의 교사·학생·수행평가 기록도 함께 이전됩니다.
              </p>
            </div>
            <div class="form-group">
              <label class="form-label">주소</label>
              <input class="form-control" v-model="addForm.address" placeholder="학교 주소 입력" :disabled="saving"/>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">구독 플랜</label>
                <select class="form-control" v-model="addForm.plan" :disabled="saving">
                  <option v-for="p in planOptions" :key="p">{{ p }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">상태</label>
                <select class="form-control" v-model="addForm.status" :disabled="saving">
                  <option v-for="s in statusOptions" :key="s">{{ s }}</option>
                </select>
              </div>
            </div>
            <div v-if="addError" style="color:#EF4444;font-size:0.82rem;margin-bottom:8px">⚠ {{ addError }}</div>
          </div>

          <div style="padding:16px 24px;border-top:1px solid var(--border);display:flex;gap:10px;flex-shrink:0">
            <button class="btn btn-outline" style="flex:1;justify-content:center" @click="closeAddSchoolModal" :disabled="saving">취소</button>
            <button class="btn btn-primary" style="flex:1;justify-content:center" @click="submitAddSchool" :disabled="saving">
              {{ saving ? (editMode ? '저장 중...' : '등록 중...') : (editMode ? '수정 완료' : '학교 등록') }}
            </button>
          </div>
        </div>
      </div>
    </main>
  `,
};