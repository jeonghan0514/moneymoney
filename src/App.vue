```
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
  <!-- ==================== 分頁 1：💸 錢包出血 (含總結與記帳/分類) ==================== -->
  <div v-if="currentTab === 'wallet'" class="tab-page-content">
    <!-- 隱私開關與頂部三大概覽卡片 -->
    <div class="privacy-bar">
      <button @click="togglePrivacy" class="privacy-btn">
        <i class="fa-solid" :class="isPrivacyMode ? 'fa-eye-slash' : 'fa-eye'"></i>
        {{ isPrivacyMode ? '顯示頂部金額' : '隱藏頂部金額' }}
      </button>
    </div>

    <div class="summary-cards">
      <div class="card income">
        <span class="card-label"><i class="fa-solid fa-chart-line"></i> 本月回血</span>
        <h3 class="card-amount">
          <span v-if="isPrivacyMode" class="diamond-mask">
            <i class="fa-solid fa-gem"></i><i class="fa-solid fa-gem"></i><i class="fa-solid fa-gem"></i>
          </span>
          <span v-else>+ ${{ totalIncome }}</span>
        </h3>
      </div>
      <div class="card expense">
        <span class="card-label"><i class="fa-solid fa-arrow-trend-down"></i> 本月腎痛</span>
        <h3 class="card-amount">
          <span v-if="isPrivacyMode" class="diamond-mask">
            <i class="fa-solid fa-gem"></i><i class="fa-solid fa-gem"></i><i class="fa-solid fa-gem"></i>
          </span>
          <span v-else>- ${{ totalExpense }}</span>
        </h3>
      </div>
      <div class="card balance">
        <span class="card-label"><i class="fa-solid fa-wallet"></i> 剩餘血量</span>
        <h3 class="card-amount" :class="{ negative: !isPrivacyMode && (totalIncome - totalExpense) < 0 }">
          <span v-if="isPrivacyMode" class="diamond-mask">
            <i class="fa-solid fa-gem"></i><i class="fa-solid fa-gem"></i><i class="fa-solid fa-gem"></i>
          </span>
          <span v-else>${{ totalIncome - totalExpense }}</span>
        </h3>
      </div>
    </div>

    <!-- 錢包內頁小分頁切換：新增紀錄 vs 分類管理 -->
    <div class="sub-tab-nav">
      <button :class="['sub-tab-btn', { active: walletSubTab === 'form' }]" @click="walletSubTab = 'form'">
        <i class="fa-solid fa-circle-plus"></i> 新增紀錄
      </button>
      <button :class="['sub-tab-btn', { active: walletSubTab === 'categories' }]" @click="walletSubTab = 'categories'">
        <i class="fa-solid fa-sliders"></i> 分類管理
      </button>
    </div>

    <!-- 子分頁 A：新增紀錄表單 -->
    <div v-if="walletSubTab === 'form'" class="card-box tab-content">
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
                <option v-for="cat in currentExpenseCategories" :key="cat" :value="cat">{{ cat }}</option>
              </template>
              <template v-else>
                <option v-for="cat in currentIncomeCategories" :key="cat" :value="cat">{{ cat }}</option>
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

    <!-- 子分頁 B：分類管理 -->
    <div v-if="walletSubTab === 'categories'" class="card-box tab-content">
      <h3><i class="fa-solid fa-sliders"></i> 分類管理與設定</h3>

      <!-- 新增或編輯分類表單區塊 -->
      <div class="cat-editor-card">
        <span class="editor-title">
          <i class="fa-solid" :class="editingId ? 'fa-pen-to-square' : 'fa-plus-circle'"></i> 
          {{ editingId ? `編輯分類 (${catForm.name})` : '新增自訂分類' }}
        </span>

        <form @submit.prevent="saveCategory" class="cat-form">
          <div class="form-row">
            <div class="form-group">
              <label>分類名稱</label>
              <input type="text" v-model="catForm.name" placeholder="例如：課金、美妝、周邊" required />
            </div>
            <div class="form-group">
              <label>收支類型</label>
              <select v-model="catForm.type">
                <option value="expense">支出 (腎痛)</option>
                <option value="income">收入 (回血)</option>
              </select>
            </div>
          </div>

          <!-- 可視化莫蘭迪圖示選擇網格 -->
          <div class="form-group full-width">
            <label>選擇代表圖示 (點擊選擇)</label>
            <div class="icon-picker-grid">
              <button 
                v-for="iconOption in availableIcons" 
                :key="iconOption.class"
                type="button"
                :class="['icon-choice-btn', { active: catForm.icon === iconOption.class }]"
                @click="catForm.icon = iconOption.class"
                :title="iconOption.label"
              >
                <i :class="iconOption.class"></i>
              </button>
            </div>
          </div>

          <!-- 直接打色號專用區塊 -->
          <div class="form-group full-width">
            <label>圖表代表色 (可直接輸入 HEX 色號，如 #92A8D1)</label>
            <div class="color-picker-wrapper">
              <input type="color" v-model="catForm.color" class="color-picker" />
              <input 
                type="text" 
                v-model="catForm.color" 
                placeholder="#92A8D1" 
                class="color-hex-input"
                maxlength="7"
              />
            </div>
          </div>

          <div class="cat-form-actions">
            <button type="submit" class="submit-btn full-btn">
              {{ editingId ? '儲存修改' : '新增分類' }}
            </button>
            <button v-if="editingId" type="button" @click="resetCatForm" class="cancel-btn">
              取消
            </button>
          </div>
        </form>
      </div>

      <!-- 所有分類一覽 -->
      <div class="cat-list-section">
        <span class="section-label">目前所有可用分類一覽（點擊鉛筆按鈕即可自訂風格）：</span>

        <div class="cat-grid">
          <div 
            v-for="cat in displayAllCategories" 
            :key="cat.id || cat.name" 
            class="cat-card-item"
            :class="{ editing: editingId === (cat.id || 'default-' + cat.name), default: cat.isDefault }"
          >
            <div class="cat-item-left">
              <span class="cat-icon-circle" :style="{ backgroundColor: cat.color }">
                <i :class="cat.icon"></i>
              </span>
              <div class="cat-item-meta">
                <span class="cat-item-name">
                  {{ cat.name }} 
                  <span v-if="cat.isDefault" class="default-badge">系統預設</span>
                </span>
                <span class="cat-item-type">{{ cat.type === 'expense' ? '支出' : '收入' }}</span>
              </div>
            </div>

            <div class="cat-item-actions">
              <button @click="startEditCategory(cat)" class="action-btn-sm edit" title="編輯風格/圖示">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button v-if="!cat.isDefault" @click="deleteCustomCategory(cat.id)" class="action-btn-sm del" title="刪除">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== 分頁 2：📊 痛覺分析 (圓餅圖 + 歷史明細) ==================== -->
  <div v-if="currentTab === 'chart'" class="tab-page-content">
    <!-- 區間篩選列 -->
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
      <div class="filter-item">
        <label><i class="fa-solid fa-filter"></i> 分類篩選</label>
        <select v-model="filterCategory">
          <option value="ALL">全部分類</option>
          <option v-for="cat in allCategories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>
    </div>

    <!-- 圓餅圖區塊 -->
    <div class="card-box tab-content">
      <h3><i class="fa-solid fa-chart-simple"></i> 腎痛來源分類分析</h3>
      <div v-if="chartMonthRecords.filter(r => r.type === 'expense').length === 0" class="status-msg">
        <i class="fa-solid fa-inbox msg-icon"></i> 該時間區間目前沒有腎痛支出紀錄喔！
      </div>
      <PieChart :customCategories="customCategoryList" :records="chartMonthRecords" v-else/>
    </div>

    <!-- 歷史紀錄明細區塊 -->
    <div class="card-box tab-content">
      <h3><i class="fa-solid fa-receipt"></i> 腎痛與回血明細</h3>
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
  </div>

  <!-- ==================== 分頁 3：🤝 互助協會 (代墊管理與設定) ==================== -->
  <div v-if="currentTab === 'advance'" class="tab-page-content">
    <div class="card-box tab-content">
      <h3><i class="fa-solid fa-hand-holding-dollar"></i> 代墊討債專區</h3>
      
      <div class="advance-summary">
        <span>待收代墊款總計</span>
        <h2 class="advance-total">
          ${{ totalPendingAdvance.toLocaleString() }}
        </h2>
      </div>

      <div v-if="groupedAdvanceList.length === 0" class="status-msg">
        <i class="fa-solid fa-circle-check msg-icon"></i> 目前沒有未結清的代墊，大家都還清囉！✨
      </div>

      <div v-else class="borrower-group-list">
        <div v-for="group in groupedAdvanceList" :key="group.borrower" class="borrower-card">
          <div class="borrower-card-header">
            <div class="borrower-info">
              <span class="borrower-avatar"><i class="fa-solid fa-user"></i></span>
              <div class="borrower-name-box">
                <h4 class="borrower-name">{{ group.borrower }}</h4>
                <span class="borrower-count">
                  小計: <strong>${{ group.total.toLocaleString() }}</strong> ({{ group.items.length }}筆)
                </span>
              </div>
            </div>

            <div class="borrower-header-actions">
              <button @click="copyGroupPrompt(group)" class="mini-action-btn copy" title="複製 LINE 催帳訊息">
                <i class="fa-solid fa-copy"></i> 複製
              </button>
              <button @click="settleAllForBorrower(group)" class="mini-action-btn settle-all" title="全額還清">
                <i class="fa-solid fa-check-double"></i> 還清
              </button>
            </div>
          </div>

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
  </div>
</template>

<!-- 底部固定導覽列 (Bottom Navigation Bar) -->
<nav v-if="user" class="bottom-nav">
  <button :class="['nav-item', { active: currentTab === 'wallet' }]" @click="currentTab = 'wallet'">
    <i class="fa-solid fa-wallet"></i>
    <span>錢包出血</span>
  </button>
  <button :class="['nav-item', { active: currentTab === 'chart' }]" @click="currentTab = 'chart'">
    <i class="fa-solid fa-chart-pie"></i>
    <span>痛覺分析</span>
  </button>
  <button :class="['nav-item', { active: currentTab === 'advance' }]" @click="currentTab = 'advance'">
    <i class="fa-solid fa-handshake-angle"></i>
    <span>互助協會</span>
    <span v-if="pendingAdvanceCount > 0" class="nav-badge">{{ pendingAdvanceCount }}</span>
  </button>
</nav>

```
