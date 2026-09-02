<template>
  <div class="chart-section">
    <!-- 圓餅圖本體 -->
    <div class="chart-container">
      <Pie :data="chartData" :options="chartOptions" />
    </div>

    <!-- 各分類金額與百分比列表 -->
    <div class="category-summary">
      <div 
        v-for="item in categoryList" 
        :key="item.category" 
        class="summary-item"
      >
        <div class="item-info">
          <span class="color-dot" :style="{ backgroundColor: item.color }"></span>
          <i :class="['icon-style', item.icon]"></i>
          <span class="category-name">{{ item.category }}</span>
        </div>

        <div class="item-values">
          <span class="percentage">{{ item.percentage }}%</span>
          <span class="amount">${{ item.amount.toLocaleString() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { Pie } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, ArcElement);

export default {
  name: 'PieChart',
  components: { Pie },
  props: {
    records: {
      type: Array,
      required: true
    }
  },
  setup(props) {
    // 莫蘭迪配色
    const categoryColors = {
      '飲食': '#f4a261',
      '交通': '#e76f51',
      '購物': '#e9c46a',
      '娛樂': '#2a9d8f',
      '追星': '#9b5de5'
    };

    // Font Awesome 圖示對應
    const categoryIcons = {
      '飲食': 'fa-solid fa-utensils',
      '交通': 'fa-solid fa-car',
      '購物': 'fa-solid fa-bag-shopping',
      '娛樂': 'fa-solid fa-gamepad',
      '追星': 'fa-solid fa-wand-magic-sparkles'
    };

    // 移除舊資料中的 Emoji
    const cleanCategoryName = (category) => {
      if (!category) return '';
      return category.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    };

    const categoryStats = computed(() => {
      const expenseRecords = props.records.filter(r => r.type === 'expense');
      const totals = {};
      let sum = 0;

      expenseRecords.forEach(r => {
        const cleanCat = cleanCategoryName(r.category);
        totals[cleanCat] = (totals[cleanCat] || 0) + r.amount;
        sum += r.amount;
      });

      return { totals, sum };
    });

    const categoryList = computed(() => {
      const { totals, sum } = categoryStats.value;
      if (sum === 0) return [];

      return Object.keys(totals)
        .map(cat => {
          const amount = totals[cat];
          const percentage = ((amount / sum) * 100).toFixed(1);
          return {
            category: cat,
            amount,
            percentage,
            icon: categoryIcons[cat] || 'fa-solid fa-tag',
            color: categoryColors[cat] || '#a08369'
          };
        })
        .sort((a, b) => b.amount - a.amount);
    });

    const chartData = computed(() => {
      const labels = categoryList.value.map(item => item.category);
      const data = categoryList.value.map(item => item.amount);
      const backgroundColor = categoryList.value.map(item => item.color);

      return {
        labels,
        datasets: [
          {
            data,
            backgroundColor,
            borderWidth: 2,
            borderColor: '#ffffff'
          }
        ]
      };
    });

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      }
    };

    return {
      categoryList,
      chartData,
      chartOptions
    };
  }
};
</script>

<style scoped>
.chart-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chart-container {
  position: relative;
  height: 220px;
  width: 100%;
}

.category-summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px dashed #f3e9d2;
  padding-top: 16px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #fffdf9;
  border-radius: 10px;
  border: 1px solid #f7f1e3;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-style {
  font-size: 14px;
  color: #785232;
  width: 16px;
  text-align: center;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.category-name {
  font-size: 14px;
  font-weight: 600;
  color: #5c4d42;
}

.item-values {
  display: flex;
  align-items: center;
  gap: 12px;
}

.percentage {
  font-size: 13px;
  color: #a08369;
  background: #fefae0;
  padding: 2px 6px;
  border-radius: 6px;
}

.amount {
  font-size: 15px;
  font-weight: bold;
  color: #d96b68;
}
</style>
