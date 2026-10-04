import './pos.css';
import './sync.js';

// Clock Update
const clockEl = document.getElementById('pos-clock');
setInterval(() => {
    const now = new Date();
    clockEl.innerHTML = `
        <div style="font-size: 0.75rem; color: #a1a5ba; font-weight: 400; margin-bottom: 0.2rem;">
            ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
        </div>
        ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    `;
}, 1000);

// Bill State
let billItems = [];
let totalAmount = 0;

const barcodeInput = document.getElementById('barcode-input');
const qtyInput = document.getElementById('qty-input');
const addItemBtn = document.getElementById('add-item-btn');
const billItemsTbody = document.getElementById('bill-items');
const posSearchResults = document.getElementById('pos-search-results');

function showPosDropdown(query = '') {
    const db = JSON.parse(localStorage.getItem('pos_products_db')) || window.productsDB || {};
    const allProducts = Object.values(db);
    
    const matches = query ? allProducts.filter(p => 
        p.barcode.toLowerCase().includes(query) || 
        (p.name && p.name.toLowerCase().includes(query))
    ) : allProducts;
    
    posSearchResults.innerHTML = '';
    if (matches.length > 0) {
        matches.forEach(p => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerHTML = `
                <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 3px;">${p.barcode}</div>
                <div style="font-size: 0.8rem; color: #cbd5e1;">${p.name} &bull; ${(parseFloat(p.price)||0).toFixed(2)}</div>
            `;
            div.addEventListener('click', () => {
                barcodeInput.value = p.barcode;
                posSearchResults.classList.remove('active');
                addItemBtn.click(); // Auto-add to bill
            });
            posSearchResults.appendChild(div);
        });
        posSearchResults.classList.add('active');
    } else {
        posSearchResults.innerHTML = '<div class="search-item" style="color: #ef4444; font-size: 0.9rem;">No products found</div>';
        posSearchResults.classList.add('active');
    }
}

if (barcodeInput) {
    barcodeInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            posSearchResults.classList.remove('active');
            return;
        }
        showPosDropdown(query);
    });
}

const posCaret = document.querySelector('.pos-caret');
if (posCaret) {
    posCaret.addEventListener('click', () => {
        if (posSearchResults.classList.contains('active')) {
            posSearchResults.classList.remove('active');
        } else {
            showPosDropdown(barcodeInput.value.toLowerCase().trim());
            barcodeInput.focus();
        }
    });
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.stock-search-box') && posSearchResults) {
        posSearchResults.classList.remove('active');
    }
});

window.productsDB = JSON.parse(localStorage.getItem('pos_products_db')) || {};

window.addEventListener('cloudDataSynced', () => {
    window.productsDB = JSON.parse(localStorage.getItem('pos_products_db')) || {};
    if (barcodeInput && barcodeInput.value) {
        showPosDropdown(barcodeInput.value.toLowerCase().trim());
    }
});

function updateBill() {
    billItemsTbody.innerHTML = '';
    totalAmount = 0;
    let totalQty = 0;
    let totalDiscount = 0;

    billItems.forEach((item, index) => {
        item.disPercent = item.disPercent || 0;
        item.disAmount = item.disAmount || 0;
        
        // Calculate item total based on discount
        let itemRate = item.price;
        if (item.disPercent > 0) {
            item.disAmount = item.price * (item.disPercent / 100);
        } else if (item.disAmount > 0) {
            item.disPercent = (item.disAmount / item.price) * 100;
        }
        
        let discountedRate = itemRate - item.disAmount;
        const amount = discountedRate * item.qty;
        
        totalAmount += amount;
        totalQty += item.qty;
        totalDiscount += (item.disAmount * item.qty);

        // Pink background for return items (negative qty)
        const rowBg = item.qty < 0 ? 'background-color: #fbcfe8;' : '';

        billItemsTbody.innerHTML += `
            <tr style="${rowBg}">
                <td style="font-weight: 600; color: #3b82f6;">${item.name}</td>
                <td><input type="number" value="${item.price.toFixed(2)}" class="tbl-input" style="width: 70px; border: none; background: transparent; color: inherit; font-family: inherit;" onchange="window.updateItemField(${index}, 'price', this.value)"></td>
                <td>
                    <div style="display:flex; align-items:center;">
                        <input type="number" value="${item.disPercent.toFixed(2)}" class="tbl-input" style="width: 50px; text-align:right; color: #ef4444; border: 1px solid #e5e7eb; border-radius:3px;" onchange="window.updateItemField(${index}, 'disPercent', this.value)">
                        <span style="font-size:0.7rem; margin-left:2px; color:#6b7280;">%</span>
                    </div>
                </td>
                <td><input type="number" value="${item.disAmount.toFixed(2)}" class="tbl-input" style="width: 60px; border: 1px solid #e5e7eb; border-radius:3px;" onchange="window.updateItemField(${index}, 'disAmount', this.value)"></td>
                <td><input type="number" value="${discountedRate.toFixed(2)}" class="tbl-input" style="width: 70px; font-weight: 700; border: none; background: transparent;" readonly></td>
                <td><input type="number" value="${item.qty}" class="tbl-input" style="width: 50px; font-weight: 700; border: 1px solid #e5e7eb; border-radius:3px; text-align: center;" onchange="window.updateItemField(${index}, 'qty', this.value)"></td>
                <td style="text-align: right; font-weight: 700;">${amount.toFixed(2)}</td>
                <td style="text-align: center;">
                    <button style="background:none; border:none; color: #6b7280; cursor:pointer; margin-right: 5px;"><i class="fa-solid fa-pencil"></i></button>
                    <button onclick="window.removeItem(${index})" style="background:none; border:none; color: #ef4444; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });

    document.getElementById('total-amount').innerText = totalAmount.toFixed(2);
    const discEl = document.getElementById('total-disc');
    if(discEl) discEl.innerText = totalDiscount.toFixed(2);
    document.getElementById('total-items').innerText = billItems.length;
    document.getElementById('total-qty').innerText = totalQty;
}

window.updateItemField = (index, field, value) => {
    let val = parseFloat(value) || 0;
    if (field === 'disPercent') {
        billItems[index].disPercent = val;
        billItems[index].disAmount = 0; // Reset amount if percent changes
    } else if (field === 'disAmount') {
        billItems[index].disAmount = val;
        billItems[index].disPercent = 0; // Reset percent if amount changes
    } else if (field === 'qty') {
        billItems[index].qty = parseInt(value) || 1; // Preserve negative if it's a return
    } else if (field === 'price') {
        billItems[index].price = val;
    }
    updateBill();
};

window.removeItem = (index) => {
    billItems.splice(index, 1);
    updateBill();
};

addItemBtn.addEventListener('click', () => {
    const code = barcodeInput.value.trim();
    const qty = parseInt(qtyInput.value) || 1;
    
    if (code.startsWith('*')) {
        const parts = code.split('*');
        const price = parseFloat(parts[1]) || 0;
        const name = parts[2] ? parts[2].trim() : 'Custom Item';
        
        billItems.push({ code: 'CUST-' + Date.now(), name: name, price: price, qty });
        updateBill();
        barcodeInput.value = '';
        qtyInput.value = '1';
        barcodeInput.focus();
        return;
    }

    const currentDB = JSON.parse(localStorage.getItem('pos_products_db')) || window.productsDB || {};
    if (code && currentDB[code]) {
        const product = currentDB[code];
        // Check if exists
        const existing = billItems.find(i => i.code === code);
        if (existing) {
            existing.qty += qty;
        } else {
            billItems.push({ code, name: product.name, price: parseFloat(product.price) || 0, qty });
        }
        updateBill();
        barcodeInput.value = '';
        qtyInput.value = '1';
        barcodeInput.focus();
    } else if (code) {
        alert(`Product with barcode "${code}" not found! Please check barcode or add it under Products.`);
    }
});

barcodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addItemBtn.click();
});

// Modals Logic
const modalsContainer = document.getElementById('modals-container');

function openModal(htmlContent) {
    modalsContainer.innerHTML = `
        <div class="modal-overlay active" id="current-modal">
            ${htmlContent}
        </div>
    `;
    document.getElementById('current-modal').addEventListener('mousedown', (e) => {
        if(e.target.id === 'current-modal') closeModal();
    });
}

window.closeModal = () => {
    modalsContainer.innerHTML = '';
};

// Payment Modal
document.getElementById('btn-payment').addEventListener('click', () => {
    if (billItems.length === 0) return alert('Bill is empty!');
    
    const paymentHtml = `
        <div class="modal-content payment-modal" onclick="event.stopPropagation()">
            <div class="payment-left">
                <div class="modal-header">
                    <div>
                        <h2>Payment Details</h2>
                        <p style="font-size: 0.8rem; color: #9ca3af; margin-top:0.2rem;">Enter payment information below</p>
                    </div>
                    <span class="bill-no">Bill #179095969121</span>
                </div>

                <div class="customer-section-box">
                    <div class="section-title"><i class="fa-solid fa-user"></i> CUSTOMER</div>
                    <div class="customer-inputs">
                        <div class="form-group" style="flex:1;">
                            <label style="font-size: 0.75rem; color: #6b7280; font-weight: 700;">Card / Loyalty</label>
                            <input type="text" placeholder="Scan Card">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label style="font-size: 0.75rem; color: #6b7280; font-weight: 700;">Mobile</label>
                            <div style="display:flex; gap:0.2rem;">
                                <div class="search-input" style="flex: 1; position: relative; display: flex; align-items: center; width: 100%;">
                                    <input type="text" id="cust-mobile" placeholder="Search Mobile or Name..." oninput="window.handleCustomerSearch(this.value)" onfocus="window.handleCustomerSearch(this.value)" autocomplete="off" style="width: 100%; padding-right: 2rem;">
                                    <i class="fa-solid fa-caret-down" style="position: absolute; right: 10px; color: #6b7280; cursor: pointer;" onclick="window.toggleCustomerSearchDropdown()"></i>
                                    <div id="cust-search-results" class="search-dropdown" style="width: 100%; top: calc(100% + 4px);"></div>
                                </div>
                                <button type="button" class="btn-blue-add" onclick="window.openCustomerModal()"><i class="fa-solid fa-plus"></i></button>
                            </div>
                            <div id="customer-credit-info" style="display: none; gap: 0.5rem; margin-top: 0.6rem;">
                                <div style="flex: 1; border: 1px solid #e5e7eb; border-radius: 4px; padding: 0.4rem; text-align: center;">
                                    <div style="font-size: 0.6rem; font-weight: 700; color: #6b7280;">CREDIT LIMIT</div>
                                    <div id="cust-credit-limit" style="font-size: 0.85rem; font-weight: 700; color: #3b82f6;">0.00</div>
                                </div>
                                <div style="flex: 1; border: 1px solid #e5e7eb; border-radius: 4px; padding: 0.4rem; text-align: center;">
                                    <div style="font-size: 0.6rem; font-weight: 700; color: #6b7280;">DUE AMOUNT</div>
                                    <div id="cust-due-amount" style="font-size: 0.85rem; font-weight: 700; color: #ef4444;">0.00</div>
                                </div>
                            </div>
                            <div id="customer-not-found" style="color: #ef4444; font-size: 0.7rem; margin-top:0.3rem; display: none;">Customer not found</div>
                        </div>
                    </div>
                </div>

                <div class="section-title"><i class="fa-solid fa-credit-card"></i> PAYMENT METHODS</div>
                
                <div class="payment-method">
                    <label>Cash Payment</label>
                    <div class="payment-input-group">
                        <input type="number" id="pay-cash" placeholder="0.00" value="${totalAmount.toFixed(2)}" oninput="window.calculatePayment()">
                    </div>
                </div>

                <div class="payment-method">
                    <label>Card Payment</label>
                    <div class="payment-input-group">
                        <input type="number" id="pay-card" placeholder="0.00" oninput="window.calculatePayment()">
                    </div>
                </div>

                <div class="payment-method">
                    <label>Cheque Payment</label>
                    <div class="payment-input-group">
                        <input type="number" id="pay-cheque" placeholder="0.00" oninput="window.calculatePayment()">
                        <button class="icon-btn" title="Add Cheque Details" onclick="window.openDetailsModal('Cheque')"><i class="fa-solid fa-money-check-pen"></i></button>
                    </div>
                </div>
                
                <div class="payment-method">
                    <label>Credit Payment</label>
                    <div class="payment-input-group">
                        <input type="number" id="pay-credit" placeholder="0.00" readonly style="background-color: #f3f4f6; cursor: not-allowed;">
                        <input type="date" id="credit-due-date" style="padding: 0.6rem; border: 1px solid #e5e7eb; border-radius: 4px; outline: none; width: 130px; font-family: inherit; font-size: 0.9rem;" title="Due Date">
                    </div>
                </div>

                <div class="bottom-settings-box">
                    <div class="form-row">
                        <div class="form-group">
                            <label style="font-size: 0.75rem;">Discount</label>
                            <div style="display:flex; gap:0.2rem;">
                                <input type="text" placeholder="%" style="width:50px;">
                                <input type="text" placeholder="Amount">
                            </div>
                            <div style="font-size:0.7rem; color:#3b82f6; margin-top:0.4rem; cursor:pointer;"><i class="fa-solid fa-lock"></i> Unlock</div>
                        </div>
                        <div class="form-group">
                            <label style="font-size: 0.75rem;">Extra Pts</label>
                            <input type="text">
                            <div style="font-size:0.7rem; color:#4b5563; margin-top:0.4rem; display:flex; align-items:center; gap:0.3rem;">
                                <input type="checkbox" checked style="width:auto; margin:0;"> Print Receipt
                            </div>
                        </div>
                        <div class="form-group">
                            <label style="font-size: 0.75rem;">Format</label>
                            <select>
                                <option>80mm</option>
                                <option>A4</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div class="payment-right">
                <div class="pay-amount-box">
                    <p>TO PAY AMOUNT</p>
                    <h1>${totalAmount.toFixed(2)}</h1>
                    <div class="points-pill"><i class="fa-solid fa-star" style="color:#eab308;"></i> +${totalAmount.toFixed(2)} Points</div>
                </div>
                <div class="balance-box">
                    <span style="font-size:0.65rem; color:#6b7280; text-transform:uppercase; font-weight:700;">BALANCE</span><br>
                    <span class="bal-val">-${totalAmount.toFixed(2)}</span>
                </div>
                <div class="numpad">
                    <div class="quick-cash">
                        <button>50</button><button>100</button><button>500</button><button>1k</button><button>5k</button>
                    </div>
                    <button class="num-btn">7</button><button class="num-btn">8</button><button class="num-btn">9</button>
                    <button class="num-btn">4</button><button class="num-btn">5</button><button class="num-btn">6</button>
                    <button class="num-btn">1</button><button class="num-btn">2</button><button class="num-btn">3</button>
                    <button class="num-btn">0</button><button class="num-btn">00</button><button class="num-btn clr">CLR</button>
                </div>
                <div class="confirm-box">
                    <button class="btn-confirm" onclick="window.confirmPayment()"><i class="fa-solid fa-circle-check"></i> CONFIRM PAYMENT</button>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="btn-right-action" onclick="window.closeModal()">Edit Bill</button>
                        <button class="btn-right-action" style="color: #ef4444;" onclick="window.cancelBill()">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    openModal(paymentHtml);
    window.calculatePayment(); // Initial calculation
});

window.cancelBill = () => {
    billItems = [];
    updateBill();
    closeModal();
};

window.customersDB = JSON.parse(localStorage.getItem('pos_customers_db')) || {};
window.currentCustomer = null;

window.searchCustomer = (val) => {
    const credBox = document.getElementById('customer-credit-info');
    const notFound = document.getElementById('customer-not-found');
    if (!credBox || !notFound) return;

    if (window.customersDB[val]) {
        window.currentCustomer = window.customersDB[val];
        window.currentCustomerMobile = val;
        document.getElementById('cust-credit-limit').innerText = (window.currentCustomer.creditLimit || 0).toFixed(2);
        document.getElementById('cust-due-amount').innerText = (window.currentCustomer.dueAmount || 0).toFixed(2);
        credBox.style.display = 'flex';
        notFound.style.display = 'none';
        window.calculatePayment();
    } else if (val.length > 0) {
        window.currentCustomer = null;
        credBox.style.display = 'none';
        notFound.style.display = 'block';
    } else {
        window.currentCustomer = null;
        credBox.style.display = 'none';
        notFound.style.display = 'none';
    }
};

window.handleCustomerSearch = (query = '') => {
    const custDropdown = document.getElementById('cust-search-results');
    if (!custDropdown) return;
    const db = window.customersDB || JSON.parse(localStorage.getItem('pos_customers_db')) || {};
    const allCust = Object.values(db);
    const q = query.toLowerCase().trim();
    
    const matches = q ? allCust.filter(c => 
        (c.phone || '').toLowerCase().includes(q) || 
        (c.name || '').toLowerCase().includes(q)
    ) : allCust;
    
    custDropdown.innerHTML = '';
    if (matches.length > 0) {
        matches.forEach(c => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerHTML = `
                <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 3px;">${c.name}</div>
                <div style="font-size: 0.8rem; color: #cbd5e1;">${c.phone}</div>
            `;
            div.addEventListener('click', () => {
                document.getElementById('cust-mobile').value = c.phone;
                window.searchCustomer(c.phone);
                custDropdown.classList.remove('active');
            });
            custDropdown.appendChild(div);
        });
        custDropdown.classList.add('active');
    } else {
        custDropdown.innerHTML = '<div class="search-item" style="color: #ef4444; font-size: 0.9rem;">No customers found</div>';
        custDropdown.classList.add('active');
    }
    
    window.searchCustomer(query);
};

window.toggleCustomerSearchDropdown = () => {
    const custDropdown = document.getElementById('cust-search-results');
    if (custDropdown) {
        if (custDropdown.classList.contains('active')) {
            custDropdown.classList.remove('active');
        } else {
            window.handleCustomerSearch(document.getElementById('cust-mobile').value);
            document.getElementById('cust-mobile').focus();
        }
    }
};

document.addEventListener('click', (e) => {
    const custDropdown = document.getElementById('cust-search-results');
    if (custDropdown && !e.target.closest('.search-input')) {
        custDropdown.classList.remove('active');
    }
});


window.saveCustomer = () => {
    const name = document.getElementById('new-cust-name').value.trim();
    const mobile = document.getElementById('new-cust-mobile').value.trim();
    if (name && mobile) {
        // Save to localStorage
        const db = JSON.parse(localStorage.getItem('pos_customers_db')) || {};
        db[mobile] = { name: name, creditLimit: 0, dueAmount: 0, phone: mobile };
        localStorage.setItem('pos_customers_db', JSON.stringify(db));
        window.customersDB = db;
        
        alert('Customer saved successfully!');
        window.currentCustomerMobile = mobile;
        
        const mobileInput = document.getElementById('cust-mobile');
        if (mobileInput) {
            mobileInput.value = mobile;
            window.searchCustomer(mobile);
        }
        
        document.getElementById('sub-modal-container').remove();
    } else {
        alert('Name and Mobile are required!');
    }
};

window.calculatePayment = () => {
    const cash = parseFloat(document.getElementById('pay-cash').value) || 0;
    const card = parseFloat(document.getElementById('pay-card').value) || 0;
    const cheque = parseFloat(document.getElementById('pay-cheque').value) || 0;
    
    const totalPaid = cash + card + cheque;
    const balance = totalPaid - totalAmount;
    
    const balBox = document.querySelector('.balance-box .bal-val');
    const balLabel = document.querySelector('.balance-box span');
    const creditInput = document.getElementById('pay-credit');
    
    if (balance < 0) {
        balLabel.innerText = "Credit Payment";
        balBox.innerText = balance.toFixed(2);
        creditInput.value = Math.abs(balance).toFixed(2);
    } else {
        balLabel.innerText = "BALANCE";
        balBox.innerText = balance.toFixed(2);
        creditInput.value = '0.00';
    }

    // Dynamic Due Amount update
    if (window.currentCustomer) {
        const dueBox = document.getElementById('cust-due-amount');
        if (dueBox) {
            // New Due Amount = Old Due Amount - Balance (if negative balance, subtract negative = add credit)
            // Wait, if balance is negative (e.g. -50), they owe 50. 150 - (-50) = 200.
            // If balance is positive (e.g. +50), they overpaid, which reduces due. 150 - (+50) = 100.
            let newDue = window.currentCustomer.dueAmount - balance;
            dueBox.innerText = newDue.toFixed(2);
            dueBox.style.color = newDue > 0 ? '#ef4444' : '#10b981'; // red if owe, green if overpaid
        }
    }
};

// Customer Modal
window.openCustomerModal = () => {
    const custHtml = `
        <div class="modal-overlay active" id="sub-modal-overlay" onclick="this.parentElement.remove()">
            <div class="modal-content generic-modal" onclick="event.stopPropagation()">
                <button class="close-btn" onclick="document.getElementById('sub-modal-container').remove()"><i class="fa-solid fa-xmark"></i></button>
                <div class="modal-header">
                    <h2><i class="fa-solid fa-user-plus" style="color: #3b82f6;"></i> Add New Customer</h2>
                </div>
                <div style="background: #f0fdf4; color: #166534; padding: 0.8rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 1.5rem; border: 1px solid #bbf7d0;">
                    <i class="fa-solid fa-circle-info"></i> Please enter the customer's details below to register them.
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>CUSTOMER NAME *</label>
                        <input type="text" id="new-cust-name" placeholder="Full Name">
                    </div>
                    <div class="form-group">
                        <label>MOBILE NUMBER *</label>
                        <input type="text" id="new-cust-mobile" placeholder="07XXXXXXXX">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>NIC NUMBER</label>
                        <input type="text" placeholder="National ID">
                    </div>
                    <div class="form-group">
                        <label>PIN *</label>
                        <input type="text" value="1113" style="border-color: #3b82f6; color: #3b82f6; font-weight: 700;">
                    </div>
                </div>
                <div class="form-group">
                    <label>ADDRESS</label>
                    <textarea rows="3" placeholder="Residential Address"></textarea>
                </div>
                
                <div class="modal-actions">
                    <button class="btn-cancel" onclick="document.getElementById('sub-modal-container').remove()">Cancel</button>
                    <button class="btn-save" onclick="window.saveCustomer()"><i class="fa-solid fa-circle-check"></i> Save Customer</button>
                </div>
            </div>
        </div>
    `;
    const div = document.createElement('div');
    div.id = 'sub-modal-container';
    div.innerHTML = custHtml;
    document.body.appendChild(div);
};

// Details Modal (Cheque / Credit)
window.chequeDetails = null;

window.saveChequeDetails = () => {
    const numEl = document.getElementById('cheque-num');
    const bankEl = document.getElementById('cheque-bank');
    const dateEl = document.getElementById('cheque-date');
    
    window.chequeDetails = {
        num: numEl ? numEl.value : '',
        bank: bankEl ? bankEl.value : '',
        date: dateEl ? dateEl.value : ''
    };
    
    document.getElementById('sub-modal-container').remove();
    
    const btn = document.querySelector('button[title="Add Cheque Details"]');
    if (btn) {
        btn.style.backgroundColor = '#10b981';
        btn.style.color = 'white';
        btn.style.borderColor = '#10b981';
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
    }
};

window.openDetailsModal = (type) => {
    const isCheque = type === 'Cheque';
    const autofillMobile = window.currentCustomerMobile || '';
    
    const detailsHtml = `
        <div class="modal-overlay active" id="sub-modal-overlay" onclick="this.parentElement.remove()">
            <div class="modal-content generic-modal" onclick="event.stopPropagation()">
                <button class="close-btn" onclick="document.getElementById('sub-modal-container').remove()"><i class="fa-solid fa-xmark"></i></button>
                <div class="modal-header">
                    <h2><i class="fa-solid ${isCheque ? 'fa-money-check-pen' : 'fa-hand-holding-dollar'}" style="color: #3b82f6;"></i> ${type} Details</h2>
                </div>
                <p style="font-size: 0.85rem; color: #6b7280; margin-bottom: 1.5rem;">Enter details to track this payment on the dashboard.</p>
                
                ${isCheque ? `
                <div class="form-row">
                    <div class="form-group">
                        <label>Cheque Number</label>
                        <input type="text" id="cheque-num" placeholder="e.g. 849201" value="${window.chequeDetails ? window.chequeDetails.num : ''}">
                    </div>
                    <div class="form-group">
                        <label>Bank Name</label>
                        <select id="cheque-bank">
                            <option value="">Select Bank...</option>
                            <option value="BOC">Bank of Ceylon (BOC)</option>
                            <option value="Commercial">Commercial Bank</option>
                            <option value="HNB">Hatton National Bank (HNB)</option>
                            <option value="Sampath">Sampath Bank</option>
                            <option value="Peoples">People's Bank</option>
                            <option value="Seylan">Seylan Bank</option>
                            <option value="NDB">National Development Bank (NDB)</option>
                            <option value="NTB">Nations Trust Bank (NTB)</option>
                            <option value="DFCC">DFCC Bank</option>
                            <option value="PanAsia">Pan Asia Bank</option>
                        </select>
                    </div>
                </div>
                ` : ''}

                <div class="form-row">
                    <div class="form-group">
                        <label>Due Date</label>
                        <input type="date" id="cheque-date" value="${window.chequeDetails ? window.chequeDetails.date : ''}">
                    </div>
                    <div class="form-group">
                        <label>Customer WhatsApp</label>
                        <div style="display:flex; gap:0.5rem;">
                            <input type="text" placeholder="07XXXXXXXX" value="${autofillMobile}">
                            <button style="background: #22c55e; color: white; border: none; padding: 0 1.2rem; border-radius: 6px; cursor: pointer;"><i class="fa-brands fa-whatsapp"></i></button>
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn-cancel" onclick="document.getElementById('sub-modal-container').remove()">Back</button>
                    <button class="btn-save" onclick="window.saveChequeDetails()"><i class="fa-solid fa-floppy-disk"></i> Save Details</button>
                </div>
            </div>
        </div>
    `;
    const div = document.createElement('div');
    div.id = 'sub-modal-container';
    div.innerHTML = detailsHtml;
    document.body.appendChild(div);
    
    if (isCheque && window.chequeDetails && window.chequeDetails.bank) {
        document.getElementById('cheque-bank').value = window.chequeDetails.bank;
    }
};

window.confirmPayment = () => {
    const cash = parseFloat(document.getElementById('pay-cash').value) || 0;
    const card = parseFloat(document.getElementById('pay-card').value) || 0;
    const cheque = parseFloat(document.getElementById('pay-cheque').value) || 0;
    const totalPaid = cash + card + cheque;
    const balance = totalPaid - totalAmount;
    const creditDueDateEl = document.getElementById('credit-due-date');
    const creditDueDate = creditDueDateEl ? creditDueDateEl.value : '';
    
    // Generate Bill ID: date-based YYMMDD + sequence
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePrefix = yy + mm + dd;
    
    // Get existing bills to determine next sequence
    let salesData = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
    const todayBills = salesData.filter(b => b.id.startsWith(datePrefix));
    const nextSeq = String(2050 + salesData.length + 1).padStart(4, '0');
    const billId = datePrefix + nextSeq;
    
    // Get customer info
    const custMobileEl = document.getElementById('cust-mobile');
    const customerName = window.currentCustomer ? window.currentCustomer.name : 'Unknown';
    const customerPhone = custMobileEl ? custMobileEl.value : '';
    
    // Update Customer Due Amount
    if (customerPhone && balance !== 0) {
        let custDb = JSON.parse(localStorage.getItem('pos_customers_db')) || {};
        let custKey = Object.keys(custDb).find(k => custDb[k].phone === customerPhone || k === customerPhone);
        if (custKey) {
            let currentDue = custDb[custKey].dueAmount || 0;
            // balance = totalPaid - totalAmount
            // If balance < 0 (they underpaid), we subtract a negative number (add to dueAmount).
            // If balance > 0 (they overpaid), we subtract a positive number (reduce dueAmount).
            custDb[custKey].dueAmount = currentDue - balance;
            localStorage.setItem('pos_customers_db', JSON.stringify(custDb));
        }
    }
    
    // Format datetime using local date & time
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const datetime = `${dateStr} ${timeStr}`;
    
    // Cheque Details Capture
    const chequeNum = (cheque > 0 && window.chequeDetails && (window.chequeDetails.number || window.chequeDetails.num))
        ? (window.chequeDetails.number || window.chequeDetails.num)
        : (cheque > 0 ? 'CHQ-' + billId : '');
    const chequeBankName = (cheque > 0 && window.chequeDetails && window.chequeDetails.bank)
        ? window.chequeDetails.bank
        : (cheque > 0 ? 'Bank' : '');
    const chequeDueDate = (cheque > 0 && window.chequeDetails && window.chequeDetails.date)
        ? window.chequeDetails.date
        : dateStr;

    // Build new bill object
    const newBill = {
        id: billId,
        total: totalAmount.toFixed(2),
        cash: cash > 0 ? cash.toFixed(2) : '0',
        card: card > 0 ? card.toFixed(2) : '-',
        cheque: cheque > 0 ? cheque.toFixed(2) : '-',
        chequeNo: chequeNum,
        chequeBank: chequeBankName,
        chequeDate: chequeDueDate,
        chequeStatus: 'Pending',
        user: 'Admin User',
        customer: customerName,
        customerPhone: customerPhone,
        datetime: datetime,
        dueDate: balance < -0.01 && creditDueDate ? creditDueDate : null,
        items: billItems.map(item => ({
            name: item.name,
            barcode: item.code || item.barcode || '0000000000000',
            cost: item.price,
            original: item.price,
            sale: item.price - (item.disAmount || 0),
            qty: item.qty
        }))
    };
    
    // 1. Deduct Stock Quantity from pos_products_db
    let productsDb = JSON.parse(localStorage.getItem('pos_products_db')) || {};
    let productsUpdated = false;
    billItems.forEach(item => {
        const code = item.code || item.barcode;
        if (code && productsDb[code]) {
            const currentQty = parseFloat(productsDb[code].qty) || 0;
            const soldQty = parseFloat(item.qty) || 0;
            productsDb[code].qty = Math.max(0, currentQty - soldQty);
            productsUpdated = true;
        } else {
            Object.keys(productsDb).forEach(k => {
                if (productsDb[k].name === item.name) {
                    const currentQty = parseFloat(productsDb[k].qty) || 0;
                    const soldQty = parseFloat(item.qty) || 0;
                    productsDb[k].qty = Math.max(0, currentQty - soldQty);
                    productsUpdated = true;
                }
            });
        }
    });
    if (productsUpdated) {
        localStorage.setItem('pos_products_db', JSON.stringify(productsDb));
    }

    // Save sales data to localStorage & Cloud
    salesData.unshift(newBill); // Add to top (most recent first)
    localStorage.setItem('pos_sales_data', JSON.stringify(salesData));
    
    // Reset chequeDetails
    window.chequeDetails = null;
    
    // Generate Print Receipt
    const printDiv = document.createElement('div');
    printDiv.id = 'print-section';
    printDiv.innerHTML = `
        <style>
            @media print {
                body * { visibility: hidden !important; }
                #print-section, #print-section * { visibility: visible !important; }
                #print-section {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    color: black;
                    background: white;
                }
            }
        </style>
        <div style="text-align:center; font-family: monospace; font-size: 14px; margin-bottom: 20px;">
            <h2>OSS POS System</h2>
            <p>Invoice: ${billId}</p>
            <hr>
            ${billItems.map(item => `<div style="display:flex; justify-content:space-between;"><span>${item.name} x${item.qty}</span><span>${(item.price * item.qty).toFixed(2)}</span></div>`).join('')}
            <hr>
            <div style="display:flex; justify-content:space-between; font-weight:bold;"><span>Total</span><span>${totalAmount.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Total Paid</span><span>${totalPaid.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Balance/Due</span><span>${Math.abs(balance).toFixed(2)}</span></div>
            <hr>
        </div>
    `;
    document.body.appendChild(printDiv);
    window.print();
    printDiv.remove();
    
    // Show Success Modal with premium design
    const displayBalance = Math.abs(balance);
    const isCredit = balance < -0.01;
    const balanceLabel = isCredit ? 'Ã°Å¸â€™Â³ BALANCE DUE' : 'Ã°Å¸â€™Âµ CHANGE';
    const balanceGrad = isCredit
        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
        : 'linear-gradient(135deg, #10b981, #059669)';
    const checkGrad = 'linear-gradient(135deg, #10b981, #34d399)';

    const successHtml = `
        <style>
            @keyframes pop-in {
                0% { transform: scale(0.5) translateY(40px); opacity: 0; }
                70% { transform: scale(1.05) translateY(-5px); }
                100% { transform: scale(1) translateY(0); opacity: 1; }
            }
            @keyframes check-draw {
                0% { transform: scale(0) rotate(-30deg); opacity: 0; }
                60% { transform: scale(1.3) rotate(5deg); opacity: 1; }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            @keyframes fade-up {
                from { opacity: 0; transform: translateY(12px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse-ring {
                0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
                70% { box-shadow: 0 0 0 20px rgba(16,185,129,0); }
                100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
            }
            #success-modal-container .s-overlay {
                position: fixed; inset: 0;
                background: rgba(0,0,0,0.65);
                backdrop-filter: blur(6px);
                z-index: 100000;
                display: flex; align-items: center; justify-content: center;
            }
            #success-modal-container .s-card {
                background: #fff;
                border-radius: 24px;
                width: 360px;
                max-width: 95vw;
                overflow: hidden;
                box-shadow: 0 40px 80px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1);
                animation: pop-in 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards;
            }
            #success-modal-container .s-header {
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                padding: 2rem 2rem 1.5rem;
                text-align: center;
                position: relative;
            }
            #success-modal-container .s-check-ring {
                width: 80px; height: 80px;
                border-radius: 50%;
                background: ${checkGrad};
                display: flex; align-items: center; justify-content: center;
                margin: 0 auto 1rem;
                animation: check-draw 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.15s both, pulse-ring 1.5s 0.6s ease-out;
                box-shadow: 0 8px 24px rgba(16,185,129,0.45);
            }
            #success-modal-container .s-check-ring i {
                font-size: 2rem; color: white;
            }
            #success-modal-container .s-bill-id {
                font-size: 1.6rem; font-weight: 800; letter-spacing: 2px;
                color: #fff;
                font-family: 'Outfit', monospace;
                animation: fade-up 0.4s 0.3s ease both;
            }
            #success-modal-container .s-badge {
                display: inline-block; margin-top: 0.5rem;
                background: rgba(16,185,129,0.2);
                color: #34d399;
                border: 1px solid rgba(52,211,153,0.3);
                padding: 0.2rem 0.8rem;
                border-radius: 999px;
                font-size: 0.7rem; font-weight: 700; letter-spacing: 1px;
                animation: fade-up 0.4s 0.4s ease both;
            }
            #success-modal-container .s-body {
                padding: 1.5rem 2rem;
            }
            #success-modal-container .s-amounts {
                display: flex;
                gap: 1rem;
                margin-bottom: 1.25rem;
                animation: fade-up 0.4s 0.35s ease both;
            }
            #success-modal-container .s-amt-box {
                flex: 1;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 0.9rem 1rem;
                text-align: center;
            }
            #success-modal-container .s-amt-label {
                font-size: 0.65rem; font-weight: 700; letter-spacing: 1px;
                color: #94a3b8; text-transform: uppercase;
                margin-bottom: 0.3rem;
            }
            #success-modal-container .s-amt-val {
                font-size: 1.4rem; font-weight: 800; color: #1e293b;
            }
            #success-modal-container .s-amt-val.paid { color: #3b82f6; }
            #success-modal-container .s-balance {
                border-radius: 16px;
                padding: 1.4rem;
                text-align: center;
                background: ${balanceGrad};
                color: white;
                margin-bottom: 1.5rem;
                animation: fade-up 0.4s 0.45s ease both;
                box-shadow: ${isCredit ? '0 8px 24px rgba(239,68,68,0.3)' : '0 8px 24px rgba(16,185,129,0.3)'};
            }
            #success-modal-container .s-balance-label {
                font-size: 0.75rem; font-weight: 700; letter-spacing: 1.5px;
                opacity: 0.85; margin-bottom: 0.4rem;
            }
            #success-modal-container .s-balance-val {
                font-size: 3rem; font-weight: 900; line-height: 1;
                letter-spacing: -1px;
                text-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            #success-modal-container .s-done-btn {
                width: 100%;
                padding: 1rem;
                border: none;
                border-radius: 12px;
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                font-size: 1.1rem;
                font-weight: 800;
                cursor: pointer;
                letter-spacing: 0.5px;
                box-shadow: 0 6px 20px rgba(16,185,129,0.4);
                transition: transform 0.15s, box-shadow 0.15s;
                animation: fade-up 0.4s 0.5s ease both;
            }
            #success-modal-container .s-done-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 28px rgba(16,185,129,0.5);
            }
            #success-modal-container .s-done-btn:active {
                transform: translateY(0);
            }
        </style>
        <div class="s-overlay" onclick="event.stopPropagation()">
            <div class="s-card">
                <div class="s-header">
                    <div class="s-check-ring"><i class="fa-solid fa-check"></i></div>
                    <div class="s-bill-id">${billId}</div>
                    <div class="s-badge">Ã¢Å“â€œ PAYMENT SUCCESSFUL</div>
                </div>
                <div class="s-body">
                    <div class="s-amounts">
                        <div class="s-amt-box">
                            <div class="s-amt-label">Total Amount</div>
                            <div class="s-amt-val">${totalAmount.toFixed(2)}</div>
                        </div>
                        <div class="s-amt-box">
                            <div class="s-amt-label">Paid</div>
                            <div class="s-amt-val paid">${totalPaid.toFixed(2)}</div>
                        </div>
                    </div>
                    <div class="s-balance">
                        <div class="s-balance-label">${balanceLabel}</div>
                        <div class="s-balance-val">${displayBalance.toFixed(2)}</div>
                    </div>
                    <button class="s-done-btn" onclick="window.closeSuccessModal()">
                        <i class="fa-solid fa-circle-check"></i> &nbsp; Done
                    </button>
                </div>
            </div>
        </div>
    `;

    const div = document.createElement('div');
    div.id = 'success-modal-container';
    div.innerHTML = successHtml;
    document.body.appendChild(div);
};


window.closeSuccessModal = () => {
    document.getElementById('success-modal-container').remove();
    billItems = [];
    updateBill();
    closeModal();
};


// --- PHASE 1: New Modals ---

// Other (F4) Item Modal
window.openOtherModal = () => {
    const html = `
        <div class="modal-content" style="max-width: 450px; padding: 0;">
            <div style="background: #2563eb; color: white; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; border-radius: 8px 8px 0 0;">
                <h3 style="margin: 0; font-size: 1.1rem;"><i class="fa-solid fa-cart-plus"></i> Add Other Item</h3>
                <button onclick="window.closeModal()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div style="padding: 1.5rem;">
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase;">Product Name</label>
                    <input type="text" id="other-name" value="Other Item" style="width: 100%; padding: 0.8rem; border: 1px solid #e5e7eb; border-radius: 4px; border-left: 4px solid #eab308; font-weight: 600; color: #374151;">
                </div>
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group" style="flex: 1;">
                        <label style="font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase;">Cost Price</label>
                        <div style="display: flex; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden;">
                            <span style="background: #f3f4f6; padding: 0.8rem; color: #10b981;"><i class="fa-solid fa-money-bill-1"></i></span>
                            <input type="number" id="other-cost" placeholder="0.00" style="width: 100%; padding: 0.8rem; border: none; outline: none;">
                        </div>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label style="font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase;">Sale Price</label>
                        <div style="display: flex; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden;">
                            <span style="background: #f3f4f6; padding: 0.8rem; color: #3b82f6;"><i class="fa-solid fa-tag"></i></span>
                            <input type="number" id="other-price" placeholder="0.00" style="width: 100%; padding: 0.8rem; border: none; outline: none;">
                        </div>
                    </div>
                </div>
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label style="font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase;">Quantity</label>
                    <div style="display: flex; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden;">
                        <span style="background: #f3f4f6; padding: 0.8rem; color: #6b7280;"><i class="fa-solid fa-cubes"></i></span>
                        <input type="number" id="other-qty" value="1" style="width: 100%; padding: 0.8rem; border: none; outline: none; border-left: 2px solid #3b82f6;">
                    </div>
                </div>
                <button onclick="window.addOtherItem()" style="width: 100%; background: #1e3a8a; color: white; border: none; padding: 1rem; border-radius: 6px; font-weight: 700; cursor: pointer; transition: background 0.2s;"><i class="fa-solid fa-plus-circle"></i> Add to List</button>
            </div>
        </div>
    `;
    openModal(html);
};

window.addOtherItem = () => {
    const name = document.getElementById('other-name').value || 'Other Item';
    const price = parseFloat(document.getElementById('other-price').value) || 0;
    const qty = parseInt(document.getElementById('other-qty').value) || 1;
    
    billItems.push({ code: 'OTHER-' + Date.now(), name, price, qty });
    updateBill();
    closeModal();
};

// Day End Modal
window.openDayEndModal = () => {
    // Mock calculations based on local storage if we had it, but for now we use mock static data like the screenshot
    const dayStartCash = 10000.00;
    const cashPayment = 1480.00; // Fake value for demonstration
    const repairPayment = 0.00;
    const orderPayment = 0.00;
    const discountAmount = 0.00;
    const expenses = 0.00;
    const cancelBill = 0.00;
    const cashBalance = dayStartCash + cashPayment - expenses;
    
    const html = `
        <div class="modal-content" style="max-width: 600px; padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f3f4f6; padding-bottom: 1rem; margin-bottom: 1.5rem;">
                <div>
                    <h3 style="margin: 0; font-size: 1.1rem; color: #111827;">Today Summery Report</h3>
                </div>
                <button onclick="window.closeModal()" style="background: #e5e7eb; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-xmark" style="font-size: 0.7rem;"></i></button>
            </div>
            
            <div style="text-align: center; margin-bottom: 1.5rem; font-weight: 700; font-size: 0.9rem;">
                <div>Name: Admin User</div>
                <div>Valid Date: ${new Date().toISOString().split('T')[0]}</div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; border: 1px solid #111827; margin-bottom: 1.5rem;">
                <tbody>
                    <tr>
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem;">Day Start Cash Amount</td>
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem; text-align: right;">${dayStartCash.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem;">Cash Payment</td>
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem; text-align: right;">${cashPayment.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem;">Repair Payment</td>
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem; text-align: right;">${repairPayment.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem;">Order Payment</td>
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem; text-align: right;">${orderPayment.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem;">Discount Amount</td>
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem; text-align: right;">${discountAmount.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem;">My Expenses</td>
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem; text-align: right;">${expenses.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem;">Cancel Bill</td>
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem; text-align: right;">${cancelBill.toFixed(2)}</td>
                    </tr>
                    <tr style="font-weight: 700;">
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem;">Cash Balance</td>
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem; text-align: right;">${cashBalance.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem;">Hand Count Cash Amount</td>
                        <td style="border: 1px solid #111827; padding: 0; text-align: right;">
                            <input type="number" id="hand-count" value="0.00" oninput="window.updateDayEndDiff(${cashBalance})" style="width: 100%; height: 100%; padding: 0.4rem 0.5rem; border: none; background: #fef08a; text-align: right; outline: none; font-family: inherit;">
                        </td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #111827; padding: 0.4rem 0.5rem;">Difference</td>
                        <td id="day-end-diff" style="border: 1px solid #111827; padding: 0.4rem 0.5rem; text-align: right;">-${cashBalance.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
            
            <button style="background: #3b82f6; color: white; border: none; padding: 0.6rem 1rem; border-radius: 4px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Day End & Print</button>
        </div>
    `;
    openModal(html);
};

window.updateDayEndDiff = (expected) => {
    const hand = parseFloat(document.getElementById('hand-count').value) || 0;
    const diff = hand - expected;
    const el = document.getElementById('day-end-diff');
    el.innerText = diff.toFixed(2);
    el.style.color = diff < 0 ? '#ef4444' : (diff > 0 ? '#10b981' : '#374151');
};

document.getElementById('btn-new-bill').addEventListener('click', () => {
    billItems = [];
    updateBill();
});

// --- PHASE 2-4: Extended ERP Modals ---

window.openReturnModal = () => {
    const html = `
        <div class="modal-content" style="max-width: 500px; padding: 0; overflow: visible; border-radius: 8px;">
            <div style="background: #ef4444; color: white; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                <h3 style="margin: 0; font-size: 1.1rem;"><i class="fa-solid fa-rotate-left"></i> Add Return Item</h3>
                <button onclick="window.closeModal()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div style="padding: 1.5rem;">
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 0.5rem; display: block;">SELECT ITEM</label>
                    <div class="search-input" style="width: 100%;">
                        <i class="fa-solid fa-barcode"></i>
                        <input type="text" id="ret-barcode" placeholder="Scan Barcode or Product Name" autocomplete="off" oninput="window.showRetDropdown(this.value)">
                        <i class="fa-solid fa-caret-down pos-caret" onclick="window.toggleRetDropdown()"></i>
                        <div id="ret-search-results" class="search-dropdown" style="width: 100%;"></div>
                    </div>
                </div>
                <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="form-group" style="flex: 1;">
                        <label style="font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase;">RETURN QTY</label>
                        <div style="display: flex; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden;">
                            <span style="background: #f3f4f6; padding: 0.8rem; color: #6b7280;"><i class="fa-solid fa-cubes"></i></span>
                            <input type="number" id="ret-qty" value="1" style="width: 100%; padding: 0.8rem; border: none; outline: none; border-left: 2px solid #ef4444;">
                        </div>
                    </div>
                    <div class="form-group" style="flex: 2;">
                        <label style="font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase;">REASON</label>
                        <div style="display: flex; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden;">
                            <span style="background: #f3f4f6; padding: 0.8rem; color: #6b7280;"><i class="fa-solid fa-comment"></i></span>
                            <input type="text" id="ret-reason" value="Exchange Item" style="width: 100%; padding: 0.8rem; border: none; outline: none; border-left: 2px solid #eab308;">
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button style="background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; padding: 0.8rem 1.5rem; border-radius: 20px; font-weight: 600; cursor: pointer;"><i class="fa-solid fa-gear"></i> Advance</button>
                    <button onclick="window.addReturnItem()" style="flex: 1; background: #ef4444; color: white; border: none; padding: 0.8rem; border-radius: 20px; font-weight: 700; cursor: pointer; transition: background 0.2s;"><i class="fa-solid fa-plus-circle"></i> Add to List</button>
                </div>
            </div>
        </div>
    `;
    openModal(html);
};

window.addReturnItem = () => {
    const code = document.getElementById('ret-barcode').value || 'RETURN';
    const qty = parseInt(document.getElementById('ret-qty').value) || 1;
    billItems.push({ code, name: 'Returned Item', price: 150.00, qty: -qty }); // Negative quantity
    updateBill();
    closeModal();
};

window.openProductsModal = () => {
    const html = `
        <div class="modal-content" style="max-width: 900px; padding: 1.5rem; border-radius: 8px; overflow: visible;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <div style="display: flex; gap: 1rem; flex: 1;">
                    <div class="search-input" style="flex: 2;">
                        <i class="fa-solid fa-barcode"></i>
                        <input type="text" id="prod-modal-search" placeholder="Scan Barcode or Type Product Name..." autocomplete="off" oninput="window.showProdModalDropdown(this.value)">
                        <i class="fa-solid fa-caret-down pos-caret" onclick="window.toggleProdModalDropdown()"></i>
                        <div id="prod-search-results" class="search-dropdown" style="width: 100%;"></div>
                    </div>
                    <div style="display: flex; border: 1px solid #d1d5db; border-radius: 4px; overflow: hidden; flex: 1;">
                        <span style="background: #f9fafb; padding: 0.6rem; color: #9ca3af;"><i class="fa-solid fa-money-bill"></i></span>
                        <input type="text" value="0.00" style="width: 100%; padding: 0.6rem; border: none; outline: none; text-align: right;">
                    </div>
                </div>
                <button onclick="window.closeModal()" style="background: transparent; border: none; margin-left: 1rem; cursor: pointer; color: #9ca3af;"><i class="fa-solid fa-circle-xmark" style="font-size: 1.2rem;"></i></button>
            </div>
            
            <div style="color: #10b981; font-weight: 600; font-size: 0.9rem; margin-bottom: 0.5rem;"><i class="fa-solid fa-boxes-stacked"></i> Main Store</div>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                    <thead>
                        <tr style="border-bottom: 2px solid #e5e7eb;">
                            <th style="text-align: left; padding: 0.8rem 0.5rem;">No.</th>
                            <th style="text-align: left; padding: 0.8rem 0.5rem;">Product Name</th>
                            <th style="text-align: left; padding: 0.8rem 0.5rem;">Barcode</th>
                            <th style="text-align: right; padding: 0.8rem 0.5rem;">Sale Price</th>
                            <th style="text-align: right; padding: 0.8rem 0.5rem;">Dis. Price</th>
                            <th style="text-align: right; padding: 0.8rem 0.5rem;">QTY</th>
                            <th style="text-align: center; padding: 0.8rem 0.5rem;">Dis. On/Off</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.keys(productsDB).map((code, idx) => `
                        <tr style="border-bottom: 1px solid #f3f4f6;">
                            <td style="padding: 0.8rem 0.5rem;">${idx + 1}</td>
                            <td style="padding: 0.8rem 0.5rem;"><div style="font-weight:600;">${productsDB[code].name}</div><div style="color:#6b7280; font-size:0.75rem;">${productsDB[code].name}</div></td>
                            <td style="padding: 0.8rem 0.5rem;">${code}</td>
                            <td style="text-align: right; padding: 0.8rem 0.5rem;"><div style="font-weight:700;">${productsDB[code].price.toFixed(2)}</div><div style="color:#9ca3af; font-size:0.7rem; font-style: italic;">Product Create Badge</div></td>
                            <td style="text-align: right; padding: 0.8rem 0.5rem;">${productsDB[code].price.toFixed(2)}</td>
                            <td style="text-align: right; padding: 0.8rem 0.5rem;">${Math.floor(Math.random() * 50) + 1}.000</td>
                            <td style="text-align: center; padding: 0.8rem 0.5rem;"><span style="background: #ef4444; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">Off</span></td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    openModal(html);
};

window.openQuotationsModal = () => {
    const html = `
        <div class="modal-content" style="max-width: 900px; padding: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0; color: #6b7280; font-size: 0.9rem;"><i class="fa-solid fa-filter"></i> FILTER QUOTATIONS</h3>
                <button onclick="window.closeModal()" style="background: transparent; border: none; cursor: pointer; color: #9ca3af;"><i class="fa-solid fa-circle-xmark" style="font-size: 1.2rem;"></i></button>
            </div>
            
            <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
                <div style="flex: 1;">
                    <label style="font-size: 0.75rem; font-weight: 700; color: #374151;">From Date</label>
                    <input type="date" style="width: 100%; padding: 0.6rem; border: 1px solid #d1d5db; border-radius: 4px; outline: none; margin-top: 0.3rem;">
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 0.75rem; font-weight: 700; color: #374151;">To Date</label>
                    <input type="date" style="width: 100%; padding: 0.6rem; border: 1px solid #d1d5db; border-radius: 4px; outline: none; margin-top: 0.3rem;">
                </div>
                <div style="flex: 1; display: flex; align-items: flex-end;">
                    <button style="width: 100%; background: #3b82f6; color: white; border: none; padding: 0.6rem; border-radius: 4px; font-weight: 600; cursor: pointer;"><i class="fa-solid fa-magnifying-glass"></i> Filter Data</button>
                </div>
            </div>
            
            <h3 style="margin: 0 0 1rem 0; color: #374151; font-size: 1.1rem;"><i class="fa-solid fa-list-ul" style="color: #3b82f6;"></i> Quotation List</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                <thead style="background: #374151; color: white;">
                    <tr>
                        <th style="text-align: left; padding: 0.8rem 1rem;">#</th>
                        <th style="text-align: left; padding: 0.8rem 1rem;">Quotation ID</th>
                        <th style="text-align: left; padding: 0.8rem 1rem;">Created Date</th>
                        <th style="text-align: left; padding: 0.8rem 1rem;">User</th>
                        <th style="text-align: center; padding: 0.8rem 1rem;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="background: #f3f4f6; border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 0.8rem 1rem;">1</td>
                        <td style="padding: 0.8rem 1rem; font-weight: 700;">179096267721</td>
                        <td style="padding: 0.8rem 1rem;">2026-Oct-02 11:11 PM</td>
                        <td style="padding: 0.8rem 1rem;"><span style="background: #e5e7eb; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600;">Admin User</span></td>
                        <td style="text-align: center; padding: 0.8rem 1rem;">
                            <button style="background: #3b82f6; color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 4px; cursor: pointer; margin-right: 0.3rem;"><i class="fa-solid fa-print"></i></button>
                            <button style="background: #22c55e; color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-cart-shopping"></i> Pay</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    openModal(html);
};

window.openNewQuotationModal = () => {
    const html = `
        <div class="modal-content" style="max-width: 450px; padding: 2.5rem; border-radius: 12px; text-align: center;">
            <h2 style="margin: 0 0 0.5rem 0; color: #111827; font-size: 1.5rem;">Create Quotation</h2>
            <p style="color: #6b7280; font-size: 0.85rem; margin-bottom: 2rem;">Enter details to generate a new quotation</p>
            
            <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem;">
                <div style="display: flex; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                    <span style="background: white; padding: 0.8rem; color: #9ca3af;"><i class="fa-solid fa-tag"></i></span>
                    <input type="text" placeholder="Quotation Title" style="width: 100%; padding: 0.8rem; border: none; outline: none; font-size: 0.9rem;">
                </div>
                <div style="display: flex; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                    <span style="background: white; padding: 0.8rem; color: #9ca3af;"><i class="fa-solid fa-user"></i></span>
                    <input type="text" placeholder="Customer Name" style="width: 100%; padding: 0.8rem; border: none; outline: none; font-size: 0.9rem;">
                </div>
                <div style="display: flex; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                    <span style="background: white; padding: 0.8rem; color: #9ca3af;"><i class="fa-solid fa-phone"></i></span>
                    <input type="text" placeholder="Mobile Number" style="width: 100%; padding: 0.8rem; border: none; outline: none; font-size: 0.9rem;">
                </div>
                <div style="display: flex; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                    <span style="background: white; padding: 0.8rem; color: #9ca3af; align-items: flex-start;"><i class="fa-solid fa-align-left"></i></span>
                    <textarea placeholder="Remarks (Optional)" rows="3" style="width: 100%; padding: 0.8rem; border: none; outline: none; font-size: 0.9rem; resize: none;"></textarea>
                </div>
            </div>
            
            <button style="width: 100%; background: #4f46e5; color: white; border: none; padding: 1rem; border-radius: 6px; font-weight: 600; font-size: 1rem; margin-bottom: 0.8rem; cursor: pointer;">Print Quotation</button>
            <button onclick="window.closeModal()" style="width: 100%; background: white; color: #4b5563; border: 1px solid #e5e7eb; padding: 1rem; border-radius: 6px; font-weight: 600; font-size: 1rem; cursor: pointer;">Cancel & Close</button>
        </div>
    `;
    openModal(html);
};

window.openBalanceModal = () => {
    const html = `
        <div class="modal-content" style="width: 85vw; max-width: 1100px; min-height: 60vh; background: #f1f5f9; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); position: relative; max-height: 90vh; overflow-y: auto;">
            
            <button onclick="window.closeModal()" style="position: absolute; top: 1rem; right: 1rem; background: #cbd5e1; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; color: #475569; display: flex; align-items: center; justify-content: center; z-index: 10;"><i class="fa-solid fa-xmark"></i></button>
            
            <!-- Find Customer Card -->
            <div style="background: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="font-size: 0.85rem; font-weight: 800; color: #64748b; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.5rem;"><i class="fa-solid fa-magnifying-glass"></i> FIND CUSTOMER</div>
                <div class="search-input" style="width: 100%; display: flex; position: relative;">
                    <i class="fa-solid fa-phone"></i>
                    <input type="text" id="balance-search-input" placeholder="Search by Contact Number..." autocomplete="off" oninput="window.showCustDropdown(this.value)" onkeydown="if(event.key === 'Enter') window.searchBalanceCustomer()">
                    <i class="fa-solid fa-caret-down pos-caret" style="padding: 0 1rem; color: #64748b; cursor: pointer; display: flex; align-items: center;" onclick="window.toggleCustDropdown()"></i>
                    <button onclick="window.searchBalanceCustomer()" style="background: #3b82f6; color: white; border: none; padding: 0 1.5rem; font-weight: 600; cursor: pointer; border-top-right-radius: 6px; border-bottom-right-radius: 6px; transition: background 0.2s; align-self: stretch;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">Search</button>
                    <div id="cust-search-results" class="search-dropdown" style="width: 100%;"></div>
                </div>
            </div>
            
            <div id="balance-details-container" style="display: none;">
                <div style="display: flex; gap: 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                    
                    <!-- Customer Profile Card -->
                    <div style="flex: 1; min-width: 350px; background: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); padding: 1.5rem; display: flex; flex-direction: column;">
                        <div style="font-weight: 800; color: #475569; margin-bottom: 1.2rem; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;"><i class="fa-solid fa-user-circle"></i> Customer Profile</div>
                        <table style="width: 100%; font-size: 0.9rem; color: #64748b; margin-bottom: auto; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 0.8rem 0;">Name</td><td style="text-align: right; font-weight: 800; color: #1e293b; padding: 0.8rem 0;" id="bal-cust-name">-</td></tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 0.8rem 0;">Mobile</td><td style="text-align: right; font-weight: 800; color: #1e293b; padding: 0.8rem 0;" id="bal-cust-mobile">-</td></tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 0.8rem 0;">NIC</td><td style="text-align: right; font-weight: 800; color: #1e293b; padding: 0.8rem 0;" id="bal-cust-nic">-</td></tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 0.8rem 0;">Registered</td><td style="text-align: right; font-weight: 800; color: #1e293b; padding: 0.8rem 0;" id="bal-cust-reg">-</td></tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 0.8rem 0;">Total Bill</td><td style="text-align: right; font-weight: 800; color: #1e293b; padding: 0.8rem 0;" id="bal-cust-bills">-</td></tr>
                        </table>
                        <button style="width: 100%; background: white; color: #ef4444; border: 1px solid #ef4444; padding: 0.75rem; border-radius: 6px; font-weight: 700; margin-top: 1.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;"><i class="fa-solid fa-print"></i> Print Due Statement</button>
                    </div>
                    
                    <!-- Current Balance Card -->
                    <div style="flex: 1; min-width: 350px; background: white; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); padding: 1.5rem; text-align: center; display: flex; flex-direction: column;">
                        <div style="font-size: 0.85rem; color: #64748b; font-weight: 700; margin-bottom: 0.5rem;">Current Balance</div>
                        <div id="bal-cust-amount" style="font-size: 3rem; font-weight: 800; color: #475569; margin-bottom: 0.2rem; line-height: 1;">0.00</div>
                        <div id="bal-cust-status" style="font-size: 0.85rem; color: #475569; font-weight: 700; margin-bottom: 1.5rem;">Settled</div>
                        
                        <div style="border-top: 1px dashed #e2e8f0; margin-bottom: 1.5rem;"></div>
                        
                        <div style="text-align: left; margin-bottom: 1rem;">
                            <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: block; margin-bottom: 0.5rem;">Payment Method</label>
                            <select style="width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; font-size: 0.9rem; color: #334155; background: white;">
                                <option>Cash Payment</option>
                            </select>
                        </div>
                        <div style="text-align: left; margin-bottom: 1.5rem;">
                            <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: block; margin-bottom: 0.5rem;">Amount</label>
                            <div style="display: flex; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
                                <span style="background: #f8fafc; padding: 0.75rem 1rem; color: #64748b; font-size: 0.9rem; font-weight: 600; border-right: 1px solid #cbd5e1;">Rs.</span>
                                <input type="number" id="bal-pay-amount" value="" placeholder="0.00" style="width: 100%; padding: 0.75rem; border: none; outline: none; text-align: right; font-weight: 700; font-size: 0.95rem; color: #0f172a;">
                            </div>
                        </div>
                        <button onclick="window.payCustomerBalance()" style="width: 100%; background: #22c55e; color: white; border: none; padding: 0.9rem; border-radius: 6px; font-weight: 800; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: auto;"><i class="fa-solid fa-circle-check"></i> PAY AMOUNT</button>
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
                    <div id="bal-cust-no-invoices" style="text-align: center; padding: 3rem 0; display: none;">
                        <div style="width: 50px; height: 50px; background: #22c55e; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.2rem; font-size: 1.5rem; box-shadow: 0 4px 6px rgba(34, 197, 94, 0.2);"><i class="fa-solid fa-check"></i></div>
                        <div style="color: #64748b; font-size: 1rem; font-weight: 600;">No outstanding invoices found. Good job!</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    openModal(html);
};

window.searchBalanceCustomer = () => {
    const input = document.getElementById('balance-search-input').value.trim();
    if (!input) {
        alert('Please enter a name or contact number to search.');
        return;
    }
    
    const db = JSON.parse(localStorage.getItem('pos_customers_db')) || {};
    // Find customer by phone or name
    let customer = null;
    let custPhone = null;
    for (const key in db) {
        if (db[key].phone === input || db[key].name === input) {
            customer = db[key];
            custPhone = key;
            break;
        }
    }
    
    if (customer) {
        document.getElementById('balance-details-container').style.display = 'block';
        document.getElementById('bal-cust-name').innerText = customer.name || 'Unknown';
        document.getElementById('bal-cust-mobile').innerText = customer.phone || '-';
        document.getElementById('bal-cust-nic').innerText = customer.nic || '-';
        document.getElementById('bal-cust-reg').innerText = customer.regDate || '-';
        
        // Calculate bills from sales db
        const salesData = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
        const custSales = salesData.filter(s => s.customerPhone === customer.phone || s.customer === customer.name);
        document.getElementById('bal-cust-bills').innerText = custSales.length;
        
        // Populate outstanding invoices
        const tbody = document.getElementById('bal-cust-invoices');
        tbody.innerHTML = '';
        let hasOutstanding = false;
        let calculatedDue = 0;
        
        custSales.forEach(s => {
            const total = parseFloat(s.total) || 0;
            const cash = parseFloat(s.cash) || 0;
            const card = parseFloat(s.card) || 0;
            const cheque = parseFloat(s.cheque) || 0;
            // Treat non-numeric "-" as 0 for older dirty data
            const paid = (isNaN(cash)?0:cash) + (isNaN(card)?0:card) + (isNaN(cheque)?0:cheque);
            
            calculatedDue += (total - paid);
            
            if (total > paid) {
                hasOutstanding = true;
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
        
        const amountEl = document.getElementById('bal-cust-amount');
        const statusEl = document.getElementById('bal-cust-status');
        
        // Also take into account manually entered balance (if calculatedDue is 0 but customer has some old balance)
        // Usually we want to trust the computed balance, but in case they manually paid we might just want to use calculatedDue if there's any discrepancy, or maybe the max. 
        // For now, let's just use calculatedDue directly to avoid "Settled 0.00" when there's obviously an outstanding invoice.
        const finalDue = calculatedDue;
        
        amountEl.innerText = Math.abs(finalDue).toFixed(2);
        
        if (finalDue > 0) {
            amountEl.style.color = '#ef4444';
            statusEl.style.color = '#ef4444';
            statusEl.innerText = 'To Pay / Due';
        } else if (finalDue < 0) {
            amountEl.style.color = '#22c55e';
            statusEl.style.color = '#22c55e';
            statusEl.innerText = 'Overpaid / Credit';
        } else {
            amountEl.style.color = '#475569';
            statusEl.style.color = '#475569';
            statusEl.innerText = 'Settled';
        }
        

        
        if (hasOutstanding) {
            document.getElementById('bal-cust-no-invoices').style.display = 'none';
        } else {
            document.getElementById('bal-cust-no-invoices').style.display = 'block';
        }
        
        
    } else {
        alert('Customer not found!');
        document.getElementById('balance-details-container').style.display = 'none';
    }
};

window.payCustomerBalance = () => {
    const allocInputs = document.querySelectorAll('.invoice-alloc-input');
    let manualTotal = 0;
    const manualAllocations = {};
    
    allocInputs.forEach(inp => {
        const val = parseFloat(inp.value) || 0;
        if (val > 0) {
            manualTotal += val;
            manualAllocations[inp.dataset.id] = val;
        }
    });

    const mainInput = document.getElementById('bal-pay-amount');
    let mainAmt = parseFloat(mainInput.value) || 0;
    
    if (manualTotal > 0) {
        mainAmt = manualTotal; 
    }
    
    if (mainAmt <= 0) {
        alert("Please enter a valid amount to pay.");
        return;
    }
    
    const nameEl = document.getElementById('bal-cust-name').innerText;
    const phoneEl = document.getElementById('bal-cust-mobile').innerText;
    if (!nameEl || nameEl === '-') return;
    
    let salesData = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
    
    if (manualTotal > 0) {
        salesData.forEach(s => {
            if (manualAllocations[s.id]) {
                const cash = parseFloat(s.cash) || 0;
                s.cash = (cash + manualAllocations[s.id]).toFixed(2);
            }
        });
    } else {
        let remainingToPay = mainAmt;
        let custSales = salesData.filter(s => s.customerPhone === phoneEl || s.customer === nameEl);
        custSales.sort((a,b) => a.id.localeCompare(b.id));
        
        custSales.forEach(s => {
            if (remainingToPay <= 0) return;
            const total = parseFloat(s.total) || 0;
            const cash = parseFloat(s.cash) || 0;
            const card = parseFloat(s.card) || 0;
            const cheque = parseFloat(s.cheque) || 0;
            const paid = (isNaN(cash)?0:cash) + (isNaN(card)?0:card) + (isNaN(cheque)?0:cheque);
            const balance = total - paid;
            
            if (balance > 0) {
                const payThisInvoice = Math.min(balance, remainingToPay);
                // Update the original object reference in salesData
                s.cash = (cash + payThisInvoice).toFixed(2);
                remainingToPay -= payThisInvoice;
            }
        });
    }
    
    localStorage.setItem('pos_sales_data', JSON.stringify(salesData));
    
    let custDb = JSON.parse(localStorage.getItem('pos_customers_db')) || {};
    let custKey = Object.keys(custDb).find(k => custDb[k].phone === phoneEl || k === phoneEl);
    if (custKey) {
        let currentDue = custDb[custKey].dueAmount || 0;
        custDb[custKey].dueAmount = currentDue - mainAmt;
        localStorage.setItem('pos_customers_db', JSON.stringify(custDb));
    }
    
    alert("Payment of Rs. " + mainAmt.toFixed(2) + " applied successfully!");
    if (mainInput) mainInput.value = "";
    
    // Refresh to show updated balances
    window.searchBalanceCustomer();
};

window.openTodaySaleModal = () => {
    const today = new Date().toISOString().slice(0, 10);
    const html = `
        <div class="modal-content" style="max-width: 1100px; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid #f3f4f6; padding-bottom: 1rem;">
                <div style="font-size: 1rem; font-weight: 800; color: #4b5563; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-solid fa-filter" style="color: #3b82f6;"></i> DATE FILTER
                </div>
                <button onclick="window.closeModal()" style="background: #f3f4f6; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: #4b5563; display: flex; align-items: center; justify-content: center; transition: background 0.2s;"><i class="fa-solid fa-xmark"></i></button>
            </div>
            
            <div style="display: flex; gap: 1.5rem; margin-bottom: 2.5rem; background: #f8fafc; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="flex: 1;">
                    <label style="font-size: 0.8rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; display: block;">From Date</label>
                    <div style="display: flex; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: white;">
                        <input type="date" id="ts-from-date" value="${today}" style="width: 100%; padding: 0.75rem; border: none; outline: none; font-size: 0.95rem; color: #334155;">
                    </div>
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 0.8rem; font-weight: 700; color: #64748b; margin-bottom: 0.5rem; display: block;">To Date</label>
                    <div style="display: flex; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: white;">
                        <input type="date" id="ts-to-date" value="${today}" style="width: 100%; padding: 0.75rem; border: none; outline: none; font-size: 0.95rem; color: #334155;">
                    </div>
                </div>
                <div style="flex: 1; display: flex; align-items: flex-end;">
                    <button onclick="window.filterTodaySales()" style="width: 100%; background: #3b82f6; color: white; border: none; padding: 0.75rem; border-radius: 6px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: background 0.2s; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);"><i class="fa-solid fa-magnifying-glass" style="margin-right: 0.5rem;"></i> Search</button>
                </div>
            </div>
            
            <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; text-align: left;">
                    <thead style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                        <tr style="color: #64748b; font-weight: 700; font-size: 0.8rem; letter-spacing: 0.05em; text-transform: uppercase;">
                            <th style="padding: 1.2rem 1rem;">#</th>
                            <th style="padding: 1.2rem 1rem;">BILL ID</th>
                            <th style="padding: 1.2rem 1rem; text-align: right;">TOTAL AMOUNT</th>
                            <th style="padding: 1.2rem 1rem;">PAYMENT BREAKDOWN</th>
                            <th style="padding: 1.2rem 1rem; text-align: right;">CUSTOMER PAYMENT</th>
                            <th style="padding: 1.2rem 1rem; text-align: right;">DISCOUNT</th>
                            <th style="padding: 1.2rem 1rem;">CUSTOMER</th>
                            <th style="padding: 1.2rem 1rem;">TIME</th>
                            <th style="padding: 1.2rem 1rem; text-align: center;">ACTION</th>
                        </tr>
                    </thead>
                    <tbody id="ts-tbody">
                        <!-- Rendered by JS -->
                    </tbody>
                    <tfoot style="background: #f8fafc; border-top: 2px solid #e2e8f0;">
                        <tr>
                            <td colspan="2" style="padding: 1.5rem 1rem; text-align: right; font-weight: 800; color: #475569; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.05em;">TOTAL:</td>
                            <td id="ts-total-amount" style="padding: 1.5rem 1rem; text-align: right; font-weight: 800; color: #3b82f6; font-size: 1.1rem;">0.00</td>
                            <td id="ts-total-breakdown" style="padding: 1.5rem 1rem; font-weight: 800; color: #1e293b; font-size: 1.1rem;">0.00</td>
                            <td id="ts-total-payment" style="padding: 1.5rem 1rem; text-align: right; font-weight: 800; color: #10b981; font-size: 1.1rem;">0.00</td>
                            <td id="ts-total-discount" style="padding: 1.5rem 1rem; text-align: right; font-weight: 800; color: #ef4444; font-size: 1.1rem;">0.00</td>
                            <td colspan="3"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;
    document.getElementById('modals-container').innerHTML = `<div class="modal-backdrop open" id="general-modal">${html}</div>`;
    
    // Auto-run filter on open
    setTimeout(() => { window.filterTodaySales(); }, 100);
};

window.filterTodaySales = () => {
    const fromDate = document.getElementById('ts-from-date').value;
    const toDate = document.getElementById('ts-to-date').value;
    if (!fromDate || !toDate) return;
    
    let sales = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
    
    // Filter by Date range
    const filtered = sales.filter(bill => {
        if (!bill.datetime) return false;
        const billDate = bill.datetime.split(' ')[0]; // e.g. "2026-10-04"
        return billDate >= fromDate && billDate <= toDate;
    });
    
    const tbody = document.getElementById('ts-tbody');
    tbody.innerHTML = '';
    
    let sumTotal = 0;
    let sumCash = 0;
    let sumDiscount = 0;
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 2rem; color: #64748b;">No sales found for this date range.</td></tr>`;
    } else {
        filtered.forEach((bill, idx) => {
            const total = parseFloat(bill.total) || 0;
            const cash = parseFloat(bill.cash) || 0;
            const discount = parseFloat(bill.discount) || 0;
            const datetime = bill.datetime ? bill.datetime.substring(11, 16) : '-'; // just time HH:mm
            const billDate = bill.datetime ? bill.datetime.substring(0, 10) : '-';
            
            sumTotal += total;
            sumCash += cash;
            sumDiscount += discount;
            
            let payStr = `Cash Payment: <span style="font-weight: 700; color: #1e293b; float: right;">${cash.toFixed(2)}</span>`;
            if (bill.paymentMethod !== 'Cash') {
                payStr = `${bill.paymentMethod || 'Other'}: <span style="font-weight: 700; color: #1e293b; float: right;">${total.toFixed(2)}</span>`;
            }

            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s; background: white;" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='white'">
                    <td style="padding: 1.2rem 1rem; color: #64748b; font-weight: 600;">${idx + 1}</td>
                    <td style="padding: 1.2rem 1rem; font-weight: 700; color: #3b82f6;">${bill.id}</td>
                    <td style="padding: 1.2rem 1rem; text-align: right; font-weight: 800; color: #1e293b;">${total.toFixed(2)}</td>
                    <td style="padding: 1.2rem 1rem; color: #64748b;">${payStr}</td>
                    <td style="padding: 1.2rem 1rem; text-align: right; font-weight: 800; color: #10b981;">${cash.toFixed(2)}</td>
                    <td style="padding: 1.2rem 1rem; text-align: right; font-weight: 800; color: #ef4444;">${discount.toFixed(2)}</td>
                    <td style="padding: 1.2rem 1rem; font-style: italic; color: #64748b;">${bill.customer || 'Walk-in'}</td>
                    <td style="padding: 1.2rem 1rem; color: #64748b; font-size: 0.8rem;">${datetime}<br><small>${billDate}</small></td>
                    <td style="padding: 1.2rem 1rem; text-align: center;">
                        <button onclick="alert('View receipt feature coming soon!')" style="background: transparent; border: 1px solid #cbd5e1; border-radius: 6px; width: 28px; height: 28px; cursor: pointer; color: #3b82f6;"><i class="fa-solid fa-eye"></i></button>
                    </td>
                </tr>
            `;
        });
    }
    
    // Update footer totals
    document.getElementById('ts-total-amount').innerText = sumTotal.toFixed(2);
    document.getElementById('ts-total-breakdown').innerText = sumCash.toFixed(2);
    document.getElementById('ts-total-payment').innerText = sumCash.toFixed(2);
    document.getElementById('ts-total-discount').innerText = sumDiscount.toFixed(2);
};

window.openCashInOutModal = () => {
    const html = `
        <div class="modal-content" style="max-width: 900px; padding: 1.5rem; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
                <div style="font-size: 0.8rem; font-weight: 700; color: #6b7280;"><i class="fa-solid fa-filter"></i> FILTER TRANSACTIONS</div>
                <button onclick="window.closeModal()" style="background: #e5e7eb; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; color: #4b5563;"><i class="fa-solid fa-xmark"></i></button>
            </div>
            
            <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                <div style="flex: 1;">
                    <label style="font-size: 0.75rem; color: #6b7280;">From</label>
                    <input type="date" value="2026-10-02" style="width: 100%; padding: 0.6rem; border: 1px solid #e5e7eb; border-radius: 4px; outline: none; margin-top: 0.3rem;">
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 0.75rem; color: #6b7280;">To</label>
                    <input type="date" value="2026-10-02" style="width: 100%; padding: 0.6rem; border: 1px solid #e5e7eb; border-radius: 4px; outline: none; margin-top: 0.3rem;">
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 0.75rem; color: #6b7280;">User</label>
                    <select style="width: 100%; padding: 0.6rem; border: 1px solid #e5e7eb; border-radius: 4px; outline: none; margin-top: 0.3rem;">
                        <option>All Users</option>
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 0.75rem; color: #6b7280;">Location</label>
                    <select style="width: 100%; padding: 0.6rem; border: 1px solid #e5e7eb; border-radius: 4px; outline: none; margin-top: 0.3rem;">
                        <option>All Locations</option>
                    </select>
                </div>
                <div style="display: flex; align-items: flex-end;">
                    <button style="background: #3b82f6; color: white; border: none; padding: 0.6rem 2rem; border-radius: 4px; font-weight: 600; cursor: pointer;"><i class="fa-solid fa-magnifying-glass"></i> Filter</button>
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
                <div style="flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div>
                        <div style="font-size: 0.75rem; font-weight: 700; color: #10b981;">TOTAL CASH IN</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: #111827;">10,000.00</div>
                    </div>
                    <div style="background: #10b981; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;"><i class="fa-solid fa-arrow-down"></i></div>
                </div>
                <div style="flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div>
                        <div style="font-size: 0.75rem; font-weight: 700; color: #ef4444;">TOTAL CASH OUT</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: #111827;">0.00</div>
                    </div>
                    <div style="background: #ef4444; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;"><i class="fa-solid fa-arrow-up"></i></div>
                </div>
                <div style="flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div>
                        <div style="font-size: 0.75rem; font-weight: 700; color: #6b7280;">NET BALANCE</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: #111827;">10,000.00</div>
                    </div>
                    <div style="background: #6366f1; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;"><i class="fa-solid fa-scale-balanced"></i></div>
                </div>
            </div>
            
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <div style="padding: 1rem; border-bottom: 1px solid #e5e7eb;">
                    <div style="font-size: 0.9rem; font-weight: 700; color: #10b981;"><i class="fa-solid fa-circle-plus"></i> New Entry</div>
                </div>
                <div style="padding: 1rem; display: flex; gap: 1rem; align-items: flex-end;">
                    <div style="flex: 1;">
                        <label style="font-size: 0.75rem; color: #374151; font-weight: 600;">Transaction Type</label>
                        <select style="width: 100%; padding: 0.6rem; border: 1px solid #d1d5db; border-radius: 4px; outline: none; margin-top: 0.3rem;">
                            <option>- Select Type -</option>
                            <option>Cash In</option>
                            <option>Cash Out</option>
                        </select>
                    </div>
                    <div style="flex: 2;">
                        <label style="font-size: 0.75rem; color: #374151; font-weight: 600;">Description / Remark</label>
                        <input type="text" placeholder="Enter details here..." style="width: 100%; padding: 0.6rem; border: 1px solid #d1d5db; border-radius: 4px; outline: none; margin-top: 0.3rem;">
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 0.75rem; color: #374151; font-weight: 600;">Amount</label>
                        <input type="number" value="0.00" style="width: 100%; padding: 0.6rem; border: 1px solid #d1d5db; border-radius: 4px; outline: none; margin-top: 0.3rem;">
                    </div>
                    <button style="background: #22c55e; color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 4px; font-weight: 600; cursor: pointer;"><i class="fa-solid fa-plus"></i> Add</button>
                </div>
                
                <table style="width: 100%; font-size: 0.85rem; border-collapse: collapse;">
                    <thead style="background: #374151; color: white;">
                        <tr>
                            <th style="text-align: left; padding: 0.8rem 1rem;">Type</th>
                            <th style="text-align: left; padding: 0.8rem 1rem;">Details</th>
                            <th style="text-align: right; padding: 0.8rem 1rem;">Amount (Rs.)</th>
                            <th style="text-align: center; padding: 0.8rem 1rem;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 0.8rem 1rem;"><span style="background: #10b981; color: white; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;"><i class="fa-solid fa-arrow-down"></i> Cash In</span></td>
                            <td style="padding: 0.8rem 1rem;">
                                <div style="font-weight: 600; color: #111827;">Today Opening Amount</div>
                                <div style="font-size: 0.7rem; color: #6b7280; margin-top: 0.2rem;"><i class="fa-solid fa-clock"></i> 2026-Oct-02 06:18 AM Ã¢â‚¬Â¢ <i class="fa-solid fa-user"></i> Admin User Ã¢â‚¬Â¢ <i class="fa-solid fa-location-dot"></i> Main Store</div>
                            </td>
                            <td style="text-align: right; padding: 0.8rem 1rem; font-weight: 700; color: #111827;">10,000.00</td>
                            <td style="text-align: center; padding: 0.8rem 1rem;">
                                <button style="background: white; border: 1px solid #ef4444; color: #ef4444; width: 26px; height: 26px; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-trash-can"></i></button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    openModal(html);
};

// Hide Loading Overlay
window.addEventListener('load', () => {
    setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        if(overlay) overlay.classList.add('hidden');
    }, 800);
});

// Dropdown Handlers
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-input') && !e.target.closest('.stock-search-box')) {
        document.querySelectorAll('.search-dropdown').forEach(dd => dd.classList.remove('active'));
    }
});

// --- Return Modal ---
window.showRetDropdown = (query = '') => {
    query = query.toLowerCase().trim();
    const db = JSON.parse(localStorage.getItem('pos_products_db')) || {};
    const allProducts = Object.values(db);
    const matches = query ? allProducts.filter(p => p.barcode.toLowerCase().includes(query) || p.name.toLowerCase().includes(query)) : allProducts;
    
    const container = document.getElementById('ret-search-results');
    if (!container) return;
    container.innerHTML = '';
    
    if (matches.length > 0) {
        matches.forEach(p => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerHTML = '<div class="search-item-barcode">' + p.barcode + '</div><div class="search-item-name">' + p.name + ' &bull; ' + (parseFloat(p.price)||0).toFixed(2) + '</div>';
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                document.getElementById('ret-barcode').value = p.barcode;
                container.classList.remove('active');
            });
            container.appendChild(div);
        });
        container.classList.add('active');
    } else {
        container.innerHTML = '<div class="search-item" style="color: #ef4444;">No products found</div>';
        container.classList.add('active');
    }
};
window.toggleRetDropdown = () => {
    const container = document.getElementById('ret-search-results');
    if (!container) return;
    if (container.classList.contains('active')) container.classList.remove('active');
    else {
        window.showRetDropdown(document.getElementById('ret-barcode').value);
        document.getElementById('ret-barcode').focus();
    }
};

// --- Products Modal ---
window.showProdModalDropdown = (query = '') => {
    query = query.toLowerCase().trim();
    const db = JSON.parse(localStorage.getItem('pos_products_db')) || {};
    const allProducts = Object.values(db);
    const matches = query ? allProducts.filter(p => p.barcode.toLowerCase().includes(query) || p.name.toLowerCase().includes(query)) : allProducts;
    
    const container = document.getElementById('prod-search-results');
    if (!container) return;
    container.innerHTML = '';
    
    if (matches.length > 0) {
        matches.forEach(p => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerHTML = '<div class="search-item-barcode">' + p.barcode + '</div><div class="search-item-name">' + p.name + ' &bull; ' + (parseFloat(p.price)||0).toFixed(2) + '</div>';
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                document.getElementById('prod-modal-search').value = p.barcode;
                container.classList.remove('active');
            });
            container.appendChild(div);
        });
        container.classList.add('active');
    } else {
        container.innerHTML = '<div class="search-item" style="color: #ef4444;">No products found</div>';
        container.classList.add('active');
    }
};
window.toggleProdModalDropdown = () => {
    const container = document.getElementById('prod-search-results');
    if (!container) return;
    if (container.classList.contains('active')) container.classList.remove('active');
    else {
        window.showProdModalDropdown(document.getElementById('prod-modal-search').value);
        document.getElementById('prod-modal-search').focus();
    }
};

// --- Customer Balance / Find Customer Modal ---
window.showCustDropdown = (query = '') => {
    query = query.toLowerCase().trim();
    const db = JSON.parse(localStorage.getItem('pos_customers_db')) || {};
    const allCustomers = Object.values(db);
    const matches = query ? allCustomers.filter(c => (c.phone || '').includes(query) || (c.name && c.name.toLowerCase().includes(query))) : allCustomers;
    
    const container = document.getElementById('cust-search-results');
    if (!container) return;
    container.innerHTML = '';
    
    if (matches.length > 0) {
        matches.forEach(c => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerHTML = '<div class="search-item-barcode">' + (c.name || 'Unknown') + '</div><div class="search-item-name">' + (c.phone || '') + '</div>';
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                document.getElementById('balance-search-input').value = c.phone || '';
                container.classList.remove('active');
                if (window.searchBalanceCustomer) window.searchBalanceCustomer();
            });
            container.appendChild(div);
        });
        container.classList.add('active');
    } else {
        container.innerHTML = '<div class="search-item" style="color: #ef4444;">No customers found</div>';
        container.classList.add('active');
    }
};
window.toggleCustDropdown = () => {
    const container = document.getElementById('cust-search-results');
    if (!container) return;
    if (container.classList.contains('active')) container.classList.remove('active');
    else {
        window.showCustDropdown(document.getElementById('balance-search-input').value);
        document.getElementById('balance-search-input').focus();
    }
};
// ==========================================
// Day Start / Day End Logic
// ==========================================
const todayDateStr = new Date().toISOString().slice(0, 10);
const startCashKey = 'pos_day_start_' + todayDateStr;

window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem(startCashKey) === null) {
        document.getElementById('day-start-modal').classList.add('open');
    }
    
    const actualCashInput = document.getElementById('actual-cash-input');
    if(actualCashInput) {
        actualCashInput.addEventListener('input', window.calculateDifference);
    }
});

window.calculateDifference = () => {
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
};

window.submitDayStart = () => {
    const startCash = document.getElementById('start-cash-input').value;
    if (startCash === '' || parseFloat(startCash) < 0) {
        alert('Please enter a valid start cash amount.');
        return;
    }
    localStorage.setItem(startCashKey, startCash);
    
    // Log Day Start Cash to Cash Ledger
    const expensesData = JSON.parse(localStorage.getItem('pos_expenses_data')) || [];
    // Only log if we haven't logged today's start cash yet
    const alreadyLogged = expensesData.find(e => e.date === todayDateStr && e.category === 'Day Start Cash');
    if (!alreadyLogged) {
        expensesData.push({
            date: todayDateStr,
            type: 'in',
            category: 'Day Start Cash',
            desc: 'Initial cash added at register open',
            amount: parseFloat(startCash)
        });
        localStorage.setItem('pos_expenses_data', JSON.stringify(expensesData));
    }

    document.getElementById('day-start-modal').classList.remove('open');
};

window.openDayEndModal = () => {
    const startCash = parseFloat(localStorage.getItem(startCashKey)) || 0;
    
    const allSales = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
    const todaySales = allSales.filter(s => s.datetime && s.datetime.startsWith(todayDateStr));
    const cashSales = todaySales.reduce((sum, sale) => sum + (parseFloat(sale.cash) || 0), 0);
    
    const totalDiscount = todaySales.reduce((sum, sale) => sum + (parseFloat(sale.total_discount) || 0), 0);
    
    const allExpenses = JSON.parse(localStorage.getItem('pos_expenses_data')) || [];
    const todayExpenses = allExpenses.filter(e => e.date === todayDateStr && e.type !== 'in');
    const cashExpenses = todayExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    
    // Profit Calculation exactly as in dashboard
    const todayProfit = todaySales.reduce((s, b) => {
        const itemProfit = (b.items || []).reduce((ip, it) => {
            const sale = (it.sale !== undefined ? parseFloat(it.sale) : parseFloat(it.price)) || 0;
            const cost = (it.cost !== undefined ? parseFloat(it.cost) : parseFloat(it.buyPrice)) || 0;
            const qty = parseFloat(it.qty) || 0;
            return ip + ((sale - cost) * qty);
        }, 0);
        return s + itemProfit;
    }, 0) - cashExpenses;

    const expectedDrawer = startCash + cashSales - cashExpenses;

    const settings = JSON.parse(localStorage.getItem('pos_settings')) || { name: 'THE LABEL' };
    const storeNameEl = document.getElementById('de-store-name');
    if (storeNameEl) storeNameEl.innerText = settings.name || 'THE LABEL';

    document.getElementById('de-start').innerText = startCash.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('de-discount').innerText = totalDiscount.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('de-expenses').innerText = cashExpenses.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('de-total-cash').innerText = cashSales.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('de-profit').innerText = todayProfit.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('de-expected').innerText = expectedDrawer.toLocaleString('en-US', {minimumFractionDigits: 2});
    
    document.getElementById('actual-cash-input').value = '0.00';
    window.calculateDifference();
    
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
    const totalCash = parseFloat(document.getElementById('de-total-cash').innerText.replace(/,/g, ''));
    const profit = parseFloat(document.getElementById('de-profit').innerText.replace(/,/g, ''));
    const diff = actualCash - expectedCash;
    
    const report = {
        date: todayDateStr,
        timestamp: new Date().toISOString(),
        startCash: startCash,
        discount: discountAmount,
        expenses: expensesAmount,
        totalCash: totalCash,
        profit: profit,
        expectedCash: expectedCash,
        actualCash: actualCash,
        difference: diff
    };
    
    const reports = JSON.parse(localStorage.getItem('pos_day_reports')) || [];
    reports.push(report);
    localStorage.setItem('pos_day_reports', JSON.stringify(reports));
    
    const settings = JSON.parse(localStorage.getItem('pos_settings')) || { name: 'THE LABEL' };
    const printStoreNameEl = document.getElementById('print-store-name');
    const printLogoContainer = document.getElementById('print-logo-container');
    if (printLogoContainer) {
        printLogoContainer.innerHTML = settings.logo ? `<img src="${settings.logo}" style="max-height:60px; max-width:150px; margin-bottom:10px;">` : '';
    }
    if (printStoreNameEl) printStoreNameEl.innerText = settings.name || 'THE LABEL';

    document.getElementById('print-date').innerText = todayDateStr;
    document.getElementById('print-start').innerText = startCash.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('print-discount').innerText = discountAmount.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('print-expenses').innerText = expensesAmount.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('print-total-cash').innerText = totalCash.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('print-profit').innerText = profit.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('print-expected').innerText = expectedCash.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('print-actual').innerText = actualCash.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('print-diff').innerText = diff.toLocaleString('en-US', {minimumFractionDigits: 2});
    
    document.getElementById('day-end-modal').classList.remove('open');
    
    window.print();
    
    setTimeout(() => {
        alert('Register Closed Successfully!');
        window.location.href = '/dashboard.html';
    }, 1000);
};


