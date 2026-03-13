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
            
            const statusClass = coffee.is_active ? 'status-active' : 'status-inactive';
            const statusText = coffee.is_active ? 'Live' : 'Hidden';
            
            if (coffee.type === 'green_export') {
                row.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600;">
                        <i data-lucide="map-pin" size="14" style="color: var(--accent);"></i>
                        ${coffee.region || 'Kenya'}
                    </div>
                </td>
                <td>
                    <span class="badge-mini" style="background: var(--accent-hover); color: white; border: none; padding: 4px 10px;">
                        ${coffee.grade || 'AA'}
                    </span>
                </td>
                <td>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 600; color: var(--text-dark);">${coffee.species || 'Arabica'}</span>
                        <small style="color: var(--text-muted); text-transform: uppercase; font-size: 0.75rem;">${coffee.process || 'Washed'}</small>
                    </div>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--gold); font-weight: 700;">
                        <i data-lucide="star" size="14"></i>
                        ${coffee.cupping_score ? coffee.cupping_score.toFixed(2) : 'N/A'}
                    </div>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <i data-lucide="package" size="14" style="color: var(--text-muted);"></i>
                        <span><strong>${coffee.available_bags || 0}</strong> Sacks (60kg)</span>
                    </div>
                </td>
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
            } else {
                // Fallback for legacy B2C or other types
                row.innerHTML = `
                    <td colspan="5" style="color: var(--text-muted); font-style: italic;">Non-B2B Entry: ${coffee.name}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="action-buttons-group">
                            <button class="action-btn edit-btn" data-id="${coffee.id}"><i data-lucide="edit-3"></i></button>
                            <button class="action-btn delete-btn" data-id="${coffee.id}"><i data-lucide="trash-2"></i></button>
                        </div>
                    </td>
                `;
            }

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

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this coffee from the catalog? This action cannot be undone.')) {
                deleteProduct(id);
            }
        });
    });
}

// --- 3. Delete Product ---
async function deleteProduct(id) {
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        loadAdminCatalog(); // Refresh table
    } catch (error) {
        console.error('Delete Error:', error);
        alert('Failed to delete product: ' + error.message);
    }
}

// Lightbox Removed

// --- Helper: Open Edit Modal ---
function openEditModal(id) {
    const product = allAdminProducts.find(p => p.id == id);
    if (!product) return;

    // Set Form Mode
    productForm.setAttribute('data-mode', 'edit');
    productForm.setAttribute('data-id', id);
    // Populate Common Fields
    document.getElementById('prod-type').value = product.type;
    document.getElementById('prod-name').value = product.name || 'Green Coffee Lot';
    document.getElementById('prod-desc').value = product.description || '';

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

    document.getElementById('modal-title').textContent = 'Edit Coffee Specs';
    document.getElementById('save-product-btn').textContent = 'Update Coffee';
    modal.style.display = 'flex';
}

// Ensure global variables are defined
const productForm = document.getElementById('product-form');
const modal = document.getElementById('product-modal');

// Visual Preview Logic Removed

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const mode = productForm.getAttribute('data-mode'); // 'create' or 'edit'
    const editId = productForm.getAttribute('data-id');

    const submitBtn = document.getElementById('save-product-btn');
    submitBtn.textContent = 'Uploading & Saving...';
    submitBtn.disabled = true;

    try {
        // Image Handling Removed
        let imageUrl = mode === 'edit' ? allAdminProducts.find(p => p.id == editId).image_url : 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=800&auto=format&fit=crop';

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
    document.getElementById('prod-type').value = 'green_export';
    document.getElementById('prod-type').dispatchEvent(new Event('change'));
    
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
const prodTypeEl = document.getElementById('prod-type');
if (prodTypeEl) {
    prodTypeEl.addEventListener('change', (e) => {
        const b2cFields = document.getElementById('b2c-fields');
        const b2bFields = document.getElementById('b2b-fields');
        
        if (e.target.value === 'roasted_retail') {
            if (b2cFields) b2cFields.style.display = 'block';
            if (b2bFields) b2bFields.style.display = 'none';
        } else {
            if (b2cFields) b2cFields.style.display = 'none';
            if (b2bFields) b2bFields.style.display = 'block';
        }
    });
}