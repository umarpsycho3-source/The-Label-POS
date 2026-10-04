import './sync.js';

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const billId = params.get('id');

    const type = params.get('type') || params.get('format');
    if (type === 'thermal' || type === 'receipt') {
        document.body.classList.add('thermal-mode');
        const btn = document.getElementById('btn-toggle-format');
        if (btn) btn.innerHTML = `<i class="fa-solid fa-file-invoice"></i> Switch to A4 Invoice`;
    }

    window.toggleFormat = function() {
        document.body.classList.toggle('thermal-mode');
        const isThermal = document.body.classList.contains('thermal-mode');
        const btn = document.getElementById('btn-toggle-format');
        if (btn) {
            btn.innerHTML = isThermal 
                ? `<i class="fa-solid fa-file-invoice"></i> Switch to A4 Invoice` 
                : `<i class="fa-solid fa-receipt"></i> Switch to Thermal 80mm`;
        }
    };

    if (!billId) return;

    // Set the ID in the header
    document.getElementById('invoice-id').innerText = '#' + billId;

    // Load data from localStorage
    let salesData = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
    let currentBill = salesData.find(b => b.id === billId);

    if (currentBill) {
        // Update Date and Time
        if (currentBill.datetime) {
            const parts = currentBill.datetime.split(' ');
            if (parts.length >= 2) {
                document.getElementById('invoice-date').innerText = parts[0];
                document.getElementById('invoice-time').innerText = parts.slice(1).join(' ');
            }
        }

        // Render Items
        const tbody = document.getElementById('invoice-tbody');
        let html = '';
        let totalItems = 0;
        let calcTotal = 0;

        if (currentBill.items && currentBill.items.length > 0) {
            currentBill.items.forEach(item => {
                totalItems += 1;
                const rowAmount = item.sale * item.qty;
                calcTotal += rowAmount;
                html += `
                <tr>
                  <td>${item.name}</td>
                  <td class="right">${item.qty}</td>
                  <td class="right">${item.sale.toFixed(2)}</td>
                  <td class="right">${rowAmount.toFixed(2)}</td>
                </tr>
                `;
            });
        } else {
            // Fallback for bills without specific items
            totalItems = 1;
            calcTotal = parseFloat(currentBill.total) || 0;
            html += `
            <tr>
              <td>Custom Items</td>
              <td class="right">1</td>
              <td class="right">${calcTotal.toFixed(2)}</td>
              <td class="right">${calcTotal.toFixed(2)}</td>
            </tr>
            `;
        }

        if (tbody) tbody.innerHTML = html;

        // Update Summaries
        document.getElementById('invoice-total-items').innerText = totalItems;
        document.getElementById('invoice-subtotal').innerText = calcTotal.toFixed(2);
        document.getElementById('invoice-total').innerText = calcTotal.toFixed(2);
        
        const cashVal = parseFloat(currentBill.cash) || 0;
        const cardVal = parseFloat(currentBill.card) || 0;
        const chequeVal = parseFloat(currentBill.cheque) || 0;
        const totalPaid = cashVal + cardVal + chequeVal;
        
        document.getElementById('invoice-cash').innerText = cashVal.toFixed(2);
        
        if (cardVal > 0) {
            document.getElementById('invoice-card-row').style.display = 'table-row';
            document.getElementById('invoice-card').innerText = cardVal.toFixed(2);
        }
        
        if (chequeVal > 0) {
            document.getElementById('invoice-cheque-row').style.display = 'table-row';
            document.getElementById('invoice-cheque').innerText = chequeVal.toFixed(2);
        }
        
        // Update Customer & Cashier Info
        const custEl = document.getElementById('invoice-customer');
        if (custEl) {
            const name = currentBill.customer || 'Walk-in Customer';
            const phone = currentBill.customerPhone;
            custEl.innerText = phone ? `${name} (${phone})` : name;
        }

        const cashierEl = document.getElementById('invoice-cashier');
        if (cashierEl) {
            cashierEl.innerText = `Cashier: ${currentBill.user || 'Admin User'}`;
        }

        const due = calcTotal - totalPaid;
        document.getElementById('invoice-due').innerText = due > 0 ? due.toFixed(2) : '0.00';
        
        const change = totalPaid - calcTotal > 0 ? totalPaid - calcTotal : 0;
        document.getElementById('invoice-change').innerText = change.toFixed(2);

        // Auto print trigger
        if (params.get('autoprint') === 'true') {
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }
});
