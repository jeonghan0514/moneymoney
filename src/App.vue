<template>
  <div class="finance-container">
    <!-- 頂部標題與用戶狀態 -->
    <div class="header">
      <h2><i class="fa-solid fa-notes-medical header-icon"></i> 腎痛紀錄</h2>
      <p class="subtitle">紀錄每一筆快樂與血流成河的追星基金 <i class="fa-solid fa-wand-magic-sparkles sub-icon"></i></p>
      
      <div class="user-bar">
        <div v-if="user" class="user-info">
          <img :src="user.photoURL" alt="avatar" class="avatar" />
          <span class="user-name">{{ user.displayName }}</span>
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
      <p><i class="fa-solid fa-circle-info msg-icon"></i> 請先點擊上方按鈕登入 Google 帳號，即可跨裝置同步你的腎痛紀錄。</p>
    </div>

    <!-- 登入後的主要區域 -->
    <template v-else>
      <!-- 本月概覽卡片 -->
      <div class="summary-cards">
        <div class="card income">
          <span class="card-label"><i class="fa-solid fa-chart-line"></i> 本月回血</span>
          <h3 class="card-amount">+ ${{ totalIncome }}</h3>
        </div>
        <div class="card expense">
          <span class="card-label"><i class="fa-solid fa-arrow-trend-down"></i> 本月腎痛</span>
          <h3 class="card-amount">- ${{ totalExpense }}</h3>
        </div>
        <div class="card balance">
          <span class="card-label"><i class="fa-solid fa-wallet"></i> 剩餘血量</span>
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
          :class="['tab-btn', { active: currentTab === 'advance' }]" 
          @click="currentTab = 'advance'"
        >
          <i class="fa-solid fa-hand-holding-dollar"></i> 代墊管理
          <span v-if="pendingAdvanceCount > 0" class="badge-count">{{ pendingAdvanceCount }}</span>
        </button>
        <button 
          :class="['tab-btn', { active: currentTab === 'chart' }]" 
          @click="currentTab = 'chart'"
        >
          <i class="fa-solid fa-chart-pie"></i> 腎痛分析
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
                <option value="expense">支出 (腎痛)</option>
                <option value="income">收入 (回血)</option>
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

          <!-- 代墊選項 -->
          <div v-if="form.type === 'expense'" class="advance-box">
            <label class="checkbox-label">
              <input type="checkbox" v-model="form.isAdvance" />
              <span><i class="fa-solid fa-user-tag"></i> 這筆是幫朋友代墊的</span>
            </label>
            <div v-if="form.isAdvance" class="form-group margin-top-sm">
              <label>對象 (朋友名字)</label>
              <input type="text" v-model="form.borrower" placeholder="例如：小明、阿華" required />
            </div>
          </div>

          <div class="form-group full-width">
            <label>備註說明</label>
            <input type="text" v-model="form.note" placeholder="例：小卡、演唱會門票、周邊、吃火鍋" />
          </div>

          <button type="submit" class="submit-btn"><i class="fa-solid fa-check"></i> 儲存這筆紀錄</button>
        </form>
      </div>

      <!-- 分頁 2：代墊管理 (按人物卡片分組) -->
      <div v-if="currentTab === 'advance'" class="card-box tab-content">
        <h3><i class="fa-solid fa-hand-holding-dollar"></i> 代墊討債專區</h3>
        
        <div class="advance-summary">
          <span>待收代墊款總計</span>
          <h2 class="advance-total">${{ totalPendingAdvance.toLocaleString() }}</h2>
        </div>

        <div v-if="groupedAdvanceList.length === 0" class="status-msg">
          <i class="fa-solid fa-circle-check msg-icon"></i> 目前沒有未結清的代墊，大家都還清囉！✨
        </div>

        <div v-else class="borrower-group-list">
          <!-- 每位朋友一張卡片 -->
          <div v-for="group in groupedAdvanceList" :key="group.borrower" class="borrower-card">
            <div class="borrower-card-header">
              <div class="borrower-info">
                <span class="borrower-avatar"><i class="fa-solid fa-user"></i></span>
                <div class="borrower-name-box">
                  <h4 class="borrower-name">{{ group.borrower }}</h4>
                  <span class="borrower-count">共 {{ group.items.length }} 筆待結算</span>
                </div>
              </div>
              <div class="borrower-total-box">
                <span class="borrower-total-label">欠款小計</span>
                <span class="borrower-total-amount">${{ group.total.toLocaleString() }}</span>
              </div>
            </div>

            <!-- 操作按鈕區 -->
            <div class="borrower-card-actions">
              <button @click="copyGroupPrompt(group)" class="action-btn copy full">
                <i class="fa-solid fa-copy"></i> 複製清單給 {{ group.borrower }}
              </button>
              <button @click="settleAllForBorrower(group)" class="action-btn settle-all full">
                <i class="fa-solid fa-check-double"></i> 一鍵全部還清
              </button>
            </div>

            <!-- 細項展開清單 -->
            <ul class="borrower-item-list">
              <li v-for="item in group.items" :key="item.id" class="borrower-sub-item">
                <div class="sub-item-left">
                  <span class="sub-item-note">{{ cleanCategoryName(item.category) }} - {{ item.note || '未填寫備註' }}</span>
                  <span class="sub-item-date">{{ item.date }}</span>
                </div>
                <div class="sub-item-right">
                  <span class="sub-item-amount">${{ item.amount }}</span>
                  <button @click="markAsSettled(item.id)" class="mini-btn" title="單筆還款">已還</button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 分頁 3：支出圖表分析 -->
      <div v-if="currentTab === 'chart'" class="card-box tab-content">
        <h3><i class="fa-solid fa-chart-simple"></i> 腎痛來源分類分析</h3>
        
        <div class="filter-bar">
          <div class="filter-item">
            <label><i class="fa-solid fa-calendar"></i> 年份</label>
            <select v-model="filterYear">
              <option v-for="y in yearOptions" :key="y" :value="y">{{ y }} 年</option>
            </select>
          </div>
          <div class="filter-item">
            <label><i class="fa-solid fa-calendar-days"></i> 月份</label>
            <select v-model="filterMonthSelect">
              <option value="ALL">全年不限</option>
              <option v-for="m in 12" :key="m" :value="String(m).padStart(2, '0')">
                {{ m }} 月
              </option>
            </select>
          </div>
        </div>

        <div v-if="chartMonthRecords.filter(r => r.type === 'expense').length === 0" class="status-msg">
          <i class="fa-solid fa-inbox msg-icon"></i> 該時間區間目前沒有腎痛支出紀錄喔！
        </div>
        <PieChart v-else :records="chartMonthRecords" />
      </div>

      <!-- 分頁 4：歷史紀錄明細 -->
      <div v-if="currentTab === 'list'" class="card-box tab-content">
        <h3><i class="fa-solid fa-list"></i> 腎痛與回血明細</h3>
        
        <div class="filter-bar grid-3">
          <div class="filter-item">
            <label><i class="fa-solid fa-calendar"></i> 年份</label>
            <select v-model="filterYear">
              <option v-for="y in yearOptions" :key="y" :value="y">{{ y }} 年</option>
            </select>
          </div>
          <div class="filter-item">
            <label><i class="fa-solid fa-calendar-days"></i> 月份</label>
            <select v-model="filterMonthSelect">
              <option value="ALL">全年不限</option>
              <option v-for="m in 12" :key="m" :value="String(m).padStart(2, '0')">
                {{ m }} 月
              </option>
            </select>
          </div>
          <div class="filter-item">
            <label><i class="fa-solid fa-filter"></i> 分類</label>
            <select v-model="filterCategory">
              <option value="ALL">全部分類</option>
              <option v-for="cat in allCategories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
        </div>

        <div v-if="loading" class="status-msg"><i class="fa-solid fa-spinner fa-spin msg-icon"></i> 資料載入中...</div>
        <div v-else-if="filteredRecords.length === 0" class="status-msg">
          <i class="fa-solid fa-inbox msg-icon"></i> 沒有符合篩選條件的紀錄喔！
        </div>
        <ul v-else class="record-list">
          <li v-for="item in filteredRecords" :key="item.id" :class="['record-item', item.type]">
            <div class="item-left">
              <span class="category-badge">
                <i :class="['badge-icon', getCategoryIcon(item.category)]"></i>
                {{ cleanCategoryName(item.category) }}
              </span>
              <div class="item-detail">
                <span class="note-text">
                  <span v-if="item.isAdvance" class="borrower-tag">[代墊: {{ item.borrower }}]</span>
                  {{ item.note || '未填寫備註' }}
                </span>
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
  updateDoc,
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

    const now = new Date();
    const currentYear = String(now.getFullYear());
    const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');

    const filterYear = ref(currentYear);
    const filterMonthSelect = ref(currentMonthStr);
    const filterCategory = ref('ALL');

    const yearOptions = computed(() => {
      const years = [];
      const y = new Date().getFullYear();
      for (let i = y - 3; i <= y + 1; i++) {
        years.push(String(i));
      }
      return years;
    });

    const expenseCategories = ref(['飲食', '交通', '購物', '娛樂', '追星']);
    const incomeCategories = ref(['薪水', '獎金/紅包', '售出回血', '其他收入']);

    const allCategories = computed(() => [
      ...expenseCategories.value,
      ...incomeCategories.value
    ]);

    const cleanCategoryName = (category) => {
      if (!category) return '';
      return category.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    };

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
      note: '',
      isAdvance: false,
      borrower: ''
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
          isAdvance: form.value.type === 'expense' ? form.value.isAdvance : false,
          borrower: form.value.isAdvance ? form.value.borrower.trim() : '',
          isSettled: false,
          createdAt: new Date()
        });
        
        form.value.amount = '';
        form.value.note = '';
        form.value.isAdvance = false;
        form.value.borrower = '';
        await fetchRecords();
        currentTab.value = 'list';
      } catch (error) {
        console.error('新增失敗:', error);
      }
    };

    const markAsSettled = async (id) => {
      try {
        await updateDoc(doc(db, 'personal_records', id), {
          isSettled: true
        });
        await fetchRecords();
      } catch (error) {
        console.error('更新狀態失敗:', error);
      }
    };

    const settleAllForBorrower = async (group) => {
      if (!confirm(`確定 ${group.borrower} 已經還清全部的 $${group.total} 嗎？`)) return;
      try {
        const promises = group.items.map(item => 
          updateDoc(doc(db, 'personal_records', item.id), { isSettled: true })
        );
        await Promise.all(promises);
        await fetchRecords();
      } catch (error) {
        console.error('批量更新失敗:', error);
      }
    };

    const copyGroupPrompt = (group) => {
      const details = group.items.map(item => 
        `• ${item.date} ${cleanCategoryName(item.category)}${item.note ? ' (' + item.note + ')' : ''}: $${item.amount}`
      ).join('\n');

      const text = `${group.borrower}～上次幫你代墊的項目如下：\n${details}\n\n👉 總共是 $${group.total} 喔！再麻煩你有空轉給我，感謝啦～✨`;
      
      navigator.clipboard.writeText(text).then(() => {
        alert(`✨ 已複製給 ${group.borrower} 的完整催帳訊息！可以直接貼到 LINE 囉～`);
      });
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

    const pendingAdvanceList = computed(() => {
      return records.value.filter(r => r.isAdvance && !r.isSettled);
    });

    const pendingAdvanceCount = computed(() => pendingAdvanceList.value.length);

    const totalPendingAdvance = computed(() => {
      return pendingAdvanceList.value.reduce((sum, r) => sum + r.amount, 0);
    });

    const groupedAdvanceList = computed(() => {
      const groups = {};
      pendingAdvanceList.value.forEach(item => {
        const name = item.borrower || '未具名朋友';
        if (!groups[name]) {
          groups[name] = {
            borrower: name,
            total: 0,
            items: []
          };
        }
        groups[name].items.push(item);
        groups[name].total += item.amount;
      });
      return Object.values(groups);
    });

    const isDateMatch = (dateStr) => {
      if (!dateStr) return false;
      const targetPrefix = filterMonthSelect.value === 'ALL' 
        ? `${filterYear.value}-` 
        : `${filterYear.value}-${filterMonthSelect.value}`;
      return dateStr.startsWith(targetPrefix);
    };

    const currentMonthRecords = computed(() => {
      return records.value.filter(r => isDateMatch(r.date));
    });

    const chartMonthRecords = computed(() => {
      return records.value.filter(r => isDateMatch(r.date));
    });

    const totalIncome = computed(() => {
      return currentMonthRecords.value.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
    });

    const totalExpense = computed(() => {
      return currentMonthRecords.value.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
    });

    const filteredRecords = computed(() => {
      return records.value.filter(r => {
        const matchTime = isDateMatch(r.date);
        const cleanedCat = cleanCategoryName(r.category);
        const matchCat = filterCategory.value === 'ALL' ? true : (cleanedCat === filterCategory.value);
        return matchTime && matchCat;
      });
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
      filterYear,
      filterMonthSelect,
      filterCategory,
      yearOptions,
      expenseCategories,
      incomeCategories,
      allCategories,
      filteredRecords,
      pendingAdvanceList,
      pendingAdvanceCount,
      totalPendingAdvance,
      groupedAdvanceList,
      chartMonthRecords,
      form,
      cleanCategoryName,
      getCategoryIcon,
      handleSignIn,
      handleSignOut,
      addRecord,
      markAsSettled,
      settleAllForBorrower,
      copyGroupPrompt,
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

.header-icon { font-size: 22px; color: #785232; }
.sub-icon { font-size: 13px; color: #d4a373; }
.msg-icon { margin-right: 6px; }

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

.user-name {
  color: #785232;
  font-weight: 600;
  font-size: 13px;
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
  background: #f0e6d2;
  color: #8c7355;
  padding: 4px 10px;
  font-size: 12px;
  transition: background 0.2s;
}

.auth-btn.logout:hover {
  background: #ebdcc4;
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
  font-size: 13px;
  font-weight: bold;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  position: relative;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: #ffffff;
  color: #785232;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.badge-count {
  background: #e76f51;
  color: white;
  border-radius: 10px;
  padding: 1px 6px;
  font-size: 10px;
  margin-left: 2px;
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

.advance-box {
  background: #fffdf9;
  border: 1px dashed #e9c46a;
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 15px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #785232;
  cursor: pointer;
}

.margin-top-sm {
  margin-top: 10px;
}

.advance-summary {
  background: #fefae0;
  border: 1px solid #faedcd;
  padding: 16px;
  border-radius: 14px;
  text-align: center;
  margin-bottom: 20px;
  color: #8c7355;
}

.advance-total {
  margin: 6px 0 0 0;
  color: #e76f51;
  font-size: 28px;
}

/* 人物卡片分組奶油莫蘭迪配色 */
.borrower-group-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.borrower-card {
  background: #fffdf9;
  border: 1px solid #f3e9d2;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(212, 184, 150, 0.08);
}

.borrower-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.borrower-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.borrower-avatar {
  background: #ddb892;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.borrower-name {
  margin: 0;
  font-size: 16px;
  color: #5c4d42;
}

.borrower-count {
  font-size: 12px;
  color: #a08369;
}

.borrower-total-box {
  text-align: right;
}

.borrower-total-label {
  display: block;
  font-size: 11px;
  color: #8c7355;
}

.borrower-total-amount {
  font-size: 18px;
  font-weight: bold;
  color: #d96b68;
}

.borrower-card-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.action-btn {
  border: none;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;
}

.action-btn:hover {
  opacity: 0.9;
}

.action-btn.copy {
  background: #f4a261;
  color: white;
}

.action-btn.settle-all {
  background: #b5838d;
  color: white;
}

.action-btn.full {
  flex: 1;
}

.borrower-item-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border-top: 1px dashed #f3e9d2;
  padding-top: 10px;
}

.borrower-sub-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f7f1e3;
}

.borrower-sub-item:last-child {
  border-bottom: none;
}

.sub-item-left {
  display: flex;
  flex-direction: column;
}

.sub-item-note {
  font-size: 13px;
  font-weight: 600;
  color: #5c4d42;
}

.sub-item-date {
  font-size: 11px;
  color: #b09a85;
}

.sub-item-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sub-item-amount {
  font-size: 14px;
  font-weight: bold;
  color: #d96b68;
}

.mini-btn {
  background: #519872;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}

.mini-btn:hover {
  background: #3b7053;
}

.borrower-tag {
  color: #e76f51;
  font-size: 12px;
  margin-right: 4px;
}

.filter-bar {
  display: flex;
  gap: 10px;
  background: #fffdf9;
  border: 1px solid #f3e9d2;
  padding: 12px;
  border-radius: 14px;
  margin-bottom: 18px;
}

.filter-bar.grid-3 .filter-item { flex: 1; }

.filter-item {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.filter-item label {
  font-size: 12px;
  font-weight: 600;
  color: #8c7355;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.filter-item select {
  padding: 9px 10px;
  background: #ffffff;
  border: 1px solid #ebdcc4;
  border-radius: 10px;
  font-size: 13px;
  color: #5c4d42;
  outline: none;
  cursor: pointer;
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

.badge-icon { font-size: 13px; }

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
  color: #d8c3b1;
  font-size: 15px;
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
}

.del-btn:hover {
  color: #d96b68;
}
</style>
