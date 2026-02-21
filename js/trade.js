import { supabase } from './supabase-client.js';

// Global variable to hold all B2B coffees so we don't have to re-fetch on every click
let allB2BCoffees = [];

// --- 1. Fetch Data from Supabase ---
async function fetchTradeCatalog() {
    const tableBody = document.getElementById('catalog-body');
    const resultsCount = document.getElementById('results-count');

    try {
        const { data: coffees, error } = await supabase
            .from('products')
            .select('*')
            .eq('type', 'green_export')
            .eq('is_active', true)
            .order('cupping_score', { ascending: false });

        if (error) throw error;
        
        allB2BCoffees = coffees; // Store in memory
        renderTable(allB2BCoffees); // Render everything initially

    } catch (error) {
        console.error('Error fetching catalog:', error);
        tableBody.innerHTML = '<tr><td colspan="6">Failed to load offers. Please try refreshing.</td></tr>';
        if (resultsCount) resultsCount.textContent = "Error loading data.";
    }
}

// --- 2. Render Table Function ---
function renderTable(dataArray) {
    const tableBody = document.getElementById('catalog-body');
    const resultsCount = document.getElementById('results-count');
    
    tableBody.innerHTML = '';
    if (resultsCount) resultsCount.textContent = `Showing ${dataArray.length} available offer(s)`;

    if (dataArray.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">No coffees match your selected filters. Try clearing some.</td></tr>';
        return;
    }

    dataArray.forEach(coffee => {
        // Fallbacks: If data is missing in the DB, show a default instead of a blank space
        const originText = coffee.region || 'Kenya'; 
        const speciesText = coffee.species || 'Arabica';
        const gradeText = coffee.grade || 'AA';
        const processText = coffee.process || 'Washed';
        const scoreText = coffee.cupping_score ? coffee.cupping_score : 'Pending';
        
        // Use a default green coffee image if they didn't upload one
        const imageUrl = coffee.image_url || 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=800&auto=format&fit=crop';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="coffee-cell">
                    <img src="${imageUrl}" alt="${coffee.name}" class="table-thumb">
                    <div>
                        <strong style="font-size: 1.3rem; color: var(--gold); display: block; margin-bottom: 6px;">${coffee.name}</strong>
                        <div style="font-size: 0.9rem; color: #e0e0e0; line-height: 1.5; max-width: 280px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                            ${coffee.description || ''}
                        </div>
                    </div>
                </div>
            </td>
            <td class="region-cell"><strong>${originText}</strong><br><small>${speciesText}</small></td>
            <td><span class="grade-badge">${gradeText}</span></td>
            <td>${processText}</td>
            <td class="score-cell">${scoreText}</td>
            <td class="action-cell">
                <button class="btn secondary-btn view-btn" data-id="${coffee.id}">View</button>
                <button class="btn primary-btn sample-btn" data-id="${coffee.id}" data-name="${coffee.name}">Sample</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// --- NEW: View Details Modal Logic ---
const viewModal = document.getElementById('view-modal');
const closeViewBtn = document.getElementById('close-view-btn');

document.addEventListener('click', (e) => {
    // If they click the "View" button
    if (e.target.classList.contains('view-btn')) {
        const coffeeId = e.target.getAttribute('data-id');
        
        // Find the specific coffee in our in-memory array
        const coffee = allB2BCoffees.find(c => c.id === coffeeId);
        
        if (coffee) {
            // Populate the modal
            document.getElementById('view-image').src = coffee.image_url || 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=800&auto=format&fit=crop';
            document.getElementById('view-name').textContent = coffee.name;
            document.getElementById('view-tags').textContent = `${coffee.region || 'Kenya'} | ${coffee.species || 'Arabica'} | ${coffee.process || 'Washed'}`;
            document.getElementById('view-desc').textContent = coffee.description || 'No tasting notes provided for this lot.';
            document.getElementById('view-grade').textContent = coffee.grade || 'AA';
            document.getElementById('view-score').textContent = coffee.cupping_score || 'Pending';
            document.getElementById('view-stock').textContent = coffee.available_bags ? `${coffee.available_bags} Sacks` : '0 Sacks';
            
            // Pass the ID and Name to the modal's "Request Sample" button so it seamlessly links to the Sample Modal
            const viewToSampleBtn = document.getElementById('view-to-sample-btn');
            viewToSampleBtn.setAttribute('data-id', coffee.id);
            viewToSampleBtn.setAttribute('data-name', coffee.name);

            // Show the modal
            viewModal.style.display = 'flex';
        }
    }
});

// Close View Modal
if (closeViewBtn) closeViewBtn.onclick = () => viewModal.style.display = 'none';

// Link the View Modal's "Request Sample" button to open the Sample Modal
document.getElementById('view-to-sample-btn').addEventListener('click', (e) => {
    viewModal.style.display = 'none'; // Hide View Modal
    // The main document click listener for '.sample-btn' will catch this click since we add the class, 
    // but just to be safe, we manually trigger the sample modal logic here:
    const productId = e.target.getAttribute('data-id');
    const productName = e.target.getAttribute('data-name');
    
    document.getElementById('modal-product-id').value = productId;
    document.getElementById('modal-product-name').textContent = productName;
    document.getElementById('sample-modal').style.display = 'flex';
});

// Hide modals if clicking outside of them
window.addEventListener('click', (e) => {
    if (e.target === viewModal) viewModal.style.display = 'none';
    const sampleModal = document.getElementById('sample-modal');
    if (e.target === sampleModal) sampleModal.style.display = 'none';
});

// --- 3. The Filter Engine ---
function applyFilters() {
    // 1. Gather all checked values from the DOM
    const selectedOrigins = Array.from(document.querySelectorAll('input[data-category="origin"]:checked')).map(cb => cb.value);
    const selectedSpecies = Array.from(document.querySelectorAll('input[data-category="species"]:checked')).map(cb => cb.value);
    const selectedGrades = Array.from(document.querySelectorAll('input[data-category="grade"]:checked')).map(cb => cb.value);
    const selectedProcesses = Array.from(document.querySelectorAll('input[data-category="process"]:checked')).map(cb => cb.value);

    // 2. Filter the master array
    const filteredCoffees = allB2BCoffees.filter(coffee => {
        // Assume defaults if database fields are empty so old data doesn't disappear
        const cOrigin = coffee.region || 'Kenya'; 
        const cSpecies = coffee.species || 'Arabica';
        const cGrade = coffee.grade || 'AA';
        const cProcess = coffee.process || 'Washed';

        // Check each category. If the array is length 0, it means no filters are selected for that category (so allow everything).
        const matchesOrigin = selectedOrigins.length === 0 || selectedOrigins.includes(cOrigin);
        const matchesSpecies = selectedSpecies.length === 0 || selectedSpecies.includes(cSpecies);
        const matchesGrade = selectedGrades.length === 0 || selectedGrades.includes(cGrade);
        const matchesProcess = selectedProcesses.length === 0 || selectedProcesses.includes(cProcess);

        // It must match ALL active categories (AND logic)
        return matchesOrigin && matchesSpecies && matchesGrade && matchesProcess;
    });

    // 3. Re-render the table with the filtered results
    renderTable(filteredCoffees);
}

// --- 4. Event Listeners for Filters ---
document.querySelectorAll('.filter-sidebar input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', applyFilters);
});

// Clear Filters Button
document.getElementById('clear-filters').addEventListener('click', () => {
    document.querySelectorAll('.filter-sidebar input[type="checkbox"]').forEach(cb => cb.checked = false);
    applyFilters(); // Re-run to show all
});

// --- 2. Modal Logic ---
const modal = document.getElementById('sample-modal');
const closeBtn = document.getElementById('close-modal-btn');

// Open Modal (Using Event Delegation for dynamic buttons)
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('sample-btn')) {
        const productId = e.target.getAttribute('data-id');
        const productName = e.target.getAttribute('data-name');
        
        // Populate hidden field and title
        document.getElementById('modal-product-id').value = productId;
        document.getElementById('modal-product-name').textContent = productName;
        
        // Show modal
        modal.style.display = 'flex';
    }
});

// Close Modal
closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

// Toggle Account Number field based on carrier choice
document.getElementById('sample-courier').addEventListener('change', (e) => {
    const accountGroup = document.getElementById('account-no-group');
    const otherInput = document.getElementById('sample-courier-other');
    
    if (e.target.value === 'Local') {
        accountGroup.style.display = 'none'; // Hide for local deliveries
    } else {
        accountGroup.style.display = 'block';
    }

    // Handle "Other" option
    if (e.target.value === 'Other') {
        otherInput.style.display = 'block';
        otherInput.required = true;
    } else {
        otherInput.style.display = 'none';
        otherInput.required = false;
    }
});

// --- 5. B2B Sample Request Form Submission ---
const sampleForm = document.getElementById('sample-form');

if (sampleForm) {
    sampleForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Stop the page from reloading

        const submitBtn = sampleForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending Request...';
        submitBtn.disabled = true;

        // Determine correct courier name
        const courierSelect = document.getElementById('sample-courier').value;
        const courierOther = document.getElementById('sample-courier-other').value;
        const finalCourier = courierSelect === 'Other' ? courierOther : courierSelect;

        // 1. Gather Data from the Form Inputs (Perfectly mapped to your SQL Schema)
        const payload = {
            // We include product_id just in case you need it for relational tracking later
            product_id: document.getElementById('modal-product-id').value || null, 
            coffee_name: document.getElementById('modal-product-name').textContent, 
            company_name: document.getElementById('sample-company').value,
            contact_name: document.getElementById('sample-name').value,
            email: document.getElementById('sample-email').value,
            shipping_carrier: finalCourier, // Uses the resolved name
            courier_account: document.getElementById('sample-account').value,
            buyer_notes: document.getElementById('sample-notes').value, // New Notes Field
            status: 'pending' 
        };

        try {
            // 2. Insert into Supabase
            const { error } = await supabase.from('b2b_sample_requests').insert([payload]);
            if (error) throw error;

            // 3. Show Success Message inside the Modal
            const modalContent = document.querySelector('#sample-modal .modal-content');
            modalContent.innerHTML = `
                <div style="text-align: center; padding: 3rem 1rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
                    <h3 style="color: var(--primary-green); font-family: var(--font-heading); font-size: 2rem; margin-bottom: 1rem;">Request Received!</h3>
                    <p style="color: #555; line-height: 1.6; margin-bottom: 2rem;">
                        Thank you, ${payload.contact_name}. Our trade team will review your details and dispatch the <strong>${payload.coffee_name}</strong> sample via your ${payload.courier_name} account shortly.
                    </p>
                    <button class="btn secondary-btn" onclick="document.getElementById('sample-modal').style.display='none'; location.reload();">Close Window</button>
                </div>
            `;

        } catch (error) {
            console.error('Submission Error:', error);
            let errorMessage = 'Failed to send request. Please check your connection and try again.';
            // Provide more specific feedback for common Supabase errors
            if (error.message.includes('security policy')) {
                errorMessage += '\n\n(Developer Hint: The database is rejecting this request due to its security policies. You may need to allow anonymous inserts on the `b2b_sample_requests` table in your Supabase dashboard.)';
            } else if (error.message.includes('invalid input syntax for type integer')) {
                errorMessage += '\n\n(Developer Hint: The `product_id` is not a valid number. Check the data being sent.)';
            }
            alert(errorMessage);
            
            // Reset button if it fails
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Initialize table on load
document.addEventListener('DOMContentLoaded', fetchTradeCatalog);