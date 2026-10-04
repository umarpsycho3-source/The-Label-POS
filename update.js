const fs = require('fs');
let code = fs.readFileSync('src/pos.js', 'utf8');

const replacement = 
// ==========================================
// Day Start / Day End Logic
// ==========================================
const todayDateStr = new Date().toISOString().slice(0, 10);
const startCashKey = 'pos_day_start_' + todayDateStr;

window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem(startCashKey) === null) {
        document.getElementById('day-start-modal').classList.add('open');
    }
    
    // Attach listener for difference calculation
    const actualCashInput = document.getElementById('actual-cash-input');
    if(actualCashInput) {
        actualCashInput.addEventListener('input', calculateDifference);
    }
});

function calculateDifference() {
    const expectedStr = document.getElementById('de-expected').innerText.replace(/,/g, '');
    const expectedCash = parseFloat(expectedStr) || 0;
    const actualCash = parseFloat(document.getElementById('actual-cash-input').value) || 0;
    
    const diff = actualCash - expectedCash;
    const diffEl = document.getElementById('de-diff');
    diffEl.innerText = diff.toLocaleString('en-US', {minimumFractionDigits: 2});
    
    if (diff < 0) {
        diffEl.style.color = '#ef4444'; // Red for shortage
    } else {
        diffEl.style.color = '#10b981'; // Green for overage/exact
    }
}

window.submitDayStart = () => {
    const startCash = document.getElementById('start-cash-input').value;
    if (startCash === '' || parseFloat(startCash) < 0) {
        alert('Please enter a valid start cash amount.');
        return;
    }
    localStorage.setItem(startCashKey, startCash);
    document.getElementById('day-start-modal').classList.remove('open');
};

window.openDayEndModal = () => {
    const startCash = parseFloat(localStorage.getItem(startCashKey)) || 0;
    
    const allSales = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
    const todaySales = allSales.filter(s => s.datetime && s.datetime.startsWith(todayDateStr));
    const cashSales = todaySales.reduce((sum, sale) => sum + (parseFloat(sale.cash) || 0), 0);
    
    // Calculate total discount from today's sales
    const totalDiscount = todaySales.reduce((sum, sale) => sum + (parseFloat(sale.total_discount) || 0), 0);
    
    const allExpenses = JSON.parse(localStorage.getItem('pos_expenses_data')) || [];
    const todayExpenses = allExpenses.filter(e => e.date === todayDateStr);
    const cashExpenses = todayExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    
    const expectedDrawer = startCash + cashSales - cashExpenses;

    document.getElementById('de-start').innerText = startCash.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('de-discount').innerText = totalDiscount.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('de-expenses').innerText = cashExpenses.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('de-expected').innerText = expectedDrawer.toLocaleString('en-US', {minimumFractionDigits: 2});
    
    document.getElementById('actual-cash-input').value = '0.00';
    calculateDifference();
    
    document.getElementById('day-end-modal').classList.add('open');
};

window.submitDayEnd = () => {
    const actualCashStr = document.getElementById('actual-cash-input').value;
    if (actualCashStr === '') {
        alert('Please enter the actual counted cash.');
        return;
    }
    
    const actualCash = parseFloat(actualCashStr);
    const expectedCash = parseFloat(document.getElementById('de-expected').innerText.replace(/,/g, ''));
    const startCash = parseFloat(document.getElementById('de-start').innerText.replace(/,/g, ''));
    const discountAmount = parseFloat(document.getElementById('de-discount').innerText.replace(/,/g, ''));
    const expensesAmount = parseFloat(document.getElementById('de-expenses').innerText.replace(/,/g, ''));
    const diff = actualCash - expectedCash;
    
    const report = {
        date: todayDateStr,
        timestamp: new Date().toISOString(),
        startCash: startCash,
        discount: discountAmount,
        expenses: expensesAmount,
        expectedCash: expectedCash,
        actualCash: actualCash,
        difference: diff
    };
    
    const reports = JSON.parse(localStorage.getItem('pos_day_reports')) || [];
    reports.push(report);
    localStorage.setItem('pos_day_reports', JSON.stringify(reports));
    
    // Populate Print Receipt
    document.getElementById('print-date').innerText = todayDateStr;
    document.getElementById('print-start').innerText = startCash.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('print-discount').innerText = discountAmount.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('print-expenses').innerText = expensesAmount.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('print-expected').innerText = expectedCash.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('print-actual').innerText = actualCash.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('print-diff').innerText = diff.toLocaleString('en-US', {minimumFractionDigits: 2});
    
    document.getElementById('day-end-modal').classList.remove('open');
    
    // Trigger Print
    window.print();
    
    // Give time for print dialog before redirecting
    setTimeout(() => {
        alert('Register Closed Successfully!');
        window.location.href = '/dashboard.html';
    }, 1000);
};
\;

code = code.replace(/\/\/ ==========================================\n\/\/ Day Start \/ Day End Logic\n\/\/ ==========================================[^]+/, replacement);
fs.writeFileSync('src/pos.js', code);
console.log("Replaced");
