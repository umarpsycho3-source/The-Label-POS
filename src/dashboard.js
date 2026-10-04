import './dashboard.css';
import Chart from 'chart.js/auto';
import './sync.js';

// Always hide loading overlay
window.addEventListener('load', () => {
    setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('hidden');
    }, 600);
});

// Dynamic Greeting
const greetEl = document.getElementById('greeting-text');
if (greetEl) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    greetEl.textContent = `${greeting}, Admin!`;
}

// Safe number helper
const safeNum = (v) => {
    if (v === undefined || v === null || v === '-' || v === '') return 0;
    return parseFloat(String(v).replace(/,/g, '')) || 0;
};

// Initialize Date/Time Display
const datetimeDisplay = document.getElementById('datetime-display');
if (datetimeDisplay) {
    const updateTime = () => {
        const now = new Date();
        datetimeDisplay.innerHTML = `
            ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})} <br>
            <span style="font-size: 0.9rem; font-weight: 400; opacity: 0.85;">${now.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})}</span>
        `;
    };
    updateTime();
    setInterval(updateTime, 1000);
}

const fmt = (n) => {
    const settings = JSON.parse(localStorage.getItem('pos_settings')) || { currency: 'LKR' };
    return (settings.currency || 'LKR') + ' ' + (parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

let barChartInstance = null;
let pieChartInstance = null;

function getLocalDateStr(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getLocalMonthStr(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function renderDashboard() {
    // 1. Live Metrics
    const allSales = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
    const todayStr = getLocalDateStr();
    const todaySales = allSales.filter(b => b.datetime && b.datetime.startsWith(todayStr));
    const monthStr = getLocalMonthStr();
    const monthSales = allSales.filter(b => b.datetime && b.datetime.startsWith(monthStr));

    const todayRevenue = todaySales.reduce((s, b) => s + (parseFloat(b.total) || 0), 0);
    const todayCash = todaySales.reduce((s, b) => s + (parseFloat(b.cash) || 0), 0);

    const allExpenses = JSON.parse(localStorage.getItem('pos_expenses_data')) || [];
    const todayExpenses = allExpenses
        .filter(e => e.date === todayStr && e.type !== 'in')
        .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    const dayStartCash = parseFloat(localStorage.getItem('pos_day_start_' + todayStr)) || 0;

    const todayProfit = todaySales.reduce((s, b) => {
        const itemProfit = (b.items || []).reduce((ip, it) => {
            const sale = safeNum(it.sale) || safeNum(it.price);
            const cost = safeNum(it.cost) || safeNum(it.buyPrice);
            const qty = safeNum(it.qty);
            return ip + ((sale - cost) * qty);
        }, 0);
        return s + itemProfit;
    }, 0) - todayExpenses;

    const todayReturns = todaySales.reduce((s, b) => {
        const retAmt = (b.items || []).reduce((ip, it) => {
            const qty = safeNum(it.qty);
            const sale = safeNum(it.sale) || safeNum(it.price);
            return ip + (qty < 0 ? Math.abs(sale * qty) : 0);
        }, 0);
        return s + retAmt;
    }, 0);
    const monthRevenue = monthSales.reduce((s, b) => s + (parseFloat(b.total) || 0), 0);

    const customersDb = JSON.parse(localStorage.getItem('pos_customers_db')) || {};
    const totalCustomers = Object.keys(customersDb).length;
    const productsDb = JSON.parse(localStorage.getItem('pos_products_db')) || {};
    const totalProducts = Object.keys(productsDb).length;

    const metrics = [
        { title: "TODAY'S REVENUE", value: fmt(todayRevenue), icon: "fa-solid fa-dollar-sign", color: "#3b82f6" },
        { title: "TODAY'S INVOICES", value: todaySales.length.toString(), icon: "fa-solid fa-file-invoice", color: "#10b981" },
        { title: "TOTAL CUSTOMERS", value: (totalCustomers || 0).toString(), icon: "fa-solid fa-users", color: "#06b6d4" },
        { title: "START CASH", value: fmt(dayStartCash), icon: "fa-solid fa-cash-register", color: "#8b5cf6" },
        { title: "TOTAL PRODUCTS", value: (totalProducts || 0).toString(), icon: "fa-solid fa-cubes", color: "#eab308" },
        { title: "MONTHLY INCOME", value: fmt(monthRevenue), icon: "fa-solid fa-calendar-check", color: "#8b5cf6" },
        { title: "TODAY'S PROFIT", value: fmt(todayProfit), icon: "fa-solid fa-chart-line", color: "#10b981" },
        { title: "TODAY'S EXPENSES", value: fmt(todayExpenses), icon: "fa-solid fa-minus", color: "#ef4444" },
        { title: "TODAY'S RETURNS", value: fmt(todayReturns), icon: "fa-solid fa-rotate-left", color: "#f97316" },
        { title: "TODAY'S CASH", value: fmt(todayCash), icon: "fa-solid fa-money-bill", color: "#06b6d4" }
    ];

    const metricsGrid = document.querySelector('.metrics-grid');
    if (metricsGrid) {
        metricsGrid.innerHTML = metrics.map(m => `
            <div class="metric-card" style="border-left-color: ${m.color}">
                <div class="metric-info">
                    <h3 style="color: ${m.color}">${m.title}</h3>
                    <div class="value">${m.value}</div>
                </div>
                <div class="metric-icon" style="background-color: ${m.color}">
                    <i class="${m.icon}"></i>
                </div>
            </div>
        `).join('');
    }

    // 2. Render Charts
    renderCharts(allSales, productsDb);

    // 3. Render Tables
    renderRecentInvoices(allSales);
    renderCreditDues(allSales);
    renderChequeReminders(allSales);
    renderLowStockAlerts(productsDb);
}

function renderCharts(salesDataForCharts, productsDbForCharts) {
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

    const catSales = {};
    salesDataForCharts.forEach(sale => {
        (sale.items || []).forEach(item => {
            const prod = Object.values(productsDbForCharts).find(p => p.barcode === item.id || p.id === item.id || p.name === item.name) || {};
            const cat = prod.category || 'Uncategorized';
            const itemTotal = parseFloat(item.total) || (parseFloat(item.sale || item.price || 0) * parseFloat(item.qty || 0)) || 0;
            catSales[cat] = (catSales[cat] || 0) + itemTotal;
        });
    });
    let pieLabels = Object.keys(catSales);
    let pieData = Object.values(catSales);
    const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];
    if (pieLabels.length === 0) { pieLabels = ['No Data']; pieData = [1]; pieColors[0] = '#cbd5e1'; }

    const barCanvas = document.getElementById('barChart');
    if (barCanvas) {
        if (barChartInstance) barChartInstance.destroy();
        barChartInstance = new Chart(barCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: 'Sales Overview (LKR)',
                    data: lineData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4, fill: false, borderWidth: 2, pointBackgroundColor: '#ffffff', pointBorderColor: '#3b82f6', pointBorderWidth: 2, pointRadius: 4
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
        });
    }

    const pieCanvas = document.getElementById('pieChart');
    if (pieCanvas) {
        if (pieChartInstance) pieChartInstance.destroy();
        pieChartInstance = new Chart(pieCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: pieLabels,
                datasets: [{
                    data: pieData, backgroundColor: pieColors, borderWidth: 0, hoverOffset: 4
                }]
            },
            options: { responsive: true, cutout: '75%', plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } } } }
        });
    }
}

// --- Table 1: Recent Invoices ---
function renderRecentInvoices(allSales) {
    const tbody = document.getElementById('invoices-tbody');
    if (!tbody) return;

    // Latest 6 sales
    const recent = [...allSales].reverse().slice(0, 6);
    if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:#64748b;">No recent invoices recorded.</td></tr>`;
        return;
    }

    tbody.innerHTML = recent.map(s => {
        const dateStr = s.datetime ? s.datetime.split(' ')[0] : '-';
        const timeStr = s.datetime ? s.datetime.split(' ')[1] || '' : '';
        const total = parseFloat(s.total) || 0;
        return `
            <tr>
                <td><a href="/sales.html" style="color:#3b82f6; font-weight:700; text-decoration:none;"><i class="fa-solid fa-eye"></i> View</a></td>
                <td style="font-weight:700; color:#1e293b;">${s.id}</td>
                <td>${dateStr}</td>
                <td>${timeStr}</td>
                <td style="text-align:right; font-weight:800; color:#10b981;">${fmt(total)}</td>
                <td style="text-align:center;">
                    <button onclick="window.location.href='/sales.html'" style="background:#e0f2fe; color:#0369a1; border:none; padding:4px 10px; border-radius:6px; font-weight:700; cursor:pointer;">
                        <i class="fa-solid fa-arrow-right"></i> Open
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// --- Table 2: Customer Credit Due ---
function renderCreditDues(allSales) {
    const tbody = document.getElementById('credit-tbody');
    if (!tbody) return;

    const custMap = {};
    allSales.forEach(s => {
        const total = parseFloat(s.total) || 0;
        const cash = parseFloat(s.cash) || 0;
        const card = parseFloat(s.card) || 0;
        const cheque = parseFloat(s.cheque) || 0;
        const paid = cash + card + cheque;
        const due = total - paid;

        if (due > 0.01) {
            const custKey = s.customerPhone || s.customer || 'Walk-in Customer';
            if (!custMap[custKey]) {
                custMap[custKey] = {
                    name: s.customer || 'Walk-in Customer',
                    phone: s.customerPhone || '-',
                    products: [],
                    dueDate: s.datetime ? s.datetime.split(' ')[0] : '-',
                    balance: 0
                };
            }
            custMap[custKey].balance += due;
            if (s.items) {
                s.items.forEach(it => {
                    const itemName = it.name || it.id;
                    if (itemName && !custMap[custKey].products.includes(itemName)) {
                        custMap[custKey].products.push(itemName);
                    }
                });
            }
        }
    });

    const duesList = Object.values(custMap).slice(0, 6);
    if (duesList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:#64748b;">No outstanding customer credits.</td></tr>`;
        return;
    }

    tbody.innerHTML = duesList.map(c => {
        const prodDisplay = c.products.slice(0, 2).map(p => String(p).replace(/^#/, '')).join(', ') + (c.products.length > 2 ? ` (+${c.products.length - 2})` : '');
        const waLink = c.phone && c.phone !== '-' ? `https://wa.me/${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent('Reminder: Outstanding balance of ' + fmt(c.balance) + ' at THE LABEL POS.')}` : '';
        return `
            <tr>
                <td style="font-weight:700; color:#1e293b;">${c.name}</td>
                <td>${c.phone}</td>
                <td style="font-size:0.85rem; color:#475569;">${prodDisplay || '-'}</td>
                <td><span class="badge" style="background:#fef3c7; color:#d97706; padding:3px 8px; border-radius:10px; font-weight:700; font-size:0.75rem;">${c.dueDate}</span></td>
                <td style="text-align:right; font-weight:800; color:#ef4444;">${fmt(c.balance)}</td>
                <td style="text-align:right; display:flex; gap:6px; justify-content:flex-end;">
                    ${waLink ? `<a href="${waLink}" target="_blank" style="background:#dcfce7; color:#15803d; padding:4px 8px; border-radius:6px; text-decoration:none; font-weight:700;"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
                    <button onclick="window.location.href='/balance.html'" style="background:#10b981; color:white; border:none; padding:4px 10px; border-radius:6px; font-weight:700; cursor:pointer;">
                        Settle
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// --- Table 3: Cheque Reminder (Pending) ---
function renderChequeReminders(allSales) {
    const tbody = document.getElementById('cheque-tbody');
    if (!tbody) return;

    const pendingCheques = [];
    allSales.forEach(s => {
        const chqAmt = parseFloat(s.cheque) || 0;
        if (chqAmt > 0 && (s.chequeStatus === 'Pending' || !s.chequeStatus)) {
            pendingCheques.push({
                saleId: s.id,
                chqNo: s.chequeNo || 'CHQ-' + s.id,
                type: 'Received',
                payee: s.customer || 'Walk-in',
                bank: s.chequeBank || 'Bank',
                dueDate: s.chequeDate || (s.datetime ? s.datetime.split(' ')[0] : '-'),
                amount: chqAmt,
                status: 'Pending'
            });
        }
    });

    const displayCheques = pendingCheques.reverse().slice(0, 6);
    if (displayCheques.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748b;">No pending cheques.</td></tr>`;
        return;
    }

    tbody.innerHTML = displayCheques.map(chq => `
        <tr>
            <td style="font-weight:700; color:#1e293b;">${chq.chqNo}</td>
            <td><span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:700;">${chq.type}</span></td>
            <td>${chq.payee} <br><small style="color:#94a3b8;">${chq.bank}</small></td>
            <td>${chq.dueDate}</td>
            <td style="text-align:right; font-weight:800; color:#8b5cf6;">${fmt(chq.amount)}</td>
            <td style="text-align:center;"><span style="background:#fef3c7; color:#b45309; padding:3px 8px; border-radius:10px; font-weight:700; font-size:0.75rem;"><i class="fa-solid fa-clock"></i> Pending</span></td>
            <td style="text-align:right;">
                <button onclick="window.location.href='/cheque.html'" style="background:#8b5cf6; color:white; border:none; padding:4px 10px; border-radius:6px; font-weight:700; cursor:pointer;">
                    Manage
                </button>
            </td>
        </tr>
    `).join('');
}

// --- Table 4: Low Stock Alert (Main Store) ---
function renderLowStockAlerts(productsDb) {
    const tbody = document.getElementById('lowstock-tbody');
    if (!tbody) return;

    const allProducts = Object.values(productsDb);
    // Find products where qty <= 5 or qty <= minStock
    const lowStockProds = allProducts.filter(p => {
        const stock = parseFloat(p.qty) || 0;
        const minStock = parseFloat(p.minStock || p.minLevel || 5);
        return stock <= minStock;
    });

    if (lowStockProds.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:#10b981; font-weight:600;"><i class="fa-solid fa-circle-check"></i> All products are sufficiently stocked.</td></tr>`;
        return;
    }

    tbody.innerHTML = lowStockProds.map(p => {
        const stock = parseFloat(p.qty) || 0;
        const minLevel = parseFloat(p.minStock || p.minLevel || 5);
        return `
            <tr>
                <td style="font-weight:700; color:#1e293b;">
                    ${p.name} <br>
                    <small style="color:#94a3b8;"><i class="fa-solid fa-barcode"></i> ${p.barcode}</small>
                </td>
                <td style="text-align:center; font-weight:600; color:#64748b;">${minLevel}</td>
                <td style="text-align:right;">
                    <span style="background:#fee2e2; color:#dc2626; padding:4px 10px; border-radius:12px; font-weight:800; font-size:0.85rem;">
                        <i class="fa-solid fa-triangle-exclamation"></i> ${stock.toFixed(stock % 1 === 0 ? 0 : 2)}
                    </span>
                </td>
                <td style="text-align:right;">
                    <button onclick="window.location.href='/stock.html?search=${encodeURIComponent(p.barcode)}'" style="background:#ef4444; color:white; border:none; padding:5px 12px; border-radius:6px; font-weight:700; cursor:pointer;">
                        <i class="fa-solid fa-boxes-packing"></i> Restock
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Initial render
document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
});

// Real-time update on Cloud Sync
window.addEventListener('cloudDataSynced', () => {
    renderDashboard();
});
