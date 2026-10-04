import './dashboard.css';
import './sales.css';
import './sync.js';

document.addEventListener('DOMContentLoaded', () => {
    function loadAndRenderSales() {
        let allData = JSON.parse(localStorage.getItem('pos_sales_data')) || [];
        const filterFromDate = document.getElementById('filter-from-date');
        const filterToDate   = document.getElementById('filter-to-date');
        const searchInput    = document.getElementById('search-bill');

        const from = filterFromDate ? filterFromDate.value : '';
        const to = filterToDate ? filterToDate.value : '';
        const search = searchInput ? searchInput.value.toLowerCase().trim() : '';

        const filtered = allData.filter(row => {
            const dt = row.datetime ? row.datetime.split(' ')[0] : '';
            if (from && dt < from) return false;
            if (to && dt > to) return false;
            if (search) {
                const idMatch = String(row.id || '').toLowerCase().includes(search);
                const custMatch = String(row.customer || '').toLowerCase().includes(search);
                const phoneMatch = String(row.customerPhone || '').toLowerCase().includes(search);
                if (!idMatch && !custMatch && !phoneMatch) return false;
            }
            return true;
        });

        if (typeof renderTable === 'function') renderTable(filtered);
    }


    // Normalise every record so numbers & strings both work safely
    function normalise(row) {
        const safe = (v) => {
            if (v === undefined || v === null || v === '-' || v === '') return 0;
            return parseFloat(String(v).replace(/,/g, '')) || 0;
        };
        return {
            ...row,
            _total:  safe(row.total),
            _cash:   safe(row.cash),
            _card:   safe(row.card),
            _cheque: safe(row.cheque),
        };
    }

    // ── Helper for local YYYY-MM-DD date ──────────────────────────────────
    function getLocalDateStr(d = new Date()) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // ── Set today's date as defaults ───────────────────────────────────────
    const todayStr = getLocalDateStr();
    const filterFromDate = document.getElementById('filter-from-date');
    const filterToDate   = document.getElementById('filter-to-date');
    if (filterFromDate) filterFromDate.value = todayStr;
    if (filterToDate)   filterToDate.value   = todayStr;

    // ── Helper: format display value ───────────────────────────────────────
    const fmtNum = (n) => n === 0 ? '—' : n.toFixed(2);
    const fmtTotal = (n) => n.toFixed(2);

    // ── Render Table ───────────────────────────────────────────────────────
    const tbody = document.getElementById('management-tbody');

    function renderTable(data) {
        if (!tbody) return;

        let html = '';
        data.forEach((raw, index) => {
            const row = normalise(raw);
            const due = Math.max(0, row._total - row._cash - row._card - row._cheque);

            const statusBadge = due > 0.01
                ? `<span style="background:#fee2e2;color:#b91c1c;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.72rem;font-weight:700;">Credit</span>`
                : `<span style="background:#dcfce7;color:#16a34a;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.72rem;font-weight:700;">Paid</span>`;

            // Safe display for cash/card/cheque
            const displayCash   = row._cash   > 0 ? `Rs. ${row._cash.toFixed(2)}`   : '—';
            const displayCard   = row._card   > 0 ? `Rs. ${row._card.toFixed(2)}`   : '—';
            const displayCheque = row._cheque > 0 ? `Rs. ${row._cheque.toFixed(2)}` : '—';
            const displayDue    = due          > 0 ? `<span style="color:#dc2626;font-weight:800;">Rs. ${due.toFixed(2)}</span>` : '<span style="color:#10b981;">—</span>';

            const dtRaw   = raw.datetime || '';
            const dtParts = dtRaw.split(' ');
            const dtDate  = dtParts[0] || '';
            const dtTime  = dtParts.slice(1).join(' ') || '';

            html += `
                <tr data-id="${raw.id}" style="transition:background 0.15s;">
                    <td style="color:#64748b;font-weight:600;font-size:0.85rem;">${index + 1}</td>
                    <td>
                        <div style="display:flex;gap:0.3rem;flex-wrap:wrap;">
                            <button class="btn-icon edit btn-action-edit"   data-id="${raw.id}" title="Edit Invoice"   style="background:#dbeafe;color:#1d4ed8;border:none;width:30px;height:30px;border-radius:7px;cursor:pointer;"><i class="fa-solid fa-pen fa-xs"></i></button>
                            <button class="btn-icon view btn-action-view"   data-id="${raw.id}" title="View A4 Invoice" style="background:#f0fdf4;color:#16a34a;border:none;width:30px;height:30px;border-radius:7px;cursor:pointer;"><i class="fa-solid fa-file-invoice fa-xs"></i></button>
                            <button class="btn-icon print btn-action-receipt" data-id="${raw.id}" title="Print Thermal Receipt" style="background:#f5f3ff;color:#7c3aed;border:none;width:30px;height:30px;border-radius:7px;cursor:pointer;"><i class="fa-solid fa-receipt fa-xs"></i></button>
                            <button class="btn-icon delete btn-action-delete" data-id="${raw.id}" title="Delete Invoice" style="background:#fee2e2;color:#dc2626;border:none;width:30px;height:30px;border-radius:7px;cursor:pointer;"><i class="fa-solid fa-trash-can fa-xs"></i></button>
                        </div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <div style="font-weight:800;color:#1e293b;font-size:0.9rem;">#${raw.id}</div>
                        <div style="color:#64748b;font-size:0.72rem;margin-top:0.15rem;"><i class="fa-solid fa-location-dot"></i> Main Store</div>
                    </td>
                    <td style="font-weight:800;color:#0f172a;">Rs. ${fmtTotal(row._total)}</td>
                    <td style="color:#16a34a;font-weight:700;">—</td>
                    <td>${displayCash}</td>
                    <td>${displayCard}</td>
                    <td>${displayCheque}</td>
                    <td style="color:#475569;font-size:0.85rem;">${raw.user || 'Admin'}</td>
                    <td style="font-weight:700;color:#1e293b;">${raw.customer || 'Walk-in'}</td>
                    <td style="color:#64748b;font-size:0.8rem;line-height:1.5;">
                        <div>${dtDate}</div>
                        <div>${dtTime}</div>
                    </td>
                </tr>`;
        });

        if (data.length === 0) {
            html = `<tr><td colspan="12" style="text-align:center;color:#94a3b8;padding:3rem;font-weight:600;"><i class="fa-solid fa-inbox" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>No invoices found for this filter.</td></tr>`;
        }

        tbody.innerHTML = html;

        // ── Totals footer ────────────────────────────────────────────────
        let sumTotal = 0, sumCash = 0, sumCard = 0, sumCheque = 0, sumDue = 0;
        data.forEach(raw => {
            const row = normalise(raw);
            sumTotal  += row._total;
            sumCash   += row._cash;
            sumCard   += row._card;
            sumCheque += row._cheque;
            const due = row._total - row._cash - row._card - row._cheque;
            if (due > 0) sumDue += due;
        });

        const tfoot = document.querySelector('.management-table tfoot');
        if (tfoot) {
            tfoot.innerHTML = `
                <tr style="background:#f8fafc;border-top:2px solid #e2e8f0;">
                    <td colspan="4" style="text-align:right;font-weight:800;color:#64748b;font-size:0.9rem;padding:1rem;">
                        TOTALS <span style="color:#94a3b8;font-size:0.75rem;">(${data.length} bills)</span>
                    </td>
                    <td style="font-weight:800;color:#0f172a;">Rs. ${sumTotal.toFixed(2)}</td>
                    <td style="font-weight:800;color:#16a34a;">0.00</td>
                    <td style="font-weight:800;color:#0f172a;">${sumCash > 0 ? 'Rs. ' + sumCash.toFixed(2) : '—'}</td>
                    <td style="font-weight:800;color:#0f172a;">${sumCard > 0 ? 'Rs. ' + sumCard.toFixed(2) : '—'}</td>
                    <td style="font-weight:800;color:#0f172a;">${sumCheque > 0 ? 'Rs. ' + sumCheque.toFixed(2) : '—'}</td>
                    <td colspan="3" style="text-align:right;font-weight:800;color:#dc2626;padding-right:1.5rem;">
                        Due: Rs. ${sumDue.toFixed(2)}
                    </td>
                </tr>`;
        }

        // ── Action button events ─────────────────────────────────────────
        document.querySelectorAll('.btn-action-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.location.href = '/edit-bill.html?id=' + e.currentTarget.dataset.id;
            });
        });
        document.querySelectorAll('.btn-action-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.location.href = '/view-sale.html?id=' + e.currentTarget.dataset.id;
            });
        });
        document.querySelectorAll('.btn-action-receipt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.open('/view-sale.html?id=' + e.currentTarget.dataset.id + '&type=thermal', '_blank');
            });
        });
        document.querySelectorAll('.btn-action-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm(`Delete invoice #${id}? This cannot be undone.`)) {
                    allData = allData.filter(item => String(item.id) !== String(id));
                    localStorage.setItem('pos_sales_data', JSON.stringify(allData));
                    applyFilter();
                }
            });
        });
    }

    // ── Core Filter Function ───────────────────────────────────────────────
    const filterSearchId = document.getElementById('filter-search-id');
    const filterPayment  = document.getElementById('filter-payment');
    const filterCashier  = document.getElementById('filter-cashier');

    function applyFilter() {
        let filtered = allData;

        // 1. Date range filter — the MAIN fix
        const from = filterFromDate?.value;
        const to   = filterToDate?.value;
        if (from || to) {
            filtered = filtered.filter(item => {
                const itemDate = (item.datetime || '').slice(0, 10);
                if (!itemDate) return false;
                if (from && itemDate < from) return false;
                if (to   && itemDate > to)   return false;
                return true;
            });
        }

        // 2. Search by Bill ID or Customer
        const searchVal = filterSearchId?.value.trim();
        if (searchVal) {
            filtered = filtered.filter(item =>
                String(item.id).includes(searchVal) ||
                (item.customer || '').toLowerCase().includes(searchVal.toLowerCase()) ||
                (item.customerPhone || '').includes(searchVal)
            );
        }

        // 3. Payment type filter
        const payVal = filterPayment?.value;
        if (payVal && payVal !== 'Any') {
            filtered = filtered.filter(item => {
                const row = normalise(item);
                if (payVal === 'Cash')   return row._cash   > 0;
                if (payVal === 'Card')   return row._card   > 0;
                if (payVal === 'Cheque') return row._cheque > 0;
                if (payVal === 'Credit') {
                    const due = row._total - row._cash - row._card - row._cheque;
                    return due > 0.01;
                }
                return true;
            });
        }

        // 4. Cashier filter
        const cashierVal = filterCashier?.value;
        if (cashierVal && cashierVal !== 'Any') {
            filtered = filtered.filter(item => (item.user || '') === cashierVal);
        }

        // Sort newest first
        filtered = filtered.slice().sort((a, b) => (b.datetime || '').localeCompare(a.datetime || ''));

        renderTable(filtered);
    }

    // ── Quick Range Buttons ────────────────────────────────────────────────
    function setDateRange(from, to) {
        if (filterFromDate) filterFromDate.value = from;
        if (filterToDate)   filterToDate.value   = to;
    }

    document.querySelectorAll('.btn-range').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-range').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');

            const now = new Date();
            const today = getLocalDateStr(now);

            const offsetDay = (dStr, offset) => {
                const parts = dStr.split('-').map(Number);
                const dt = new Date(parts[0], parts[1] - 1, parts[2] + offset);
                return getLocalDateStr(dt);
            };

            const getMonday = (dStr) => {
                const parts = dStr.split('-').map(Number);
                const dt = new Date(parts[0], parts[1] - 1, parts[2]);
                const day = dt.getDay();
                const diff = day === 0 ? -6 : 1 - day;
                dt.setDate(dt.getDate() + diff);
                return getLocalDateStr(dt);
            };

            const range = e.currentTarget.dataset.range;
            if (range === 'today') {
                setDateRange(today, today);
            } else if (range === 'yesterday') {
                const y = offsetDay(today, -1);
                setDateRange(y, y);
            } else if (range === 'week') {
                setDateRange(getMonday(today), today);
            } else if (range === 'month') {
                const firstOfMonth = today.slice(0, 7) + '-01';
                setDateRange(firstOfMonth, today);
            }

            applyFilter();
        });
    });

    // ── Wire up filter buttons ─────────────────────────────────────────────
    document.getElementById('btn-apply-filter')?.addEventListener('click', applyFilter);
    document.getElementById('btn-filter-secondary')?.addEventListener('click', applyFilter);
    document.getElementById('btn-search-icon')?.addEventListener('click', applyFilter);
    filterSearchId?.addEventListener('keypress', (e) => { if (e.key === 'Enter') applyFilter(); });
    filterFromDate?.addEventListener('change', applyFilter);
    filterToDate?.addEventListener('change', applyFilter);

    // ── Initial render with today's date ──────────────────────────────────
    applyFilter();

    // ── Listen for cloud sync updates across devices ───────────────────────
    window.addEventListener('cloudDataSynced', () => {
        applyFilter();
    });
});
