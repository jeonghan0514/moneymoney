<template>
  <div class="chart-container">
    <Pie :data="chartData" :options="chartOptions" />
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
    // 各類別對應的溫柔莫蘭迪配色
    const categoryColors = {
      '🍱 飲食': '#f4a261',
      '🚗 交通': '#e76f51',
      '🛍️ 購物': '#e9c46a',
      '🎮 娛樂': '#2a9d8f',
      '💎 追隨': '#9b5de5'
    };

    const chartData = computed(() => {
      // 隻統計「支出」
      const expenseRecords = props.records.filter(r => r.type === 'expense');
      
      // 按分類累加金額
      const categoryTotals = {};
      expenseRecords.forEach(r => {
        categoryTotals[r.category] = (categoryTotals[r.category] || 0) + r.amount;
      });

      const labels = Object.keys(categoryTotals);
      const data = Object.values(categoryTotals);
      const backgroundColor = labels.map(label => categoryColors[label] || '#a08369');

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
        legend: {
          position: 'bottom',
          labels: {
            color: '#5c4d42',
            font: {
              size: 13
            }
          }
        }
      }
    };

    return {
      chartData,
      chartOptions
    };
  }
};
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 250px;
  width: 100%;
}
</style>
