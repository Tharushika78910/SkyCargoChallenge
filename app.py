from flask import Flask, request, jsonify, render_template
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)

# MySQL Database Configuration
try:
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='12345',
        database='flight_path'
    )
    cursor = conn.cursor()
except Error as e:
    print(f"Error connecting to MySQL Database: {e}")
    exit(1)

# Register Player


app = Flask(__name__, template_folder='templates', static_folder='static')

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/main')
def main():
    player_id = request.args.get('player_id')  # Fetch 'player_id' from query parameters
    if not player_id:
        print("Error: Player ID is missing!")  # Debugging log
        return "Player ID is missing!", 400  # Return error if player_id is not found
    print(f"Player ID received: {player_id}")  # Debugging log
    return render_template('main.html')


@app.route('/register', methods=['POST'])
def register_player():
    data = request.json
    name = data.get('name')

    if not name:
        return jsonify({"error": "Name is required"}), 400

    try:
        # Insert the new player into the database
        cursor.execute("""
            INSERT INTO player (screen_name, start_location, end_location, destination, total_money, cargo_collected, fuel_amount)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (name, 'LEMD', 'LEMD', 'LIPE', 0, 0, 2000))
        conn.commit()

        # Fetch the player's ID
        cursor.execute("SELECT player_id FROM player WHERE screen_name = %s ORDER BY player_id DESC LIMIT 1", (name,))
        player_id = cursor.fetchone()

        if not player_id:
            return jsonify({"error": "Failed to fetch player ID"}), 500

        print(f"Registered player with ID: {player_id[0]}")
        return jsonify({"message": "Player registered", "player_id": player_id[0]})
    except Error as e:
        print(f"Error during player registration: {e}")
        return jsonify({"error": str(e)}), 500


# Fetch Player Data
@app.route('/player/<int:player_id>', methods=['GET'])
def get_player(player_id):
    try:
        cursor.execute("""
            SELECT screen_name, start_location, end_location, destination, total_money, cargo_collected, fuel_amount
            FROM player
            WHERE player_id = %s
        """, (player_id,))
        player = cursor.fetchone()

        if not player:
            return jsonify({"error": "Player not found"}), 404

        return jsonify({
            "name": player[0],
            "start_location": player[1],
            "current_airport": player[2],
            "destination": player[3],
            "money": player[4],
            "cargo_collected": player[5],
            "fuel": player[6]
        })
    except Error as e:
        return jsonify({"error": str(e)}), 500


# Travel to Airport
@app.route('/travel', methods=['POST'])
def travel():
    data = request.json
    player_id = data.get('player_id')
    destination = data.get('destination')

    # Debugging: Log the received data
    print(f"Player ID: {player_id}, Destination: {destination}")

    # Validate inputs
    if not player_id or not destination:
        return jsonify({"error": "Player ID and destination are required"}), 400

    # Process travel (fuel deduction, database update, etc.)
    try:
        cursor.execute("SELECT fuel_amount FROM player WHERE player_id = %s", (player_id,))
        player = cursor.fetchone()
        if not player:
            return jsonify({"error": "Player not found"}), 404

        fuel_cost = 50  # Example cost
        if player[0] < fuel_cost:
            return jsonify({"error": "Not enough fuel"}), 400

        cursor.execute("""
            UPDATE player 
            SET end_airport = %s, fuel_amount = fuel_amount - %s 
            WHERE player_id = %s
        """, (destination, fuel_cost, player_id))
        conn.commit()

        return jsonify({"message": "Travel successful", "new_airport": destination})
    except Exception as e:
        print(f"Error during travel: {e}")
        return jsonify({"error": "Internal server error"}), 500


# Collect Cargo
@app.route('/collect_cargo', methods=['POST'])
def collect_cargo():
    data = request.json
    player_id = data['player_id']
    cargo = data['cargo']

    cursor.execute("SELECT cargo_collected, total_money FROM player WHERE player_id=%s", (player_id,))
    player = cursor.fetchone()
    if not player:
        return jsonify({"error": "Player not found"}), 404

    collected_cargo = player[0].split(',') if player[0] else []
    if cargo in collected_cargo:
        return jsonify({"error": "Cargo already collected"}), 400

    collected_cargo.append(cargo)
    updated_cargo = ','.join(collected_cargo)
    new_money = player[1] + 100

    cursor.execute("UPDATE player SET cargo_collected=%s, total_money=%s WHERE player_id=%s",
                   (updated_cargo, new_money, player_id))
    conn.commit()
    return jsonify({"message": "Cargo collected", "new_money": new_money})

# Purchase Fuel
@app.route('/buy_fuel', methods=['POST'])
def buy_fuel():
    data = request.json
    player_id = data['player_id']
    fuel_amount = data['fuel_amount']

    fuel_cost = fuel_amount * 5

    cursor.execute("SELECT total_money, fuel_amount FROM player WHERE player_id=%s", (player_id,))
    player = cursor.fetchone()
    if not player:
        return jsonify({"error": "Player not found"}), 404

    if player[0] < fuel_cost:
        return jsonify({"error": "Not enough money"}), 400

    new_fuel = player[1] + fuel_amount
    new_money = player[0] - fuel_cost

    cursor.execute("UPDATE player SET fuel_amount=%s, total_money=%s WHERE player_id=%s",
                   (new_fuel, new_money, player_id))
    conn.commit()
    return jsonify({"message": "Fuel purchased", "new_fuel": new_fuel})

if __name__ == '__main__':
    app.run(debug=True)



