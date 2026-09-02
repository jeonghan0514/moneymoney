<template>
  <div class="finance-container">
    <!-- 頂部標題與用戶狀態 -->
    <div class="header">
      <h2><i class="fa-solid fa-lock header-icon"></i> 私人記帳本</h2>
      <p class="subtitle">紀錄每一筆小美好與追星基金 <i class="fa-solid fa-wand-magic-sparkles sub-icon"></i></p>
      
      <div class="user-bar">
        <div v-if="user" class="user-info">
          <img :src="user.photoURL" alt="avatar" class="avatar" />
          <span>{{ user.displayName }}</span>
          <button @click="handleSignOut" class="auth-btn logout">登出</button>
        </div>
        <div v-else>
          <button @click="handleSignIn" class="auth-btn login">
            <i class="fa-solid fa-right-to-bracket"></i> 使用 Google 登入雲端同步
          </button>
        </div>
      </div>
    </div>

    <!-- 尚未登入提示 -->
    <div v-if="!user" class="card-box status-msg">
      <p><i class="fa-solid fa-circle-info msg-icon"></i> 請先點擊上方按鈕登入 Google 帳號，即可跨裝置同步你的記帳紀錄。</p>
    </div>

    <!-- 登入後的主要區域 -->
    <template v-else>
      <!-- 本月概覽卡片 -->
      <div class="summary-cards">
        <div class="card income">
          <span class="card-label"><i class="fa-solid fa-chart-line"></i> 本月收入</span>
          <h3 class="card-amount">+ ${{ totalIncome }}</h3>
        </div>
        <div class="card expense">
          <span class="card-label"><i class="fa-solid fa-arrow-trend-down"></i> 本月支出</span>
          <h3 class="card-amount">- ${{ totalExpense }}</h3>
        </div>
        <div class="card balance">
          <span class="card-label"><i class="fa-solid fa-wallet"></i> 本月結餘</span>
          <h3 class="card-amount" :class="{ negative: (totalIncome - totalExpense) < 0 }">
            ${{ totalIncome - totalExpense }}
          </h3>
        </div>
      </div>

      <!-- 分頁選單 -->
      <div class="tab-nav">
        <button 
          :class="['tab-btn', { active: currentTab === 'form' }]" 
          @click="currentTab = 'form'"
        >
          <i class="fa-solid fa-circle-plus"></i> 新增紀錄
        </button>
        <button 
          :class="['tab-btn', { active: currentTab === 'chart' }]" 
          @click="currentTab = 'chart'"
        >
          <i class="fa-solid fa-chart-pie"></i> 圖表分析
        </button>
        <button 
          :class="['tab-btn', { active: currentTab === 'list' }]" 
          @click="currentTab = 'list'"
        >
          <i class="fa-solid fa-receipt"></i> 歷史明細
        </button>
      </div>

      <!-- 分頁 1：新增記帳表單 -->
      <div v-if="currentTab === 'form'" class="card-box tab-content">
        <h3><i class="fa-solid fa-pen-to-square"></i> 新增一筆紀錄</h3>
        <form @submit.prevent="addRecord" class="finance-form">
          <div class="form-row">
            <div class="form-group">
              <label>日期</label>
              <input type="date" v-model="form.date" required />
            </div>

            <div class="form-group">
              <label>收支類型</label>
              <select v-model="form.type">
                <option value="expense">支出</option>
                <option value="income">收入</option>
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

          <button type="submit" class="submit-btn"><i class="fa-solid fa-check"></i> 儲存這筆紀錄</button>
        </form>
      </div>

      <!-- 分頁 2：支出圖表分析 -->
      <div v-if="currentTab === 'chart'" class="card-box tab-content">
        <h3><i class="fa-solid fa-chart-simple"></i> 支出分類比例分析</h3>
        <div v-if="records.filter(r => r.type === 'expense').length === 0" class="status-msg">
          <i class="fa-solid fa-inbox msg-icon"></i> 目前還沒有支出紀錄，無法生成圖表。
        </div>
        <PieChart v-else :records="records" />
      </div>

      <!-- 分頁 3：歷史紀錄明細 -->
      <div v-if="currentTab === 'list'" class="card-box tab-content">
        <h3><i class="fa-solid fa-list"></i> 收支紀錄明細</h3>
        <div v-if="loading" class="status-msg"><i class="fa-solid fa-spinner fa-spin msg-icon"></i> 資料載入中...</div>
        <div v-else-if="records.length === 0" class="status-msg"><i class="fa-solid fa-inbox msg-icon"></i> 目前還沒有紀錄，快來上記第一筆吧！</div>
        <ul v-else class="record-list">
          <li v-for="item in records" :key="item.id" :class="['record-item', item.type]">
            <div class="item-left">
              <span class="category-badge">
                <i :class="['badge-icon', getCategoryIcon(item.category)]"></i>
                {{ cleanCategoryName(item.category) }}
              </span>
              <div class="item-detail">
                <span class="note-text">{{ item.note || '未填寫備註' }}</span>
                <span class="date-text">{{ item.date }}</span>
              </div>
            </div>
            <div class="item-right">
              <span class="amount-text">
                {{ item.type === 'expense' ? '-' : '+' }}${{ item.amount }}
              </span>
              <button @click="deleteRecord(item.id)" class="del-btn" title="刪除">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { db, auth, provider, signInWithPopup, signOut } from './firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where 
} from 'firebase/firestore';
import PieChart from './components/PieChart.vue';

export default {
  name: 'App',
  components: { PieChart },
  setup() {
    const user = ref(null);
    const records = ref([]);
    const loading = ref(false);
    const currentTab = ref('form');

    const expenseCategories = ref(['飲食', '交通', '購物', '娛樂', '追星']);
    const incomeCategories = ref(['薪水', '獎金/紅包', '售出回血', '其他收入']);

    // 清除文字中的 Emoji 表情符號
    const cleanCategoryName = (category) => {
      if (!category) return '';
      return category.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    };

    // 定義 Font Awesome Class 對應
    const categoryIconMap = {
      '飲食': 'fa-solid fa-utensils',
      '交通': 'fa-solid fa-car',
      '購物': 'fa-solid fa-bag-shopping',
      '娛樂': 'fa-solid fa-gamepad',
      '追星': 'fa-solid fa-wand-magic-sparkles',
      '薪水': 'fa-solid fa-money-bill-wave',
      '獎金/紅包': 'fa-solid fa-gift',
      '售出回血': 'fa-solid fa-rotate',
      '其他收入': 'fa-solid fa-coins'
    };

    const getCategoryIcon = (category) => {
      const cleaned = cleanCategoryName(category);
      return categoryIconMap[cleaned] || 'fa-solid fa-tag';
    };

    const form = ref({
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      category: '飲食',
      amount: '',
      note: ''
    });

    const handleSignIn = async () => {
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error('登入失敗:', error);
      }
    };

    const handleSignOut = async () => {
      try {
        await signOut(auth);
        records.value = [];
      } catch (error) {
        console.error('登出失敗:', error);
      }
    };

    const fetchRecords = async () => {
      if (!user.value) return;
      loading.value = true;
      try {
        const q = query(
          collection(db, 'personal_records'),
          where('uid', '==', user.value.uid)
        );
        const querySnapshot = await getDocs(q);
        const list = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        records.value = list.sort((a, b) => new Date(b.date) - new Date(a.date));
      } catch (error) {
        console.error('讀取紀錄失敗:', error);
      } finally {
        loading.value = false;
      }
    };

    const addRecord = async () => {
      if (!form.value.amount || form.value.amount <= 0 || !user.value) return;
      try {
        await addDoc(collection(db, 'personal_records'), {
          uid: user.value.uid,
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
        currentTab.value = 'list';
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
      return records.value.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
    });

    const totalExpense = computed(() => {
      return records.value.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
    });

    onMounted(() => {
      onAuthStateChanged(auth, (currentUser) => {
        user.value = currentUser;
        if (currentUser) {
          fetchRecords();
        }
      });
    });

    return {
      user,
      records,
      loading,
      currentTab,
      expenseCategories,
      incomeCategories,
      form,
      cleanCategoryName,
      getCategoryIcon,
      handleSignIn,
      handleSignOut,
      addRecord,
      deleteRecord,
      totalIncome,
      totalExpense
    };
  }
};
</script>

<style>
body {
  margin: 0;
  padding: 0;
  background-color: #fdfaf2;
}
</style>

<style scoped>
.finance-container {
  max-width: 650px;
  margin: 0 auto;
  padding: 24px 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #5c4d42;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  font-size: 26px;
  color: #785232;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.header-icon {
  font-size: 22px;
  color: #785232;
}

.sub-icon {
  font-size: 13px;
  color: #d4a373;
}

.msg-icon {
  margin-right: 6px;
}

.subtitle {
  margin-top: 6px;
  font-size: 14px;
  color: #a08369;
}

.user-bar {
  margin-top: 15px;
  display: flex;
  justify-content: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fffdf7;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid #f3e9d2;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.auth-btn {
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
  font-weight: bold;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.auth-btn.login {
  background: #f4a261;
  color: white;
  box-shadow: 0 2px 8px rgba(244, 162, 97, 0.3);
}

.auth-btn.logout {
  background: #e9ecef;
  color: #6c757d;
  padding: 4px 10px;
  font-size: 12px;
}

.summary-cards {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 6px;
}

.card-amount {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.card.income .card-amount { color: #519872; }
.card.expense .card-amount { color: #d96b68; }
.card.balance .card-amount { color: #785232; }

.tab-nav {
  display: flex;
  background: #f3e9d2;
  border-radius: 14px;
  padding: 4px;
  margin-bottom: 20px;
  gap: 4px;
}

.tab-btn {
  flex: 1;
  padding: 10px 0;
  border: none;
  background: transparent;
  color: #8c7355;
  font-size: 14px;
  font-weight: bold;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: #ffffff;
  color: #785232;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

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
  display: flex;
  align-items: center;
  gap: 8px;
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
}

.submit-btn {
  width: 100%;
  padding: 13px;
  background: linear-gradient(135deg, #f4a261 0%, #e76f51 100%);
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.status-msg {
  text-align: center;
  color: #b09a85;
  padding: 20px 0;
  display: flex;
  align-items: center;
  justify-content: center;
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
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge-icon {
  font-size: 13px;
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
  color: #c9ada7;
  font-size: 15px;
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
}

.del-btn:hover {
  color: #d96b68;
}
</style>
