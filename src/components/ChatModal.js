// src/components/ChatModal.js
const ChatModal = {
  name: 'ChatModal',
  inject: ['modeState'],
  props: {
    schedule: { type: Object, required: true }, // 수행평가 정보
  },
  emits: ['close'],
  data() {
    return {
      messages: [],
      newMessage: '',
      sending: false,
      unsubscribe: null,
    };
  },
  computed: {
    chatId() {
      // 수행평가 ID + 학교명으로 채팅방 ID 생성
      return `${this.schedule.id}_${this.modeState.selectedSchool?.name || 'unknown'}`;
    },
    currentUser() {
      return auth.currentUser;
    },
    senderLabel() {
      return this.modeState.current === 'teacher' ? '선생님' : '학생';
    },
  },
  mounted() {
    this.listenMessages();
  },
  beforeUnmount() {
    if (this.unsubscribe) this.unsubscribe();
  },
  methods: {
    listenMessages() {
      this.unsubscribe = db
        .collection('chats')
        .doc(this.chatId)
        .collection('messages')
        .orderBy('createdAt', 'asc')
        .onSnapshot(snapshot => {
          this.messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          this.$nextTick(() => this.scrollToBottom());
        });
    },
    async sendMessage() {
      if (!this.newMessage.trim() || this.sending) return;
      this.sending = true;
      try {
        await db
          .collection('chats')
          .doc(this.chatId)
          .collection('messages')
          .add({
            text: this.newMessage.trim(),
            senderUid: this.currentUser?.uid || 'anonymous',
            senderName: this.currentUser?.displayName || this.senderLabel,
            senderRole: this.modeState.current,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        this.newMessage = '';
      } catch (e) {
        alert('메시지 전송 실패');
      }
      this.sending = false;
    },
    scrollToBottom() {
      const el = this.$refs.messageList;
      if (el) el.scrollTop = el.scrollHeight;
    },
    formatTime(ts) {
      if (!ts) return '';
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    },
    isMe(msg) {
      return msg.senderUid === this.currentUser?.uid;
    },
    getDisplayName(msg) {
      if (msg.senderRole === 'student') return '학생';
      let name = msg.senderName || '선생님';
      if (name !== '선생님' && !name.includes('선생님')) {
        name += ' 선생님';
      }
      return `${name} ${this.schedule.subject}`;
    },
  },
  template: `
    <div style="position:fixed;inset:0;background:rgba(15,27,53,0.6);display:flex;align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(4px)" @click.self="$emit('close')">
      <div style="background:var(--white);border-radius:var(--radius-lg);width:100%;max-width:520px;height:600px;display:flex;flex-direction:column;box-shadow:var(--shadow-lg);overflow:hidden">

        <!-- 헤더 -->
        <div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
          <div>
            <div style="font-family:var(--font-serif);font-size:1.1rem;color:var(--navy);margin-bottom:2px">
              {{ schedule.subject }} — {{ schedule.title }}
            </div>
            <div style="font-size:0.78rem;color:var(--text-muted)">{{ schedule.classRoom }} · {{ schedule.date }} · {{ modeState.selectedSchool?.name || schedule.school }}</div>
          </div>
          <button @click="$emit('close')" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--text-muted);padding:4px">✕</button>
        </div>

        <!-- 메시지 목록 -->
        <div ref="messageList" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px">
          <div v-if="messages.length === 0" style="text-align:center;color:var(--text-muted);margin:auto;font-size:0.85rem">
            첫 번째 메시지를 남겨보세요 💬
          </div>
          <div
            v-for="msg in messages"
            :key="msg.id"
            :style="isMe(msg) ? 'align-self:flex-end;align-items:flex-end' : 'align-self:flex-start;align-items:flex-start'"
            style="display:flex;flex-direction:column;max-width:75%;gap:3px"
          >
            <!-- 상대방 이름 -->
            <div v-if="!isMe(msg)" style="font-size:0.72rem;color:var(--text-muted);padding:0 4px;display:flex;align-items:center;gap:4px">
              <span style="color:var(--navy);font-weight:700">
                {{ getDisplayName(msg) }}
              </span>
            </div>
            <!-- 말풍선 -->
            <div :style="isMe(msg)
              ? 'background:var(--navy);color:white;border-radius:18px 18px 4px 18px'
              : 'background:var(--cream);color:var(--navy);border-radius:18px 18px 18px 4px'"
              style="padding:10px 14px;font-size:0.88rem;line-height:1.5;word-break:break-word">
              {{ msg.text }}
            </div>
            <!-- 시간 -->
            <div style="font-size:0.68rem;color:var(--text-muted);padding:0 4px">{{ formatTime(msg.createdAt) }}</div>
          </div>
        </div>

        <!-- 입력창 -->
        <div style="padding:16px 24px;border-top:1px solid var(--border);display:flex;gap:10px;flex-shrink:0">
          <input
            class="form-control"
            v-model="newMessage"
            placeholder="메시지를 입력하세요..."
            @keyup.enter="sendMessage"
            style="flex:1"
          />
          <button class="btn btn-primary" @click="sendMessage" :disabled="sending || !newMessage.trim()" style="flex-shrink:0;padding:0 20px">
            전송
          </button>
        </div>

      </div>
    </div>
  `,
};