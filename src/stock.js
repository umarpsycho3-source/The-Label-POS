import './sync.js';

let currentAction = 'in'; // 'in', 'out', 'transfer', 'count'
let selectedProduct = null;

window.addEventListener('cloudDataSynced', () => {
    if (selectedProduct && selectedProduct.barcode) {
        loadStockData(selectedProduct.barcode);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Action buttons toggle
    const btnIn = document.querySelector('.btn-stock-in');
    const btnOut = document.querySelector('.btn-stock-out');
    const btnTransfer = document.querySelector('.btn-transfer');
    const btnCount = document.querySelector('.btn-count');
    
    function resetBtns() {
        const btns = [btnIn, btnOut, btnTransfer, btnCount].filter(Boolean);
        btns.forEach(b => b.classList.remove('active'));
    }

    if (btnIn) btnIn.addEventListener('click', () => { resetBtns(); btnIn.classList.add('active'); currentAction = 'in'; });
    if (btnOut) btnOut.addEventListener('click', () => { resetBtns(); btnOut.classList.add('active'); currentAction = 'out'; });
    if (btnTransfer) btnTransfer.addEventListener('click', () => { resetBtns(); btnTransfer.classList.add('active'); currentAction = 'transfer'; });
    if (btnCount) btnCount.addEventListener('click', () => { resetBtns(); btnCount.classList.add('active'); currentAction = 'count'; });

    // Search logic
    const searchInput = document.getElementById('s-search');
    const searchResults = document.getElementById('s-search-results');
    
    function showDropdown(query = '') {
        const db = JSON.parse(localStorage.getItem('pos_products_db')) || {};
        const allProducts = Object.values(db);
        
        const matches = query ? allProducts.filter(p => 
            (p.barcode || '').toLowerCase().includes(query) || 
            (p.name || '').toLowerCase().includes(query)
        ) : allProducts;
        
        searchResults.innerHTML = '';
        if (matches.length > 0) {
            matches.forEach(p => {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.innerHTML = `
                    <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 3px;">${p.barcode}</div>
                    <div style="font-size: 0.8rem; color: #cbd5e1;">${p.name} &bull; ${(parseFloat(p.price)||0).toFixed(2)}</div>
                `;
                div.addEventListener('click', () => {
                    selectProduct(p.barcode);
                    searchResults.classList.remove('active');
                    searchInput.value = p.barcode;
                });
                searchResults.appendChild(div);
            });
            searchResults.classList.add('active');
        } else {
            searchResults.innerHTML = '<div class="search-item" style="color: #ef4444; font-size: 0.9rem;">No products found</div>';
            searchResults.classList.add('active');
        }
    }

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        showDropdown(query);
    });

    searchInput.addEventListener('focus', () => {
        const query = searchInput.value.toLowerCase().trim();
        showDropdown(query);
    });

    // ─── AUTO-SEARCH FROM URL PARAM (e.g. from Dashboard Low Stock Alert) ───
    const urlParams = new URLSearchParams(window.location.search);
    const preSearch = urlParams.get('search');
    if (preSearch) {
        searchInput.value = preSearch;
        showDropdown(preSearch.toLowerCase().trim());
        
        // Auto-select if there's an exact or near match
        const db = JSON.parse(localStorage.getItem('pos_products_db')) || {};
        const allProducts = Object.values(db);
        const match = allProducts.find(p =>
            (p.name || '').toLowerCase() === preSearch.toLowerCase() ||
            (p.barcode || '').toLowerCase() === preSearch.toLowerCase() ||
            (p.name || '').toLowerCase().includes(preSearch.toLowerCase())
        );
        if (match) {
            setTimeout(() => {
                selectProduct(match.barcode);
                searchInput.value = match.barcode;
                // Scroll the product card into view
                const card = document.getElementById('stock-product-card');
                if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Highlight the search box to show it's been pre-filled
                searchInput.style.borderColor = '#10b981';
                searchInput.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.15)';
                setTimeout(() => {
                    searchInput.style.borderColor = '';
                    searchInput.style.boxShadow = '';
                }, 2500);
            }, 300);
        }
    }

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.toLowerCase().trim();
            if (!query) return;
            const db = JSON.parse(localStorage.getItem('pos_products_db')) || {};
            const allProducts = Object.values(db);
            const match = allProducts.find(p => 
                (p.barcode || '').toLowerCase() === query || 
                (p.name || '').toLowerCase() === query
            );
            if (match) {
                selectProduct(match.barcode);
                searchResults.classList.remove('active');
                searchInput.value = match.barcode;
            } else {
                alert('Product not found!');
            }
        }
    });

    // Handle caret click to show all products
    const caretIcon = document.querySelector('.stock-search-box .fa-caret-down');
    if (caretIcon) {
        caretIcon.style.cursor = 'pointer';
        caretIcon.addEventListener('click', () => {
            if (searchResults.classList.contains('active')) {
                searchResults.classList.remove('active');
            } else {
                showDropdown(searchInput.value.toLowerCase().trim());
                searchInput.focus();
            }
        });
    }

    // Close search dropdown on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.stock-search-box')) {
            searchResults.classList.remove('active');
        }
    });
});

function selectProduct(barcode) {
    const db = JSON.parse(localStorage.getItem('pos_products_db')) || {};
    const p = db[barcode];
    if (!p) return;
    
    selectedProduct = p;
    
    // Update labels
    document.getElementById('s-barcode').textContent = p.barcode;
    document.getElementById('s-product-id').textContent = p.barcode;
    document.getElementById('s-name').textContent = p.name;
    
    // Set Batch
    const dateStr = p.addTime ? p.addTime.split(' ')[0] : new Date().toISOString().split('T')[0];
    const batchSelect = document.getElementById('s-batch');
    batchSelect.innerHTML = `<option value="${p.barcode}">Product Create Badge | MRP: ${(parseFloat(p.price)||0).toFixed(2)} | ${dateStr}</option>`;
    
    loadStockData(p.barcode);
}

function loadStockData(barcode) {
    const history = JSON.parse(localStorage.getItem('pos_stock_history')) || [];
    const prodHistory = history.filter(h => h.barcode === barcode);
    
    const db = JSON.parse(localStorage.getItem('pos_products_db')) || {};
    const p = db[barcode];
    
    let totalIn = 0;
    let totalOut = 0;
    
    // Default initial stock from product creation is considered "In"
    // Let's look for an "Opening Stock" entry, if not, create a virtual one based on p.qty if history is empty
    if (prodHistory.length === 0 && parseFloat(p.qty) > 0) {
        totalIn = parseFloat(p.qty);
    }
    
    const activityBody = document.getElementById('activity-tbody');
    activityBody.innerHTML = '';
    
    // If no history but has opening stock, show it
    if (prodHistory.length === 0 && parseFloat(p.qty) > 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-size:0.8rem;">${p.addTime}</td>
            <td style="font-size:0.85rem; font-weight:500;">Opening Stock<br><span style="font-size:0.7rem; color:#64748b; font-weight:normal;">Product Create Badge • Main Store</span></td>
            <td style="text-align:right; font-weight:700;">${parseFloat(p.qty).toFixed(3)}</td>
            <td style="text-align:center;"><span class="badge-in">In</span></td>
        `;
        activityBody.appendChild(tr);
    }
    
    prodHistory.reverse().forEach(h => {
        if (h.type === 'in') totalIn += h.qty;
        if (h.type === 'out') totalOut += h.qty;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-size:0.8rem;">${h.date}</td>
            <td style="font-size:0.85rem; font-weight:500;">${h.info}<br><span style="font-size:0.7rem; color:#64748b; font-weight:normal;">Product Create Badge • Main Store</span></td>
            <td style="text-align:right; font-weight:700;">${h.qty.toFixed(3)}</td>
            <td style="text-align:center;"><span class="badge-${h.type}">${h.type === 'in' ? 'In' : 'Out'}</span></td>
        `;
        activityBody.appendChild(tr);
    });
    
    const available = totalIn - totalOut;
    
    document.getElementById('s-total-in').textContent = totalIn.toFixed(3);
    document.getElementById('s-total-out').textContent = totalOut.toFixed(3);
    document.getElementById('s-available').textContent = available.toFixed(3);
    document.getElementById('s-loc-qty').textContent = available.toFixed(3);
    
    // Update Batch Table
    const batchBody = document.getElementById('batch-tbody');
    batchBody.innerHTML = `
        <tr>
            <td style="font-weight:500;">Product Create Badge</td>
            <td>${p.addTime.split(' ')[0]}</td>
            <td style="text-align:right;">${(parseFloat(p.cost)||0).toFixed(2)}</td>
            <td style="text-align:right;">${(parseFloat(p.price)||0).toFixed(2)}</td>
            <td style="text-align:right; font-weight:700; color:#2563eb;">${available.toFixed(3)}</td>
        </tr>
    `;
}

window.updateStock = () => {
    if (!selectedProduct) {
        alert("Please select a product first.");
        return;
    }
    
    const qtyInput = document.getElementById('s-qty');
    const qty = parseFloat(qtyInput.value);
    
    if (isNaN(qty) || qty <= 0) {
        alert("Please enter a valid positive quantity.");
        return;
    }
    
    if (currentAction !== 'in' && currentAction !== 'out') {
        alert("Only Stock In and Stock Out are supported in this demo.");
        return;
    }
    
    const history = JSON.parse(localStorage.getItem('pos_stock_history')) || [];
    const now = new Date();
    
    const entry = {
        barcode: selectedProduct.barcode,
        type: currentAction, // 'in' or 'out'
        qty: qty,
        date: now.toLocaleString(),
        info: currentAction === 'in' ? 'Manual Stock In' : 'Manual Stock Out'
    };
    
    history.push(entry);
    localStorage.setItem('pos_stock_history', JSON.stringify(history));
    
    // Also update main product qty (for simplicity)
    const db = JSON.parse(localStorage.getItem('pos_products_db')) || {};
    if (db[selectedProduct.barcode]) {
        let currentQty = parseFloat(db[selectedProduct.barcode].qty) || 0;
        if (currentAction === 'in') {
            currentQty += qty;
        } else {
            currentQty -= qty;
        }
        db[selectedProduct.barcode].qty = currentQty;
        localStorage.setItem('pos_products_db', JSON.stringify(db));
    }
    
    qtyInput.value = '';
    loadStockData(selectedProduct.barcode);
};
