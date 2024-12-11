document.addEventListener('DOMContentLoaded', async () => {
    // Airport Data
    const airports = [
        { id: 1, code: "LEMD", name: "Adolfo Suárez Madrid–Barajas Airport (LEMD)", lat: 40.471926, lon: -3.56264 ,value: 3500},
        { id: 2, code: "LEAL", name: "Alicante-Elche Miguel Hernández Airport (LEAL)", lat: 38.2822, lon: -0.558156 ,value: 1500},
        { id: 3, code: "EHAM", name: "Amsterdam Airport Schiphol (EHAM)", lat: 52.308601, lon: 4.76389 ,value: 2000},
        { id: 4, code: "EGAA", name: "Belfast International Airport (EGAA)", lat: 54.657501, lon: -6.215829 ,value: 1500},
        { id: 5, code: "LYBE", name: "Belgrade Nikola Tesla Airport (LYBE)", lat: 44.818401, lon: 20.3091 ,value: 5000},
        { id: 6, code: "ENBR", name: "Bergen Airport, Flesland (ENBR)", lat: 60.2934, lon: 5.21814 ,value: 3500},
        { id: 7, code: "EDDB", name: "Berlin Brandenburg Airport (EDDB)", lat: 52.351389, lon: 13.493889 ,value: 4500},
        { id: 8, code: "EKBI", name: "Billund Airport (EKBI)", lat: 55.740299, lon: 9.15178 ,value: 5000},
        { id: 9, code: "EGBB", name: "Birmingham International Airport (EGBB)", lat: 52.453899, lon: -1.748029 ,value: 2000},
        { id: 10, code: "LIPE", name: "Bologna Guglielmo Marconi Airport (LIPE)", lat: 44.5354, lon: 11.2887 ,value: 4500}
    ];

    // Get player_id from URL
    const params = new URLSearchParams(window.location.search);
    const playerId = params.get('player_id');

    if (!playerId) {
        alert('Player ID is missing!');
        window.location.href = '/';
        return;
    }

    // Fetch player data from the backend
    let playerData;
    try {
        const response = await fetch(`/player/${playerId}`);
        playerData = await response.json();

        if (playerData.error) {
            alert('Error fetching player data: ' + playerData.error);
            window.location.href = '/';
            return;
        }

        // Update the display panel with player data
        document.getElementById('player-name').textContent = playerData.name;
        document.getElementById('current-airport').textContent = playerData.current_airport;
        document.getElementById('fuel-level').textContent = playerData.fuel;
        document.getElementById('money-balance').textContent = playerData.money;
        document.getElementById('cargo-collected').textContent = playerData.cargo_collected;
    } catch (error) {
        console.error('Error fetching player data:', error);
        alert('Could not fetch player data.');
        window.location.href = '/';
        return;
    }

    // Initialize Map
    const map = L.map('map', {
        center: [50.0, 10.0], // Centered over Europe
        zoom: 6,              // Initial zoom level
        zoomControl: true,   // Disable zoom controls
        scrollWheelZoom: true, // Disable zooming with the scroll wheel
        doubleClickZoom: true, // Disable zooming with double-click
        boxZoom: false,         // Disable zooming with box selection
        keyboard: false         // Disable keyboard zooming
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add Markers for Airports
    airports.forEach(airport => {
        L.marker([airport.lat, airport.lon]).addTo(map)
            .bindPopup(`<b>${airport.name}</b><br>Code: ${airport.code}`);
    });

    // Player Location Indicator
    let playerMarker = null;

    const updatePlayerLocation = (lat, lon) => {
        if (playerMarker) {
            map.removeLayer(playerMarker); // Remove previous marker
        }
        playerMarker = L.marker([lat, lon], {
            icon: L.icon({
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
            })
        }).addTo(map)
            .bindPopup('You are here now!')
            .openPopup();
        map.setView([lat, lon]); // Update the map view to the player's location
    };

    // Initialize Player's Location
    const currentAirport = airports.find(airport => airport.code === playerData.current_airport) || airports[0];
    updatePlayerLocation(currentAirport.lat, currentAirport.lon);

    // Populate Dropdown with Airports
    const airportSelect = document.getElementById('airport-select');
    airports.forEach(airport => {
        const option = document.createElement('option');
        option.value = airport.code;
        option.textContent = airport.name;
        airportSelect.appendChild(option);
    });

    // Randomly select 3 airports for unfavorable weather conditions
    const unfavorableWeatherAirports = [];
    const airportIds = new Set();
    while (airportIds.size < 3) {
        const randomIndex = Math.floor(Math.random() * airports.length);
        airportIds.add(randomIndex);
    }
    airportIds.forEach(index => unfavorableWeatherAirports.push(airports[index]));

    // Debug: Log the airports with unfavorable weather
    console.log("Unfavorable Weather Airports:", unfavorableWeatherAirports.map(a => a.name));

    // Function to check if an airport has unfavorable weather
    const isUnfavorableWeather = (airport) => {
        return unfavorableWeatherAirports.includes(airport);
    };

    // Travel Action
    window.travel = () => {
        const selectedCode = airportSelect.value;
        const selectedAirport = airports.find(airport => airport.code === selectedCode);

        if (!selectedAirport) {
            alert('Invalid airport selection! Please choose a valid destination.');
            return;
        }


        // Retrieve the current airport code from the display panel
        const currentAirportCode = document.getElementById('current-airport').textContent;
        const currentAirport = airports.find(airport => airport.code === currentAirportCode);

        if (!currentAirport) {
            alert('Error: Current airport not found.');
            return;
        }

        // Retrieve the cargo collected count
        const cargoCollectedElement = document.getElementById('cargo-collected');
        const cargoCollected = parseInt(cargoCollectedElement.textContent, 10) || 0;

        // Check if the selected airport is LIPE and handle win/lose conditions
        if (selectedCode === 'LIPE') {
            if (cargoCollected === 8) {
                alert('Congratulations! You have won the game by delivering 8 cargos to LIPE!');
                window.location.href = '/'; // Redirect to the main screen
                return;
            } else {
                alert('Game Over! You must collect 8 cargos before going to LIPE.');
                window.location.href = '/'; // Redirect to the main screen
                return;
            }
        }

        // Calculate the distance using the Haversine formula
        const toRadians = (degrees) => degrees * (Math.PI / 180);
        const earthRadiusKm = 6371;

        const dLat = toRadians(selectedAirport.lat - currentAirport.lat);
        const dLon = toRadians(selectedAirport.lon - currentAirport.lon);

        const lat1 = toRadians(currentAirport.lat);
        const lat2 = toRadians(selectedAirport.lat);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = earthRadiusKm * c; // Distance in kilometers

        // Calculate the fuel cost based on the distance(for 2km ---> 1 fuel unit)
        let fuelCost = Math.ceil(distance/2);

        // Increase fuel consumption if the selected airport has unfavorable weather
        if (isUnfavorableWeather(selectedAirport)) {
            fuelCost = Math.ceil(fuelCost * 1.6); // 60% increase in fuel consumption
            alert(`Unfavorable weather conditions at ${selectedAirport.name}. Fuel consumption increased by 60%.`);
        }

        // Retrieve the current fuel amount
        const fuelLevelElement = document.getElementById('fuel-level');
        let currentFuel = parseInt(fuelLevelElement.textContent, 10) || 0;

        // Check if the player has enough fuel
        if (currentFuel < fuelCost) {
            alert(`Not enough fuel to travel! You need at least ${fuelCost} fuel units.`);
            return;
        }

        // Deduct fuel and update the Player Status panel
        currentFuel -= fuelCost;
        fuelLevelElement.textContent = currentFuel;

        // Update the player's current location in the display
        document.getElementById('current-airport').textContent = selectedCode;

        // Update the player's location on the map
        updatePlayerLocation(selectedAirport.lat, selectedAirport.lon);

        // Display success message
        alert(`You have traveled to: ${selectedAirport.name}. Distance: ${distance.toFixed(2)} km. Fuel used: ${fuelCost} units.`);
    };

    // Collect Cargo Action
    window.collectCargo = () => {
        const cargoCollectedElement = document.getElementById('cargo-collected');
        let currentCargoCount = parseInt(cargoCollectedElement.textContent, 10) || 0;
        currentCargoCount += 1;
        cargoCollectedElement.textContent = currentCargoCount;

        const moneyElement = document.getElementById('money-balance');
        let currentMoney = parseInt(moneyElement.textContent, 10) || 0;

        const currentAirportCode = document.getElementById('current-airport').textContent;
        const currentAirport = airports.find(airport => airport.code === currentAirportCode);

        if (currentAirport) {
            currentMoney += currentAirport.value;
            moneyElement.textContent = currentMoney;
            alert(`Cargo collected at ${currentAirport.name}! You earned ${currentAirport.value} money.`);
        } else {
            alert('Error: Could not find the current airport!');
        }
    };

    // Buy Fuel Action
    window.buyFuel = () => {
        // Retrieve the fuel input value
        const fuelInputElement = document.querySelector('#fuel-input');
        const fuelAmount = parseInt(fuelInputElement.value, 10);

        // Validate the input
        if (isNaN(fuelAmount) || fuelAmount <= 0) {
            alert('Please enter a valid fuel amount.');
            return;
        }

        // Retrieve the current money and fuel from the Player Status panel
        const moneyElement = document.getElementById('money-balance');
        const fuelLevelElement = document.getElementById('fuel-level');

        let currentMoney = parseInt(moneyElement.textContent, 10) || 0;
        let currentFuel = parseInt(fuelLevelElement.textContent, 10) || 0;

        // Define the fuel cost per unit
        const fuelCostPerUnit = 5;

        // Calculate the total cost
        const totalCost = fuelAmount * fuelCostPerUnit;

        // Check if the player has enough money
        if (currentMoney < totalCost) {
            alert('Not enough money to buy fuel!');
            return;
        }

        // Deduct the cost from the money and add fuel
        currentMoney -= totalCost;
        currentFuel += fuelAmount;

        // Update the Player Status panel
        moneyElement.textContent = currentMoney;
        fuelLevelElement.textContent = currentFuel;

        // Clear the input field
        fuelInputElement.value = '';

        // Display success message
        alert(`Successfully bought ${fuelAmount} units of fuel for ${totalCost} money.`);
    };

    // Quit Game Action
    window.quitGame = () => {
        // Redirect to index.html
        window.location.href = '/';
    };


});
