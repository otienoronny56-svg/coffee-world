// admin/b2b-samples.js
import { supabase } from '../js/supabase-client.js';

let allRequests = []; // Global store for filtering

async function loadSampleRequests() {
    const tableBody = document.getElementById('samples-body');
    tableBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

    try {
        // Fetch all B2B requests, newest first
        const { data: requests, error } = await supabase
            .from('b2b_sample_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        allRequests = requests;
        renderRequests();

    } catch (error) {
        console.error('Error fetching sample requests:', error);
        tableBody.innerHTML = '<tr><td colspan="6">Failed to load requests. Check console.</td></tr>';
    }
}

function renderRequests() {
    const tableBody = document.getElementById('samples-body');
    const searchTerm = document.getElementById('request-search').value.toLowerCase();
    const filterValue = document.getElementById('status-filter').value;

    tableBody.innerHTML = '';

    const filteredRequests = allRequests.filter(request => {
        const status = (request.status || 'pending').toLowerCase();
        const isCompleted = status === 'completed';
        const isProcessing = status === 'processing' || status === 'shipped';

        // 1. Status Filter
        if (filterValue === 'active' && isCompleted) return false;
        if (filterValue === 'processing' && !isProcessing) return false;
        if (filterValue === 'completed' && !isCompleted) return false;

        // 2. Search Filter
        const company = (request.company_name || request.company || '').toLowerCase();
        const contact = (request.contact_name || request.name || '').toLowerCase();
        const email = (request.email || request.contact_email || '').toLowerCase();
        
        return company.includes(searchTerm) || contact.includes(searchTerm) || email.includes(searchTerm);
    });

    if (filteredRequests.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No requests match your criteria.</td></tr>';
        return;
    }

    filteredRequests.forEach(request => {
            // Format the Date
            const dateObj = new Date(request.created_at);
            const dateFormatted = dateObj.toLocaleDateString('en-GB'); 

            // Safe ENUM status check
            const currentStatus = (request.status || 'pending').toLowerCase();
            
            let statusClass = 'status-pending';
            if (currentStatus === 'processing' || currentStatus === 'shipped') statusClass = 'status-processing';
            if (currentStatus === 'completed') statusClass = 'status-completed';

            // Action Button Logic (Using safe database ENUM words: processing & completed)
            let actionBtnHTML = '';
            if (currentStatus === 'pending') {
                actionBtnHTML = `<button class="btn primary-btn update-btn" data-id="${request.id}" data-next="processing" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Approve & Ship</button>`;
            } else if (currentStatus === 'processing' || currentStatus === 'shipped') {
                actionBtnHTML = `<button class="btn primary-btn update-btn" data-id="${request.id}" data-next="completed" style="background: #2e7d32; padding: 0.4rem 0.8rem; font-size: 0.85rem;">Mark Completed</button>`;
            } else {
                actionBtnHTML = `<span style="color: #888; font-size: 0.85rem;">Archived</span>`;
            }

            // Fallbacks for variable database column names
            const companyName = request.company_name || request.company || 'Unknown Company';
            const contactName = request.contact_name || request.name || 'No Name';
            const email = request.email || request.contact_email || 'No Email';
            const coffeeName = request.coffee_name || request.product_name || request.coffee_requested || 'Unknown Coffee';
            // Fix: Check 'shipping_carrier' first as that's what we send from trade.js
            const courier = request.shipping_carrier || request.courier_name || request.shipping_method || 'Courier';
            const accountNo = request.courier_account || request.account_number || 'No Account Provided';
            const notes = request.buyer_notes ? `<br><small style="color: #e65100; font-style: italic; display: block; margin-top: 4px;">📝 "${request.buyer_notes}"</small>` : '';

            // Build the row
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><small style="color:#666;">${dateFormatted}</small></td>
                <td>
                    <strong>${companyName}</strong><br>
                    <small>👤 ${contactName}</small><br>
                    <small>✉️ <a href="mailto:${email}" style="color: var(--gold); text-decoration: none;">${email}</a></small>
                </td>
                <td><strong>${coffeeName}</strong>${notes}</td>
                <td>
                    <strong>${courier}</strong><br>
                    <span class="data-highlight" style="font-family: monospace; letter-spacing: 1px;">Acct: ${accountNo}</span>
                </td>
                <td><span class="status-badge ${statusClass}" style="text-transform: capitalize;">${currentStatus}</span></td>
                <td>${actionBtnHTML}</td>
            `;
            tableBody.appendChild(row);
        });

        // Attach listeners to the dynamic buttons
        document.querySelectorAll('.update-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const nextStatus = e.target.getAttribute('data-next');
                updateRequestStatus(id, nextStatus);
            });
        });
}

// Update the status in Supabase safely
async function updateRequestStatus(id, newStatus) {
    try {
        const safeStatus = newStatus.toLowerCase(); // Prevent 400 errors

        const { error } = await supabase
            .from('b2b_sample_requests')
            .update({ status: safeStatus })
            .eq('id', id);

        if (error) throw error;
        
        loadSampleRequests(); // Reload table
    } catch (error) {
        console.error('Update Error:', error);
        alert('Failed to update request status. Check the console.');
    }
}

// Refresh button logic
document.getElementById('refresh-samples-btn').addEventListener('click', loadSampleRequests);
document.getElementById('request-search').addEventListener('input', renderRequests);
document.getElementById('status-filter').addEventListener('change', renderRequests);

// Load initially
document.addEventListener('DOMContentLoaded', () => {
    loadSampleRequests();

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