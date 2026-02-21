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

        // --- ROBUST FALLBACK: Fetch items manually to ensure summary always shows ---
        // 1. Get all Order IDs
        const orderIds = allOrders.map(o => o.id);
        
        // 2. Fetch all items for these orders
        const { data: itemsData } = await supabase.from('b2c_order_items').select('*').in('order_id', orderIds);
        allOrderItems = itemsData || [];
        
        // 3. Fetch product names for these items
        const productIds = allOrderItems.map(i => i.product_id);
        const { data: productsData } = await supabase.from('products').select('id, name').in('id', productIds);
        allProducts = productsData || [];
        // --------------------------------------------------------------------------

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
            <td><small style="color:#666;">${dateFormatted}</small><br><strong>${timeFormatted}</strong></td>
            <td>
                <strong>${customerName}</strong><br>
                <small>📞 ${customerPhone}</small><br>
                <small>📍 ${address}</small>
            </td>
            <td><small>${items}</small></td>
            <td>
                <strong>KSh ${total}</strong><br>
                <span class="data-highlight" style="font-family: monospace; letter-spacing: 1px;">${mpesa}</span>
            </td>
            <td><span class="status-badge ${statusClass}" style="text-transform: capitalize;">${currentStatus}</span></td>
            <td>${actionBtnHTML}${printBtnHTML}</td>
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
function printPackingSlip(orderId) {
    const order = allOrders.find(o => o.id == orderId);
    if (!order) return;

    // Get items
    const orderItems = allOrderItems.filter(i => i.order_id == orderId);
    const itemsWithDetails = orderItems.map(item => {
        const product = allProducts.find(p => p.id == item.product_id);
        return {
            ...item,
            name: product ? product.name : 'Unknown Item',
            price: item.price_at_purchase || 0
        };
    });

    // Generate HTML
    const printWindow = window.open('', '_blank');
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