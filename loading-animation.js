window.initLoadingAnimation = function() {
    const loadingContainer = document.getElementById('loading-container');
    
    if (!loadingContainer) {
        console.error('Loading container element not found');
        return null;
    }
    
    loadingContainer.innerHTML = `
        <div class="loading-overlay">
            <div class="loading-content">
                <div class="loading-logo">
                    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <!-- Coffee cup shape -->
                        <path d="M30 40 L30 90 A20 20 0 0 0 50 110 L70 110 A20 20 0 0 0 90 90 L90 40 Z" stroke="#c3865f" stroke-width="4" fill="#1e1e2f"/>
                        <!-- Cup handle -->
                        <path d="M90 50 Q110 50 110 70 Q110 90 90 90" stroke="#c3865f" stroke-width="4" fill="none"/>
                        <!-- Coffee steam -->
                        <path class="steam-path" d="M45 30 Q50 20 55 30" stroke="#c3865f" stroke-width="2" fill="none"/>
                        <path class="steam-path" d="M60 30 Q65 15 70 30" stroke="#c3865f" stroke-width="2" fill="none"/>
                        <path class="steam-path" d="M75 30 Q80 20 85 30" stroke="#c3865f" stroke-width="2" fill="none"/>
                    </svg>
                </div>
                <div class="loading-text">ESPressoFlash</div>
                <div class="loading-spinner"></div>
            </div>
        </div>
    `;
    
    const loadingStyles = document.createElement('style');
    loadingStyles.textContent = `
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: #121223;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            transition: opacity 0.5s ease;
        }
        
        .loading-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
        }
        
        .loading-logo {
            animation: float 3s ease-in-out infinite;
        }
        
        .steam-path {
            opacity: 0.8;
            animation: steam 2s ease-in-out infinite;
        }
        
        .steam-path:nth-child(2) {
            animation-delay: 0.3s;
        }
        
        .steam-path:nth-child(3) {
            animation-delay: 0.6s;
        }
        
        .loading-text {
            font-size: 2rem;
            font-weight: 600;
            color: #c3865f;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .loading-spinner {
            width: 48px;
            height: 48px;
            border: 5px solid rgba(195, 134, 95, 0.2);
            border-radius: 50%;
            border-top-color: #c3865f;
            animation: spin 1s linear infinite;
        }
        
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
        }
        
        @keyframes steam {
            0% { transform: translateY(0) scaleX(1); opacity: 0; }
            20% { opacity: 0.8; }
            40% { transform: translateY(-10px) scaleX(1.1); }
            80% { opacity: 0; }
            100% { transform: translateY(-20px) scaleX(1.5); opacity: 0; }
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    
    document.head.appendChild(loadingStyles);
    
    return {
        cleanup: function() {
            const overlay = document.querySelector('.loading-overlay');
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    if (loadingContainer) {
                        loadingContainer.innerHTML = '';
                    }
                }, 500);
            }
        }
    };
}; 