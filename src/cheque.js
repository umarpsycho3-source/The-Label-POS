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
                    <button style="background:#e0f2fe; color:#0ea5e9; border:none; padding:0.4rem 0.6rem; border-radius:6px; cursor:pointer;" onclick="window.editChequeDetails('${s.id}')" title="Edit Cheque Details">
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

window.editChequeDetails = (saleId) => {
    const salesDb = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
    const s = salesDb.find(item => String(item.id) === String(saleId));
    if (!s) return;

    const modalHtml = `
        <div class="modal-overlay active" id="edit-cheque-modal" style="background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); display:flex; align-items:center; justify-content:center; z-index:9999; position:fixed; inset:0;">
            <div style="background:#fff; width:90%; max-width:500px; border-radius:12px; padding:1.5rem; box-shadow:0 10px 25px rgba(0,0,0,0.2); position:relative;">
                <button onclick="document.getElementById('edit-cheque-modal').remove()" style="position:absolute; top:1rem; right:1rem; background:#cbd5e1; border:none; width:28px; height:28px; border-radius:50%; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
                <h3 style="font-size:1.1rem; font-weight:800; margin-bottom:1rem; color:#1e293b;"><i class="fa-solid fa-money-check-pen" style="color:#3b82f6;"></i> Edit Cheque #${s.id}</h3>
                
                <div style="display:flex; flex-direction:column; gap:1rem;">
                    <div>
                        <label style="font-size:0.85rem; font-weight:700; color:#475569; display:block; margin-bottom:0.3rem;">Cheque Number</label>
                        <input type="text" id="edit-chq-no" value="${s.chequeNo || ''}" placeholder="e.g. 123456" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:6px; font-weight:700;">
                    </div>
                    <div>
                        <label style="font-size:0.85rem; font-weight:700; color:#475569; display:block; margin-bottom:0.3rem;">Bank Name</label>
                        <input type="text" id="edit-chq-bank" value="${s.chequeBank || ''}" placeholder="e.g. Bank of Ceylon" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:6px;">
                    </div>
                    <div>
                        <label style="font-size:0.85rem; font-weight:700; color:#475569; display:block; margin-bottom:0.3rem;">Due Date</label>
                        <input type="date" id="edit-chq-date" value="${s.chequeDate || (s.datetime ? s.datetime.slice(0,10) : '')}" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:6px;">
                    </div>
                    <div>
                        <label style="font-size:0.85rem; font-weight:700; color:#475569; display:block; margin-bottom:0.3rem;">Status</label>
                        <select id="edit-chq-status" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:6px; background:#fff;">
                            <option value="Pending" ${(s.chequeStatus || 'Pending') === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Cleared" ${s.chequeStatus === 'Cleared' ? 'selected' : ''}>Cleared</option>
                            <option value="Bounced" ${s.chequeStatus === 'Bounced' ? 'selected' : ''}>Bounced</option>
                        </select>
                    </div>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:0.8rem; margin-top:1.5rem;">
                    <button onclick="document.getElementById('edit-cheque-modal').remove()" style="padding:0.6rem 1.2rem; background:#cbd5e1; border:none; border-radius:6px; cursor:pointer; font-weight:700;">Cancel</button>
                    <button onclick="window.saveEditedCheque('${s.id}')" style="padding:0.6rem 1.2rem; background:#3b82f6; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:700;"><i class="fa-solid fa-floppy-disk"></i> Save Changes</button>
                </div>
            </div>
        </div>
    `;

    const div = document.createElement('div');
    div.id = 'edit-cheque-container';
    div.innerHTML = modalHtml;
    document.body.appendChild(div);
};

window.saveEditedCheque = (saleId) => {
    const chqNo = document.getElementById('edit-chq-no')?.value.trim() || 'N/A';
    const chqBank = document.getElementById('edit-chq-bank')?.value.trim() || 'Bank';
    const chqDate = document.getElementById('edit-chq-date')?.value || '';
    const chqStatus = document.getElementById('edit-chq-status')?.value || 'Pending';

    const salesDb = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
    const idx = salesDb.findIndex(s => String(s.id) === String(saleId));
    if (idx !== -1) {
        salesDb[idx].chequeNo = chqNo;
        salesDb[idx].chequeBank = chqBank;
        salesDb[idx].chequeDate = chqDate;
        salesDb[idx].chequeStatus = chqStatus;
        localStorage.setItem('pos_sales_data', JSON.stringify(salesDb));
    }

    const modal = document.getElementById('edit-cheque-container');
    if (modal) modal.remove();

    window.renderCheques();
};

window.updateChequeStatus = (saleId, newStatus) => {
    if (confirm(`Mark this cheque as ${newStatus}?`)) {
        const salesDb = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
        const idx = salesDb.findIndex(s => s.id === saleId);
        if (idx !== -1) {
            salesDb[idx].chequeStatus = newStatus;
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
