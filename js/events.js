// js/events.js
import { supabase } from './supabase-client.js';

async function loadLiveEvents() {
    const upcomingGrid = document.getElementById('upcoming-events-grid');
    const pastGrid = document.getElementById('past-events-grid');

    try {
        // Fetch all events from Supabase
        const { data: events, error } = await supabase
            .from('events')
            .select('*');

        if (error) throw error;

        // Clear the loading text
        upcomingGrid.innerHTML = '';
        pastGrid.innerHTML = '';

        // Sort upcoming events so the closest one is first
        const upcomingEvents = events
            .filter(ev => ev.status === 'upcoming')
            .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

        // Sort past events so the most recent one is first
        const pastEvents = events
            .filter(ev => ev.status === 'past')
            .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

        // --- 1. Render Upcoming Events ---
        if (upcomingEvents.length === 0) {
            upcomingGrid.innerHTML = '<p>No upcoming events at the moment. Check back soon!</p>';
        } else {
            upcomingEvents.forEach(ev => {
                // Extract Month (e.g., "MAY") and Day (e.g., "15") for the badge
                const dateObj = new Date(ev.event_date);
                const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
                const day = dateObj.getDate().toString().padStart(2, '0');

                // Fallback image just in case
                const imageUrl = ev.image_url || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=800&auto=format&fit=crop';

                const card = document.createElement('article');
                card.className = 'event-card';
                card.innerHTML = `
                    <div class="event-image-wrapper">
                        <img src="${imageUrl}" alt="${ev.title}">
                        <div class="date-badge">
                            <span class="month">${month}</span>
                            <span class="day">${day}</span>
                        </div>
                    </div>
                    <div class="event-content">
                        <span class="event-tag upcoming-tag">${ev.tag || 'Event'}</span>
                        <h3>${ev.title}</h3>
                        <p class="event-meta">📍 ${ev.location}</p>
                        <p class="event-desc">${ev.description}</p>
                        <a href="contact.html" class="btn secondary-btn event-btn">Register / Inquire</a>
                    </div>
                `;
                upcomingGrid.appendChild(card);
            });
        }

        // --- 2. Render Past Highlights ---
        if (pastEvents.length === 0) {
            pastGrid.innerHTML = '<p>No past highlights to show yet.</p>';
        } else {
            pastEvents.forEach(ev => {
                // For past events, we just want "October 2025" formatting
                const dateObj = new Date(ev.event_date);
                const monthYear = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

                const imageUrl = ev.image_url || 'https://images.unsplash.com/photo-1600590711251-c439ffcb61bc?q=80&w=800&auto=format&fit=crop';

                const card = document.createElement('article');
                card.className = 'event-card past-event';
                card.innerHTML = `
                    <div class="event-image-wrapper">
                        <img src="${imageUrl}" alt="${ev.title}">
                    </div>
                    <div class="event-content">
                        <span class="event-tag past-tag">Completed</span>
                        <h3>${ev.title}</h3>
                        <p class="event-meta">📍 ${ev.location} | ${monthYear}</p>
                        <p class="event-desc">${ev.description}</p>
                    </div>
                `;
                pastGrid.appendChild(card);
            });
        }

    } catch (error) {
        console.error('Error fetching live events:', error);
        upcomingGrid.innerHTML = '<p style="color: red;">Error loading events. Please try again later.</p>';
        pastGrid.innerHTML = '';
    }
}

// Run the script when the page loads
document.addEventListener('DOMContentLoaded', loadLiveEvents);