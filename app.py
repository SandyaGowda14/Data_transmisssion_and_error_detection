from flask import Flask, render_template, request, jsonify
import random

app = Flask(__name__)


def count_bits(data):
    ones = data.count("1")
    zeros = data.count("0")
    return ones, zeros


def select_parity(ones, zeros):
    """
    Adaptive parity rule:

    More/equal 1s -> EVEN parity
    More 0s       -> ODD parity
    """

    if ones >= zeros:
        return "EVEN"
    else:
        return "ODD"


def calculate_parity_bit(data, parity_type):
    """
    Calculate the parity bit required for the selected parity.
    """

    ones = data.count("1")

    if parity_type == "EVEN":
        return "0" if ones % 2 == 0 else "1"

    else:  # ODD parity
        return "1" if ones % 2 == 0 else "0"


def create_packet(data, parity_type):
    """
    Packet format:

    [parity mode][data][parity bit]

    E = Even parity
    O = Odd parity
    """

    parity_bit = calculate_parity_bit(data, parity_type)

    mode_bit = "E" if parity_type == "EVEN" else "O"

    return mode_bit + data + parity_bit


def inject_noise(packet, noise_percentage):
    """
    Randomly flips binary bits according to the noise percentage.

    E/O parity mode characters are not modified.
    """

    result = list(packet)
    error_positions = []

    # Start from index 1 because index 0 contains E/O.
    for i in range(1, len(result)):

        if random.random() < (noise_percentage / 100):

            if result[i] == "0":
                result[i] = "1"
            elif result[i] == "1":
                result[i] = "0"

            error_positions.append(i)

    return "".join(result), error_positions


def check_packet(packet):
    """
    Receiver checks the parity of the received packet.
    """

    if not packet:
        return False, "Invalid packet"

    mode = packet[0]

    if mode not in ["E", "O"]:
        return False, "Invalid parity mode"

    parity_type = "EVEN" if mode == "E" else "ODD"

    binary_part = packet[1:]

    ones = binary_part.count("1")

    if parity_type == "EVEN":
        valid = ones % 2 == 0
    else:
        valid = ones % 2 == 1

    if valid:
        return True, "No error detected"
    else:
        return False, "Error detected"


def process_transmission(data, noise_percentage):
    ones, zeros = count_bits(data)

    parity_type = select_parity(ones, zeros)

    parity_bit = calculate_parity_bit(data, parity_type)

    original_packet = create_packet(data, parity_type)

    # First transmission
    received_packet, error_positions = inject_noise(
        original_packet,
        noise_percentage
    )

    valid, message = check_packet(received_packet)

    result = {
        "input_data": data,
        "ones": ones,
        "zeros": zeros,
        "parity_type": parity_type,
        "parity_bit": parity_bit,
        "original_packet": original_packet,
        "received_packet": received_packet,
        "error_positions": error_positions,
        "error_count": len(error_positions),
        "error_detected": not valid,
        "status": "",
        "retransmitted_packet": None,
        "retransmission_received": None,
        "retransmission_success": None
    }

    # No error
    if valid:

        result["status"] = "ACCEPTED"

        return result

    # Error detected -> retransmission
    result["status"] = "RETRANSMISSION REQUIRED"

    retransmitted_packet, retransmission_errors = inject_noise(
        original_packet,
        noise_percentage
    )

    retransmission_valid, _ = check_packet(retransmitted_packet)

    result["retransmitted_packet"] = original_packet
    result["retransmission_received"] = retransmitted_packet
    result["retransmission_success"] = retransmission_valid

    if retransmission_valid:
        result["status"] = "RETRANSMISSION SUCCESSFUL"
    else:
        result["status"] = "RETRANSMISSION FAILED"

    return result


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/simulate", methods=["POST"])
def simulate():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "No input received"
        }), 400

    packets = data.get("packets", [])
    noise = data.get("noise", 10)

    if not isinstance(packets, list) or len(packets) == 0:
        return jsonify({
            "error": "Please provide at least one packet."
        }), 400

    try:
        noise = float(noise)
    except (TypeError, ValueError):
        return jsonify({
            "error": "Invalid noise value."
        }), 400

    if noise < 0 or noise > 50:
        return jsonify({
            "error": "Noise must be between 0 and 50 percent."
        }), 400

    results = []

    for packet in packets:

        packet = str(packet).strip()

        if not packet:
            continue

        if any(bit not in "01" for bit in packet):

            return jsonify({
                "error": f"Invalid binary input: {packet}"
            }), 400

        results.append(
            process_transmission(packet, noise)
        )

    if not results:
        return jsonify({
            "error": "No valid packets were entered."
        }), 400

    total = len(results)

    errors = sum(
        1 for r in results
        if r["error_detected"]
    )

    accepted = sum(
        1 for r in results
        if r["status"] == "ACCEPTED"
    )

    successful_retransmissions = sum(
        1 for r in results
        if r["retransmission_success"] is True
    )

    failed_retransmissions = sum(
        1 for r in results
        if r["retransmission_success"] is False
    )

    retransmissions = successful_retransmissions + failed_retransmissions

    return jsonify({

        "results": results,

        "statistics": {
            "total_packets": total,
            "error_packets": errors,
            "accepted_packets": accepted,
            "retransmissions": retransmissions,
            "successful_retransmissions": successful_retransmissions,
            "failed_retransmissions": failed_retransmissions,
            "noise_percentage": noise
        }
    })


if __name__ == "__main__":
    app.run(debug=True)