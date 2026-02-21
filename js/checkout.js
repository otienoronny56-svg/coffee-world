import { supabase } from './supabase-client.js';
import { getCart, removeFromCart } from './cart.js';

// cart is managed in `cart.js`; use helper to fetch current cart

// 2. Render Cart Items
function renderCheckoutCart() {
    const container = document.getElementById('checkout-cart-items');
    const totalEl = document.getElementById('checkout-total');
    const cart = getCart();

    if (!cart || cart.length === 0) {
        container.innerHTML = '<p>Your cart is empty.</p>';
        document.getElementById('submit-btn').disabled = true;
        totalEl.textContent = 'KSh 0.00';
        return 0;
    }

    let total = 0;
    container.innerHTML = '';

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const row = document.createElement('div');
        row.className = 'checkout-item-row';
        row.innerHTML = `
            <div>
                <strong>${item.name}</strong><br>
                <small>Qty: ${item.quantity}</small>
            </div>
            <div style="display:flex; align-items:center; gap:0.75rem;">
                <div>KSh ${itemTotal.toLocaleString()}</div>
                <button class="btn secondary-btn remove-from-cart" data-id="${item.id}" style="padding:0.35rem 0.6rem; font-size:0.85rem;">Remove</button>
            </div>
        `;
        container.appendChild(row);
    });

    totalEl.textContent = `KSh ${total.toLocaleString()}`;
    document.getElementById('submit-btn').disabled = false;
    return total;
}

// 3. Handle Form Submission
document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    // Gather Form Data
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const address = document.getElementById('cust-address').value;
    const mpesaCode = document.getElementById('mpesa-code').value.toUpperCase();
    const orderTotal = renderCheckoutCart();
    const cart = getCart();

    // Generate a readable summary string for the Admin Panel
    let itemsSummary = cart.map(item => `${item.quantity} x ${item.name}`).join(', ');
    
    // Safety Check: Ensure this is never null or empty string
    if (!itemsSummary || itemsSummary.trim() === '') itemsSummary = 'Standard Order (See Items)';

    // DEBUG: Log the payload to see if itemsSummary is generated correctly
    console.log('Submitting Order Payload:', { name, mpesaCode, total: orderTotal, itemsSummary });

    try {
        // Step A: Insert into b2c_orders table
        const { data: order, error: orderError } = await supabase
            .from('b2c_orders')
            .insert([{
                customer_name: name,
                customer_phone: phone,
                shipping_address: address,
                mpesa_receipt_number: mpesaCode,
                total_amount_kes: orderTotal,
                status: 'pending',
                items_summary: itemsSummary // Save the summary here
            }])
            .select()
            .single();

        if (orderError) throw orderError;

        // Step B: Insert the individual items into b2c_order_items
        const orderItems = cart.map(item => ({
            order_id: order.id,
            product_id: item.id,
            quantity: item.quantity,
            price_at_purchase: item.price,
            grind_type: 'Whole Bean' // You can expand this later to let them choose
        }));

        const { error: itemsError } = await supabase
            .from('b2c_order_items')
            .insert(orderItems);

        if (itemsError) throw itemsError;

        // Step C: Clear the Cart and Show Success
        localStorage.removeItem('coffee_world_cart');
        document.getElementById('success-modal').style.display = 'flex';

    } catch (error) {
        console.error('Checkout Error:', error);
        alert('Order Failed: ' + (error.message || 'Check console for details.'));
        submitBtn.textContent = 'Place Order';
        submitBtn.disabled = false;
    }
});

// 4. Handle remove clicks (delegation)
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.remove-from-cart');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    if (!id) return;
    const removed = removeFromCart(id);
    if (removed) renderCheckoutCart();
});

// 5. Initialize page
document.addEventListener('DOMContentLoaded', renderCheckoutCart);