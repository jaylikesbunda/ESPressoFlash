document.addEventListener('DOMContentLoaded', () => {
    // Check for cookies to apply default settings
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }
    
    // Check if user has angered multiple eye pairs before
    const multipleEyesAngered = getCookie('multipleEyesAngered');
    const darkMode = getCookie('darkMode');
    
    // Apply dark mode if cookie is set
    if (darkMode === 'true') {
        document.documentElement.classList.add('dark-mode');
        // Show eyes container in dark mode
        const eyesContainer = document.querySelector('.eyes-container');
        if (eyesContainer) {
            eyesContainer.style.display = 'block';
        }
    }
    
    // Apply red eyes class if multiple pairs were angered
    if (multipleEyesAngered === 'true') {
        document.body.classList.add('multiple-eyes-angered');
    }
    
    const deviceCards = document.querySelectorAll('.device-card');
    const nextToStep2Button = document.getElementById('nextToStep2');
    
    deviceCards.forEach(card => {
        card.addEventListener('click', () => {
            nextToStep2Button.disabled = false;
        });
    });
    
    // Enhanced Eyelid Simulation with Realistic Glow Effects
    function initEyelidSimulation() {
        // Only run in dark mode
        if (!document.documentElement.classList.contains('dark-mode')) return;
        
        // Get all eye pairs instead of individual eyes
        const eyePairs = document.querySelectorAll('.eye-pair');
        
        eyePairs.forEach((pair, index) => {
            // Create a more realistic blink cycle for each pair
            function blinkPair() {
                // Randomize blink timing for natural effect
                const blinkDelay = 4000 + Math.random() * 10000; // 4-14 seconds
                
                // Get both eyes in the pair
                const eyes = pair.querySelectorAll('.eye');
                if (eyes.length === 2) {
                    // Animate both eyes in the pair together
                    animateEyelidPair(eyes[0], eyes[1]);
                }
                
                // Schedule next blink
                setTimeout(blinkPair, blinkDelay);
            }
            
            // Start the blinking cycle with staggered timing
            setTimeout(blinkPair, Math.random() * 3000 + index * 1000);
        });
    }
    
    // Animate both eyelids in a pair
    function animateEyelidPair(eye1, eye2) {
        const eyelid1 = eye1.querySelector('.eyelid');
        const eyelid2 = eye2.querySelector('.eyelid');
        
        if (!eyelid1 || !eyelid2) return;
        
        // blink curve
        const steps = [
            { top: -100, glow: 0.2, duration: 30 },   // Fully closed
            { top: -70, glow: 0.4, duration: 20 },    // Partially open
            { top: -30, glow: 0.7, duration: 15 },    // Mostly open
            { top: 0, glow: 1, duration: 80 },        // Fully open
            { top: -30, glow: 0.7, duration: 15 },    // Start closing
            { top: -70, glow: 0.4, duration: 20 },    // Almost closed
            { top: -100, glow: 0.2, duration: 30 }    // Fully closed
        ];
        
        // Apply each step with appropriate timing to both eyes
        let totalTime = 0;
        steps.forEach((step, index) => {
            totalTime += step.duration;
            setTimeout(() => {
                // Move both eyelids
                eyelid1.style.top = `${step.top}%`;
                eyelid2.style.top = `${step.top}%`;
                
                // Calculate glow based on eyelid position (more realistic)
                // When eyelid covers more of the eye, less glow is visible
                const coverage = Math.max(0, Math.min(1, (step.top + 100) / 100)); // 0 = fully covered, 1 = fully exposed
                const glowIntensity = Math.pow(coverage, 5); // Exponential falloff for more realistic effect
                
                // Adjust glow dynamically based on eyelid coverage
                const innerGlow = Math.floor(5 + 15 * glowIntensity); // 5-20px range
                const outerGlow = Math.floor(10 + 25 * glowIntensity); // 10-35px range
                
                eye1.style.boxShadow = `0 0 ${innerGlow}px #ffffff, 0 0 ${outerGlow}px #ffffff`;
                eye2.style.boxShadow = `0 0 ${innerGlow}px #ffffff, 0 0 ${outerGlow}px #ffffff`;
                
                // Add subtle lighting effects when fully open
                if (step.top === 0) {
                    // Brief brighten effect when fully open
                    eye1.style.boxShadow = `0 0 15px #ffffff, 0 0 30px #ffffff`;
                    eye2.style.boxShadow = `0 0 15px #ffffff, 0 0 30px #ffffff`;
                    
                    setTimeout(() => {
                        eye1.style.boxShadow = `0 0 8px #ffffff, 0 0 20px #ffffff`;
                        eye2.style.boxShadow = `0 0 8px #ffffff, 0 0 20px #ffffff`;
                    }, 80);
                }
            }, totalTime);
        });
    }
    
    // Initialize eyelid simulation when dark mode is toggled
    const titleToggle = document.getElementById('darkModeToggle');
    if (titleToggle) {
        titleToggle.addEventListener('click', () => {
            // Small delay to ensure dark mode class is applied
            setTimeout(initEyelidSimulation, 100);
        });
    }
    
    // Initialize if already in dark mode
    if (document.documentElement.classList.contains('dark-mode')) {
        setTimeout(initEyelidSimulation, 500);
    }
    
    // Track angry eye pairs
    let angryEyePairs = new Set();
    
    // Add click event listeners to eyes for the escalating shake effect
    function initEyeClickHandlers() {
        const eyes = document.querySelectorAll('.eye');
        
        eyes.forEach(eye => {
            eye.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent event from bubbling up
                
                // Find the parent eye-pair
                const eyePair = this.closest('.eye-pair');
                if (!eyePair) return;
                
                // Add this eye pair to the set of angry pairs
                angryEyePairs.add(eyePair);
                
                // Get both eyes in the pair
                const eyesInPair = eyePair.querySelectorAll('.eye');
                
                // Add red eye effect to both eyes in the pair
                eyesInPair.forEach(eyeElem => {
                    eyeElem.classList.add('clicked');
                });
                
                // Remove red eye effect after 10 seconds
                setTimeout(() => {
                    eyesInPair.forEach(eyeElem => {
                        eyeElem.classList.remove('clicked');
                    });
                    // Remove this eye pair from the set of angry pairs
                    angryEyePairs.delete(eyePair);
                }, 10000);
                
                // Start escalating shake effect
                let shakeIntensity = 1;
                const maxIntensity = 5;
                const intervalTime = 2000; // Increase intensity every 2 seconds
                
                // Apply initial shake
                eyePair.classList.add('shake');
                
                // Escalate shake intensity every 2 seconds
                const shakeInterval = setInterval(() => {
                    shakeIntensity++;
                    if (shakeIntensity <= maxIntensity) {
                        // Update animation with higher intensity
                        const animationSpeed = Math.max(0.1, 0.5 - (shakeIntensity * 0.08));
                        eyePair.style.animation = `shakeLevel${shakeIntensity} ${animationSpeed}s infinite`;
                    }
                }, intervalTime);
                
                // Stop shaking and either reload or close window after 10 seconds
                setTimeout(() => {
                    clearInterval(shakeInterval);
                    eyePair.style.animation = '';
                    eyePair.classList.remove('shake');
                    
                    // Check if more than one eye pair is angry
                    if (angryEyePairs.size > 1) {
                        // Set cookie to remember user angered multiple eye pairs
                        document.cookie = "multipleEyesAngered=true; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";
                        // Set cookie to default to dark mode
                        document.cookie = "darkMode=true; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";
                        
                        // Try to close the window, but handle cases where it's not allowed
                        try {
                            // This will only work if the window was opened by JavaScript
                            if (!window.opener) {
                                // If we can't close, redirect to a blank page
                                window.location.href = 'about:blank';
                            } else {
                                window.close();
                            }
                        } catch (e) {
                            // If window.close() fails, redirect to a blank page
                            window.location.href = 'about:blank';
                        }
                    } else {
                        // Reload the page for a single angry eye pair
                        location.reload();
                    }
                }, 10000);
            });
        });
    }
    
    // Initialize eye click handlers
    initEyeClickHandlers();
});