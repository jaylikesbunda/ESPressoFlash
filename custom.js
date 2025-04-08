document.addEventListener('DOMContentLoaded', () => {
    const deviceCards = document.querySelectorAll('.device-card');
    const nextToStep2Button = document.getElementById('nextToStep2');
    
    deviceCards.forEach(card => {
        card.addEventListener('click', () => {
            nextToStep2Button.disabled = false;
        });
    });
});