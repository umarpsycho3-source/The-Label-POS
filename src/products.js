import './sync.js';

document.addEventListener('DOMContentLoaded', () => {
    loadDropdownOptions();
    initProfitCalculation();
    initImageUpload();
    loadProducts();

    const searchInput = document.getElementById('search-product');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            loadProducts(e.target.value);
        });
    }
});

window.addEventListener('cloudDataSynced', () => {
    loadDropdownOptions();
    const searchInput = document.getElementById('search-product');
    loadProducts(searchInput ? searchInput.value : '');
});

function initProfitCalculation() {
    const costInput = document.getElementById('p-cost');
    const mrpInput = document.getElementById('p-mrp');
    const profitPctInput = document.getElementById('p-profit-pct');
    const profitAmtInput = document.getElementById('p-profit-amt');

    if (!costInput || !mrpInput || !profitPctInput || !profitAmtInput) return;

    function calculateProfit() {
        const cost = parseFloat(costInput.value) || 0;
        const mrp = parseFloat(mrpInput.value) || 0;
        
        let profitAmt = mrp - cost;
        let profitPct = 0;
        
        if (cost > 0) {
            profitPct = (profitAmt / cost) * 100;
        }

        profitAmtInput.value = profitAmt.toFixed(2);
        profitPctInput.value = profitPct.toFixed(2);
    }

    costInput.addEventListener('input', calculateProfit);
    mrpInput.addEventListener('input', calculateProfit);
}

function initImageUpload() {
    const box = document.getElementById('p-image-box');
    const fileInput = document.getElementById('p-image-file');
    const preview = document.getElementById('p-image-preview');
    const urlBtn = document.getElementById('p-image-url-btn');

    if (!box || !fileInput) return;

    function setImage(src) {
        if (!src) return;
        preview.src = src;
        preview.style.display = 'block';
    }

    // Click to upload
    box.addEventListener('click', (e) => {
        if (e.target !== urlBtn) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => setImage(ev.target.result);
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    // Paste to upload
    document.addEventListener('paste', (e) => {
        if (!document.getElementById('product-form-modal').style.display || document.getElementById('product-form-modal').style.display === 'none') return;
        
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file') {
                const blob = item.getAsFile();
                const reader = new FileReader();
                reader.onload = (ev) => setImage(ev.target.result);
                reader.readAsDataURL(blob);
            }
        }
    });

    // Add from URL
    if (urlBtn) {
        urlBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = prompt("Enter image URL:");
            if (url) {
                setImage(url);
            }
        });
    }
}

window.resetImageUpload = () => {
    const preview = document.getElementById('p-image-preview');
    const fileInput = document.getElementById('p-image-file');
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
    if (fileInput) fileInput.value = '';
};

function getProductsDB() {
    return JSON.parse(localStorage.getItem('pos_products_db')) || {};
}

function saveProductsDB(db) {
    localStorage.setItem('pos_products_db', JSON.stringify(db));
}

function loadProducts(searchQuery = '') {
    const tbody = document.getElementById('product-tbody');
    if (!tbody) return;

    const db = getProductsDB();
    tbody.innerHTML = '';
    let counter = 1;

    for (const barcode in db) {
        const p = db[barcode];
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const match = (p.name || '').toLowerCase().includes(query) || 
                          barcode.includes(query) ||
                          (p.category || '').toLowerCase().includes(query);
            if (!match) continue;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${counter}</td>
            <td>
                <div class="action-group">
                    <button class="action-btn edit" onclick="window.editProduct('${barcode}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn delete" onclick="window.deleteProduct('${barcode}')"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
            <td>
                <div style="font-weight:700; color:#1e293b; margin-bottom:0.2rem;">${p.name}</div>
                <div style="font-size:0.75rem; color:#94a3b8;"><i class="fa-solid fa-barcode"></i> ${barcode}</div>
            </td>
            <td>
                <span style="display:inline-block; background:#e0f2fe; color:#0369a1; padding:0.2rem 0.6rem; border-radius:12px; font-size:0.75rem; font-weight:600; margin-bottom:0.3rem;">
                    ${p.category || 'General'}
                </span>
                <div style="font-size:0.75rem; color:#64748b;">${p.supplier || 'No Name'}</div>
            </td>
            <td>${(parseFloat(p.cost) || 0).toFixed(2)}</td>
            <td style="font-weight:700;">${(parseFloat(p.price) || 0).toFixed(2)}</td>
            <td>${(parseFloat(p.discount) || parseFloat(p.price) || 0).toFixed(2)}</td>
            <td>${(parseFloat(p.wholesale) || parseFloat(p.price) || 0).toFixed(2)}</td>
            <td>${(parseFloat(p.special) || parseFloat(p.price) || 0).toFixed(2)}</td>
            <td>
                <span style="display:inline-block; background:#dcfce7; color:#166534; padding:0.2rem 0.6rem; border-radius:4px; font-size:0.8rem; font-weight:700;">
                    ${(parseFloat(p.qty) || 0).toFixed(3)}
                </span>
            </td>
            <td>
                <span style="display:inline-block; background:#475569; color:white; padding:0.1rem 0.4rem; border-radius:4px; font-size:0.7rem;">
                    ${p.status || 'Off'}
                </span>
            </td>
            <td style="font-size:0.8rem; color:#64748b;">${p.addTime || '2025-12-28 02:17 PM'}</td>
        `;
        tbody.appendChild(tr);
        counter++;
    }
}

window.openProductForm = () => {
    document.getElementById('product-list-view').style.display = 'none';
    document.getElementById('product-form-view').style.display = 'block';
    
    // Clear form
    document.getElementById('form-title').innerHTML = '<i class="fa-solid fa-cube" style="color:#3b82f6;"></i> Add New Product';
    document.getElementById('p-barcode').value = '';
    document.getElementById('p-barcode').readOnly = false;
    document.getElementById('p-name').value = '';
    document.getElementById('p-cost').value = '';
    document.getElementById('p-mrp').value = '';
    document.getElementById('p-stock').value = '0';
    document.getElementById('p-category').value = 'Birthday Item';
    document.getElementById('p-supplier').value = 'No Name - No Company 00';
    
    window.resetImageUpload();
    
    document.getElementById('btn-save-product').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Product';
    document.getElementById('btn-save-product').onclick = () => window.saveProduct(null);
};

window.closeProductForm = () => {
    document.getElementById('product-form-view').style.display = 'none';
    document.getElementById('product-list-view').style.display = 'block';
};

window.editProduct = (barcode) => {
    const db = getProductsDB();
    const p = db[barcode];
    if (!p) return;

    document.getElementById('product-list-view').style.display = 'none';
    document.getElementById('product-form-view').style.display = 'block';
    
    document.getElementById('form-title').innerHTML = '<i class="fa-solid fa-cube" style="color:#3b82f6;"></i> Edit Product';
    
    document.getElementById('p-barcode').value = barcode;
    document.getElementById('p-barcode').readOnly = true; // Barcode is primary key
    
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-cost').value = p.cost || '';
    document.getElementById('p-mrp').value = p.price || '';
    document.getElementById('p-stock').value = p.qty || '0';
    
    window.resetImageUpload();
    if (p.image && p.image !== window.location.href) {
        const preview = document.getElementById('p-image-preview');
        preview.src = p.image;
        preview.style.display = 'block';
    }
    
    // Attempt to set dropdowns
    const catSelect = document.getElementById('p-category');
    if (Array.from(catSelect.options).some(o => o.value === p.category)) {
        catSelect.value = p.category;
    }
    
    document.getElementById('btn-save-product').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Update Product';
    document.getElementById('btn-save-product').onclick = () => window.saveProduct(barcode);
};

window.saveProduct = (oldBarcode) => {
    const barcode = document.getElementById('p-barcode').value.trim();
    const name = document.getElementById('p-name').value.trim();
    const cost = parseFloat(document.getElementById('p-cost').value) || 0;
    const price = parseFloat(document.getElementById('p-mrp').value) || 0;
    const qty = parseFloat(document.getElementById('p-stock').value) || 0;
    const category = document.getElementById('p-category').value;
    const supplier = document.getElementById('p-supplier').value;
    
    const imagePreview = document.getElementById('p-image-preview');
    const image = (imagePreview && imagePreview.style.display !== 'none') ? imagePreview.src : '';

    if (!barcode || !name || price <= 0) {
        alert("Barcode, Product Name, and MRP Price are required!");
        return;
    }

    const db = getProductsDB();
    
    // If new, check collision
    if (!oldBarcode && db[barcode]) {
        alert("Product with this barcode already exists!");
        return;
    }

    const p = {
        barcode: barcode,
        name: name,
        cost: cost,
        price: price,
        qty: qty,
        category: category,
        supplier: supplier,
        discount: price,
        wholesale: price,
        special: price,
        status: 'Off',
        image: image,
        addTime: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    if (oldBarcode && oldBarcode !== barcode) {
        delete db[oldBarcode];
    }
    
    db[barcode] = p;
    saveProductsDB(db);
    
    window.closeProductForm();
    loadProducts();
};

window.deleteProduct = (barcode) => {
    if (confirm("Are you sure you want to delete this product?")) {
        const db = getProductsDB();
        delete db[barcode];
        saveProductsDB(db);
        loadProducts();
    }
};

function loadDropdownOptions() {
    ['p-supplier', 'p-category', 'p-unit'].forEach(id => {
        const customOptions = JSON.parse(localStorage.getItem('pos_custom_' + id)) || [];
        const select = document.getElementById(id);
        if (select) {
            customOptions.forEach(optVal => {
                // Only add if not already in the HTML
                if (!Array.from(select.options).some(o => o.value === optVal)) {
                    const opt = document.createElement('option');
                    opt.value = optVal;
                    opt.textContent = optVal;
                    select.appendChild(opt);
                }
            });
        }
    });
}

window.addDropdownOption = (selectId, labelName) => {
    const newVal = prompt(`Enter new ${labelName}:`);
    if (newVal && newVal.trim() !== '') {
        const select = document.getElementById(selectId);
        // Add to dropdown if not exists
        if (!Array.from(select.options).some(o => o.value === newVal.trim())) {
            const opt = document.createElement('option');
            opt.value = newVal.trim();
            opt.textContent = newVal.trim();
            select.appendChild(opt);
            
            // Save to localStorage
            const key = 'pos_custom_' + selectId;
            const existing = JSON.parse(localStorage.getItem(key)) || [];
            existing.push(newVal.trim());
            localStorage.setItem(key, JSON.stringify(existing));
        }
        select.value = newVal.trim();
    }
};

window.generateBarcode = () => {
    // Generate a random 10-digit number for the barcode
    let newBarcode = '';
    for (let i = 0; i < 10; i++) {
        newBarcode += Math.floor(Math.random() * 10).toString();
    }
    
    // Check if it exists just to be safe
    const db = getProductsDB();
    if (db[newBarcode]) {
        // If collision, just recursively call it again
        return window.generateBarcode();
    }
    
    document.getElementById('p-barcode').value = newBarcode;
};

window.openBarcodeModal = () => {
    const db = getProductsDB();
    const select = document.getElementById('bc-product-select');
    select.innerHTML = '';
    
    let hasProducts = false;
    for (const [barcode, p] of Object.entries(db)) {
        hasProducts = true;
        const opt = document.createElement('option');
        opt.value = barcode;
        opt.textContent = `${p.name} - Rs. ${parseFloat(p.price || 0).toFixed(2)}`;
        select.appendChild(opt);
    }
    
    if (!hasProducts) {
        alert("No products available to print barcodes.");
        return;
    }
    
    document.getElementById('barcode-modal').style.display = 'flex';
};

window.printBarcodes = () => {
    const barcode = document.getElementById('bc-product-select').value;
    const qty = parseInt(document.getElementById('bc-qty').value) || 10;
    const db = getProductsDB();
    const p = db[barcode];
    
    if (!p) return;
    
    // Get Settings for Currency & Code Word
    const settings = JSON.parse(localStorage.getItem('pos_settings')) || {};
    const currency = settings.currency || 'LKR';
    let codeWord = (settings.codeWord || 'ABCDEFGHIJ').toLowerCase();
    if (codeWord.length !== 10) codeWord = 'abcdefghij';
    
    // Encode the cost
    const rawCost = (parseFloat(p.cost) || 0).toString();
    let encodedCost = '';
    for (const char of rawCost) {
        if (char >= '1' && char <= '9') {
            encodedCost += codeWord[parseInt(char) - 1];
        } else if (char === '0') {
            encodedCost += codeWord[9];
        } else {
            encodedCost += char; // Keep decimals or other characters
        }
    }
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Print Barcodes</title>
        <style>
            body { font-family: sans-serif; padding: 20px; }
            .label-container {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            .label-box {
                width: 150px;
                height: auto;
                border: 1px solid #ccc;
                padding: 10px;
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
            }
            .product-name {
                font-size: 12px;
                font-weight: bold;
                margin-bottom: 5px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
            }
            .product-price {
                font-size: 14px;
                font-weight: bold;
                margin-top: 5px;
            }
            .product-cost {
                font-size: 10px;
                color: #64748b;
                margin-top: 2px;
                letter-spacing: 1px;
            }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
    </head>
    <body>
        <div class="label-container">
    `;
    
    for (let i = 0; i < qty; i++) {
        html += `
            <div class="label-box">
                <div class="product-name">${p.name}</div>
                <svg id="barcode-${i}"></svg>
                <div class="product-price">${currency} ${(parseFloat(p.price || 0)).toFixed(2)}</div>
                <div class="product-cost">${encodedCost}</div>
            </div>
        `;
    }
    
    html += `
        </div>
        <script>
            window.onload = () => {
                for(let i=0; i<${qty}; i++) {
                    try {
                        JsBarcode("#barcode-" + i, "${barcode}", {
                            format: "CODE128",
                            width: 1.5,
                            height: 40,
                            displayValue: true,
                            fontSize: 14
                        });
                    } catch(e) {
                        console.error(e);
                    }
                }
                setTimeout(() => {
                    window.print();
                }, 500);
            }
        </script>
    </body>
    </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    
    document.getElementById('barcode-modal').style.display = 'none';
};

// --- Category Management ---
window.openCategoryModal = () => {
    document.getElementById('category-modal').style.display = 'flex';
    renderCategoryList();
};

function renderCategoryList() {
    const categories = JSON.parse(localStorage.getItem('pos_custom_p-category')) || [];
    const tbody = document.getElementById('category-list-body');
    tbody.innerHTML = '';
    
    if (categories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:1rem; color:#64748b;">No categories found.</td></tr>`;
        return;
    }
    
    categories.forEach(cat => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:0.5rem; border-bottom:1px solid #f1f5f9;">${cat}</td>
            <td style="padding:0.5rem; border-bottom:1px solid #f1f5f9; text-align:right;">
                <button onclick="window.deleteCategory('${cat.replace(/'/g, "\\'")}')" style="background:#fee2e2; color:#ef4444; border:none; padding:0.3rem 0.5rem; border-radius:4px; cursor:pointer;" title="Delete Category"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.addCategoryFromModal = () => {
    const input = document.getElementById('new-category-name');
    const name = input.value.trim();
    if (!name) return;
    
    const categories = JSON.parse(localStorage.getItem('pos_custom_p-category')) || [];
    if (!categories.includes(name)) {
        categories.push(name);
        localStorage.setItem('pos_custom_p-category', JSON.stringify(categories));
    }
    input.value = '';
    renderCategoryList();
    
    // Update the dropdown on the main form
    loadDropdownOptions();
};

window.deleteCategory = (name) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;
    let categories = JSON.parse(localStorage.getItem('pos_custom_p-category')) || [];
    categories = categories.filter(c => c !== name);
    localStorage.setItem('pos_custom_p-category', JSON.stringify(categories));
    renderCategoryList();
    
    // Update the dropdown on the main form
    const select = document.getElementById('p-category');
    if (select) {
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === name) {
                select.remove(i);
                break;
            }
        }
    }
};

// --- Print List ---
window.printProductList = () => {
    const db = getProductsDB();
    const products = Object.values(db);
    
    if (products.length === 0) {
        alert("No products to print.");
        return;
    }
    
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Product List</title>
        <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            h1 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
            th { background-color: #f8fafc; font-weight: bold; }
            .right { text-align: right; }
        </style>
    </head>
    <body>
        <h1>Product List</h1>
        <table>
            <thead>
                <tr>
                    <th>Barcode</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Supplier</th>
                    <th class="right">Cost</th>
                    <th class="right">MRP Price</th>
                    <th class="right">Stock Qty</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    products.forEach(p => {
        html += `
            <tr>
                <td>${p.barcode}</td>
                <td>${p.name}</td>
                <td>${p.category || '-'}</td>
                <td>${p.supplier || '-'}</td>
                <td class="right">${(parseFloat(p.cost) || 0).toFixed(2)}</td>
                <td class="right">${(parseFloat(p.price) || 0).toFixed(2)}</td>
                <td class="right">${(parseFloat(p.qty) || 0).toFixed(3)}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
        <script>
            window.onload = () => {
                setTimeout(() => {
                    window.print();
                }, 500);
            };
        </script>
    </body>
    </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
};

