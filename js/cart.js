// js/cart.js

// Module-style cart helpers (exported)
let cart = JSON.parse(localStorage.getItem('coffee_world_cart')) || [];

function updateCartCount() {
    const cartBtn = document.getElementById('cart-btn');
    if (cartBtn) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartBtn.textContent = `Cart (${totalItems})`;
        cartBtn.onclick = () => window.location.href = 'checkout.html';
    }
}

function saveCart() {
    localStorage.setItem('coffee_world_cart', JSON.stringify(cart));
    updateCartCount();
    // emit a small event so other scripts can react
    window.dispatchEvent(new CustomEvent('coffee_cart_updated', { detail: { cart } }));
}

function getCart() {
    return cart;
}

function addToCart(product) {
    const existingItemIndex = cart.findIndex(item => item.id === product.id);
    if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: parseFloat(product.price) || 0,
            quantity: 1
        });
    }
    saveCart();
    showToast(`${product.name} added to cart!`);
}

function removeFromCart(id) {
    const idx = cart.findIndex(i => String(i.id) === String(id));
    if (idx === -1) return false;
    const name = cart[idx].name;
    cart.splice(idx, 1);
    saveCart();
    showToast(`${name} removed from cart`);
    return true;
}

// Event Delegation for add buttons (keeps existing behavior)
document.addEventListener('click', function(e) {
    const addBtn = e.target.closest('.add-to-cart-btn');
    if (addBtn) {
        const productData = {
            id: addBtn.getAttribute('data-id'),
            name: addBtn.getAttribute('data-name'),
            price: addBtn.getAttribute('data-price')
        };
        addToCart(productData);

        const originalText = addBtn.textContent;
        addBtn.textContent = 'Added! ✓';
        addBtn.style.backgroundColor = '#0b2318';
        addBtn.style.color = '#d4af37';

        setTimeout(() => {
            addBtn.textContent = originalText;
            addBtn.style.backgroundColor = '';
            addBtn.style.color = '';
        }, 1500);
    }
});

function showToast(message) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', updateCartCount);

export { getCart, addToCart, removeFromCart, saveCart, updateCartCount };