window.initLoadingAnimation = function() {
    const loadingContainer = document.getElementById('loading-container');
    const loadingOverlay = loadingContainer ? loadingContainer.querySelector('.loading-overlay') : null;

    if (!loadingContainer || !loadingOverlay) {
        console.error('Loading container or overlay element not found');
        // If the elements aren't found (because index.html wasn't updated),
        // we can optionally try to recreate them dynamically here, but
        // it's better to rely on the HTML structure being correct.
        return { cleanup: () => console.error("Cannot cleanup missing loader") };
    }

    // Content is now defined directly in index.html
    // Styles are now defined directly in index.html

    return {
        cleanup: function() {
            if (loadingOverlay) {
                // Add a class to trigger the fade-out and hide
                loadingOverlay.classList.add('hidden');
                // Remove the element from the DOM after the transition
                setTimeout(() => {
                    if (loadingContainer) {
                         // Clear the container's content to remove the overlay element
                        loadingContainer.innerHTML = '';
                    }
                 }, 500); // Match the CSS transition duration
            }
        }
    };
}; 