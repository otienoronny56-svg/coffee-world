// Hamburger Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobile-nav');
    
    if (hamburger && mobileNav) {
        // Toggle menu when hamburger is clicked
        hamburger.addEventListener('click', function(e) {
            e.stopPropagation();
            hamburger.classList.toggle('active');
            mobileNav.classList.toggle('active');
        });
        
        // Close menu when a link is clicked
        const navLinks = mobileNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                mobileNav.classList.remove('active');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.navbar') && !e.target.closest('.mobile-nav')) {
                hamburger.classList.remove('active');
                mobileNav.classList.remove('active');
            }
        });
    }
});
