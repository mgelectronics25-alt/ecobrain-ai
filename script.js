// ======================================
// ECOBRAIN AI - VERSIE 1.0
// DEMOMODUS
// ======================================

// INSTELLINGEN

let pricePerKWh = 0.30;

const maximumPower = 2500;

let currentPower = 245;
let voltage = 230;

let todayEnergy = 2.45;
let totalEnergy = 127.63;

let chart = null;

// ======================================
// GETALLEN OPMAKEN
// ======================================

function formatNumber(number, decimals = 2) {
	return number.toLocaleString("nl-BE", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	});
}

function formatMoney(number) {
	return "€ " + formatNumber(number);
}

// ======================================
// VERMOGENSMETER
// ======================================

function updateGauge(power) {

	const percentage = Math.min(
		Math.max(power / maximumPower, 0),
		1
	);

	const gauge = document.getElementById(
		"gauge-progress"
	);

	const arcLength = 283;

	gauge.style.strokeDashoffset =
		arcLength * (1 - percentage);

	document.getElementById(
		"live-power"
	).textContent = Math.round(power);
}

// ======================================
// STATISTIEKEN
// ======================================

function updateStatistics() {

	document.getElementById(
		"today-energy"
	).textContent =
		formatNumber(todayEnergy) + " kWh";

	document.getElementById(
		"today-cost"
	).textContent =
		formatMoney(todayEnergy * pricePerKWh);

	document.getElementById(
		"total-energy"
	).textContent =
		formatNumber(totalEnergy) + " kWh";

	document.getElementById(
		"total-cost"
	).textContent =
		formatMoney(totalEnergy * pricePerKWh);

	document.getElementById(
		"stats-today"
	).textContent =
		formatNumber(todayEnergy) + " kWh";

	document.getElementById(
		"stats-cost"
	).textContent =
		formatMoney(todayEnergy * pricePerKWh);

	document.getElementById(
		"voltage"
	).textContent =
		formatNumber(voltage, 1) + " V";

	document.getElementById(
		"current"
	).textContent =
		formatNumber(currentPower / voltage, 2) + " A";
}

// ======================================
// SIMULATIE
// ======================================

function simulateEnergy() {

	// Willekeurig vermogen
	currentPower = Math.floor(
		100 + Math.random() * 550
	);

	updateGauge(currentPower);

	// Simuleer 5 seconden energieverbruik
	const addedEnergy =
		currentPower * 5 / 3600000;

	todayEnergy += addedEnergy;
	totalEnergy += addedEnergy;

	updateStatistics();
}

// ======================================
// GRAFIEKEN
// ======================================

const chartData = {

	day: {
		labels: [
			"00:00", "02:00", "04:00",
			"06:00", "08:00", "10:00",
			"12:00", "14:00", "16:00",
			"18:00", "20:00", "22:00"
		],

		values: [
			120, 135, 110, 180,
			320, 540, 420, 680,
			310, 260, 590, 245
		],

		label: "Vermogen (W)"
	},

	week: {
		labels: [
			"Ma", "Di", "Wo", "Do",
			"Vr", "Za", "Zo"
		],

		values: [
			2.8, 3.1, 2.7, 3.5,
			2.9, 4.1, 2.45
		],

		label: "Energie (kWh)"
	},

	month: {
		labels: [
			"Week 1",
			"Week 2",
			"Week 3",
			"Week 4"
		],

		values: [
			20.5, 23.8, 21.2, 25.4
		],

		label: "Energie (kWh)"
	}
};

function createChart(period = "day") {

	const canvas = document.getElementById(
		"energy-chart"
	);

	if (typeof Chart === "undefined") {
		document.getElementById(
			"chart-note"
		).textContent =
			"Grafiekbibliotheek niet geladen. Controleer je internetverbinding.";
		return;
	}

	const ctx = canvas.getContext("2d");

	const data = chartData[period];

	if (chart !== null) {
		chart.destroy();
	}

	const gradient = ctx.createLinearGradient(
		0, 0, 0, 300
	);

	gradient.addColorStop(
		0,
		"rgba(39,245,139,0.40)"
	);

	gradient.addColorStop(
		1,
		"rgba(39,245,139,0.01)"
	);

	chart = new Chart(ctx, {

		type: "line",

		data: {
			labels: data.labels,

			datasets: [{
				label: data.label,
				data: data.values,

				borderColor: "#27f58b",
				backgroundColor: gradient,

				borderWidth: 3,
				fill: true,
				tension: 0.4,

				pointRadius: 3,
				pointHoverRadius: 6,
				pointBackgroundColor: "#27f58b"
			}]
		},

		options: {
			responsive: true,
			maintainAspectRatio: false,

			interaction: {
				intersect: false,
				mode: "index"
			},

			plugins: {
				legend: {
					display: false
				},

				tooltip: {
					backgroundColor: "#122438",
					titleColor: "#ffffff",
					bodyColor: "#27f58b",
					padding: 12
				}
			},

			scales: {
				x: {
					ticks: {
						color: "#91a4b9"
					},

					grid: {
						color: "rgba(255,255,255,0.04)"
					}
				},

				y: {
					beginAtZero: true,

					ticks: {
						color: "#91a4b9"
					},

					grid: {
						color: "rgba(255,255,255,0.07)"
					}
				}
			}
		}
	});

	document.getElementById(
		"chart-note"
	).textContent =
		period === "day"
			? "Vermogen gedurende de dag (W)"
			: "Energieverbruik per periode (kWh)";
}

// ======================================
// GRAFIEKKNOPPEN
// ======================================

document.querySelectorAll(
	".period"
).forEach(button => {

	button.addEventListener("click", () => {

		document.querySelectorAll(
			".period"
		).forEach(btn => {
			btn.classList.remove("active");
		});

		button.classList.add("active");

		createChart(button.dataset.period);
	});
});

// ======================================
// NAVIGATIE
// ======================================

document.querySelectorAll(
	".nav-item"
).forEach(button => {

	button.addEventListener("click", () => {

		const pageName = button.dataset.page;

		document.querySelectorAll(
			".page"
		).forEach(page => {
			page.classList.remove("active");
		});

		document.getElementById(
			pageName
		).classList.add("active");

		document.querySelectorAll(
			".nav-item"
		).forEach(btn => {
			btn.classList.remove("active");
		});

		button.classList.add("active");

		window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	});
});

// ======================================
// INSTELLINGEN
// ======================================

document.getElementById(
	"save-settings"
).addEventListener("click", () => {

	const input = document.getElementById(
		"price-input"
	);

	const newPrice = Number(input.value);

	if (!Number.isFinite(newPrice) || newPrice < 0 || input.value === "") {
		document.getElementById(
			"settings-message"
		).textContent =
			"Voer een geldige elektriciteitsprijs in.";
		return;
	}

	pricePerKWh = newPrice;

	updateStatistics();

	document.getElementById(
		"settings-message"
	).textContent =
		"✓ Instellingen opgeslagen voor deze sessie.";
});

// ======================================
// APP STARTEN
// ======================================

function startEcoBrain() {

	console.log("EcoBrain AI gestart!");
	console.log("Demomodus actief.");

	updateGauge(currentPower);
	updateStatistics();
	createChart("day");

	// Elke 5 seconden nieuwe demogegevens
	setInterval(simulateEnergy, 5000);
}

startEcoBrain();
