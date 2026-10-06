const packetContainer =
    document.getElementById("packetContainer");

const addPacketBtn =
    document.getElementById("addPacketBtn");

const noiseSlider =
    document.getElementById("noiseSlider");

const noiseValue =
    document.getElementById("noiseValue");

const runBtn =
    document.getElementById("runBtn");

const resultsSection =
    document.getElementById("resultsSection");

const resultsContainer =
    document.getElementById("resultsContainer");


// -------------------------------
// NOISE SLIDER
// -------------------------------

noiseSlider.addEventListener("input", () => {

    noiseValue.textContent =
        noiseSlider.value;

});


// -------------------------------
// ADD PACKET
// -------------------------------

addPacketBtn.addEventListener("click", () => {

    const packetCount =
        document.querySelectorAll(".packet-input").length + 1;

    const packet = document.createElement("div");

    packet.className = "packet-input";

    packet.innerHTML = `

        <span class="packet-number">
            ${String(packetCount).padStart(2, "0")}
        </span>

        <input
            type="text"
            class="binary-input"
            placeholder="Example: 11010100"
            maxlength="32"
        >

        <button
            class="remove-btn"
            onclick="removePacket(this)">
            ×
        </button>
    `;

    packetContainer.appendChild(packet);

    updatePacketNumbers();

});


// -------------------------------
// REMOVE PACKET
// -------------------------------

function removePacket(button) {

    const packets =
        document.querySelectorAll(".packet-input");

    if (packets.length <= 1) {

        alert("At least one packet is required.");

        return;
    }

    button.parentElement.remove();

    updatePacketNumbers();
}


// -------------------------------
// UPDATE PACKET NUMBERS
// -------------------------------

function updatePacketNumbers() {

    const packets =
        document.querySelectorAll(".packet-input");

    packets.forEach((packet, index) => {

        packet.querySelector(".packet-number")
            .textContent =
            String(index + 1).padStart(2, "0");

    });
}


// -------------------------------
// RUN TRANSMISSION
// -------------------------------

runBtn.addEventListener("click", async () => {

    const inputs =
        document.querySelectorAll(".binary-input");

    const packets = [];

    for (const input of inputs) {

        const value =
            input.value.trim();

        if (!value) {

            alert("Please enter binary data in every packet.");

            input.focus();

            return;
        }

        if (!/^[01]+$/.test(value)) {

            alert(
                "Invalid input. Please enter only 0 and 1."
            );

            input.focus();

            return;
        }

        packets.push(value);
    }


    const noise =
        Number(noiseSlider.value);


    // Button state

    runBtn.disabled = true;

    runBtn.innerHTML =
        "⏳ Transmitting...";


    try {

        const response =
            await fetch("/simulate", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    packets: packets,
                    noise: noise
                })

            });


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error || "Transmission failed."
            );

        }


        displayResults(data);


    } catch (error) {

        alert(error.message);

    } finally {

        runBtn.disabled = false;

        runBtn.innerHTML =
            "<span>▶</span> Run Transmission";

    }

});


// -------------------------------
// DISPLAY RESULTS
// -------------------------------

function displayResults(data) {

    resultsSection.classList.remove("hidden");

    resultsContainer.innerHTML = "";


    const results =
        data.results;


    results.forEach((result, index) => {

        const card =
            document.createElement("div");

        card.className = "result-card";


        let statusClass = "accepted";

        if (result.status === "RETRANSMISSION SUCCESSFUL") {

            statusClass = "success";

        } else if (
            result.status === "RETRANSMISSION FAILED"
        ) {

            statusClass = "failed";

        } else if (
            result.status === "RETRANSMISSION REQUIRED"
        ) {

            statusClass = "error";

        }


        let retransmissionHTML = "";


        if (result.error_detected) {

            retransmissionHTML = `

                <div class="retransmission-box">

                    <h4>
                        🔄 Retransmission
                    </h4>

                    <div class="transmission-row">

                        <span>
                            Retransmitted:
                        </span>

                        <code>
                            ${result.retransmitted_packet}
                        </code>

                    </div>

                    <div class="transmission-row">

                        <span>
                            Received again:
                        </span>

                        <code>
                            ${result.retransmission_received}
                        </code>

                    </div>

                    <div class="retransmission-status ${result.retransmission_success ? "good" : "bad"}">

                        ${
                            result.retransmission_success
                                ? "✓ Retransmission successful"
                                : "✕ Retransmission failed"
                        }

                    </div>

                </div>
            `;
        }


        card.innerHTML = `

            <div class="result-top">

                <div>

                    <span class="packet-label">
                        PACKET ${String(index + 1).padStart(2, "0")}
                    </span>

                    <h3>
                        ${result.status}
                    </h3>

                </div>

                <div class="result-status ${statusClass}">
                    ${result.status}
                </div>

            </div>


            <div class="data-analysis">

                <div class="analysis-item">

                    <span>Input</span>

                    <code>
                        ${result.input_data}
                    </code>

                </div>


                <div class="analysis-item">

                    <span>1s</span>

                    <strong>
                        ${result.ones}
                    </strong>

                </div>


                <div class="analysis-item">

                    <span>0s</span>

                    <strong>
                        ${result.zeros}
                    </strong>

                </div>


                <div class="analysis-item">

                    <span>Selected Parity</span>

                    <strong>
                        ${result.parity_type}
                    </strong>

                </div>


                <div class="analysis-item">

                    <span>Parity Bit</span>

                    <strong>
                        ${result.parity_bit}
                    </strong>

                </div>

            </div>


            <div class="transmission-stage">

                <div class="stage">

                    <span>1. SENT</span>

                    <code>
                        ${result.original_packet}
                    </code>

                </div>


                <div class="stage-arrow">
                    ↓
                </div>


                <div class="stage noise-stage">

                    <span>
                        2. NOISE CHANNEL
                    </span>

                    <code>
                        ${result.received_packet}
                    </code>

                </div>


                <div class="stage-arrow">
                    ↓
                </div>


                <div class="stage">

                    <span>
                        3. RECEIVER
                    </span>

                    <strong class="${result.error_detected ? "red" : "green"}">

                        ${
                            result.error_detected
                                ? "❌ ERROR DETECTED"
                                : "✓ DATA ACCEPTED"
                        }

                    </strong>

                </div>

            </div>


            <div class="error-info">

                <span>
                    Noise Level:
                    <strong>${data.statistics.noise_percentage}%</strong>
                </span>

                <span>
                    Bit Changes:
                    <strong>${result.error_count}</strong>
                </span>

            </div>


            ${retransmissionHTML}

        `;


        resultsContainer.appendChild(card);

    });


    // -------------------------------
    // STATISTICS
    // -------------------------------

    const stats =
        data.statistics;


    document.getElementById("totalPackets")
        .textContent =
        stats.total_packets;


    document.getElementById("errorPackets")
        .textContent =
        stats.error_packets;


    document.getElementById("acceptedPackets")
        .textContent =
        stats.accepted_packets;


    document.getElementById("retransmissions")
        .textContent =
        stats.retransmissions;


    const overallStatus =
        document.getElementById("overallStatus");


    if (stats.error_packets === 0) {

        overallStatus.textContent =
            "✓ ALL PACKETS ACCEPTED";

        overallStatus.className =
            "status-badge success";

    } else {

        overallStatus.textContent =
            "TRANSMISSION COMPLETED";

        overallStatus.className =
            "status-badge warning";

    }


    resultsSection.scrollIntoView({
        behavior: "smooth"
    });

}