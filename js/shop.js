// js/shop.js
import { supabase } from './supabase-client.js';

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

        gridContainer.innerHTML = '';

        if (coffees.length === 0) {
            gridContainer.innerHTML = '<p class="loading-text">No roasted coffee currently in stock. Check back soon!</p>';
            return;
        }

        // Loop through data and build product cards
        coffees.forEach(coffee => {
            // Format price to KSh with commas
            const formattedPrice = new Intl.NumberFormat('en-KE', { 
                style: 'currency', 
                currency: 'KES' 
            }).format(coffee.price_kes);

            const card = document.createElement('div');
            card.className = 'product-card';
            
            card.innerHTML = `
                <div class="card-image">
                    <img src="${coffee.image_url}" alt="${coffee.name}">
                    <span class="roast-badge">${coffee.roast_level} Roast</span>
                </div>
                <div class="card-content">
                    <h3>${coffee.name}</h3>
                    <p class="description">${coffee.description}</p>
                    <div class="card-footer">
                        <span class="price">${formattedPrice}</span>
                        <button class="btn primary-btn add-to-cart-btn" data-id="${coffee.id}" data-name="${coffee.name}" data-price="${coffee.price_kes}">
                            Add to Cart
                        </button>
                    </div>
                </div>
            `;
            
            gridContainer.appendChild(card);
        });

    } catch (error) {
        console.error('Error fetching retail catalog:', error);
        gridContainer.innerHTML = '<p class="loading-text">Failed to load the shop. Please refresh the page.</p>';
    }
}

// Run the function when the page loads
document.addEventListener('DOMContentLoaded', loadRetailCatalog);