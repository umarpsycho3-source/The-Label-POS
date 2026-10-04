import './sync.js';

document.addEventListener('DOMContentLoaded', () => {
    loadCustomers();

    // Search functionality
    const searchInput = document.getElementById('search-customer');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            loadCustomers(e.target.value);
        });
    }
});

window.addEventListener('cloudDataSynced', () => {
    const searchInput = document.getElementById('search-customer');
    loadCustomers(searchInput ? searchInput.value : '');
});

function getNextCustomerPin(db) {
    const existingPins = Object.values(db).map(c => parseInt(c.pin)).filter(p => !isNaN(p));
    let pin = 1001;
    while (existingPins.includes(pin)) {
        pin++;
    }
    return String(pin);
}

function getCustomersDB() {
    const db = JSON.parse(localStorage.getItem('pos_customers_db')) || {};
    let modified = false;
    let pinCounter = 1001;
    const existingPins = Object.values(db).map(c => parseInt(c.pin)).filter(p => !isNaN(p));
    
    Object.keys(db).forEach(k => {
        if (!db[k].pin || db[k].pin === '-' || String(db[k].pin).trim() === '') {
            while (existingPins.includes(pinCounter)) {
                pinCounter++;
            }
            db[k].pin = String(pinCounter);
            existingPins.push(pinCounter);
            modified = true;
        }
    });
    
    if (modified) {
        localStorage.setItem('pos_customers_db', JSON.stringify(db));
    }
    return db;
}

function saveCustomersDB(db) {
    localStorage.setItem('pos_customers_db', JSON.stringify(db));
}

function loadCustomers(searchQuery = '') {
    const tbody = document.getElementById('customer-tbody');
    if (!tbody) return;

    const db = getCustomersDB();
    tbody.innerHTML = '';
    let counter = 1;

    for (const mobile in db) {
        const c = db[mobile];
        
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const match = (c.name || '').toLowerCase().includes(query) || 
                          (c.phone || mobile).includes(query) ||
                          (c.nic || '').toLowerCase().includes(query);
            if (!match) continue;
        }

        const balance = c.dueAmount || 0;
        const balanceClass = balance > 0 ? 'balance-negative' : (balance < 0 ? 'balance-positive' : 'balance-positive');
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${counter}</td>
            <td>
                <div class="action-group">
                    <button class="action-btn edit" onclick="window.openCustomerModal('${mobile}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn view" onclick="window.openSummaryModal('${mobile}')"><i class="fa-solid fa-eye"></i></button>
                    <button class="action-btn cart" onclick="window.openPurchaseHistoryModal('${mobile}')"><i class="fa-solid fa-cart-shopping"></i></button>
                    <button class="action-btn delete" onclick="window.deleteCustomer('${mobile}')"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
            <td>${c.pin || '-'}</td>
            <td style="font-weight:600;">${c.name}</td>
            <td>${c.phone || mobile}</td>
            <td>${c.nic || ''}</td>
            <td>${(c.creditLimit || 0).toFixed(2)}</td>
            <td>${c.regDate || '2025-12-29'}</td>
            <td class="${balanceClass}">${balance.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
        counter++;
    }
}

// Global scope for onclick access
window.openCustomerModal = (mobile = null) => {
    const db = getCustomersDB();
    const c = mobile && db[mobile] ? db[mobile] : null;
    const isEdit = !!c;

    const defaultPin = c ? (c.pin || getNextCustomerPin(db)) : getNextCustomerPin(db);

    const html = `
        <div class="modal-overlay active" id="add-cust-modal" onclick="this.remove()">
            <div class="modal-content" style="width: 800px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div>
                        <h2><i class="fa-solid fa-user-plus" style="color: #3b82f6;"></i> ${isEdit ? 'Update Customer' : 'Add Customer'}</h2>
                        <p>Fill in the details below to ${isEdit ? 'update' : 'add'} the customer.</p>
                    </div>
                    <button class="btn-close-modal" onclick="document.getElementById('add-cust-modal').remove()"><i class="fa-solid fa-arrow-left"></i> Back to List</button>
                </div>
                <div class="modal-body">
                    <div class="form-section">
                        <div class="form-section-title"><i class="fa-regular fa-pen-to-square"></i> Customer Information</div>
                        <div class="form-grid">
                            <div class="form-group full">
                                <label>Customer Name <span style="color:red">*</span></label>
                                <input type="text" id="m-cust-name" value="${c ? c.name : ''}">
                            </div>
                            <div class="form-group">
                                <label>Mobile Number</label>
                                <input type="text" id="m-cust-mobile" value="${c ? (c.phone || mobile) : ''}" ${isEdit ? 'readonly style="background:#f1f5f9;cursor:not-allowed;"' : ''}>
                            </div>
                            <div class="form-group">
                                <label>NIC Number</label>
                                <input type="text" id="m-cust-nic" value="${c ? (c.nic || '') : ''}" placeholder="Enter NIC number">
                            </div>
                            <div class="form-group">
                                <label>Customer PIN <span style="color:red">*</span></label>
                                <input type="text" id="m-cust-pin" value="${defaultPin}">
                            </div>
                            <div class="form-group">
                                <label>Discount Rate (%)</label>
                                <input type="text" id="m-cust-disc" value="${c ? (c.discountRate || '0.00') : '0.00'}">
                            </div>
                            <div class="form-group">
                                <label>Credit Limit</label>
                                <input type="text" id="m-cust-credit" value="${c ? (c.creditLimit || 0).toFixed(2) : '0.00'}">
                            </div>
                            <div class="form-group full">
                                <label>Customer Type <span style="color:red">*</span></label>
                                <select id="m-cust-type">
                                    <option value="MRP" ${c && c.type==='MRP' ? 'selected' : ''}>MRP Customer</option>
                                    <option value="Wholesale" ${c && c.type==='Wholesale' ? 'selected' : ''}>Wholesale Customer</option>
                                </select>
                            </div>
                            <div class="form-group full">
                                <label>Address</label>
                                <textarea id="m-cust-addr" rows="3" placeholder="Enter full address">${c ? (c.address || '') : ''}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel" onclick="document.getElementById('add-cust-modal').remove()">Cancel</button>
                    <button class="btn-submit" onclick="window.saveCustomerModal('${mobile || ''}')">${isEdit ? 'Update Details' : 'Save Details'}</button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modals-container').innerHTML = html;
};

window.saveCustomerModal = (oldMobile) => {
    const name = document.getElementById('m-cust-name').value.trim();
    const mobile = document.getElementById('m-cust-mobile').value.trim();
    const nic = document.getElementById('m-cust-nic').value.trim();
    const pin = document.getElementById('m-cust-pin').value.trim();
    const disc = parseFloat(document.getElementById('m-cust-disc').value) || 0;
    const credit = parseFloat(document.getElementById('m-cust-credit').value) || 0;
    const type = document.getElementById('m-cust-type').value;
    const addr = document.getElementById('m-cust-addr').value.trim();

    if (!name || !mobile) {
        alert("Name and Mobile are required.");
        return;
    }

    const db = getCustomersDB();
    const finalPin = pin || getNextCustomerPin(db);
    
    // If it's a new customer or mobile changed (unlikely due to readonly, but safe check)
    if (!oldMobile || oldMobile !== mobile) {
        if (db[mobile]) {
            alert("A customer with this mobile number already exists.");
            return;
        }
    }

    const customerObj = {
        name: name,
        phone: mobile,
        nic: nic,
        pin: finalPin,
        discountRate: disc,
        creditLimit: credit,
        type: type,
        address: addr,
        dueAmount: oldMobile && db[oldMobile] ? db[oldMobile].dueAmount : 0,
        regDate: oldMobile && db[oldMobile] ? db[oldMobile].regDate : new Date().toISOString().split('T')[0]
    };

    // If mobile changed, delete old record
    if (oldMobile && oldMobile !== mobile) {
        delete db[oldMobile];
    }
    
    db[mobile] = customerObj;
    saveCustomersDB(db);
    
    document.getElementById('add-cust-modal').remove();
    loadCustomers();
};

window.deleteCustomer = (mobile) => {
    if (confirm("Are you sure you want to delete this customer?")) {
        const db = getCustomersDB();
        delete db[mobile];
        saveCustomersDB(db);
        loadCustomers();
    }
};

window.openSummaryModal = (mobile) => {
    const db = getCustomersDB();
    const c = db[mobile];
    if (!c) return;

    // Get transactions from sales data
    const salesData = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
    // Filter sales where customerPhone matches
    // But since pos.js was saving phone to `customerPhone` in pos_sales_data...
    const custSales = salesData.filter(s => s.customerPhone === mobile || s.customer === c.name);

    let rowsHtml = '';
    if (custSales.length === 0) {
        rowsHtml = `<tr><td colspan="7" style="text-align:center;">No transactions found.</td></tr>`;
    } else {
        custSales.forEach(s => {
            rowsHtml += `
                <tr>
                    <td>
                        <div style="display:flex;gap:0.4rem;">
                            <a href="/view-sale.html?id=${s.id}" class="action-btn view"><i class="fa-solid fa-eye"></i></a>
                        </div>
                    </td>
                    <td style="font-weight:600;">${s.id}</td>
                    <td>${s.datetime || '-'}</td>
                    <td>${s.user || 'Admin User'}</td>
                    <td style="font-weight:700;">${parseFloat(s.total).toFixed(2)}</td>
                    <td style="color:#10b981;">${(parseFloat(s.total) - parseFloat(s.dueDate ? s.total : 0)).toFixed(2)}</td>
                    <td style="color:#10b981;font-weight:600;">-</td>
                    <td style="color:#ef4444;">${parseFloat(s.dueDate ? s.total : 0).toFixed(2)}</td>
                </tr>
            `;
        });
    }

    const html = `
        <div class="modal-overlay active" id="summary-modal" onclick="this.remove()">
            <div class="modal-content" style="width: 900px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div>
                        <h2><i class="fa-solid fa-user-circle" style="color: #3b82f6;"></i> Customer Summary - ${c.name}</h2>
                        <p>View customer profile and transaction history.</p>
                    </div>
                    <button class="btn-close-modal" onclick="document.getElementById('summary-modal').remove()"><i class="fa-solid fa-xmark"></i> Close</button>
                </div>
                <div class="modal-body">
                    <div class="summary-top-cards">
                        <div class="summary-card">
                            <div>
                                <i class="fa-solid fa-phone" style="color:#64748b;margin-bottom:0.5rem;"></i>
                                <div style="font-size:0.8rem;color:#64748b;">Registered: ${c.regDate || '-'}</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:0.7rem;font-weight:700;color:#64748b;margin-bottom:0.2rem;">TOTAL DUE BALANCE</div>
                                <div class="summary-card-val ${c.dueAmount > 0 ? 'balance-negative' : 'balance-positive'}">${(c.dueAmount || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section" style="padding:0; overflow:hidden;">
                        <div class="form-section-title" style="padding:1rem 1.5rem; margin:0; border-bottom:1px solid #e2e8f0; background:#f8fafc;">
                            <i class="fa-solid fa-clock-rotate-left"></i> Transaction History
                        </div>
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>INVOICE</th>
                                        <th>TIME</th>
                                        <th>CREATED BY</th>
                                        <th>AMOUNT</th>
                                        <th>PAYMENT</th>
                                        <th>POINTS CLAIM</th>
                                        <th>DUE BALANCE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modals-container').innerHTML = html;
};

window.openPurchaseHistoryModal = (mobile) => {
    const db = getCustomersDB();
    const c = db[mobile];
    if (!c) return;

    const salesData = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
    const custSales = salesData.filter(s => s.customerPhone === mobile || s.customer === c.name);
    
    let itemsHtml = '';
    let hasItems = false;
    
    custSales.forEach(s => {
        if (s.items && s.items.length > 0) {
            hasItems = true;
            s.items.forEach(item => {
                const dateOnly = s.datetime ? s.datetime.split(' ')[0] : '-';
                itemsHtml += `
                    <tr>
                        <td>${dateOnly}</td>
                        <td>${item.barcode || 'N/A'}</td>
                        <td style="font-weight:600;color:#334155;">${item.name}</td>
                        <td style="color:#3b82f6;"><a href="/view-sale.html?id=${s.id}" style="text-decoration:none;color:inherit;">${s.id}</a></td>
                        <td>${item.qty}</td>
                        <td>${parseFloat(item.cost).toFixed(2)}</td>
                        <td>${parseFloat(item.sale).toFixed(2)}</td>
                        <td style="color:#10b981;">0.00</td>
                        <td style="color:#10b981;font-weight:600;">0.00</td>
                    </tr>
                `;
            });
        }
    });

    if (!hasItems) {
        itemsHtml = `<tr><td colspan="9" style="text-align:center;">No purchase items found.</td></tr>`;
    }

    const html = `
        <div class="modal-overlay active" id="history-modal" onclick="this.remove()">
            <div class="modal-content" style="width: 1000px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div>
                        <h2><i class="fa-solid fa-cart-shopping" style="color: #3b82f6;"></i> Customer Purchase History - ${c.name}</h2>
                        <p>List of items purchased by this customer.</p>
                    </div>
                    <button class="btn-close-modal" onclick="document.getElementById('history-modal').remove()"><i class="fa-solid fa-xmark"></i> Close</button>
                </div>
                <div class="modal-body">
                    <div class="form-section" style="padding:0; overflow:hidden;">
                        <div class="form-section-title" style="display:flex; justify-content:space-between; padding:1rem 1.5rem; margin:0; border-bottom:1px solid #e2e8f0; background:#f8fafc;">
                            <span><i class="fa-solid fa-list"></i> Purchase Details</span>
                        </div>
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>DATE</th>
                                        <th>BARCODE</th>
                                        <th>PRODUCT NAME</th>
                                        <th>INVOICE</th>
                                        <th>QTY</th>
                                        <th>COST</th>
                                        <th>SALE PRICE</th>
                                        <th>PROFIT</th>
                                        <th>NET PROFIT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modals-container').innerHTML = html;
};
