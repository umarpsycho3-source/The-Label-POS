import './sync.js';

let expensesData = JSON.parse(localStorage.getItem('pos_expenses_data')) || [];

window.addEventListener('cloudDataSynced', () => {
    expensesData = JSON.parse(localStorage.getItem('pos_expenses_data')) || [];
    const searchInput = document.getElementById('search-expense');
    renderExpenses(searchInput ? searchInput.value : '');
});

const expenseTbody = document.getElementById('expense-tbody');
const searchInput = document.getElementById('search-expense');
const expenseModal = document.getElementById('expense-modal');
const expenseForm = document.getElementById('expense-form');
const expDate = document.getElementById('exp-date');

// Set today's date by default
const todayStr = new Date().toISOString().slice(0, 10);
expDate.value = todayStr;

function fmt(n) {
    const settings = JSON.parse(localStorage.getItem('pos_settings')) || { currency: 'LKR' };
    return (settings.currency || 'LKR') + ' ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function updateSummaries(filtered) {
    const totalIn = filtered.filter(e => e.type === 'in').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const totalOut = filtered.filter(e => e.type !== 'in').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const net = totalIn - totalOut;

    const elIn = document.getElementById('cio-total-in');
    const elOut = document.getElementById('cio-total-out');
    const elNet = document.getElementById('cio-net-balance');
    
    if (elIn) elIn.innerText = fmt(totalIn);
    if (elOut) elOut.innerText = fmt(totalOut);
    if (elNet) elNet.innerText = fmt(net);
}

function renderExpenses(filter = '') {
    expenseTbody.innerHTML = '';
    
    // Sort by date descending (newest first)
    const sorted = [...expensesData].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const term = filter.toLowerCase();
    const filtered = sorted.filter(e => 
        (e.category && e.category.toLowerCase().includes(term)) ||
        (e.desc && e.desc.toLowerCase().includes(term)) ||
        (e.date && e.date.includes(term)) ||
        (e.type && e.type.toLowerCase().includes(term))
    );

    updateSummaries(filtered);

    if (filtered.length === 0) {
        expenseTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#64748b;padding:2rem;">No entries found.</td></tr>`;
        return;
    }

    filtered.forEach((e, index) => {
        const originalIndex = expensesData.indexOf(e);
        const typeStr = e.type === 'in' ? '<span style="color:#10b981;"><i class="fa-solid fa-arrow-down"></i> IN</span>' : '<span style="color:#ef4444;"><i class="fa-solid fa-arrow-up"></i> OUT</span>';
        const color = e.type === 'in' ? '#10b981' : '#ef4444';
        const sign = e.type === 'in' ? '+' : '-';
        
        expenseTbody.innerHTML += `
            <tr>
                <td>${e.date}</td>
                <td>${typeStr}</td>
                <td><span style="background:#f1f5f9;padding:4px 8px;border-radius:4px;font-size:0.8rem;font-weight:600;color:#475569;">${e.category}</span></td>
                <td>${e.desc || '-'}</td>
                <td style="color:${color};font-weight:700;">${sign} ${fmt(e.amount)}</td>
                <td>
                    <button class="action-icon del" onclick="deleteExpense(${originalIndex})" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `;
    });
}

searchInput.addEventListener('input', (e) => {
    renderExpenses(e.target.value);
});

// Modal Logic
window.openExpenseModal = () => {
    expenseModal.classList.add('open');
};

window.closeExpenseModal = () => {
    expenseModal.classList.remove('open');
    expenseForm.reset();
    expDate.value = todayStr;
};

// Form Submission
expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newExpense = {
        date: document.getElementById('exp-date').value,
        type: document.getElementById('exp-type').value,
        category: document.getElementById('exp-category').value,
        desc: document.getElementById('exp-desc').value,
        amount: parseFloat(document.getElementById('exp-amount').value) || 0
    };

    expensesData.push(newExpense);
    localStorage.setItem('pos_expenses_data', JSON.stringify(expensesData));
    
    window.closeExpenseModal();
    renderExpenses(searchInput.value);
});

// Delete Logic
window.deleteExpense = (index) => {
    if (confirm("Are you sure you want to delete this entry?")) {
        expensesData.splice(index, 1);
        localStorage.setItem('pos_expenses_data', JSON.stringify(expensesData));
        renderExpenses(searchInput.value);
    }
};

// Initial Render
renderExpenses();

