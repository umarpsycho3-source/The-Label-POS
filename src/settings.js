import './sync.js';

document.addEventListener('DOMContentLoaded', () => {
    // Default Settings
    const defaultSettings = {
        name: 'THE LABEL',
        currency: 'LKR',
        address: '123 Main Street, City',
        phone: '+94 77 000 0000',
        tax: '',
        footer: 'Thank you! Please come again.',
        logo: '',
        codeWord: 'ABCDEFGHIJ'
    };

    // Load Settings
    let currentSettings = JSON.parse(localStorage.getItem('pos_settings'));
    if (!currentSettings) {
        currentSettings = defaultSettings;
        localStorage.setItem('pos_settings', JSON.stringify(currentSettings));
    }

    // Populate Form
    if (document.getElementById('set-name')) document.getElementById('set-name').value = currentSettings.name || '';
    if (document.getElementById('set-currency')) document.getElementById('set-currency').value = currentSettings.currency || '';
    if (document.getElementById('set-address')) document.getElementById('set-address').value = currentSettings.address || '';
    if (document.getElementById('set-phone')) document.getElementById('set-phone').value = currentSettings.phone || '';
    if (document.getElementById('set-tax')) document.getElementById('set-tax').value = currentSettings.tax || '';
    if (document.getElementById('set-footer')) document.getElementById('set-footer').value = currentSettings.footer || '';
    if (document.getElementById('set-logo-base64')) document.getElementById('set-logo-base64').value = currentSettings.logo || '';
    
    if (currentSettings.logo && document.getElementById('logo-preview-box')) {
        document.getElementById('logo-preview-box').innerHTML = `<img src="${currentSettings.logo}" alt="Logo">`;
    }

    // Handle Code Word Array
    const cwInputs = [
        document.getElementById('cw-1'), document.getElementById('cw-2'),
        document.getElementById('cw-3'), document.getElementById('cw-4'),
        document.getElementById('cw-5'), document.getElementById('cw-6'),
        document.getElementById('cw-7'), document.getElementById('cw-8'),
        document.getElementById('cw-9'), document.getElementById('cw-0')
    ];
    let defaultCode = currentSettings.codeWord;
    if (!defaultCode || defaultCode.length !== 10) defaultCode = 'ABCDEFGHIJ';
    for (let i = 0; i < 10; i++) {
        if(cwInputs[i]) cwInputs[i].value = defaultCode[i].toUpperCase();
    }

    // Handle Logo Upload
    const logoInput = document.getElementById('set-logo');
    if (logoInput) {
        logoInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const base64 = e.target.result;
                    document.getElementById('set-logo-base64').value = base64;
                    document.getElementById('logo-preview-box').innerHTML = `<img src="${base64}" alt="Logo">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Handle Save
    const form = document.getElementById('settings-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            let codeWord = '';
            for (let i = 0; i < 10; i++) {
                codeWord += (cwInputs[i] && cwInputs[i].value) ? cwInputs[i].value.toUpperCase() : 'A';
            }
            if (codeWord.length !== 10) codeWord = 'ABCDEFGHIJ';

            const newSettings = {
                name: document.getElementById('set-name').value,
                currency: document.getElementById('set-currency').value,
                address: document.getElementById('set-address').value,
                phone: document.getElementById('set-phone').value,
                tax: document.getElementById('set-tax').value,
                footer: document.getElementById('set-footer').value,
                codeWord: codeWord,
                logo: document.getElementById('set-logo-base64').value
            };
            localStorage.setItem('pos_settings', JSON.stringify(newSettings));
            
            // Quick Success Feedback
            const btn = form.querySelector('.btn-save');
            if (btn) {
                const origText = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
                btn.style.background = '#059669';
                setTimeout(() => {
                    btn.innerHTML = origText;
                    btn.style.background = '';
                }, 2000);
            }
        });
    }

    // Reset Data button
    const resetBtn = document.getElementById('btn-reset-data');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm("WARNING: Are you sure you want to CLEAR ALL SYSTEM DATA? This will wipe all sales, products, expenses, and customer records across all devices!")) {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('pos_')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(k => localStorage.removeItem(k));
                alert("System data has been reset successfully.");
                window.location.reload();
            }
        });
    }
});
