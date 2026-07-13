// src/components/ScheduleCard.js
const ScheduleCard = {
  name: 'ScheduleCard',
  components: { ChatModal },
  inject: ['modeState'],
  props: {
    schedule: { type: Object, required: true },
    showActions: { type: Boolean, default: false },
    reactions: { type: Object, default: () => ({}) },
  },
  emits: ['edit', 'delete'],
  data() {
    return {
      reacting: false,
      myReaction: '',
      chatOpen: false,
    };
  },
  mounted() {
    this.loadMyReaction();
  },
  watch: {
    schedule: {
      handler() {
        this.loadMyReaction();
      },
      deep: true,
    },
  },
  computed: {
    reactionDocId() {
      return `${this.schedule.id || 'schedule'}_${auth.currentUser?.uid || 'anonymous'}`;
    },
    dday() {
      const today = new Date(); today.setHours(0,0,0,0);
      const target = new Date(this.schedule.date); target.setHours(0,0,0,0);
      const diff = Math.ceil((target - today) / 86400000);
      if (diff === 0) return 'D-Day';
      if (diff > 0)  return `D-${diff}`;
      return `D+${Math.abs(diff)}`;
    },
    ddayClass() {
      const d = parseInt(this.dday.replace('D',''));
      if (isNaN(d) || d === 0) return 'badge-red';
      if (d <= 3)  return 'badge-red';
      if (d <= 7)  return 'badge-yellow';
      return 'badge-blue';
    },
    subjectBorderClass() {
      const map = {국어:'kor',수학:'math',영어:'eng',과학:'sci',사회:'hist',음악:'art',미술:'art'};
      return map[this.schedule.subject] || 'hist';
    },
    isProblematic() {
      return !!(this.schedule.conflict || this.schedule.studentOverlapWarning);
    },
  },
  methods: {
    async loadMyReaction() {
      if (!auth.currentUser || !this.schedule?.id) {
        this.myReaction = '';
        return;
      }
      try {
        const doc = await db.collection('schedule-reactions').doc(this.reactionDocId).get();
        if (doc.exists) {
          this.myReaction = doc.data().reaction || '';
        } else {
          this.myReaction = '';
        }
      } catch (e) {
        this.myReaction = '';
      }
    },
    async submitReaction(reaction) {
      if (!auth.currentUser || !this.schedule?.id) return;
      this.reacting = true;
      try {
        await db.collection('schedule-reactions').doc(this.reactionDocId).set({
          scheduleId: this.schedule.id,
          school: this.schedule.school || '',
          studentUid: auth.currentUser.uid,
          reaction,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        this.myReaction = reaction;
      } catch (e) {
        console.error(e);
        alert('반응 저장 중 오류가 발생했습니다.');
      }
      this.reacting = false;
    },
  },
  template: `
    <div
      class="upcoming-item"
      :class="[subjectBorderClass, { 'upcoming-item--conflict': isProblematic }]"
      style="cursor:pointer"
    >
      <!-- 문제 수행평가 경고 배너 -->
      <div v-if="isProblematic" class="upcoming-item__conflict-badge">
        <span>⚠️ 일정 충돌</span>
        <span v-if="showActions && reactions[schedule.id]" class="upcoming-item__conflict-badge__reaction">
          · 괜찮아요 {{ reactions[schedule.id].good }}명&nbsp;/&nbsp;힘들어요 {{ reactions[schedule.id].hard }}명
        </span>
        <span v-else-if="showActions" class="upcoming-item__conflict-badge__reaction">
          · 아직 학생 반응 없음
        </span>
      </div>
      <span class="upcoming-item__dday badge" :class="ddayClass">{{ dday }}</span>
      <div class="upcoming-item__info">
        <div class="upcoming-item__subject" :style="isProblematic ? 'color:#C0392B;font-weight:700' : ''">{{ schedule.subject }} — {{ schedule.title }}</div>
        <div class="upcoming-item__detail">{{ schedule.classRoom }} · {{ schedule.date }} · {{ schedule.teacher }}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;align-items:center;flex-wrap:wrap;justify-content:flex-end">
        <!-- 💬 메시지 아이콘: 모든 일정 카드에 표시 -->
        <button
          class="btn-chat-icon"
          :class="{ 'btn-chat-icon--active': chatOpen }"
          @click.stop="chatOpen = true"
          :title="modeState.current === 'teacher' ? '학생과 대화하기' : '선생님과 대화하기'"
        >
          💬
        </button>

        <div v-if="modeState.current === 'student' && !showActions && (schedule.conflict || schedule.studentOverlapWarning)" style="display:flex;gap:6px;align-items:center">
          <button class="btn btn-ghost btn-sm" :disabled="reacting" @click.stop="submitReaction('괜찮아요')" :class="{ 'btn-primary': myReaction === '괜찮아요' }">괜찮아요</button>
          <button class="btn btn-danger btn-sm" :disabled="reacting" @click.stop="submitReaction('힘들어요')" :class="{ 'btn-secondary': myReaction === '힘들어요' }">힘들어요</button>
        </div>

        <div v-if="showActions" style="display:flex;gap:6px" @click.stop>
          <button class="btn btn-ghost btn-sm" @click="$emit('edit', schedule)">수정</button>
          <button class="btn btn-danger btn-sm" @click="$emit('delete', schedule)">삭제</button>
        </div>
      </div>
      <div v-if="myReaction && modeState.current === 'student' && !showActions && (schedule.conflict || schedule.studentOverlapWarning)" style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">
        나의 선택: {{ myReaction }}
      </div>

      <!-- 채팅 모달 -->
      <chat-modal
        v-if="chatOpen"
        :schedule="schedule"
        @close="chatOpen = false"
      />
    </div>
  `,
};
