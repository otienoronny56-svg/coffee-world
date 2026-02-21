// js/shop.js
import { supabase } from './supabase-client.js';

let allRetailCoffees = [];

async function loadRetailCatalog() {
    const gridContainer = document.getElementById('product-grid');

    try {
        // Fetch only active roasted retail products
        const { data: coffees, error } = await supabase
            .from('products')
            .select('*')
            .eq('type', 'roasted_retail')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        allRetailCoffees = coffees;
        renderShop(allRetailCoffees);

    } catch (error) {
        console.error('Error fetching retail catalog:', error);
        gridContainer.innerHTML = '<p class="loading-text">Failed to load the shop. Please refresh the page.</p>';
    }
}

function renderShop(coffees) {
    const gridContainer = document.getElementById('product-grid');
    gridContainer.innerHTML = '';

    if (coffees.length === 0) {
        gridContainer.innerHTML = '<p class="loading-text">No roasted coffee currently in stock. Check back soon!</p>';
        return;
    }

    // Loop through data and build product cards
    coffees.forEach(coffee => {
            // Format prices to KSh with commas
            const formatMoney = (amount) => new Intl.NumberFormat('en-KE', { 
                style: 'currency', 
                currency: 'KES' 
            }).format(amount);

            const currentPrice = formatMoney(coffee.price_kes);
            
            // Offer Logic: Check if original price exists and is higher
            let priceDisplay = `<span class="price">${currentPrice}</span>`;
            let badgesHtml = '';
            let topOffset = 1; // Initial top offset for badges

            if (coffee.original_price_kes && coffee.original_price_kes > coffee.price_kes) {
                const originalPrice = formatMoney(coffee.original_price_kes);
                const percentOff = Math.round(((coffee.original_price_kes - coffee.price_kes) / coffee.original_price_kes) * 100);
                
                badgesHtml += `<span class="discount-badge" style="top: ${topOffset}rem;">-${percentOff}% OFF</span>`;
                topOffset += 2.5; // Push next badge down

                priceDisplay = `
                    <div class="price-container">
                        <span class="original-price">${originalPrice}</span>
                        <span class="price sale-price">${currentPrice}</span>
                    </div>
                `;
            }

            // New Arrival Badge (Last 30 Days)
            const createdDate = new Date(coffee.created_at);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            if (createdDate > thirtyDaysAgo) {
                badgesHtml += `<span class="new-badge" style="position: absolute; top: ${topOffset}rem; left: 1rem; background: var(--gold); color: var(--primary-green); padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; z-index: 2; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">NEW ARRIVAL</span>`;
            }

            const card = document.createElement('div');
            card.className = 'product-card';
            
            card.innerHTML = `
                <div class="card-image">
                    <img src="${coffee.image_url}" alt="${coffee.name}">
                    <span class="roast-badge">${coffee.roast_level} Roast</span>
                    ${badgesHtml}
                </div>
                <div class="card-content">
                    <h3>${coffee.name}</h3>
                    <p class="description">${coffee.description}</p>
                    <div class="card-footer">
                        ${priceDisplay}
                        <button class="btn primary-btn add-to-cart-btn" data-id="${coffee.id}" data-name="${coffee.name}" data-price="${coffee.price_kes}">
                            Add to Cart
                        </button>
                    </div>
                </div>
            `;
            
            gridContainer.appendChild(card);
        });
}

// Sorting Event Listener
const sortSelect = document.getElementById('sort-select');
if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
        const sortValue = e.target.value;
        let sortedCoffees = [...allRetailCoffees];

        if (sortValue === 'price-low') {
            sortedCoffees.sort((a, b) => a.price_kes - b.price_kes);
        } else if (sortValue === 'price-high') {
            sortedCoffees.sort((a, b) => b.price_kes - a.price_kes);
        } else if (sortValue === 'roast-light') {
            const roastOrder = { 'Light': 1, 'Medium': 2, 'Dark': 3, 'Espresso': 4 };
            sortedCoffees.sort((a, b) => (roastOrder[a.roast_level] || 99) - (roastOrder[b.roast_level] || 99));
        } else if (sortValue === 'roast-dark') {
            const roastOrder = { 'Light': 1, 'Medium': 2, 'Dark': 3, 'Espresso': 4 };
            sortedCoffees.sort((a, b) => (roastOrder[b.roast_level] || 99) - (roastOrder[a.roast_level] || 99));
        } else {
            // Newest (default)
            sortedCoffees.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        
        renderShop(sortedCoffees);
    });
}

// Run the function when the page loads
document.addEventListener('DOMContentLoaded', loadRetailCatalog);