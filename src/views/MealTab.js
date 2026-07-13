// src/views/MealTab.js
const MealTab = {
  name: 'MealTab',
  inject: ['modeState'],
  data() {
    const today = new Date();
    return {
      selectedDate: today,
      lunch: [],
      dinner: [],
      loadingLunch: false,
      loadingDinner: false,
      errorMsg: '',
    };
  },
  computed: {
    formattedLabel() {
      const d = this.selectedDate;
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${days[d.getDay()]})`;
    },
    dateInputValue() {
      const d = this.selectedDate;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },
    schoolName() {
      return this.modeState.selectedSchool?.name || '';
    },
  },
  mounted() {
    this.loadMeals();
  },
  methods: {
    toYMD(date) {
      return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    },
    changeDate(delta) {
      const d = new Date(this.selectedDate);
      d.setDate(d.getDate() + delta);
      this.selectedDate = d;
      this.loadMeals();
    },
    goToday() {
      this.selectedDate = new Date();
      this.loadMeals();
    },
    onDateInput(e) {
      // input[type=date] 값은 로컬 타임존 기준으로 파싱해야 함
      const [y, m, day] = e.target.value.split('-').map(Number);
      this.selectedDate = new Date(y, m - 1, day);
      this.loadMeals();
    },
    parseMeal(json) {
      try {
        const raw = json.mealServiceDietInfo[1].row[0].DDISH_NM;
        const ALLERGY_MAP = {
          1:'난류', 2:'우유', 3:'메밀', 4:'땅콩', 5:'대두', 6:'밀', 7:'고등어', 8:'게', 9:'새우', 
          10:'돼지고기', 11:'복숭아', 12:'토마토', 13:'아황산염', 14:'호두', 15:'닭고기', 16:'쇠고기', 
          17:'오징어', 18:'조개류', 19:'잣'
        };

        return raw
          .split(/<br\s*\/?>/i)
          .map(item => {
            let cleanItem = item.replace(/\*/g, '').trim();
            const allergyMatch = cleanItem.match(/([\d\.]+|\([\d\.]+\))$/);
            let allergyText = '';
            
            if (allergyMatch) {
              const matchedStr = allergyMatch[1];
              cleanItem = cleanItem.replace(matchedStr, '').trim();
              const nums = matchedStr.match(/\d+/g);
              if (nums) {
                const ingredients = nums
                  .map(n => ALLERGY_MAP[parseInt(n)])
                  .filter(Boolean);
                if (ingredients.length > 0) {
                  allergyText = ingredients.join(', ');
                }
              }
            }
            
            cleanItem = cleanItem.replace(/^\d+\.\s*/, '').trim();
            
            return {
              name: cleanItem,
              allergy: allergyText
            };
          })
          .filter(m => m.name);
      } catch {
        return [];
      }
    },
    async fetchMeal(mealType) {
      const school = this.modeState.selectedSchool;
      if (!school?.officeCode || !school?.schoolCode) return [];
      const date = this.toYMD(this.selectedDate);
      try {
        const res = await fetch(
          `http://localhost:8080/api/meal?officeCode=${school.officeCode}&schoolCode=${school.schoolCode}&date=${date}&mealType=${mealType}`
        );
        if (!res.ok) throw new Error('서버 오류');
        const json = await res.json();
        return this.parseMeal(json);
      } catch (e) {
        console.error(e);
        return [];
      }
    },
    async loadMeals() {
      this.errorMsg = '';
      const school = this.modeState.selectedSchool;
      if (!school?.officeCode || !school?.schoolCode) {
        this.errorMsg = '학교 정보가 없습니다. 학교를 다시 선택해 주세요.';
        return;
      }
      this.loadingLunch = true;
      this.loadingDinner = true;
      this.lunch = [];
      this.dinner = [];
      this.lunch = await this.fetchMeal('2');
      this.loadingLunch = false;
      this.dinner = await this.fetchMeal('3');
      this.loadingDinner = false;
    },
  },
  watch: {
  'modeState.selectedSchool': {
    handler(newSchool) {
      if (newSchool?.officeCode && newSchool?.schoolCode) {
        this.loadMeals();
      }
    },
    deep: true,
  },
},
  template: `
    <main class="ph-main">
      <div class="page-header">
        <div class="page-header__title">
          <h1>급식 <em>Meal</em></h1>
          <p class="page-header__subtitle">{{ schoolName }} 오늘의 급식 정보</p>
        </div>
      </div>

      <!-- 에러 메시지 -->
      <div v-if="errorMsg" class="conflict-alert" style="margin-bottom:24px">
        <span class="conflict-alert__icon">⚠️</span>
        <div class="conflict-alert__text">{{ errorMsg }}</div>
      </div>

      <!-- 날짜 선택 네비게이션 -->
      <div style="display:flex;justify-content:center;margin-bottom:32px">
        <div style="display:inline-flex;align-items:center;background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);padding:6px;box-shadow:var(--shadow-sm)">
          <button class="btn btn-ghost" style="padding:8px 16px;border-radius:var(--radius-md)" @click="changeDate(-1)">◀ 이전</button>
          
          <div style="position:relative;display:flex;flex-direction:column;align-items:center;padding:0 24px;min-width:180px;cursor:pointer">
            <!-- 눈에 보이는 날짜 텍스트 -->
            <span style="font-family:var(--font-mono);font-size:1.1rem;font-weight:700;color:var(--navy);letter-spacing:0.02em">
              {{ formattedLabel }}
            </span>
            <!-- 실제 날짜 선택기 (투명하게 덮어씌움) -->
            <input
              type="date"
              :value="dateInputValue"
              @change="onDateInput"
              style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer"
              title="날짜 선택"
            />
          </div>

          <button class="btn btn-ghost" style="padding:8px 16px;border-radius:var(--radius-md)" @click="changeDate(1)">다음 ▶</button>
          
          <div style="width:1px;height:24px;background:var(--border);margin:0 8px"></div>
          
          <button class="btn btn-ghost" style="padding:8px 16px;font-weight:600;color:var(--navy)" @click="goToday">오늘</button>
        </div>
      </div>

      <!-- 급식 카드 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px" class="student-grid">

        <!-- 중식 -->
        <div class="ph-card">
          <div class="ph-card__header" style="justify-content:center;padding-bottom:12px;border-bottom:1px dashed var(--border)">
            <span style="font-size:1.1rem;font-weight:700;color:var(--navy);letter-spacing:0.1em">중식</span>
          </div>
          <div class="ph-card__body" style="padding:24px 16px">
            <div v-if="loadingLunch" style="text-align:center;padding:32px;color:var(--text-muted)">불러오는 중...</div>
            <div v-else-if="lunch.length === 0" style="text-align:center;padding:32px;color:var(--text-muted)">
              급식 정보가 없습니다
            </div>
            <ul v-else style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:16px;text-align:center">
              <li v-for="(item, i) in lunch" :key="i" style="display:flex;flex-direction:column;align-items:center;gap:4px">
                <span style="font-size:1.05rem;font-weight:600;color:var(--navy)">{{ item.name }}</span>
                <span v-if="item.allergy" style="font-size:0.75rem;color:var(--text-muted)">{{ item.allergy }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- 석식 -->
        <div class="ph-card">
          <div class="ph-card__header" style="justify-content:center;padding-bottom:12px;border-bottom:1px dashed var(--border)">
            <span style="font-size:1.1rem;font-weight:700;color:var(--navy);letter-spacing:0.1em">석식</span>
          </div>
          <div class="ph-card__body" style="padding:24px 16px">
            <div v-if="loadingDinner" style="text-align:center;padding:32px;color:var(--text-muted)">불러오는 중...</div>
            <div v-else-if="dinner.length === 0" style="text-align:center;padding:32px;color:var(--text-muted)">
              급식 정보가 없습니다
            </div>
            <ul v-else style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:16px;text-align:center">
              <li v-for="(item, i) in dinner" :key="i" style="display:flex;flex-direction:column;align-items:center;gap:4px">
                <span style="font-size:1.05rem;font-weight:600;color:var(--navy)">{{ item.name }}</span>
                <span v-if="item.allergy" style="font-size:0.75rem;color:var(--text-muted)">{{ item.allergy }}</span>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </main>
  `,
};