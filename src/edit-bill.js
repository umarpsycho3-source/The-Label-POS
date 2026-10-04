import './sync.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Setup dynamic customers from DB
    const dbData = JSON.parse(localStorage.getItem('pos_customers_db')) || {};
    const customers = ["No Customer"]; // Default option
    
    // Extract names from DB
    for (const key in dbData) {
        if (dbData[key] && dbData[key].name) {
            customers.push(dbData[key].name);
        }
    }
    
    const customerSelect = document.getElementById('customer-select');
    if (customerSelect) {
        let options = '';
        customers.forEach(c => {
            options += `<option value="${c}">${c}</option>`;
        });
        customerSelect.innerHTML = options;
    }
    // 2. Load from localStorage
    const params = new URLSearchParams(window.location.search);
    const billId = params.get('id');
    
    let salesData = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
    let currentBillIndex = salesData.findIndex(b => b.id === billId);
    let currentBill = currentBillIndex !== -1 ? salesData[currentBillIndex] : null;
    
    let billItems = [];
    if (currentBill && currentBill.items) {
        billItems = [...currentBill.items];
    } else if (currentBill) {
        // Fallback for bills that didn't have items defined
        billItems = [
            { id: 1, name: "B5 120 PG SQU", barcode: "4792210133420", cost: 150.00, original: 200.00, sale: 200.00, qty: 1.000 }
        ];
    }

    if (currentBill && currentBill.customer && customerSelect) {
        customerSelect.value = currentBill.customer;
    }

    // Load phone number
    const editPhone = document.getElementById('edit-customer-phone');
    const phoneSaveHint = document.getElementById('phone-save-hint');
    if (currentBill && editPhone) {
        editPhone.value = currentBill.customerPhone || '';
        if (currentBill.customerPhone) {
            if (phoneSaveHint) phoneSaveHint.style.display = 'block';
        }
    }
    if (editPhone) {
        editPhone.addEventListener('input', () => {
            if (phoneSaveHint) phoneSaveHint.style.display = editPhone.value ? 'block' : 'none';
        });
    }
    
    // Load payment details
    const editCash = document.getElementById('edit-cash');
    const editCard = document.getElementById('edit-card');
    const editCheque = document.getElementById('edit-cheque');
    const editBalanceDue = document.getElementById('edit-balance-due');
    const editDueDate = document.getElementById('edit-due-date');
    const dueDateGroup = document.getElementById('due-date-group');
    
    if (currentBill) {
        if (editCash) editCash.value = parseFloat(currentBill.cash) || 0;
        if (editCard) editCard.value = parseFloat(currentBill.card) || 0;
        if (editCheque) editCheque.value = parseFloat(currentBill.cheque) || 0;
        if (editDueDate && currentBill.dueDate) editDueDate.value = currentBill.dueDate;
    }

    const tbody = document.getElementById('edit-bill-tbody');
    const netTotalEl = document.getElementById('net-total-amount');

    const calculateDue = (netTotal) => {
        const cashVal = parseFloat(editCash?.value) || 0;
        const cardVal = parseFloat(editCard?.value) || 0;
        const chequeVal = parseFloat(editCheque?.value) || 0;
        const totalPaid = cashVal + cardVal + chequeVal;
        
        const due = netTotal - totalPaid;
        
        if (editBalanceDue) {
            editBalanceDue.value = due > 0 ? due.toFixed(2) : '0.00';
        }
        
        if (dueDateGroup) {
            if (due > 0.01) {
                dueDateGroup.style.display = 'block';
            } else {
                dueDateGroup.style.display = 'none';
            }
        }
    };
    
    [editCash, editCard, editCheque].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                let currentNetTotal = 0;
                billItems.forEach(item => { currentNetTotal += item.sale * item.qty; });
                calculateDue(currentNetTotal);
            });
        }
    });

    // 3. Render items
    const renderItems = () => {
        let html = '';
        let netTotal = 0;

        billItems.forEach((item, index) => {
            const rowTotal = item.sale * item.qty;
            netTotal += rowTotal;

            html += `
            <tr>
              <td>
                <div style="font-weight: 700; color: #1e293b;">${item.name}</div>
                <div style="font-size: 0.75rem; color: #94a3b8;">${item.barcode}</div>
              </td>
              <td align="right"><input type="text" value="${item.cost.toFixed(2)}" disabled></td>
              <td align="right"><input type="text" value="${item.original.toFixed(2)}" disabled></td>
              <td align="right"><input type="number" class="update-sale-input" data-index="${index}" value="${item.sale.toFixed(2)}" style="color: #3b82f6; font-weight: 700;"></td>
              <td align="right"><input type="number" class="update-qty-input" data-index="${index}" value="${item.qty.toFixed(3)}" step="0.1"></td>
              <td align="right" style="font-weight: 800; color: #1e293b;">${rowTotal.toFixed(2)}</td>
              <td align="center"><button class="delete-btn" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button></td>
            </tr>
            `;
        });

        if (tbody) tbody.innerHTML = html;
        if (netTotalEl) netTotalEl.innerText = netTotal.toFixed(2);
        calculateDue(netTotal);

        // Attach listeners to dynamically created inputs and buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                billItems.splice(idx, 1);
                renderItems();
            });
        });

        document.querySelectorAll('.update-qty-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                const newQty = parseFloat(e.currentTarget.value) || 0;
                billItems[idx].qty = newQty;
                renderItems();
            });
        });

        document.querySelectorAll('.update-sale-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                const newSale = parseFloat(e.currentTarget.value) || 0;
                billItems[idx].sale = newSale;
                renderItems();
            });
        });
    };

    // Initial render
    renderItems();

    // 4. Add item functionality
    const btnAdd = document.getElementById('btn-add-item');
    const inputName = document.getElementById('add-product-name');
    const inputCost = document.getElementById('add-product-cost');
    const inputOriginal = document.getElementById('add-product-original');
    const inputSale = document.getElementById('add-product-sale');
    const inputQty = document.getElementById('add-product-qty');

    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            const name = inputName.value.trim() || 'Custom Item';
            const cost = parseFloat(inputCost.value) || 0;
            const original = parseFloat(inputOriginal.value) || 0;
            const sale = parseFloat(inputSale.value) || 0;
            const qty = parseFloat(inputQty.value) || 1;

            billItems.push({
                id: Date.now(),
                name: name,
                barcode: "0000000000000",
                cost: cost,
                original: original,
                sale: sale,
                qty: qty
            });

            // Reset inputs
            inputName.value = '';
            inputCost.value = '0.00';
            inputOriginal.value = '0.00';
            inputSale.value = '0.00';
            inputQty.value = '1';

            renderItems();
        });
    }

    // 5. Update Bill Button
    const btnUpdate = document.getElementById('btn-update-bill');
    if (btnUpdate) {
        btnUpdate.addEventListener('click', () => {
            if (currentBillIndex !== -1) {
                // Calculate new total
                let newTotal = 0;
                billItems.forEach(item => {
                    newTotal += item.sale * item.qty;
                });
                
                // Update bill object
                salesData[currentBillIndex].items = billItems;
                salesData[currentBillIndex].total = newTotal.toFixed(2);
                
                // Read payment inputs
                const cashVal = editCash ? parseFloat(editCash.value) || 0 : newTotal;
                const cardVal = editCard ? parseFloat(editCard.value) || 0 : 0;
                const chequeVal = editCheque ? parseFloat(editCheque.value) || 0 : 0;
                
                salesData[currentBillIndex].cash = cashVal.toFixed(2);
                salesData[currentBillIndex].card = cardVal > 0 ? cardVal.toFixed(2) : '-';
                salesData[currentBillIndex].cheque = chequeVal > 0 ? chequeVal.toFixed(2) : '-';
                
                const dueVal = newTotal - (cashVal + cardVal + chequeVal);
                if (dueVal > 0.01 && editDueDate && editDueDate.value) {
                    salesData[currentBillIndex].dueDate = editDueDate.value;
                } else {
                    delete salesData[currentBillIndex].dueDate;
                }
                
                if (customerSelect) {
                    salesData[currentBillIndex].customer = customerSelect.value;
                }

                if (editPhone) {
                    salesData[currentBillIndex].customerPhone = editPhone.value;
                    // Also update the customers DB if phone provided
                    if (editPhone.value && customerSelect && customerSelect.value !== 'No Customer') {
                        const custDb = JSON.parse(localStorage.getItem('pos_customers_db')) || {};
                        const custName = customerSelect.value;
                        const existingKey = Object.keys(custDb).find(k => custDb[k].name === custName);
                        if (!existingKey && editPhone.value) {
                            custDb[editPhone.value] = { name: custName, creditLimit: 0, dueAmount: 0, phone: editPhone.value };
                            localStorage.setItem('pos_customers_db', JSON.stringify(custDb));
                        }
                    }
                }
                
                // Save back to localStorage
                localStorage.setItem('pos_sales_data', JSON.stringify(salesData));
            }
            
            alert("Bill updated successfully!");
            window.location.href = '/sales.html';
        });
    }

});
