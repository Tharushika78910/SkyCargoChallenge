
document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    let playerId = null;
    let playerData = null;

    const renderHomePage = () => {
        app.innerHTML = `
            <h1>Cargo Management Game</h1>
            <h2>Enter Screen Name</h2>
            <input type="text" id="screenName" placeholder="Enter your screen name">
            <button id="playNow">Play Now</button>
        `;

        document.getElementById('playNow').addEventListener('click', registerPlayer);
    };

    const registerPlayer = async () => {
        const screenName = document.getElementById('screenName').value;
        if (!screenName) {
            alert('Please enter a screen name.');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: screenName })
            });
            const result = await response.json();
            playerId = result.player_id;
            fetchStatus();
        } catch (error) {
            console.error('Error registering player:', error);
        }
    };

    const fetchStatus = async () => {
        try {
            const response = await fetch(`http://localhost:5000/status/${playerId}`);
            playerData = await response.json();
            renderGameStatus();
        } catch (error) {
            console.error('Error fetching status:', error);
        }
    };

    const renderGameStatus = () => {
        if (!playerData) return;
        app.innerHTML = `
            <h1>Welcome, ${playerData.name}</h1>
            <p>Current Airport: ${playerData.current_airport}</p>
            <p>Fuel: ${playerData.fuel}</p>
            <p>Money: ${playerData.money}</p>
            <p>Cargo Collected: ${playerData.cargo_collected.join(', ') || 'None'}</p>
            <button id="refresh">Refresh Status</button>
        `;

        document.getElementById('refresh').addEventListener('click', fetchStatus);
    };

    renderHomePage();
});
