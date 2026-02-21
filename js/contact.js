// js/contact.js

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    const successMessage = document.getElementById('contact-success');
    const submitBtn = document.getElementById('contact-submit-btn');

    if(contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent page reload

            // 1. Change button state
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            // 2. Capture data (for when you link it to Supabase later)
            const formData = {
                name: document.getElementById('contact-name').value,
                email: document.getElementById('contact-email').value,
                type: document.getElementById('contact-type').value,
                message: document.getElementById('contact-message').value
            };

            console.log("Form Data ready for Supabase:", formData);

            // 3. Simulate network request (fake 1.5 second delay)
            setTimeout(() => {
                // Hide form, show success message
                contactForm.style.display = 'none';
                successMessage.style.display = 'block';
            }, 1500);
        });
    }
});