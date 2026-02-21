// admin/events.js
import { supabase } from '../js/supabase-client.js';

// --- 1. Fetch and Display Events ---
async function loadEvents() {
    const tableBody = document.getElementById('events-body');

    try {
        const { data: events, error } = await supabase
            .from('events')
            .select('*')
            .order('event_date', { ascending: false });

        if (error) throw error;
        tableBody.innerHTML = '';

        if (events.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No events found. Add one!</td></tr>';
            return;
        }

        events.forEach(ev => {
            // Format the Date
            const dateObj = new Date(ev.event_date);
            const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

            const statusClass = ev.status === 'upcoming' ? 'status-processing' : 'status-completed'; // Blue for upcoming, Green for past
            
            // Toggle Button logic
            const toggleText = ev.status === 'upcoming' ? 'Mark as Past' : 'Set as Upcoming';
            const nextStatus = ev.status === 'upcoming' ? 'past' : 'upcoming';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${dateStr}</strong></td>
                <td>
                    <strong>${ev.title}</strong><br>
                    <span class="data-highlight">${ev.tag || 'Event'}</span>
                </td>
                <td><small>${ev.location}</small></td>
                <td><span class="status-badge ${statusClass}" style="text-transform: capitalize;">${ev.status}</span></td>
                <td>
                    <button class="btn secondary-btn toggle-status-btn" data-id="${ev.id}" data-next="${nextStatus}" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">
                        ${toggleText}
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Event listeners for toggle buttons
        document.querySelectorAll('.toggle-status-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const nextStatus = e.target.getAttribute('data-next');
                updateEventStatus(id, nextStatus);
            });
        });

    } catch (error) {
        console.error('Error fetching events:', error);
        tableBody.innerHTML = '<tr><td colspan="5">Failed to load events. Check console.</td></tr>';
    }
}

// --- 2. Add New Event Logic ---
// --- 3. Update Status Logic ---
async function updateEventStatus(id, newStatus) {
    try {
        const { error } = await supabase
            .from('events')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) throw error;
        loadEvents();
    } catch (error) {
        console.error('Update Error:', error);
        alert('Failed to update event status.');
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadEvents();

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

    const modal = document.getElementById('event-modal');
    const eventForm = document.getElementById('event-form');

    // --- 4. Modal UI Handlers ---
    document.getElementById('add-event-btn').addEventListener('click', () => {
        eventForm.reset(); // Clear form before showing
        modal.style.display = 'flex';
    });
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // --- Form Submission Logic ---
    eventForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('save-event-btn');
        submitBtn.textContent = 'Uploading & Saving...';
        submitBtn.disabled = true;

        try {
            // Handle Image Upload
            let imageUrl = 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=800&auto=format&fit=crop'; 
            const imageFileInput = document.getElementById('ev-image-file');
            
            if (imageFileInput.files.length > 0) {
                const file = imageFileInput.files[0];
                const fileExt = file.name.split('.').pop();
                const fileName = `events/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
                imageUrl = publicUrlData.publicUrl;
            }

            // Gather Payload
            const payload = {
                title: document.getElementById('ev-title').value,
                event_date: document.getElementById('ev-date').value,
                tag: document.getElementById('ev-tag').value,
                location: document.getElementById('ev-location').value,
                description: document.getElementById('ev-desc').value,
                image_url: imageUrl,
                status: 'upcoming'
            };

            const { error: dbError } = await supabase.from('events').insert([payload]);
            if (dbError) throw dbError;

            modal.style.display = 'none';
            eventForm.reset();
            loadEvents(); 
            alert('Event published successfully!');

        } catch (error) {
            console.error('Submission Error:', error);
            alert('Failed to publish event. ' + error.message);
        } finally {
            submitBtn.textContent = 'Publish Event';
            submitBtn.disabled = false;
        }
    });
});