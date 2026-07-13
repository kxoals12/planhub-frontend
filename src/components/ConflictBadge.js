const ConflictBadge = {
  name: 'ConflictBadge',
  props: {
    conflicts: { type: Array, default: () => [] },
    studentOverlapWarnings: { type: Array, default: () => [] },
  },
  template: `
    <div v-if="conflicts.length > 0 || studentOverlapWarnings.length > 0" class="conflict-alert">
      <span class="conflict-alert__icon">⚠️</span>
      <div class="conflict-alert__text">
        <div class="conflict-alert__title">수행평가 일정 안내</div>
        <div v-for="(c, i) in conflicts" :key="'conflict-'+i">
          {{ c.classRoom }}반 — {{ c.date }}에 <strong>{{ c.subjects.join(', ') }}</strong> 과목이 같은 날에 겹칩니다.
        </div>
        <div v-for="(warning, i) in studentOverlapWarnings" :key="'warning-'+i" style="margin-top:6px">
          {{ warning.studentName }} 학생은 선택과목 때문에 같은 날에 {{ warning.count }}개 과목이 겹칠 수 있어, 수행평가 배치 시 참고가 필요합니다. ({{ warning.subjects.join(', ') }})
        </div>
      </div>
    </div>
  `,
};
