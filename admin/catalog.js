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
            
            const typeText = coffee.type === 'green_export' ? 'B2B Green' : 'B2C Roasted';
            
            let stockInfo = '';
            if (coffee.type === 'green_export') {
                stockInfo = `${coffee.available_bags || 0} Bags (60kg)`;
            } else {
                stockInfo = `KSh ${coffee.price_kes || 0} | ${coffee.retail_stock || 0} in stock`;
            }

            const statusClass = coffee.is_active ? 'status-active' : 'status-inactive';
            const statusText = coffee.is_active ? 'Active (Live)' : 'Hidden';

            row.innerHTML = `
                <td><strong>${coffee.name}</strong></td>
                <td>${typeText}</td>
                <td>${stockInfo}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn secondary-btn toggle-btn" data-id="${coffee.id}" data-active="${coffee.is_active}" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">
                        ${coffee.is_active ? 'Hide' : 'Publish'}
                    </button>
                    <button class="btn danger-btn edit-btn" data-id="${coffee.id}" style="background: #333; padding: 0.4rem 0.8rem; font-size: 0.85rem;">Edit</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Attach event listeners to the newly created toggle buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const currentStatus = e.target.getAttribute('data-active') === 'true';
                toggleProductStatus(id, currentStatus);
            });
        });

        // Attach event listeners to edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                openEditModal(id);
            });
        });

    } catch (error) {
        console.error('Error fetching admin catalog:', error);
        tableBody.innerHTML = '<tr><td colspan="5">Failed to load data. Ensure Supabase is connected.</td></tr>';
    }
}

// --- Helper: Open Edit Modal ---
function openEditModal(id) {
    const product = allAdminProducts.find(p => p.id == id);
    if (!product) return;

    // Set Form Mode
    productForm.setAttribute('data-mode', 'edit');
    productForm.setAttribute('data-id', id);
    document.getElementById('modal-title').textContent = 'Edit Coffee';
    document.getElementById('save-product-btn').textContent = 'Update Coffee';

    // Populate Common Fields
    document.getElementById('prod-type').value = product.type;
    document.getElementById('prod-name').value = product.name;
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

    modal.style.display = 'flex';
}

// --- 2. Add New Product Logic (With File Upload & New UI Fields) ---
const productForm = document.getElementById('product-form');
const modal = document.getElementById('product-modal');

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