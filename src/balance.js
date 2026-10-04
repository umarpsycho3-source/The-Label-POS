import './customers.css';
import './sync.js';

document.addEventListener('DOMContentLoaded', () => {
    window.renderBalances();
});

window.addEventListener('cloudDataSynced', () => {
    window.renderBalances();
});

window.renderBalances = function() {
    const salesDb = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
    const searchInput = document.getElementById('search-balance')?.value.toLowerCase() || '';
    const dateFrom = document.getElementById('filter-date-from')?.value;
    const dateTo = document.getElementById('filter-date-to')?.value;
    
    // Group by customer
    const custBalances = {};
    
    salesDb.forEach(s => {
        const total = parseFloat(s.total) || 0;
        const cash = parseFloat(s.cash) || 0;
        const card = parseFloat(s.card) || 0;
        const cheque = parseFloat(s.cheque) || 0;
        const paid = (isNaN(cash)?0:cash) + (isNaN(card)?0:card) + (isNaN(cheque)?0:cheque);
        
        if (total > paid) {
            // Check date range filters on the invoice date
            if (dateFrom && s.datetime.split(' ')[0] < dateFrom) return;
            if (dateTo && s.datetime.split(' ')[0] > dateTo) return;
            
            const bal = total - paid;
            const custKey = s.customerPhone || s.customer || 'Unknown';
            if (!custBalances[custKey]) {
                custBalances[custKey] = {
                    name: s.customer || 'Walk-in Customer',
                    phone: s.customerPhone || '-',
                    products: [],
                    oldestDate: s.datetime,
                    outstanding: 0,
                    searchKey: custKey
                };
            }
            custBalances[custKey].outstanding += bal;
            
            // Add products
            if (s.items) {
                s.items.forEach(i => {
                    if (!custBalances[custKey].products.includes(i.id || i.name)) {
                        custBalances[custKey].products.push(i.id || i.name);
                    }
                });
            }
            
            // Track oldest date for overdue calculation
            if (new Date(s.datetime) < new Date(custBalances[custKey].oldestDate)) {
                custBalances[custKey].oldestDate = s.datetime;
            }
        }
    });
    
    const tbody = document.getElementById('balance-list');
    tbody.innerHTML = '';
    
    let totalReceivable = 0;
    let totalOverdue = 0;
    const now = new Date();

    Object.values(custBalances).forEach(bal => {
        // Apply search filter
        if (searchInput && !bal.name.toLowerCase().includes(searchInput) && !bal.phone.toLowerCase().includes(searchInput)) return;
        
        totalReceivable += bal.outstanding;
        
        const lastPurch = new Date(bal.oldestDate);
        const diffTime = Math.abs(now - lastPurch);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let overdueBadge = '';
        if (diffDays > 30) {
            totalOverdue += bal.outstanding;
            overdueBadge = '<span style="background:#fee2e2;color:#dc2626;padding:3px 8px;border-radius:12px;font-size:0.7rem;font-weight:700;margin-left:0.5rem;"><i class="fa-solid fa-triangle-exclamation"></i> Overdue</span>';
        } else if (diffDays > 15) {
            overdueBadge = '<span style="background:#fef3c7;color:#d97706;padding:3px 8px;border-radius:12px;font-size:0.7rem;font-weight:700;margin-left:0.5rem;"><i class="fa-solid fa-triangle-exclamation"></i> Due Soon</span>';
        }
        
        let prodsDisplay = bal.products.slice(0, 2).map(p => `<span style="color:#3b82f6;">${String(p).replace(/^#/, '')}</span>`).join(', ');
        if (bal.products.length > 2) prodsDisplay += ` +${bal.products.length - 2} more`;
        if (!prodsDisplay) prodsDisplay = '-';

        const formattedDate = lastPurch.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-weight:700; color:#1e293b;">${bal.name}</td>
            <td style="font-weight:600; color:#64748b;">${bal.phone}</td>
            <td style="font-size:0.85rem;">${prodsDisplay}</td>
            <td style="font-weight:600; color:#475569;">${formattedDate} ${overdueBadge}</td>
            <td style="font-weight:800; color:#ef4444; text-align:right;">Rs. ${bal.outstanding.toFixed(2)}</td>
            <td style="text-align:right; display:flex; gap:0.5rem; justify-content:flex-end;">
                <button style="background:#10b981; color:white; border:none; padding:0.4rem 0.6rem; border-radius:6px; cursor:pointer; font-weight:700; font-size:0.85rem;" onclick="openBalanceModalFor('${bal.phone}', '${bal.name}')" title="Settle Balance">
                    <i class="fa-solid fa-sack-dollar"></i> Settle
                </button>
                <button style="background:#e0f2fe; color:#0ea5e9; border:none; padding:0.4rem 0.6rem; border-radius:6px; cursor:pointer;" onclick="window.location.href='/customers.html'" title="Edit Customer">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button style="background:#dcfce7; color:#22c55e; border:none; padding:0.4rem 0.6rem; border-radius:6px; cursor:pointer;" onclick="window.open('https://wa.me/${bal.phone}?text=Hello ${bal.name}, this is a reminder regarding your outstanding balance of Rs. ${bal.outstanding.toFixed(2)}. Please arrange for payment at your earliest convenience.', '_blank')" title="WhatsApp Reminder">
                    <i class="fa-brands fa-whatsapp"></i>
                </button>
                <button style="background:#fee2e2; color:#ef4444; border:none; padding:0.4rem 0.6rem; border-radius:6px; cursor:pointer;" onclick="window.deleteCustomerBalance('${bal.phone}', '${bal.name}')" title="Delete Balance">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    if (Object.keys(custBalances).length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 3rem; color:#64748b; font-weight:600;">No outstanding balances found.</td></tr>`;
    }

    document.getElementById('total-receivable').textContent = totalReceivable.toFixed(2);
    document.getElementById('total-overdue').textContent = totalOverdue.toFixed(2);
}

window.openBalanceModalFor = (phone, name) => {
    // To implement the exact same modal logic as pos.js, but since it's quite complex, 
    // we can either duplicate the modal code here, or redirect to POS page with a query param.
    // Let's copy the modal code here because it's a dedicated page and the user expects it to work.
    
    // We already have pos.js modal code, let's inject it into modals-container
    const html = `
        <div class="modal-overlay active" id="shared-balance-modal" style="background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); display:flex; align-items:center; justify-content:center; z-index:9999;">
            <div class="modal-content" style="width: 85vw; max-width: 1100px; min-height: 60vh; background: #f1f5f9; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); position: relative; max-height: 90vh; overflow-y: auto;">
                
                <button onclick="document.getElementById('shared-balance-modal').remove()" style="position: absolute; top: 1rem; right: 1rem; background: #cbd5e1; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; color: #475569; display: flex; align-items: center; justify-content: center; z-index: 10;"><i class="fa-solid fa-xmark"></i></button>
                
                <div style="font-size: 1.25rem; font-weight: 800; color: #1e293b; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-solid fa-hand-holding-dollar" style="color:#3b82f6;"></i> Settle Customer Balance
                </div>
                
                <div style="display: flex; gap: 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                    
                    <!-- Customer Profile Card -->
                    <div style="flex: 1; min-width: 350px; background: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); padding: 1.5rem; display: flex; flex-direction: column;">
                        <div style="font-weight: 800; color: #475569; margin-bottom: 1.2rem; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;"><i class="fa-solid fa-user-circle"></i> Customer Profile</div>
                        <table style="width: 100%; font-size: 0.9rem; color: #64748b; margin-bottom: auto; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 0.8rem 0;">Name</td><td style="text-align: right; font-weight: 800; color: #1e293b; padding: 0.8rem 0;" id="bal-cust-name">-</td></tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 0.8rem 0;">Mobile</td><td style="text-align: right; font-weight: 800; color: #1e293b; padding: 0.8rem 0;" id="bal-cust-mobile">-</td></tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 0.8rem 0;">NIC</td><td style="text-align: right; font-weight: 800; color: #1e293b; padding: 0.8rem 0;" id="bal-cust-nic">-</td></tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 0.8rem 0;">Registered</td><td style="text-align: right; font-weight: 800; color: #1e293b; padding: 0.8rem 0;" id="bal-cust-reg">-</td></tr>
                        </table>
                    </div>
                    
                    <!-- Current Balance Card -->
                    <div style="flex: 1; min-width: 350px; background: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); padding: 1.5rem; text-align: center; display: flex; flex-direction: column;">
                        <div style="font-size: 0.85rem; color: #64748b; font-weight: 700; margin-bottom: 0.5rem;">Current Balance</div>
                        <div id="bal-cust-amount" style="font-size: 3rem; font-weight: 800; color: #ef4444; margin-bottom: 0.2rem; line-height: 1;">0.00</div>
                        <div id="bal-cust-status" style="font-size: 0.85rem; color: #ef4444; font-weight: 700; margin-bottom: 1.5rem;">To Pay / Due</div>
                        
                        <div style="border-top: 1px dashed #e2e8f0; margin-bottom: 1.5rem;"></div>
                        
                        <div style="text-align: left; margin-bottom: 1rem;">
                            <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: block; margin-bottom: 0.5rem;">Payment Method</label>
                            <select id="bal-pay-method" style="width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; font-size: 0.9rem; color: #334155; background: white;">
                                <option>Cash Payment</option>
                                <option>Card Payment</option>
                                <option>Cheque</option>
                            </select>
                        </div>
                        <div style="text-align: left; margin-bottom: 1.5rem;">
                            <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: block; margin-bottom: 0.5rem;">Amount</label>
                            <div style="display: flex; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
                                <span style="background: #f8fafc; padding: 0.75rem 1rem; color: #64748b; font-size: 0.9rem; font-weight: 600; border-right: 1px solid #cbd5e1;">Rs.</span>
                                <input type="number" id="bal-pay-amount" value="" placeholder="0.00" style="width: 100%; padding: 0.75rem; border: none; outline: none; text-align: right; font-weight: 700; font-size: 0.95rem; color: #0f172a;">
                            </div>
                        </div>
                        <button onclick="window.processBalancePayment('${phone}', '${name}')" style="width: 100%; background: #22c55e; color: white; border: none; padding: 0.9rem; border-radius: 6px; font-weight: 800; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: auto; transition: background 0.2s;" onmouseover="this.style.background='#16a34a'" onmouseout="this.style.background='#22c55e'"><i class="fa-solid fa-circle-check"></i> PAY AMOUNT</button>
                    </div>
                </div>
                
                <!-- Outstanding Invoices Card -->
                <div style="background: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); padding: 1.5rem;">
                    <div style="font-size: 0.95rem; font-weight: 800; color: #3b82f6; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem;"><i class="fa-solid fa-file-invoice"></i> Outstanding Invoices</div>
                    <table style="width: 100%; font-size: 0.9rem; color: #475569; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <th style="text-align: left; padding: 0.8rem 0; font-weight: 700;">Date</th>
                                <th style="text-align: left; padding: 0.8rem 0; font-weight: 700;">Invoice No</th>
                                <th style="text-align: right; padding: 0.8rem 0; font-weight: 700;">Bill Amount</th>
                                <th style="text-align: right; padding: 0.8rem 0; font-weight: 700;">Paid</th>
                                <th style="text-align: right; padding: 0.8rem 0; font-weight: 700;">Balance</th>
                                <th style="text-align: right; padding: 0.8rem 0; font-weight: 700;">Allocation</th>
                            </tr>
                        </thead>
                        <tbody id="bal-cust-invoices"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modals-container').innerHTML = html;
    
    // Populate the modal
    const db = JSON.parse(localStorage.getItem('pos_customers_db')) || {};
    let customer = null;
    for (const key in db) {
        if (db[key].phone === phone || db[key].name === name) {
            customer = db[key];
            break;
        }
    }
    
    document.getElementById('bal-cust-name').innerText = name || 'Unknown';
    document.getElementById('bal-cust-mobile').innerText = phone || '-';
    if(customer) {
        document.getElementById('bal-cust-nic').innerText = customer.nic || '-';
        document.getElementById('bal-cust-reg').innerText = customer.regDate || '-';
    }
    
    // Populate invoices
    const salesData = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
    const custSales = salesData.filter(s => s.customerPhone === phone || s.customer === name);
    const tbody = document.getElementById('bal-cust-invoices');
    
    let calculatedDue = 0;
    custSales.forEach(s => {
        const total = parseFloat(s.total) || 0;
        const cash = parseFloat(s.cash) || 0;
        const card = parseFloat(s.card) || 0;
        const cheque = parseFloat(s.cheque) || 0;
        const paid = (isNaN(cash)?0:cash) + (isNaN(card)?0:card) + (isNaN(cheque)?0:cheque);
        
        calculatedDue += (total - paid);
        
        if (total > paid) {
            const bal = total - paid;
            const date = s.datetime ? s.datetime.split(' ')[0] : '-';
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 0.8rem 0;">${date}</td>
                    <td style="padding: 0.8rem 0; font-weight: 600;">${s.id}</td>
                    <td style="text-align: right; padding: 0.8rem 0;">${total.toFixed(2)}</td>
                    <td style="text-align: right; padding: 0.8rem 0; color: #22c55e;">${paid.toFixed(2)}</td>
                    <td style="text-align: right; padding: 0.8rem 0; color: #ef4444; font-weight: 700;">${bal.toFixed(2)}</td>
                    <td style="text-align: right; padding: 0.8rem 0;">
                        <input type="number" class="invoice-alloc-input" data-id="${s.id}" placeholder="0.00" style="width: 80px; padding: 0.4rem; border: 1px solid #cbd5e1; border-radius: 4px; text-align: right; font-size: 0.85rem;">
                    </td>
                </tr>
            `;
        }
    });
    
    document.getElementById('bal-cust-amount').innerText = calculatedDue.toFixed(2);
};

window.processBalancePayment = (phone, name) => {
    const allocInputs = document.querySelectorAll('.invoice-alloc-input');
    let manualTotal = 0;
    let manualAllocations = {};
    let hasManualInput = false;
    
    allocInputs.forEach(inp => {
        const val = parseFloat(inp.value);
        if (!isNaN(val) && val > 0) {
            hasManualInput = true;
            manualTotal += val;
            manualAllocations[inp.dataset.id] = val;
        }
    });
    
    const payMethod = document.getElementById('bal-pay-method').value;
    let payAmount = parseFloat(document.getElementById('bal-pay-amount').value);
    
    if (hasManualInput) {
        if (!payAmount) {
            payAmount = manualTotal;
        } else if (Math.abs(payAmount - manualTotal) > 0.01) {
            alert('The allocated amounts do not match the total payment amount.');
            return;
        }
    }
    
    if (isNaN(payAmount) || payAmount <= 0) {
        alert('Please enter a valid payment amount.');
        return;
    }
    
    const salesData = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
    let remainingAmount = payAmount;
    
    // Sort oldest invoices first
    const dueInvoices = salesData.filter(s => {
        if (s.customerPhone !== phone && s.customer !== name) return false;
        const total = parseFloat(s.total) || 0;
        const paid = (parseFloat(s.cash)||0) + (parseFloat(s.card)||0) + (parseFloat(s.cheque)||0);
        return total > paid;
    }).sort((a,b) => parseInt(a.id) - parseInt(b.id)); // Assuming ID increments
    
    for (const inv of dueInvoices) {
        if (remainingAmount <= 0) break;
        
        const total = parseFloat(inv.total) || 0;
        const cash = parseFloat(inv.cash) || 0;
        const card = parseFloat(inv.card) || 0;
        const cheque = parseFloat(inv.cheque) || 0;
        const paid = cash + card + cheque;
        const balance = total - paid;
        
        let amountToApply = 0;
        if (hasManualInput) {
            amountToApply = manualAllocations[inv.id] || 0;
            if (amountToApply > balance) {
                alert('Allocation exceeds balance for invoice ' + inv.id);
                return;
            }
        } else {
            amountToApply = Math.min(remainingAmount, balance);
        }
        
        if (amountToApply > 0) {
            if (payMethod.includes('Cash')) inv.cash = (parseFloat(inv.cash) || 0) + amountToApply;
            else if (payMethod.includes('Card')) inv.card = (parseFloat(inv.card) || 0) + amountToApply;
            else if (payMethod.includes('Cheque')) inv.cheque = (parseFloat(inv.cheque) || 0) + amountToApply;
            
            remainingAmount -= amountToApply;
        }
    }
    
    if (!hasManualInput && remainingAmount > 0) {
        alert('Payment amount exceeds total outstanding balance. Remaining: Rs.' + remainingAmount.toFixed(2));
        return; // Or we could add credit to customer account
    }
    
    localStorage.setItem('pos_sales_data', JSON.stringify(salesData));
    alert('Payment successfully applied!');
    document.getElementById('shared-balance-modal').remove();
    window.renderBalances();
};

window.deleteCustomerBalance = (phone, name) => {
    if (confirm(`Are you sure you want to delete/write-off the balance for ${name}? This will mark all their outstanding invoices as fully paid.`)) {
        const salesData = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
        let modified = false;
        
        salesData.forEach(s => {
            if (s.customerPhone === phone || s.customer === name) {
                const total = parseFloat(s.total) || 0;
                const paid = (parseFloat(s.cash)||0) + (parseFloat(s.card)||0) + (parseFloat(s.cheque)||0);
                if (total > paid) {
                    // Force the remaining balance to be paid via cash
                    const diff = total - paid;
                    s.cash = (parseFloat(s.cash) || 0) + diff;
                    modified = true;
                }
            }
        });
        
        if (modified) {
            localStorage.setItem('pos_sales_data', JSON.stringify(salesData));
            alert('Balance deleted (written off) successfully.');
            window.renderBalances();
        } else {
            alert('No outstanding balance found to delete.');
        }
    }
};
