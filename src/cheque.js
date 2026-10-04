import './customers.css';
import './sync.js';

document.addEventListener('DOMContentLoaded', () => {
    window.renderCheques();
});

window.addEventListener('cloudDataSynced', () => {
    window.renderCheques();
});

window.renderCheques = function() {
    const searchInput = document.getElementById('search-cheque')?.value.toLowerCase() || '';
    const dateFrom = document.getElementById('filter-date-from')?.value;
    const dateTo = document.getElementById('filter-date-to')?.value;
    
    const salesDb = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
    const tbody = document.getElementById('cheque-list');
    tbody.innerHTML = '';
    
    let pending = 0, cleared = 0, bounced = 0;
    let chequeFound = false;

    // Iterate in reverse for newest first
    for (let i = salesDb.length - 1; i >= 0; i--) {
        const s = salesDb[i];
        const chqAmount = parseFloat(s.cheque) || 0;
        
        if (chqAmount > 0) {
            const chqDate = s.chequeDate || s.datetime?.split(' ')[0] || '';
            const chqNo = s.chequeNo || 'N/A';
            const chqBank = s.chequeBank || 'N/A';
            const custName = s.customer || 'Walk-in';
            const custPhone = s.customerPhone || '';
            const status = s.chequeStatus || 'Pending';
            
            // Filters
            if (dateFrom && chqDate < dateFrom) continue;
            if (dateTo && chqDate > dateTo) continue;
            if (searchInput && !custName.toLowerCase().includes(searchInput) && !chqNo.toLowerCase().includes(searchInput) && !custPhone.toLowerCase().includes(searchInput)) continue;
            
            chequeFound = true;
            
            if (status === 'Pending') pending += chqAmount;
            if (status === 'Cleared') cleared += chqAmount;
            if (status === 'Bounced') bounced += chqAmount;

            const badgeClass = status === 'Pending' ? 'badge-pending' 
                            : status === 'Cleared' ? 'badge-cleared' 
                            : 'badge-bounced';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="color:#64748b; font-weight:500;">${chqDate}</td>
                <td style="font-weight:700; color:#1e293b;">${chqNo}</td>
                <td style="color:#475569;">${chqBank}</td>
                <td style="font-weight:600; color:#3b82f6;">${custName} <br><span style="font-size:0.75rem; color:#94a3b8;">${custPhone}</span></td>
                <td style="font-weight:800; text-align:right;">Rs. ${chqAmount.toFixed(2)}</td>
                <td style="text-align:center;"><span class="badge ${badgeClass}">${status}</span></td>
                <td style="text-align:right; display:flex; gap:0.5rem; justify-content:flex-end;">
                    <button style="background:#d1fae5; color:#059669; border:none; padding:0.4rem 0.6rem; border-radius:6px; cursor:pointer;" title="Mark Cleared" onclick="window.updateChequeStatus('${s.id}', 'Cleared')" ${status === 'Cleared' ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
                        <i class="fa-solid fa-check"></i>
                    </button>
                    <button style="background:#fee2e2; color:#dc2626; border:none; padding:0.4rem 0.6rem; border-radius:6px; cursor:pointer;" title="Mark Bounced" onclick="window.updateChequeStatus('${s.id}', 'Bounced')" ${status === 'Bounced' ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </button>
                    <button style="background:#dcfce7; color:#22c55e; border:none; padding:0.4rem 0.6rem; border-radius:6px; cursor:pointer;" onclick="window.open('https://wa.me/${custPhone}?text=Hello ${custName}, this is regarding your cheque (${chqNo}) for Rs. ${chqAmount.toFixed(2)}.', '_blank')" title="WhatsApp Customer" ${!custPhone ? 'disabled style="opacity:0.4;"' : ''}>
                        <i class="fa-brands fa-whatsapp"></i>
                    </button>
                    <button style="background:#e0f2fe; color:#0ea5e9; border:none; padding:0.4rem 0.6rem; border-radius:6px; cursor:pointer;" onclick="window.location.href='/edit-bill.html?id=${s.id}'" title="Edit Bill">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button style="background:#f1f5f9; color:#ef4444; border:none; padding:0.4rem 0.6rem; border-radius:6px; cursor:pointer;" onclick="window.deleteCheque('${s.id}')" title="Delete Cheque Record">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        }
    }
    
    if (!chequeFound) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 3rem; color:#64748b; font-weight:600;">No cheques found.</td></tr>`;
    }

    document.getElementById('stat-pending').textContent = pending.toFixed(2);
    document.getElementById('stat-cleared').textContent = cleared.toFixed(2);
    document.getElementById('stat-bounced').textContent = bounced.toFixed(2);
};

window.updateChequeStatus = (saleId, newStatus) => {
    if (confirm(`Mark this cheque as ${newStatus}?`)) {
        const salesDb = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
        const idx = salesDb.findIndex(s => s.id === saleId);
        if (idx !== -1) {
            salesDb[idx].chequeStatus = newStatus;
            
            // If bounced, we could logically remove the cheque payment amount so it becomes outstanding balance again.
            // But usually merchants just want to track it as bounced. Let's just track it for now.
            
            localStorage.setItem('pos_sales_data', JSON.stringify(salesDb));
            window.renderCheques();
        }
    }
};

window.deleteCheque = (saleId) => {
    if (confirm('Are you sure you want to delete this cheque? This will set the cheque amount to 0 for this invoice, moving the amount to outstanding balance.')) {
        const salesDb = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
        const idx = salesDb.findIndex(s => s.id === saleId);
        if (idx !== -1) {
            salesDb[idx].cheque = 0;
            salesDb[idx].chequeNo = '';
            salesDb[idx].chequeBank = '';
            salesDb[idx].chequeDate = '';
            salesDb[idx].chequeStatus = 'Deleted';
            
            localStorage.setItem('pos_sales_data', JSON.stringify(salesDb));
            window.renderCheques();
        }
    }
};
