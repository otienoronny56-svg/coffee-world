// admin/b2c-orders.js
import { supabase } from '../js/supabase-client.js';

// Global state to hold data for filtering
let allOrders = [];
let allOrderItems = [];
let allProducts = [];

async function loadOrders() {
    const tableBody = document.getElementById('orders-body');
    tableBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

    try {
        // Fetch all orders, newest first
        const { data: orders, error } = await supabase
            .from('b2c_orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allOrders = orders; // Store in global variable

        if (allOrders.length > 0) {
            // 1. Get all Order IDs
            const orderIds = allOrders.map(o => o.id);
            
            // 2. Fetch all items for these orders (only if IDs exist)
            try {
                const { data: itemsData, error: itemsError } = await supabase
                    .from('b2c_order_items')
                    .select('*')
                    .in('order_id', orderIds);
                
                if (!itemsError) {
                    allOrderItems = itemsData || [];
                    
                    // 3. Fetch product names for these items
                    const productIds = [...new Set(allOrderItems.map(i => i.product_id))];
                    if (productIds.length > 0) {
                        const { data: productsData } = await supabase
                            .from('products')
                            .select('id, name')
                            .in('id', productIds);
                        allProducts = productsData || [];
                    }
                }
            } catch (err) {
                console.warn('Could not fetch order items:', err);
            }
        }

        renderOrders();

    } catch (error) {
        console.error('Error fetching orders:', error);
        tableBody.innerHTML = '<tr><td colspan="6">Failed to load orders. Check console.</td></tr>';
    }
}

function renderOrders() {
    const tableBody = document.getElementById('orders-body');
    const searchTerm = document.getElementById('order-search').value.toLowerCase();
    const filterValue = document.getElementById('status-filter').value;

    tableBody.innerHTML = '';

    // Filter Logic
    const filteredOrders = allOrders.filter(order => {
        const status = (order.status || 'pending').toLowerCase();
        
        // 1. Status Filter
        if (filterValue === 'active' && status === 'completed') return false;
        if (filterValue === 'processing' && status !== 'processing') return false;
        if (filterValue === 'completed' && status !== 'completed') return false;

        // 2. Search Filter: Check Name or M-Pesa Code
        const name = (order.customer_name || '').toLowerCase();
        const mpesa = (order.mpesa_receipt_number || '').toLowerCase();
        
        return name.includes(searchTerm) || mpesa.includes(searchTerm);
    });

    if (filteredOrders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No orders match your criteria.</td></tr>';
        return;
    }

    filteredOrders.forEach(order => {
        // Format the Date safely
        const dateObj = new Date(order.created_at);
        const dateFormatted = dateObj.toLocaleDateString('en-GB'); 
        const timeFormatted = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Fix case sensitivity for status
        const currentStatus = (order.status || 'pending').toLowerCase();
        
        let statusClass = 'status-pending';
        if (currentStatus === 'processing') statusClass = 'status-processing';
        if (currentStatus === 'completed') statusClass = 'status-completed';

        // Action Button Logic
        let actionBtnHTML = '';
        if (currentStatus === 'pending') {
            actionBtnHTML = `<button class="btn primary-btn update-btn" data-id="${order.id}" data-next="Processing" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Verify Payment</button>`;
        } else if (currentStatus === 'processing') {
            actionBtnHTML = `<button class="btn primary-btn update-btn" data-id="${order.id}" data-next="Completed" style="background: #2e7d32; padding: 0.4rem 0.8rem; font-size: 0.85rem;">Mark Dispatched</button>`;
        } else {
            actionBtnHTML = `<span style="color: #888; font-size: 0.85rem;">Archived</span>`;
        }
        
        // Add Print Button
        const printBtnHTML = `<button class="btn secondary-btn print-btn" data-id="${order.id}" style="padding: 0.4rem 0.6rem; font-size: 0.85rem; margin-left: 0.5rem;" title="Print Packing Slip">🖨️</button>`;

        // PERFECTLY MAPPED TO YOUR SQL SCHEMA
        const customerName = order.customer_name || 'Unknown Customer';
        const customerPhone = order.customer_phone || 'No phone';
        const address = order.shipping_address || 'Not provided';
        const total = order.total_amount_kes || '0.00';
        const mpesa = order.mpesa_receipt_number || 'Pending';
        
        // SMART SUMMARY GENERATION
        let items = order.items_summary;
        
        // If the simple summary column is empty (old orders), reconstruct it from the fetched items
        if (!items && allOrderItems.length > 0) {
            const myItems = allOrderItems.filter(i => i.order_id === order.id);
            if (myItems.length > 0) {
                items = myItems.map(i => {
                    const p = allProducts.find(prod => prod.id === i.product_id);
                    return `${i.quantity} x ${p ? p.name : 'Coffee'}`;
                }).join(', ');
            }
        }
        
        if (!items) items = '<span style="color:#999; font-style:italic;">No items found</span>';

        // Build the row
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 700;">${dateFormatted}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${timeFormatted}</span>
                </div>
            </td>
            <td>
                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                    <span style="font-weight: 700; color: var(--text-dark);">${customerName}</span>
                    <span style="font-size: 0.85rem; color: var(--text-muted);"><i style="font-style: normal; opacity: 0.6;">📞</i> ${customerPhone}</span>
                    <span style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.2;"><i style="font-style: normal; opacity: 0.6;">📍</i> ${address}</span>
                </div>
            </td>
            <td>
                <div style="max-width: 250px; font-size: 0.85rem; font-weight: 500; color: var(--text-dark);">
                    ${items}
                </div>
            </td>
            <td>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 700; color: var(--accent);">KSh ${total.toLocaleString()}</span>
                    <span class="status-badge" style="background: rgba(15, 23, 42, 0.05); color: var(--text-dark); font-family: monospace; font-size: 0.7rem; margin-top: 0.25rem;">${mpesa}</span>
                </div>
            </td>
            <td><span class="status-badge ${statusClass}">${currentStatus}</span></td>
            <td>
                <div class="flex-row">
                    ${actionBtnHTML}
                    <button class="btn secondary-btn print-btn" data-id="${order.id}" title="Print Packing Slip" style="padding: 0.5rem; border-color: var(--border);">
                        🖨️
                    </button>
                    ${currentStatus === 'completed' ? `
                    <button class="btn secondary-btn" style="padding: 0.5rem; opacity: 0.5; pointer-events: none;">
                        ✅
                    </button>` : ''}
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Re-attach listeners to the dynamic buttons
    document.querySelectorAll('.update-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const nextStatus = e.target.getAttribute('data-next');
            updateOrderStatus(id, nextStatus);
        });
    });
    
    // Attach listeners to print buttons
    document.querySelectorAll('.print-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            printPackingSlip(id);
        });
    });
}

// Event Listeners for Filters
document.getElementById('order-search').addEventListener('input', renderOrders);
document.getElementById('status-filter').addEventListener('change', renderOrders);


// Update the status in Supabase
async function updateOrderStatus(id, newStatus) {
    try {
        // FIX: Force the string to lowercase so it strictly matches your Supabase ENUM
        const safeStatus = newStatus.toLowerCase(); 

        const { error } = await supabase
            .from('b2c_orders')
            .update({ status: safeStatus })
            .eq('id', id);

        if (error) throw error;
        
        // Reload table to reflect changes instantly
        loadOrders();
    } catch (error) {
        console.error('Update Error:', error);
        alert('Failed to update order status. Check the console for details.');
    }
}

// --- Print Packing Slip Logic ---
async function printPackingSlip(orderId) {
    const order = allOrders.find(o => o.id == orderId);
    if (!order) return;

    // Open window immediately to avoid popup blockers
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to print receipts.');
        return;
    }
    printWindow.document.write('<html><body style="font-family:sans-serif; text-align:center; padding:2rem;">Loading receipt data...</body></html>');

    // Fetch items specifically for this order (Robust Fix)
    let { data: orderItems } = await supabase
        .from('b2c_order_items')
        .select('*')
        .eq('order_id', orderId);
    
    orderItems = orderItems || [];

    // Fetch product names for these items
    const productIds = orderItems.map(i => i.product_id);
    const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds);

    const itemsWithDetails = orderItems.map(item => {
        const product = (products || []).find(p => p.id == item.product_id);
        return {
            ...item,
            name: product ? product.name : 'Unknown Item',
            price: item.price_at_purchase || 0
        };
    });

    // Generate HTML (Overwrite loading message)
    printWindow.document.open();
    printWindow.document.write(`
        <html>
        <head>
            <title>Packing Slip #${order.id}</title>
            <style>
                body { font-family: 'Inter', sans-serif; padding: 2rem; color: #333; max-width: 800px; margin: 0 auto; }
                .header { display: flex; justify-content: space-between; margin-bottom: 2rem; border-bottom: 2px solid #d4af37; padding-bottom: 1rem; }
                .logo { font-size: 1.5rem; font-weight: bold; color: #0b2318; }
                .invoice-details { text-align: right; }
                .customer-details { margin-bottom: 2rem; background: #f9f9f9; padding: 1.5rem; border-radius: 8px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
                th, td { text-align: left; padding: 0.8rem; border-bottom: 1px solid #eee; }
                th { background-color: #f0f0f0; font-weight: 600; }
                .total-section { text-align: right; font-size: 1.2rem; font-weight: bold; margin-top: 1rem; }
                @media print {
                    body { padding: 0; }
                    .customer-details { background: none; border: 1px solid #eee; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">Coffee World Investments</div>
                <div class="invoice-details">
                    <p><strong>Order #${order.id}</strong></p>
                    <p>Date: ${new Date(order.created_at).toLocaleDateString()}</p>
                    <p>Payment: ${order.mpesa_receipt_number || 'Pending'}</p>
                </div>
            </div>
            
            <div class="customer-details">
                <h3 style="margin-top:0;">Ship To:</h3>
                <p><strong>${order.customer_name}</strong></p>
                <p>${order.customer_phone}</p>
                <p>${order.shipping_address}</p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsWithDetails.map(item => `
                        <tr>
                            <td>${item.name} <br><small style="color:#666">${item.grind_type || 'Whole Bean'}</small></td>
                            <td>${item.quantity}</td>
                            <td>KSh ${item.price.toLocaleString()}</td>
                            <td>KSh ${(item.quantity * item.price).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="total-section">
                Total: KSh ${order.total_amount_kes.toLocaleString()}
            </div>
            
            <div style="margin-top: 4rem; border-top: 1px dashed #ccc; padding-top: 1rem; font-size: 0.9rem; color: #666; text-align: center;">
                <p>Thank you for your business!</p>
                <p>Coffee World Investments Limited | Nairobi, Kenya</p>
            </div>

            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Refresh button logic
document.getElementById('refresh-orders-btn').addEventListener('click', loadOrders);

// Load initially
document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    // Theme Toggle Logic
    const themeBtn = document.getElementById('theme-toggle');
    if (localStorage.getItem('admin-theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
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
    });
});