// admin/catalog.js
import { supabase } from '../js/supabase-client.js';

// Global store for products to avoid re-fetching for edit
let allAdminProducts = [];

// --- 1. Fetch and Display Products ---
async function loadAdminCatalog() {
    const tableBody = document.getElementById('admin-catalog-body');

    try {
        const { data: coffees, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allAdminProducts = coffees; // Store for editing
        tableBody.innerHTML = '';

        coffees.forEach(coffee => {
            const row = document.createElement('tr');
            row.classList.add('animate-slide');
            
            const typeText = coffee.type === 'green_export' ? 'B2B Green' : 'B2C Roasted';
            const imageUrl = coffee.image_url || '../assets/images/coffee-placeholder.png';
            
            let marketInfo = '';
            if (coffee.type === 'green_export') {
                marketInfo = `
                    <div class="market-spec">
                        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                            <span class="badge-mini"><i data-lucide="globe" size="10"></i> ${coffee.region || 'Kenya'}</span>
                            <span class="badge-mini"><i data-lucide="award" size="10"></i> ${coffee.grade || 'AA'}</span>
                        </div>
                        <span class="spec-value"><i data-lucide="package" size="12"></i> ${coffee.available_bags || 0} Sacks (60kg)</span>
                    </div>
                `;
            } else {
                marketInfo = `
                    <div class="market-spec">
                        <span class="price-tag">KSh ${coffee.price_kes?.toLocaleString() || 0}</span>
                        <span class="spec-value">${coffee.retail_stock || 0} Units in Stock</span>
                        <span class="badge-mini">${coffee.roast_level} Roast</span>
                    </div>
                `;
            }

            const statusClass = coffee.is_active ? 'status-active' : 'status-inactive';
            const statusText = coffee.is_active ? 'Live' : 'Hidden';

            row.innerHTML = `
                <td>
                    <div class="product-thumb-container" onclick="openLightbox('${imageUrl}')">
                        <img src="${imageUrl}" alt="${coffee.name}" class="product-thumb">
                        <div class="thumb-overlay"><i data-lucide="maximize-2"></i></div>
                    </div>
                </td>
                <td>
                    <div class="product-info-cell">
                        <span class="product-name">${coffee.name}</span>
                        <span class="product-meta">${coffee.species || 'Arabica'} | ${coffee.process || 'Washed'}</span>
                    </div>
                </td>
                <td><span class="type-badge">${typeText}</span></td>
                <td>${marketInfo}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons-group">
                        <button class="action-btn toggle-btn ${coffee.is_active ? 'active' : ''}" data-id="${coffee.id}" data-active="${coffee.is_active}" title="${coffee.is_active ? 'Hide from Catalog' : 'Publish to Catalog'}">
                            <i data-lucide="${coffee.is_active ? 'eye' : 'eye-off'}"></i>
                        </button>
                        <button class="action-btn edit-btn" data-id="${coffee.id}" title="Edit Coffee Specs">
                            <i data-lucide="edit-3"></i>
                        </button>
                        <button class="action-btn delete-btn" data-id="${coffee.id}" title="Delete Coffee" style="color: var(--danger);">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Re-initialize icons
        if (window.lucide) lucide.createIcons();

        // Attach event listeners...
        setupTableListeners();

    } catch (error) {
        console.error('Error fetching admin catalog:', error);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 3rem; color: var(--danger);">Failed to synchronize catalog.</td></tr>';
    }
}

function setupTableListeners() {
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnEl = e.currentTarget;
            const id = btnEl.getAttribute('data-id');
            const currentStatus = btnEl.getAttribute('data-active') === 'true';
            toggleProductStatus(id, currentStatus);
        });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            openEditModal(id);
        });
    });
}

// Lightbox Logic
window.openLightbox = function(url) {
    const lightbox = document.getElementById('image-lightbox');
    const img = document.getElementById('lightbox-img');
    img.src = url;
    lightbox.style.display = 'flex';
};

document.getElementById('close-lightbox').addEventListener('click', () => {
    document.getElementById('image-lightbox').style.display = 'none';
});

// --- Helper: Open Edit Modal ---
function openEditModal(id) {
    const product = allAdminProducts.find(p => p.id == id);
    if (!product) return;

    // Set Form Mode
    productForm.setAttribute('data-mode', 'edit');
    productForm.setAttribute('data-id', id);
    // Populate Common Fields
    document.getElementById('prod-type').value = product.type;
    document.getElementById('prod-name').value = product.name;
    document.getElementById('prod-desc').value = product.description || '';
    
    // Set Image Preview
    const previewImg = document.getElementById('modal-img-preview');
    previewImg.src = product.image_url || '../assets/images/coffee-placeholder.png';

    // Trigger change to show correct section
    const typeEvent = new Event('change');
    document.getElementById('prod-type').dispatchEvent(typeEvent);

    // Populate Specific Fields
    if (product.type === 'green_export') {
        document.getElementById('prod-species').value = product.species || 'Arabica';
        document.getElementById('prod-origin').value = product.region || 'Kenya';
        document.getElementById('prod-grade').value = product.grade || 'AA';
        document.getElementById('prod-process').value = product.process || 'Washed';
        document.getElementById('prod-score').value = product.cupping_score || '';
        document.getElementById('prod-b2b-stock').value = product.available_bags || '';
    } else {
        document.getElementById('prod-retail-stock').value = product.retail_stock || '';
        document.getElementById('prod-roast').value = product.roast_level || 'Medium';
        document.getElementById('prod-original-price').value = product.original_price_kes || '';
        document.getElementById('prod-current-price').value = product.price_kes || '';
    }

    modal.style.display = 'flex';
}

// Ensure global variables are defined
const productForm = document.getElementById('product-form');
const modal = document.getElementById('product-modal');

// Live Image Preview Logic
document.getElementById('prod-image-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('modal-img-preview').src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Click to trigger hidden file input
document.getElementById('image-preview-zone').addEventListener('click', () => {
    document.getElementById('prod-image-file').click();
});

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const mode = productForm.getAttribute('data-mode'); // 'create' or 'edit'
    const editId = productForm.getAttribute('data-id');

    const submitBtn = document.getElementById('save-product-btn');
    submitBtn.textContent = 'Uploading & Saving...';
    submitBtn.disabled = true;

    try {
        // 1. Handle the Image Upload First
        let imageUrl = null;
        const imageFileInput = document.getElementById('prod-image-file');
        
        if (imageFileInput.files.length > 0) {
            const file = imageFileInput.files[0];
            
            // Create a unique filename: timestamp + random string + original extension
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `coffees/${fileName}`;

            // Upload the file to the 'product-images' bucket
            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get the public URL of the newly uploaded image
            const { data: publicUrlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);
                
            imageUrl = publicUrlData.publicUrl;
        } else if (mode === 'edit') {
            // If editing and no new file, keep existing image
            const existingProduct = allAdminProducts.find(p => p.id == editId);
            imageUrl = existingProduct.image_url;
        } else {
            // Default for new products if no image uploaded
            imageUrl = 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=800&auto=format&fit=crop';
        }

        // 2. Gather the rest of the form data
        const type = document.getElementById('prod-type').value;
        const name = document.getElementById('prod-name').value;
        const description = document.getElementById('prod-desc').value;

        // Base payload (Applies to both B2B and B2C)
        const payload = {
            type: type,
            name: name,
            description: description,
            image_url: imageUrl,
            // Don't overwrite is_active on edit, default true on create
            is_active: mode === 'edit' ? undefined : true 
        };
        
        // Remove undefined keys (like is_active during edit)
        if (payload.is_active === undefined) delete payload.is_active;

        // 3. Smart Payload Routing
        if (type === 'green_export') {
            // Grab B2B Fields
            payload.species = document.getElementById('prod-species').value;
            payload.region = document.getElementById('prod-origin').value;
            payload.grade = document.getElementById('prod-grade').value;
            payload.process = document.getElementById('prod-process').value;
            payload.cupping_score = parseFloat(document.getElementById('prod-score').value) || null;
            payload.available_bags = parseInt(document.getElementById('prod-b2b-stock').value) || 0;
        } else {
            // Grab B2C Fields
            payload.retail_stock = parseInt(document.getElementById('prod-retail-stock').value) || 0;
            payload.roast_level = document.getElementById('prod-roast').value;
            payload.original_price_kes = parseFloat(document.getElementById('prod-original-price').value) || null;
            payload.price_kes = parseFloat(document.getElementById('prod-current-price').value) || 0;
        }

        // 4. Save to Database
        if (mode === 'edit') {
            const { error: dbError } = await supabase
                .from('products')
                .update(payload)
                .eq('id', editId);
            if (dbError) throw dbError;
            alert('Product updated successfully!');
        } else {
            const { error: dbError } = await supabase
                .from('products')
                .insert([payload]);
            if (dbError) throw dbError;
            alert('Product added and image uploaded successfully!');
        }

        // 5. Cleanup & Success
        modal.style.display = 'none';
        productForm.reset();
        loadAdminCatalog(); // Refresh table

    } catch (error) {
        console.error('Submission Error:', error);
        alert('Failed to save product. ' + error.message);
    } finally {
        submitBtn.textContent = mode === 'edit' ? 'Update Coffee' : 'Save Coffee to Catalog';
        submitBtn.disabled = false;
    }
});

// --- 3. Toggle Status Logic (The Kill Switch) ---
async function toggleProductStatus(id, currentStatus) {
    try {
        const newStatus = !currentStatus; // Flip it
        const { error } = await supabase
            .from('products')
            .update({ is_active: newStatus })
            .eq('id', id);

        if (error) throw error;
        
        // Refresh the table
        loadAdminCatalog();
    } catch (error) {
        console.error('Update Error:', error);
        alert('Failed to update product status.');
    }
}

// --- 4. Modal UI Handlers ---
document.getElementById('add-product-btn').addEventListener('click', () => {
    productForm.reset();
    productForm.setAttribute('data-mode', 'create');
    productForm.removeAttribute('data-id');
    document.getElementById('modal-title').textContent = 'Add New Coffee';
    document.getElementById('save-product-btn').textContent = 'Save Coffee to Catalog';
    
    // Reset visibility to default
    document.getElementById('prod-type').value = 'roasted_retail';
    document.getElementById('prod-type').dispatchEvent(new Event('change'));
    
    // Reset preview
    document.getElementById('modal-img-preview').src = 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=800&auto=format&fit=crop';
    
    modal.style.display = 'flex';
});
document.getElementById('close-modal-btn').addEventListener('click', () => {
    modal.style.display = 'none';
});

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadAdminCatalog();

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

// --- 5. Modal Dynamic Form Switching ---
document.getElementById('prod-type').addEventListener('change', (e) => {
    const b2cFields = document.getElementById('b2c-fields');
    const b2bFields = document.getElementById('b2b-fields');
    
    if (e.target.value === 'roasted_retail') {
        b2cFields.style.display = 'block';
        b2bFields.style.display = 'none';
    } else {
        b2cFields.style.display = 'none';
        b2bFields.style.display = 'block';
    }
});