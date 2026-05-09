export class FeedbackController {
    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        container.textContent = message;
        container.className = 'show';

        const colors = {
            success: '#4f8f65',
            warning: '#b97a2f',
            error: '#b74e4e',
            info: '#5f7fb0'
        };
        container.style.borderColor = colors[type] || colors.info;
        container.style.boxShadow = `0 10px 40px rgba(75, 63, 47, 0.2), 0 0 0 3px ${colors[type] || colors.info}33 inset`;

        setTimeout(() => {
            container.classList.remove('show');
        }, 2000);
    }

    showKillFeed(killerName, victimName, type = 'eat') {
        const feedContainer = document.getElementById('kill-feed');
        const item = document.createElement('div');
        item.className = 'kill-feed-item';

        const killerColor = killerName.includes('🔴') ? 'color: #ff4444;' : 'color: #999;';
        const victimColor = victimName.includes('🔴') ? 'color: #ff4444;' : 'color: #999;';
        const icon = type === 'capture' ? '☠️' : '⚔️';

        item.innerHTML = `
            <span style="${killerColor}">${killerName}</span>
            <span style="color: #FFD700; margin: 0 8px; font-size: 16px;">${icon}</span>
            <span style="${victimColor}">${victimName}</span>
        `;

        feedContainer.appendChild(item);

        setTimeout(() => {
            item.classList.add('fading');
            setTimeout(() => item.remove(), 500);
        }, 3000);
    }
}
