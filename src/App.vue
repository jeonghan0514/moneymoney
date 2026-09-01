<template>
  <div class="finance-container">
    <div class="header">
      <h2>🔒 我的私人記帳本</h2>
      <p class="subtitle">紀錄每一筆小美好與追星基金 🧁✨</p>
    </div>

    <!-- 本月概覽卡片 -->
    <div class="summary-cards">
      <div class="card income">
        <span class="card-label">本月收入 💰</span>
        <h3 class="card-amount">+ ${{ totalIncome }}</h3>
      </div>
      <div class="card expense">
        <span class="card-label">本月支出 💸</span>
        <h3 class="card-amount">- ${{ totalExpense }}</h3>
      </div>
      <div class="card balance">
        <span class="card-label">本月結餘 ✨</span>
        <h3 class="card-amount" :class="{ negative: (totalIncome - totalExpense) < 0 }">
          ${{ totalIncome - totalExpense }}
        </h3>
      </div>
    </div>

    <!-- 新增記帳表單 -->
    <div class="card-box form-card">
      <h3>✍️ 新增一筆紀錄</h3>
      <form @submit.prevent="addRecord" class="finance-form">
        <div class="form-row">
          <div class="form-group">
            <label>日期</label>
            <input type="date" v-model="form.date" required />
          </div>

          <div class="form-group">
            <label>收支類型</label>
            <select v-model="form.type">
              <option value="expense">💸 支出</option>
              <option value="income">💰 收入</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>分類</label>
            <select v-model="form.category">
              <template v-if="form.type === 'expense'">
                <option v-for="cat in expenseCategories" :key="cat" :value="cat">{{ cat }}</option>
              </template>
              <template v-else>
                <option v-for="cat in incomeCategories" :key="cat" :value="cat">{{ cat }}</option>
              </template>
            </select>
          </div>

          <div class="form-group">
            <label>金額</label>
            <input type="number" v-model.number="form.amount" min="1" placeholder="0" required />
          </div>
        </div>

        <div class="form-group full-width">
          <label>備註說明</label>
          <input type="text" v-model="form.note" placeholder="例：買小卡、吃火鍋、捷運加值" />
        </div>

        <button type="submit" class="submit-btn">✨ 儲存這筆紀錄</button>
      </form>
    </div>

    <!-- 近期紀錄清單 -->
    <div class="card-box list-card">
      <h3>📜 收支紀錄</h3>
      <div v-if="loading" class="status-msg">資料載入中... ⏳</div>
      <div v-else-if="records.length === 0" class="status-msg">目前還沒有紀錄喔！快來上記第一筆吧～ 🌱</div>
      <ul v-else class="record-list">
        <li v-for="item in records" :key="item.id" :class="['record-item', item.type]">
          <div class="item-left">
            <span class="category-badge">{{ item.category }}</span>
            <div class="item-detail">
              <span class="note-text">{{ item.note || '未填寫備註' }}</span>
              <span class="date-text">{{ item.date }}</span>
            </div>
          </div>
          <div class="item-right">
            <span class="amount-text">
              {{ item.type === 'expense' ? '-' : '+' }}${{ item.amount }}
            </span>
            <button @click="deleteRecord(item.id)" class="del-btn" title="刪除">🗑️</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { db } from './firebase'; 
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore';

export default {
  name: 'App',
  setup() {
    const records = ref([]);
    const loading = ref(true);

    const expenseCategories = ref([
      '🍱 飲食',
      '🚗 交通',
      '🛍️ 購物',
      '🎮 娛樂',
      '💎 追隨'
    ]);

    const incomeCategories = ref([
      '💵 薪水收入',
      '🎁 紅包/獎金',
      '🔄 售出回血',
      '✨ 其他收入'
    ]);

    const form = ref({
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      category: '🍱 飲食',
      amount: '',
      note: ''
    });

    const fetchRecords = async () => {
      loading.value = true;
      try {
        const q = query(collection(db, 'personal_records'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        const list = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        records.value = list;
      } catch (error) {
        console.error('讀取紀錄失敗:', error);
      } finally {
        loading.value = false;
      }
    };

    const addRecord = async () => {
      if (!form.value.amount || form.value.amount <= 0) return;
      try {
        await addDoc(collection(db, 'personal_records'), {
          date: form.value.date,
          type: form.value.type,
          category: form.value.category,
          amount: Number(form.value.amount),
          note: form.value.note,
          createdAt: new Date()
        });
        
        form.value.amount = '';
        form.value.note = '';
        await fetchRecords();
      } catch (error) {
        console.error('新增失敗:', error);
      }
    };

    const deleteRecord = async (id) => {
      if (!confirm('確定要刪除這筆紀錄嗎？')) return;
      try {
        await deleteDoc(doc(db, 'personal_records', id));
        await fetchRecords();
      } catch (error) {
        console.error('刪除失敗:', error);
      }
    };

    const totalIncome = computed(() => {
      return records.value
        .filter(r => r.type === 'income')
        .reduce((sum, r) => sum + r.amount, 0);
    });

    const totalExpense = computed(() => {
      return records.value
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0);
    });

    onMounted(() => {
      fetchRecords();
    });

    return {
      records,
      loading,
      expenseCategories,
      incomeCategories,
      form,
      addRecord,
      deleteRecord,
      totalIncome,
      totalExpense
    };
  }
};
</script>

<style>
/* 全域奶油色底色 */
body {
  margin: 0;
  padding: 0;
  background-color: #fdfaf2; /* 溫柔奶油暖黃色底 */
}
</style>

<style scoped>
.finance-container {
  max-width: 650px;
  margin: 0 auto;
  padding: 24px 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #5c4d42; /* 焦糖暖褐色文字 */
}

.header {
  text-align: center;
  margin-bottom: 25px;
}

.header h2 {
  margin: 0;
  font-size: 26px;
  color: #785232; /* 濃郁奶茶色 */
  letter-spacing: 0.5px;
}

.subtitle {
  margin-top: 6px;
  font-size: 14px;
  color: #a08369;
}

.summary-cards {
  display: flex;
  gap: 12px;
  margin-bottom: 25px;
}

.card {
  flex: 1;
  padding: 16px 12px;
  border-radius: 16px;
  background: #fffdf7;
  border: 1px solid #f3e9d2;
  box-shadow: 0 4px 15px rgba(212, 184, 150, 0.15);
  text-align: center;
}

.card-label {
  font-size: 13px;
  color: #8c7355;
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
}

.card-amount {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.card.income .card-amount { color: #519872; } /* 柔和莫蘭迪綠 */
.card.expense .card-amount { color: #d96b68; } /* 柔和草莓粉紅 */
.card.balance .card-amount { color: #785232; }
.card-amount.negative { color: #d96b68; }

.card-box {
  background: #ffffff;
  border-radius: 20px;
  padding: 22px;
  border: 1px solid #f3e9d2;
  box-shadow: 0 6px 20px rgba(212, 184, 150, 0.12);
  margin-bottom: 25px;
}

.card-box h3 {
  margin-top: 0;
  margin-bottom: 18px;
  font-size: 18px;
  color: #785232;
}

.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  margin-bottom: 18px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #8c7355;
}

.form-group input, .form-group select {
  padding: 11px 14px;
  background: #fffdf9;
  border: 1px solid #ebdcc4;
  border-radius: 12px;
  font-size: 14px;
  color: #5c4d42;
  outline: none;
  transition: all 0.2s ease;
}

.form-group input:focus, .form-group select:focus {
  border-color: #d4a373;
  box-shadow: 0 0 0 3px rgba(212, 163, 115, 0.2);
}

.submit-btn {
  width: 100%;
  padding: 13px;
  background: linear-gradient(135deg, #f4a261 0%, #e76f51 100%); /* 暖黃橘焦糖漸層 */
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(231, 111, 81, 0.25);
  transition: transform 0.1s ease, opacity 0.2s;
}

.submit-btn:hover {
  opacity: 0.95;
}

.submit-btn:active {
  transform: scale(0.99);
}

.status-msg {
  text-align: center;
  color: #b09a85;
  padding: 20px 0;
}

.record-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid #f7f1e3;
}

.record-item:last-child {
  border-bottom: none;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-badge {
  background: #fefae0;
  border: 1px solid #faedcd;
  color: #785232;
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
}

.item-detail {
  display: flex;
  flex-direction: column;
}

.note-text {
  font-size: 14px;
  font-weight: 600;
  color: #5c4d42;
}

.date-text {
  font-size: 12px;
  color: #b09a85;
  margin-top: 2px;
}

.item-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.amount-text {
  font-size: 16px;
  font-weight: bold;
}

.record-item.expense .amount-text { color: #d96b68; }
.record-item.income .amount-text { color: #519872; }

.del-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.del-btn:hover {
  opacity: 1;
}
</style>
