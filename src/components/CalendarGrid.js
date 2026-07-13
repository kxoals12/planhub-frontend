// src/components/CalendarGrid.js
// FullCalendar(v6, CDN global build)로 구현. index.html에서 fullcalendar 번들을
// 미리 로드해두면 window.FullCalendar 전역으로 접근 가능.
//
// 인터페이스는 기존 커스텀 그리드와 최대한 동일하게 유지:
//   props: events, editable
//   emits: day-click ({ date })
//   methods: prevMonth(), nextMonth()  ← CalendarView.js가 $refs로 직접 호출
//   data: monthLabel                  ← CalendarView.js가 $refs로 직접 읽음
// + 신규: editable일 때 이벤트를 드래그로 옮기면 'update-schedule' emit
const CalendarGrid = {
  name: 'CalendarGrid',
  props: {
    events: { type: Array, default: () => [] },
    editable: { type: Boolean, default: false },
    // 부모가 명시적 높이를 주는 곳(CalendarView 등)은 '100%', 그 외(Dashboard, StudentPanel 등
    // 카드 안에 자연스러운 높이로 놓이는 곳)는 기본값 'auto'를 씀. 부모 높이가 없는데 '100%'를
    // 강제하면 0으로 찌그러질 수 있어서 분리함.
    height: { type: [String, Number], default: 'auto' },
  },
  emits: ['day-click', 'update-schedule'],
  data() {
    return {
      calendar: null,
      monthLabel: '',
    };
  },
  computed: {
    fcEvents() {
      return this.events.map((e, i) => ({
        id: e.id != null ? String(e.id) : `tmp-${e.date}-${e.subject}-${e.classRoom}-${i}`,
        title: e.conflict || e.studentOverlapWarning ? `⚠ ${e.subject} ${e.classRoom}` : `${e.subject} ${e.classRoom}`,
        start: e.date,
        allDay: true,
        classNames: [this.subjectClass(e.subject)],
        extendedProps: { ...e },
      }));
    },
  },
  watch: {
    fcEvents: {
      handler(newEvents) {
        if (!this.calendar) return;
        this.calendar.removeAllEvents();
        this.calendar.addEventSource(newEvents);
      },
      deep: true,
    },
    editable(val) {
      this.calendar?.setOption('editable', val);
    },
  },
  mounted() {
    this.initCalendar();
  },
  beforeUnmount() {
    this.calendar?.destroy();
  },
  methods: {
    subjectClass(subject) {
      const map = { 국어: 'fc-subject-kor', 수학: 'fc-subject-math', 영어: 'fc-subject-eng', 과학: 'fc-subject-sci', 사회: 'fc-subject-hist', 음악: 'fc-subject-art', 미술: 'fc-subject-art' };
      return map[subject] || 'fc-subject-hist';
    },
    initCalendar() {
      this.calendar = new FullCalendar.Calendar(this.$refs.calEl, {
        locale: 'ko',
        height: this.height,
        firstDay: 0,
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev', center: 'title', right: 'next' },
        dayMaxEvents: 3,
        editable: this.editable,
        events: this.fcEvents,
        // ko 로케일 기본 포맷이 "13일"처럼 나와서, 숫자만 깔끔하게 표시
        dayCellContent: (arg) => String(arg.date.getDate()),
        datesSet: (arg) => {
          this.monthLabel = arg.view.title;
        },
        dateClick: (info) => {
          this.$emit('day-click', { date: info.date });
        },
        eventClick: (info) => {
          this.$emit('day-click', { date: info.event.start });
        },
        eventDrop: (info) => {
          this.$emit('update-schedule', { id: info.event.id, date: info.event.startStr });
        },
      });
      this.calendar.render();
    },
    prevMonth() {
      this.calendar?.prev();
    },
    nextMonth() {
      this.calendar?.next();
    },
  },
  template: `<div class="fc-wrap" ref="calEl"></div>`,
};