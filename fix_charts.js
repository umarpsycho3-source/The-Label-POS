import fs from 'fs';
let js = fs.readFileSync('src/dashboard.js', 'utf8');

const newChartLogic = 
  const salesDataForCharts = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
  const productsDbForCharts = JSON.parse(localStorage.getItem('pos_products_db')) || {};

  // Line Chart Calculation (Last 7 Days)
  const lineData = [0, 0, 0, 0, 0, 0, 0];
  const dayLabels = [];
  for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      const dateStr = yr + '-' + mo + '-' + da;
      
      const daySales = salesDataForCharts.filter(s => s.datetime && s.datetime.startsWith(dateStr));
      lineData[6 - i] = daySales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
  }

  // Pie Chart Calculation (Category Sales)
  const catSales = {};
  salesDataForCharts.forEach(sale => {
      (sale.items || []).forEach(item => {
          const prod = Object.values(productsDbForCharts).find(p => p.id === item.id) || {};
          const cat = prod.category || 'Uncategorized';
          const itemTotal = parseFloat(item.total) || (parseFloat(item.sale) * parseFloat(item.qty)) || 0;
          catSales[cat] = (catSales[cat] || 0) + itemTotal;
      });
  });
  let pieLabels = Object.keys(catSales);
  let pieData = Object.values(catSales);
  const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];
  
  if (pieLabels.length === 0) {
      pieLabels = ['No Data'];
      pieData = [1];
      pieColors[0] = '#cbd5e1';
  }
  
  // Initialize Bar Chart
  const ctxBar = document.getElementById('barChart').getContext('2d');
  new Chart(ctxBar, {
      type: 'line',
      data: {
          labels: dayLabels,
          datasets: [{
              label: 'Sales Overview (LKR)',
              data: lineData,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4,
              fill: false,
              borderWidth: 2,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#3b82f6',
              pointBorderWidth: 2,
              pointRadius: 4
          }]
      },
      options: {
          responsive: true,
          plugins: {
              legend: { display: false }
          },
          scales: {
              y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
              x: { grid: { display: false } }
          }
      }
  });

  // Initialize Pie Chart
  const ctxPie = document.getElementById('pieChart').getContext('2d');
  new Chart(ctxPie, {
      type: 'doughnut',
      data: {
          labels: pieLabels,
          datasets: [{
              data: pieData,
              backgroundColor: pieColors,
              borderWidth: 0,
              hoverOffset: 4
          }]
      },
      options: {
          responsive: true,
          cutout: '75%',
          plugins: {
              legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } }
          }
      }
  });
;

js = js.replace(/\/\/ Initialize Bar Chart[\s\S]*/, newChartLogic);
fs.writeFileSync('src/dashboard.js', js, 'utf8');
