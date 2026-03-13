import { supabase } from './supabase-client.js';
import { getCart, removeFromCart } from './cart.js';

// cart is managed in `cart.js`; use helper to fetch current cart

// 2. Render Cart Items
async function renderCheckoutCart() {
    const container = document.getElementById('checkout-cart-items');
    const totalEl = document.getElementById('checkout-total');
    const cart = getCart();

    if (!cart || cart.length === 0) {
        container.innerHTML = '<p>Your cart is empty.</p>';
        document.getElementById('submit-btn').style.display = 'none'; // Better than just disabled
        totalEl.textContent = 'KSh 0.00';
        return 0;
    }

    // --- NEW: STALE PRODUCT VALIDATION ---
    try {
        const ids = cart.map(item => item.id);
        const { data: validProducts, error } = await supabase
            .from('products')
            .select('id')
            .in('id', ids);

        if (!error && validProducts) {
            const validIds = validProducts.map(p => p.id);
            const staleItems = cart.filter(item => !validIds.includes(item.id));

            if (staleItems.length > 0) {
                console.warn('Removing stale cart items:', staleItems);
                staleItems.forEach(item => removeFromCart(item.id));
                // After removing, get updated cart
                const updatedCart = getCart();
                if (updatedCart.length === 0) {
                   container.innerHTML = '<p>Your cart was cleared as the items are no longer available.</p>';
                   document.getElementById('submit-btn').style.display = 'none';
                   totalEl.textContent = 'KSh 0.00';
                   return 0;
                }
            }
        }
    } catch (ve) {
        console.error('Cart Validation Error:', ve);
    }
    // --- END VALIDATION ---

    const currentCart = getCart(); // Get fresh state after possible validation cleanup
    let total = 0;
    container.innerHTML = '';

    currentCart.forEach(item => {
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
    document.getElementById('submit-btn').style.display = 'block';
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
    
    const cart = getCart();
    if (cart.length === 0) {
        alert('Cart is empty.');
        submitBtn.textContent = 'Place Order';
        submitBtn.disabled = false;
        return;
    }

    // Calculate total manually for final insert
    const orderTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Generate a readable summary string for the Admin Panel
    let itemsSummary = cart.map(item => `${item.quantity} x ${item.name}`).join(', ');
    
    if (!itemsSummary || itemsSummary.trim() === '') itemsSummary = 'Standard Order (See Items)';

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
                items_summary: itemsSummary
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
            grind_type: 'Whole Bean'
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
        
        // Specific user feedback for foreign key violations (stale products)
        if (error.code === '23503') {
            alert('One or more items in your cart are no longer in our catalog. The page will refresh to update your cart.');
            window.location.reload();
        } else {
            alert('Order Failed: ' + (error.message || 'Check connection.'));
        }
        
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