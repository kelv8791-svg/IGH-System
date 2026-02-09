// Extracted script for syntax checking
// (non-browser DOM references will be ignored; we only look for parse errors)

// Global Data
let currentUser = null;
let users = [{email: 'admin@igh.com', password: 'admin2025', role: 'admin'}];
let data = {sales: [], expenses: [], suppliers: [], clients: [], designs: [], supplierExpenses: []};
let charts = {};
let CLIENT_ID = '', SHEET_ID = '';
let SHEET_TAB = 'Sheet1';
let gapiInited = false, tokenClient, g_access_token = '';

// (rest of file trimmed to focus on parsing) 

function generateReport() {
    try {
        const from = document.getElementById('reportFrom') ? document.getElementById('reportFrom').value : '';
        const to = document.getElementById('reportTo') ? document.getElementById('reportTo').value : '';
        const typeEl = document.getElementById('reportType');
        const type = typeEl ? (typeEl.value || 'all') : 'all';

        const fromDate = from ? new Date(from) : new Date('1970-01-01');
        const toDate = to ? new Date(to) : new Date('9999-12-31');
        if (isNaN(fromDate) || isNaN(toDate)) return showAlert('Invalid date range', 'error');

        function inRange(d) {
            if (!d) return false;
            const dt = new Date(d);
            if (isNaN(dt)) return false;
            return dt >= fromDate && dt <= toDate;
        }

        function escapeCSV(val) {
            if (val === null || val === undefined) return '';
            const s = String(val);
            if (s.indexOf('"') !== -1) return '"' + s.replace(/"/g, '""') + '"';
            if (s.search(/[,\n\r]/) !== -1) return '"' + s + '"';
            return s;
        }

        const now = new Date().toISOString();
        let headers = [];
        let rows = [];
        let title = '';

        const addSales = () => {
            headers = ['ExportedAt','Type','SaleDate','Client','Dept','Amount','Description'];
            rows = data.sales.filter(s => (!from && !to) || inRange(s.date)).map(s => [now, 'sale', s.date || '', getClientName(s.client), s.dept || '', s.amount || 0, s.desc || '']);
            title = 'Sales Report';
        };

        // end
    } catch(e) {
        console.error(e);
    }
}
