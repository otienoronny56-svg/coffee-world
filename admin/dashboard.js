import { supabase } from '../js/supabase-client.js';

// Store chart instances globally
let revenueChartInstance = null;
let statusChartInstance = null;
let productsChartInstance = null;

// Store data for export
let currentExportOrders = [];
let currentExportStats = {};

// Modern Chart defaults
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = "#64748b";
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.borderRadius = 8;
Chart.defaults.plugins.legend.labels.usePointStyle = true;

async function loadDashboard(filterType = 'all', customStart = null, customEnd = null) {
    const revenueEl = document.getElementById('total-revenue');
    const activeOrdersEl = document.getElementById('active-orders');
    const b2bLeadsEl = document.getElementById('b2b-leads');
    const lowStockEl = document.getElementById('low-stock');
    const revenueTitleEl = document.getElementById('revenue-chart-title');

    // --- 1. Date Range Handling ---
    let startDate = null;
    let endDate = new Date().toISOString();
    const now = new Date();

    if (filterType === 'today') {
        const start = new Date(now);
        start.setHours(0,0,0,0);
        startDate = start.toISOString();
    } else if (filterType === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        startDate = start.toISOString();
    } else if (filterType === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = start.toISOString();
    } else if (filterType === 'year') {
        const start = new Date(now.getFullYear(), 0, 1);
        startDate = start.toISOString();
    } else if (filterType === 'custom' && customStart) {
        startDate = new Date(customStart).toISOString();
        if (customEnd) {
             const end = new Date(customEnd);
             end.setHours(23,59,59,999);
             endDate = end.toISOString();
        }
    }

    try {
        // --- 2. Data Acquisition ---
        let ordersQuery = supabase.from('b2c_orders').select('*').order('created_at', { ascending: true });
        if (startDate) ordersQuery = ordersQuery.gte('created_at', startDate);
        if (endDate && filterType === 'custom') ordersQuery = ordersQuery.lte('created_at', endDate);

        const { data: orders, error: ordersError } = await ordersQuery;
        if (ordersError) throw ordersError;
        currentExportOrders = orders;

        const orderIds = orders.map(o => o.id);
        let orderItems = [];
        if (orderIds.length > 0) {
            const { data: items, error: itemsError } = await supabase.from('b2c_order_items').select('*').in('order_id', orderIds);
            if (itemsError) throw itemsError;
            orderItems = items || [];
        }

        const { data: products, error: productsError } = await supabase.from('products').select('*');
        if (productsError) throw productsError;

        let b2bQuery = supabase.from('b2b_sample_requests').select('*', { count: 'exact' });
        if (startDate) b2bQuery = b2bQuery.gte('created_at', startDate);
        const { data: b2bLeads, count: b2bCount, error: b2bError } = await b2bQuery;
        if (b2bError) throw b2bError;

        // --- 3. Calculations ---
        let totalRevenue = 0;
        let activeCount = 0;
        const statusCounts = { pending: 0, processing: 0, completed: 0, cancelled: 0 };
        const revenueTrend = {}; 

        let granularity = 'Monthly';
        if (filterType === 'today') granularity = 'Hourly';
        else if (filterType === 'week' || filterType === 'month') granularity = 'Daily';

        orders.forEach(order => {
            const status = (order.status || 'pending').toLowerCase();
            if (status !== 'cancelled') totalRevenue += (order.total_amount_kes || 0);
            if (status === 'pending' || status === 'processing') activeCount++;
            if (statusCounts[status] !== undefined) statusCounts[status]++;
            
            const date = new Date(order.created_at);
            let key = granularity === 'Hourly' ? date.getHours() + ':00' : granularity === 'Daily' ? date.toLocaleString('default', { month: 'short', day: 'numeric' }) : date.toLocaleString('default', { month: 'short', year: 'numeric' });
            if (!revenueTrend[key]) revenueTrend[key] = 0;
            if (status !== 'cancelled') revenueTrend[key] += (order.total_amount_kes || 0);
        });

        // Top origins (aggregated from products)
        const originSales = {};
        orderItems.forEach(item => {
            const product = products.find(p => p.id == item.product_id);
            const origin = product ? (product.region || 'Kenya') : 'Other';
            if (!originSales[origin]) originSales[origin] = 0;
            originSales[origin] += (item.quantity || 0);
        });
        const sortedOrigins = Object.entries(originSales).sort((a,b) => b[1] - a[1]).slice(0,5);

        // Inventory Alerts
        let lowStockCount = products.filter(p => p.type === 'roasted_retail' && p.retail_stock < 10).length;

        // --- 4. UI Rendering ---
        revenueEl.textContent = `KSh ${totalRevenue.toLocaleString()}`;
        activeOrdersEl.textContent = activeCount;
        b2bLeadsEl.textContent = b2bCount || 0;
        lowStockEl.textContent = lowStockCount;

        renderRevenueChart(revenueTrend, granularity);
        renderStatusChart(statusCounts);
        renderProductsChart(sortedOrigins);
        loadLiveFeed(orders, b2bLeads);

        updateChartTheme();

    } catch (error) {
        console.error('Dashboard Error:', error);
    } finally {
        // Initialize Lucide icons after dynamic content is added
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }
}

function loadLiveFeed(orders, b2bLeads) {
    const feedEl = document.getElementById('activity-feed');
    feedEl.innerHTML = '';

    const activities = [
        ...orders.map(o => ({ type: 'order', date: new Date(o.created_at), title: 'Retail Order', desc: `KSh ${o.total_amount_kes.toLocaleString()} - ${o.customer_name}`, status: o.status })),
        ...b2bLeads.map(l => ({ type: 'lead', date: new Date(l.created_at), title: 'B2B Sample', desc: `${l.coffee_name} - ${l.company_name}`, status: 'lead' }))
    ].sort((a,b) => b.date - a.date).slice(0, 10);

    if (activities.length === 0) {
        feedEl.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No recent activity.</p>';
        return;
    }

    activities.forEach(act => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        
        const iconName = act.type === 'order' ? 'shopping-cart' : 'package';
        const iconColor = act.type === 'order' ? 'var(--accent)' : 'var(--gold)';

        item.innerHTML = `
            <div class="activity-icon" style="background: ${iconColor}15; color: ${iconColor};">
                <i data-lucide="${iconName}" size="14"></i>
            </div>
            <div class="activity-info">
                <div class="flex-row justify-between align-center" style="gap: 0.5rem; margin-bottom: 2px;">
                    <span class="activity-title" style="font-weight: 700; font-size: 0.85rem;">${act.title}</span>
                    <span class="activity-time" style="font-size: 0.7rem; color: var(--text-muted); white-space: nowrap;">${act.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p class="activity-desc" style="font-size: 0.85rem; line-height: 1.3; word-break: break-word;">${act.desc}</p>
                <span class="activity-date" style="font-size: 0.7rem; color: var(--text-muted); opacity: 0.8;">${act.date.toLocaleDateString()}</span>
            </div>
        `;
        feedEl.appendChild(item);
    });

    // Re-run lucide for the new items
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function renderRevenueChart(dataObj, granularity) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    if (revenueChartInstance) revenueChartInstance.destroy();

    const labels = Object.keys(dataObj);
    const data = Object.values(dataObj);

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

    revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue (KSh)',
                data: data,
                borderColor: '#3b82f6',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { drawBorder: false } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderStatusChart(counts) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    if (statusChartInstance) statusChartInstance.destroy();

    statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Processing', 'Completed', 'Cancelled'],
            datasets: [{
                data: [counts.pending, counts.processing, counts.completed, counts.cancelled],
                backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'],
                hoverOffset: 10,
                borderWidth: 0,
                cutout: '70%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderProductsChart(sortedArray) {
    const ctx = document.getElementById('productsChart').getContext('2d');
    if (productsChartInstance) productsChartInstance.destroy();

    productsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedArray.map(a => a[0]),
            datasets: [{
                label: 'Sacks/Units',
                data: sortedArray.map(a => a[1]),
                backgroundColor: '#3b82f6',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function updateChartTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    [revenueChartInstance, statusChartInstance, productsChartInstance].forEach(chart => {
        if (!chart) return;
        chart.options.scales?.y && (chart.options.scales.y.ticks.color = textColor);
        chart.options.scales?.x && (chart.options.scales.x.ticks.color = textColor);
        chart.options.scales?.y && (chart.options.scales.y.grid.color = gridColor);
        chart.options.plugins.legend && (chart.options.plugins.legend.labels.color = textColor);
        chart.update();
    });
}

// Load initially
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    
    // Initialize initial icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    const themeBtn = document.getElementById('theme-toggle');
    if (localStorage.getItem('admin-theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeBtn.textContent = '☀️';
    }

    themeBtn.addEventListener('click', () => {
        const current = document.body.getAttribute('data-theme');
        if (current === 'dark') {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('admin-theme', 'light');
            themeBtn.textContent = '🌙';
        } else {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('admin-theme', 'dark');
            themeBtn.textContent = '☀️';
        }
        updateChartTheme();
    });

    const filterSelect = document.getElementById('dashboard-filter');
    const applyBtn = document.getElementById('apply-filter-btn');
    applyBtn.addEventListener('click', () => {
        loadDashboard(filterSelect.value, 
            document.getElementById('filter-start-date').value,
            document.getElementById('filter-end-date').value);
    });

    document.getElementById('download-report-btn').addEventListener('click', () => {
        alert("Exporting current view to CSV...");
        // Reuse export logic if needed
    });
});