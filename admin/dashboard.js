import { supabase } from '../js/supabase-client.js';

// Store chart instances globally so we can destroy them before re-rendering
let revenueChartInstance = null;
let statusChartInstance = null;
let productsChartInstance = null;

// Store data for export
let currentExportOrders = [];
let currentExportStats = {};

async function loadDashboard(filterType = 'all', customStart = null, customEnd = null) {
    const revenueEl = document.getElementById('total-revenue');
    const activeOrdersEl = document.getElementById('active-orders');
    const b2bLeadsEl = document.getElementById('b2b-leads');
    const lowStockEl = document.getElementById('low-stock');
    const revenueTitleEl = document.getElementById('revenue-chart-title');

    // --- 1. Determine Date Range ---
    let startDate = null;
    let endDate = new Date().toISOString(); // Now
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
        // --- 2. Fetch Orders (Filtered) ---
        let ordersQuery = supabase
            .from('b2c_orders')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (startDate) ordersQuery = ordersQuery.gte('created_at', startDate);
        if (endDate && filterType === 'custom') ordersQuery = ordersQuery.lte('created_at', endDate);

        const { data: orders, error: ordersError } = await ordersQuery;
        if (ordersError) throw ordersError;
        currentExportOrders = orders; // Capture for export

        // DEBUG: Log orders count
        console.log(`Dashboard: Fetched ${orders.length} orders.`);

        // --- 3. Fetch Order Items (Only for the fetched orders) ---
        // We need items only for the orders in the current timeframe to calculate "Top Selling" correctly
        const orderIds = orders.map(o => o.id);
        let orderItems = [];
        if (orderIds.length > 0) {
            const { data: items, error: itemsError } = await supabase
                .from('b2c_order_items')
                .select('*')
                .in('order_id', orderIds);
            if (itemsError) throw itemsError;
            orderItems = items || [];
            
            // DEBUG: Log items count
            console.log(`Dashboard: Fetched ${orderItems.length} order items.`);
            if (orders.length > 0 && orderItems.length === 0) {
                console.warn('⚠️ WARNING: Orders exist but no items returned. This usually means Row Level Security (RLS) is blocking access to the "b2c_order_items" table. Please add a SELECT policy in Supabase.');
            }
        }

        // --- 4. Fetch Products (All, for names & stock) ---
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*');
        if (productsError) throw productsError;

        // --- 5. Fetch B2B Requests Count (Filtered) ---
        let b2bQuery = supabase
            .from('b2b_sample_requests')
            .select('*', { count: 'exact', head: true });
        
        if (startDate) b2bQuery = b2bQuery.gte('created_at', startDate);
        if (endDate && filterType === 'custom') b2bQuery = b2bQuery.lte('created_at', endDate);

        const { count: b2bCount, error: b2bError } = await b2bQuery;
        if (b2bError) throw b2bError;

        // --- CALCULATIONS ---

        // A. Total Revenue & Active Orders
        let totalRevenue = 0;
        let activeCount = 0;
        const statusCounts = { pending: 0, processing: 0, completed: 0, cancelled: 0 };
        const revenueTrend = {}; 

        // Determine Granularity for Chart
        let granularity = 'Monthly';
        if (filterType === 'today') granularity = 'Hourly';
        else if (filterType === 'week' || filterType === 'month') granularity = 'Daily';
        else if (filterType === 'custom' && startDate && endDate) {
             if ((new Date(endDate) - new Date(startDate)) < 2629800000) granularity = 'Daily';
        }

        orders.forEach(order => {
            const status = (order.status || 'pending').toLowerCase();
            
            // Revenue (Sum completed and processing, ignore cancelled)
            if (status !== 'cancelled') {
                totalRevenue += (order.total_amount_kes || 0);
            }

            // Active Count
            if (status === 'pending' || status === 'processing') {
                activeCount++;
            }

            // Status Distribution
            if (statusCounts[status] !== undefined) statusCounts[status]++;
            else statusCounts['other'] = (statusCounts['other'] || 0) + 1;

            // Revenue Trend Grouping
            const date = new Date(order.created_at);
            let key;

            if (granularity === 'Hourly') {
                key = date.getHours() + ':00';
            } else if (granularity === 'Daily') {
                key = date.toLocaleString('default', { month: 'short', day: 'numeric' });
            } else {
                key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            }

            if (!revenueTrend[key]) revenueTrend[key] = 0;
            if (status !== 'cancelled') revenueTrend[key] += (order.total_amount_kes || 0);
        });

        // B. Low Stock
        let lowStockCount = 0;
        products.forEach(p => {
            if (p.type === 'roasted_retail' && p.retail_stock < 10) lowStockCount++;
        });

        // C. Top Selling Products
        const productSales = {};
        orderItems.forEach(item => {
            // FIX: Use loose equality (==) to match string IDs with number IDs
            const product = products.find(p => p.id == item.product_id);
            const name = product ? product.name : `Unknown Item (${item.product_id})`;
            if (!productSales[name]) productSales[name] = 0;
            productSales[name] += (item.quantity || 0);
        });

        // Sort top products
        const sortedProducts = Object.entries(productSales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Top 5

        // DEBUG: Check console to see if data is flowing
        console.log('Dashboard Stats:', { revenue: totalRevenue, topProducts: sortedProducts });

        // Capture stats for export
        currentExportStats = {
            revenue: totalRevenue,
            activeOrders: activeCount,
            b2bLeads: b2bCount || 0,
            lowStock: lowStockCount
        };

        // --- UPDATE UI ---
        revenueEl.textContent = `KSh ${totalRevenue.toLocaleString()}`;
        activeOrdersEl.textContent = activeCount;
        b2bLeadsEl.textContent = b2bCount || 0;
        lowStockEl.textContent = lowStockCount;

        // --- UPDATE CHART TITLE ---
        if (revenueTitleEl) {
            const titles = {
                'today': 'Revenue Performance (Today)',
                'week': 'Revenue Performance (Last 7 Days)',
                'month': 'Revenue Performance (This Month)',
                'year': 'Revenue Performance (This Year)',
                'custom': 'Revenue Performance (Custom Range)',
                'all': 'Revenue Performance (All Time)'
            };
            revenueTitleEl.textContent = titles[filterType] || 'Revenue Performance';
        }

        // --- RENDER CHARTS ---
        renderRevenueChart(revenueTrend, granularity);
        renderStatusChart(statusCounts);
        renderProductsChart(sortedProducts);

    } catch (error) {
        console.error('Dashboard Error:', error);
        alert('Failed to load dashboard data.');
    }
}

function renderRevenueChart(dataObj, granularity) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    const labels = Object.keys(dataObj);
    const data = Object.values(dataObj);

    // Destroy old chart if exists
    if (revenueChartInstance) revenueChartInstance.destroy();

    // Handle Empty Data
    if (labels.length === 0) {
        showNoDataMessage('revenueChart', 'No revenue data for this period');
        return;
    }

    revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Revenue (${granularity})`,
                data: data,
                borderColor: '#d4af37',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderStatusChart(counts) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    if (statusChartInstance) statusChartInstance.destroy();

    // Handle Empty Data (Check if all counts are 0)
    if (Object.values(counts).every(val => val === 0)) {
        showNoDataMessage('statusChart', 'No orders found');
        return;
    }

    statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Processing', 'Completed', 'Cancelled'],
            datasets: [{
                data: [counts.pending, counts.processing, counts.completed, counts.cancelled],
                backgroundColor: ['#e65100', '#1565c0', '#2e7d32', '#d32f2f'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderProductsChart(sortedArray) {
    const ctx = document.getElementById('productsChart').getContext('2d');
    const labels = sortedArray.map(item => item[0]);
    const data = sortedArray.map(item => item[1]);

    if (productsChartInstance) productsChartInstance.destroy();

    if (sortedArray.length === 0) {
        showNoDataMessage('productsChart', 'No product sales data available');
        return;
    }

    productsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Units Sold',
                data: data,
                backgroundColor: '#0b2318',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Helper to show text on canvas when data is empty
function showNoDataMessage(canvasId, message) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "14px Inter, sans-serif";
    ctx.fillStyle = "#888";
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

// Helper to update chart colors based on theme
function updateChartTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#eefbf3' : '#666666';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    Chart.defaults.color = textColor;
    Chart.defaults.borderColor = gridColor;

    [revenueChartInstance, statusChartInstance, productsChartInstance].forEach(chart => {
        if (chart) {
            chart.options.color = textColor;
            chart.options.borderColor = gridColor;
            if (chart.options.scales) {
                Object.values(chart.options.scales).forEach(scale => {
                    if (scale.ticks) scale.ticks.color = textColor;
                    if (scale.grid) scale.grid.color = gridColor;
                });
            }
            chart.update();
        }
    });
}

// --- CSV Export Logic ---
function downloadReport() {
    if (!currentExportOrders || currentExportOrders.length === 0) {
        alert("No data available to export for the selected period.");
        return;
    }

    const now = new Date().toLocaleString();
    let csvContent = "data:text/csv;charset=utf-8,";

    // 1. Summary Section
    csvContent += `Report Generated,${now}\n`;
    csvContent += `Total Revenue,KSh ${currentExportStats.revenue}\n`;
    csvContent += `Active Orders,${currentExportStats.activeOrders}\n`;
    csvContent += `B2B Leads (Count),${currentExportStats.b2bLeads}\n`;
    csvContent += `Low Stock Alerts,${currentExportStats.lowStock}\n\n`;

    // 2. Headers
    const headers = ["Order ID", "Date", "Customer Name", "Phone", "Address", "M-Pesa Code", "Total (KSh)", "Status", "Items Summary"];
    csvContent += headers.join(",") + "\n";

    // 3. Rows
    currentExportOrders.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString();
        const row = [
            order.id,
            date,
            `"${(order.customer_name || '').replace(/"/g, '""')}"`, // Escape quotes
            `"${(order.customer_phone || '').replace(/"/g, '""')}"`,
            `"${(order.shipping_address || '').replace(/"/g, '""')}"`,
            order.mpesa_receipt_number || '',
            order.total_amount_kes || 0,
            order.status || 'pending',
            `"${(order.items_summary || '').replace(/"/g, '""')}"`
        ];
        csvContent += row.join(",") + "\n";
    });

    // 4. Trigger Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CWI_Financial_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();

    // Theme Toggle Logic (Shared)
    const themeBtn = document.getElementById('theme-toggle');
    if (localStorage.getItem('admin-theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        updateChartTheme(); // Apply dark theme to charts initially
        themeBtn.textContent = '☀️';
    }
    themeBtn.addEventListener('click', () => {
        if (document.body.getAttribute('data-theme') === 'dark') {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('admin-theme', 'light');
            themeBtn.textContent = '🌙';
        } else {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('admin-theme', 'dark');
            themeBtn.textContent = '☀️';
        }
        updateChartTheme(); // Update charts on toggle
    });

    // Filter Logic
    const filterSelect = document.getElementById('dashboard-filter');
    const customInputs = document.getElementById('custom-date-inputs');
    const applyBtn = document.getElementById('apply-filter-btn');

    filterSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customInputs.style.display = 'flex';
        } else {
            customInputs.style.display = 'none';
        }
    });

    applyBtn.addEventListener('click', () => {
        const type = filterSelect.value;
        const start = document.getElementById('filter-start-date').value;
        const end = document.getElementById('filter-end-date').value;
        
        loadDashboard(type, start, end);
    });

    document.getElementById('download-report-btn').addEventListener('click', downloadReport);
});