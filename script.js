// =====================================================
// ECOBRAIN AI - VOLLEDIGE SCRIPT.JS
// LIVE SHELLY + SUPABASE + GRAFIEKEN + SLIMME INZICHTEN
// =====================================================


// =====================================================
// 1. SUPABASE VERBINDING
// =====================================================

const SUPABASE_URL =
    "https://euicxiqnenedocdnohwu.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_zn7QdNwvuNHjU2UOH31raQ_9d32xy-A";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

console.log("EcoBrain AI - Supabase verbonden");


// =====================================================
// 2. INSTELLINGEN
// =====================================================

let pricePerKWh = 0.30;

const maximumPower = 2500;

let currentPower = 0;
let voltage = 0;
let measuredCurrent = 0;

let todayEnergy = 0;
let totalEnergy = 0;

let chart = null;
let chartBusy = false;
let chartRefreshPending = false;

let lastReadingTime = null;


// =====================================================
// 3. GETALLEN OPMAKEN
// =====================================================

function formatNumber(number, decimals = 2) {

    return Number(number || 0).toLocaleString(
        "nl-BE",
        {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }
    );

}

function formatMoney(number) {

    return "€ " + formatNumber(number, 2);

}


// =====================================================
// 4. ONLINE / OFFLINE STATUS
// =====================================================

function isDeviceOnline() {

    if (!lastReadingTime) return false;

    const timestamp = new Date(lastReadingTime).getTime();

    if (!Number.isFinite(timestamp)) return false;

    const secondsAgo = (Date.now() - timestamp) / 1000;

    return secondsAgo >= -5 && secondsAgo <= 30;

}

function updateConnectionStatus(time) {

    if (time) {
        lastReadingTime = time;
    }

    const online = isDeviceOnline();

    const status = document.getElementById("connection-status");
    const liveBadge = document.getElementById("live-badge");
    const powerStatus = document.getElementById("power-status");
    const deviceStatus = document.getElementById("device-status");
    const shellyConnection = document.getElementById("shelly-connection");

    if (status) {
        status.textContent = online ? "Online" : "Offline";
        status.style.color = online ? "#27f58b" : "#ff5252";
    }

    if (liveBadge) {
        liveBadge.textContent = online ? "● LIVE" : "● OFFLINE";
        liveBadge.style.color = online ? "#27f58b" : "#ff5252";
    }

    if (powerStatus) {
        powerStatus.textContent = online ? "Live" : "Offline";
        powerStatus.style.color = online ? "#27f58b" : "#ff5252";
    }

    if (deviceStatus) {
        deviceStatus.textContent = online ? "Online" : "Offline";
        deviceStatus.style.color = online ? "#27f58b" : "#ff5252";
    }

    if (shellyConnection) {
        shellyConnection.textContent =
            online ? "Verbonden" : "Geen verbinding";
    }

    updateEnergyWarning(currentPower);
    updateSmartInsights(currentPower);

}


// =====================================================
// 5. LIVE VERMOGENSMETER
// =====================================================

function updateGauge(power) {

    const percentage = Math.min(
        Math.max(power / maximumPower, 0),
        1
    );

    const gauge = document.getElementById("gauge-progress");

    const arcLength = 283;

    if (gauge) {
        gauge.style.strokeDashoffset =
            arcLength * (1 - percentage);
    }

    const livePower = document.getElementById("live-power");

    if (livePower) {
        livePower.textContent = formatNumber(power, 1);
    }

    updateEnergyWarning(power);
    updateSmartInsights(power);

}


// =====================================================
// 6. STATISTIEKEN
// =====================================================

function updateStatistics() {

    document.getElementById("today-energy").textContent =
        formatNumber(todayEnergy, 4) + " kWh";

    document.getElementById("today-cost").textContent =
        formatMoney(todayEnergy * pricePerKWh);

    document.getElementById("total-energy").textContent =
        formatNumber(totalEnergy, 4) + " kWh";

    document.getElementById("total-cost").textContent =
        formatMoney(totalEnergy * pricePerKWh);

    document.getElementById("stats-today").textContent =
        formatNumber(todayEnergy, 4) + " kWh";

    document.getElementById("stats-cost").textContent =
        formatMoney(todayEnergy * pricePerKWh);

    document.getElementById("voltage").textContent =
        formatNumber(voltage, 1) + " V";

    document.getElementById("current").textContent =
        formatNumber(measuredCurrent, 3) + " A";

    updateSmartInsights(currentPower);

}


// =====================================================
// 7. GRAFIEKGEGEVENS
// =====================================================

const chartData = {

    day: {
        labels: [],
        values: [],
        label: "Gemiddeld vermogen (W)"
    },

    week: {
        labels: [],
        values: [],
        label: "Energieverbruik per dag (kWh)"
    },

    month: {
        labels: [],
        values: [],
        label: "Energieverbruik per dag (kWh)"
    }

};


// =====================================================
// 8. GRAFIEK TEKENEN
// =====================================================

function createChart(period = "day") {

    const canvas = document.getElementById("energy-chart");

    if (!canvas) return;

    if (typeof Chart === "undefined") {

        document.getElementById("chart-note").textContent =
            "Chart.js kon niet worden geladen.";

        return;
    }

    const ctx = canvas.getContext("2d");
    const data = chartData[period];

    if (!data) return;

    if (chart !== null) {
        chart.destroy();
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);

    gradient.addColorStop(0, "rgba(39,245,139,0.40)");
    gradient.addColorStop(1, "rgba(39,245,139,0.01)");

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
                        color: "#91a4b9",
                        maxTicksLimit: 12
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

}


// =====================================================
// 9. GRAFIEKKNOPPEN
// =====================================================

document.querySelectorAll(".period").forEach(button => {

    button.addEventListener("click", () => {

        document.querySelectorAll(".period").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        updateRealChart();

    });

});


// =====================================================
// 10. NAVIGATIE
// =====================================================

document.querySelectorAll(".nav-item").forEach(button => {

    button.addEventListener("click", () => {

        const pageName = button.dataset.page;

        document.querySelectorAll(".page").forEach(page => {
            page.classList.remove("active");
        });

        const page = document.getElementById(pageName);

        if (page) {
            page.classList.add("active");
        }

        document.querySelectorAll(".nav-item").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    });

});


// =====================================================
// 11. INSTELLINGEN
// =====================================================

document.getElementById("save-settings").addEventListener("click", () => {

    const input = document.getElementById("price-input");

    const newPrice = Number(input.value);

    if (
        !Number.isFinite(newPrice) ||
        newPrice < 0 ||
        input.value === ""
    ) {

        document.getElementById("settings-message").textContent =
            "Voer een geldige elektriciteitsprijs in.";

        return;
    }

    pricePerKWh = newPrice;

    updateStatistics();

    document.getElementById("settings-message").textContent =
        "✓ Instellingen opgeslagen voor deze sessie.";

});


// =====================================================
// 12. INLOGSYSTEEM
// =====================================================

const loginScreen = document.getElementById("login-screen");
const ecobrainApp = document.getElementById("ecobrain-app");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const loginButton = document.getElementById("login-button");

function showDashboard() {

    loginScreen.hidden = true;
    ecobrainApp.hidden = false;

    console.log("EcoBrain AI - Ingelogd");

    updateRealChart();

}

function showLogin() {

    loginScreen.hidden = false;
    ecobrainApp.hidden = true;

}


// =====================================================
// 13. INLOGGEN
// =====================================================

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email =
        document.getElementById("login-email").value.trim();

    const password =
        document.getElementById("login-password").value;

    loginButton.disabled = true;

    loginMessage.textContent = "Bezig met inloggen...";

    try {

        const { data, error } = await db.auth.signInWithPassword({
            email,
            password
        });

        if (error) {

            loginMessage.textContent =
                "Inloggen mislukt: " + error.message;

            return;
        }

        if (data.session) {

            loginMessage.textContent = "";

            document.getElementById("login-password").value = "";

            showDashboard();

        }

    } catch (error) {

        console.error(error);

        loginMessage.textContent =
            "Verbindingsfout. Probeer opnieuw.";

    } finally {

        loginButton.disabled = false;

    }

});


// =====================================================
// 14. UITLOGGEN
// =====================================================

document.getElementById("logout-button").addEventListener(
    "click",
    async () => {

        const { error } = await db.auth.signOut();

        if (error) {
            console.error(error);
            return;
        }

        showLogin();

    }
);


// =====================================================
// 15. BESTAANDE SESSIE CONTROLEREN
// =====================================================

async function checkLogin() {

    try {

        const { data, error } = await db.auth.getUser();

        if (error || !data.user) {

            showLogin();
            return;

        }

        showDashboard();

    } catch (error) {

        console.error(error);
        showLogin();

    }

}


// =====================================================
// 16. ECHTE SHELLY-METINGEN OPHALEN
// =====================================================

async function testEnergyConnection() {

    const { data: userData, error: userError } =
        await db.auth.getUser();

    if (userError || !userData.user) return;

    const { data, error } = await db
        .from("energy_readings")
        .select(`
            id,
            created_at,
            power,
            voltage,
            current,
            energy_total,
            devices!inner(user_id)
        `)
        .eq("devices.user_id", userData.user.id)
        .order("created_at", {
            ascending: false
        })
        .limit(1);

    if (error) {

        console.error(
            "Fout bij Shelly-metingen:",
            error.message
        );

        return;
    }

    if (!data || data.length === 0) return;

    const reading = data[0];

    lastReadingTime = reading.created_at;

    currentPower = Number(reading.power) || 0;
    voltage = Number(reading.voltage) || 0;
    measuredCurrent = Number(reading.current) || 0;
    totalEnergy = Number(reading.energy_total) || 0;

    updateGauge(currentPower);
    updateStatistics();
    updateConnectionStatus(reading.created_at);

    console.log("ECHTE SHELLY-METING:", reading);

    await updateTodayEnergy();

}


// =====================================================
// 17. VERBRUIK VANDAAG
// =====================================================

async function updateTodayEnergy() {

    const { data: userData, error: userError } =
        await db.auth.getUser();

    if (userError || !userData.user) return;

    const now = new Date();

    const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

    const { data: firstData, error: firstError } =
        await db
            .from("energy_readings")
            .select(`
                created_at,
                energy_total,
                devices!inner(user_id)
            `)
            .eq("devices.user_id", userData.user.id)
            .gte("created_at", startOfDay.toISOString())
            .order("created_at", {
                ascending: true
            })
            .limit(1);

    if (firstError) {

        console.error(firstError.message);
        return;

    }

    if (!firstData || firstData.length === 0) return;

    const firstReading = Number(firstData[0].energy_total);

    const { data: latestData, error: latestError } =
        await db
            .from("energy_readings")
            .select(`
                energy_total,
                devices!inner(user_id)
            `)
            .eq("devices.user_id", userData.user.id)
            .order("created_at", {
                ascending: false
            })
            .limit(1);

    if (latestError) {

        console.error(latestError.message);
        return;

    }

    if (!latestData || latestData.length === 0) return;

    const latestReading = Number(latestData[0].energy_total);

    todayEnergy = Math.max(
        0,
        latestReading - firstReading
    );

    updateStatistics();

    console.log("Verbruik vandaag:", todayEnergy, "kWh");

}


// =====================================================
// 18. GRAFIEKPERIODE BEPALEN
// =====================================================

function getChartStartDate(period) {

    const now = new Date();

    if (period === "day") {

        return new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );

    }

    if (period === "week") {

        const date = new Date(now);
        date.setDate(date.getDate() - 7);

        return date;

    }

    if (period === "month") {

        const date = new Date(now);
        date.setDate(date.getDate() - 30);

        return date;

    }

    return null;

}


// =====================================================
// 19. METINGEN OPHALEN MET PAGINERING
// =====================================================

async function fetchChartReadings(userId, startDate) {

    const readings = [];

    const pageSize = 1000;
    const maxPages = 100;

    let reachedLimit = true;

    for (let page = 0; page < maxPages; page++) {

        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data, error } = await db
            .from("energy_readings")
            .select(`
                created_at,
                power,
                energy_total,
                devices!inner(user_id)
            `)
            .eq("devices.user_id", userId)
            .gte("created_at", startDate.toISOString())
            .order("created_at", {
                ascending: true
            })
            .range(from, to);

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {

            reachedLimit = false;
            break;

        }

        readings.push(...data);

        if (data.length < pageSize) {

            reachedLimit = false;
            break;

        }

    }

    return {
        readings,
        reachedLimit
    };

}


// =====================================================
// 20. ECHTE DAG-, WEEK- EN MAANDGRAFIEKEN
// =====================================================

async function updateRealChart() {

    if (chartBusy) {

        chartRefreshPending = true;
        return;

    }

    chartBusy = true;

    try {

        const { data: userData, error: userError } =
            await db.auth.getUser();

        if (userError || !userData.user) return;

        const selectedPeriod =
            document.querySelector(".period.active")
                ?.dataset.period || "day";

        const startDate = getChartStartDate(selectedPeriod);

        if (!startDate) return;

        const { readings, reachedLimit } =
            await fetchChartReadings(
                userData.user.id,
                startDate
            );

        const activePeriod =
            document.querySelector(".period.active")
                ?.dataset.period || "day";

        if (activePeriod !== selectedPeriod) {

            chartRefreshPending = true;
            return;

        }

        const labels = [];
        const values = [];

        if (readings.length === 0) {

            chartData[selectedPeriod].labels = [];
            chartData[selectedPeriod].values = [];

            createChart(selectedPeriod);

            document.getElementById("chart-note").textContent =
                "Nog geen echte metingen beschikbaar.";

            return;

        }

        // DAG: GEMIDDELD VERMOGEN PER UUR

        if (selectedPeriod === "day") {

            const hours = new Map();

            for (const reading of readings) {

                const date = new Date(reading.created_at);
                const hour = date.getHours();

                if (!hours.has(hour)) {

                    hours.set(hour, {
                        sum: 0,
                        count: 0
                    });

                }

                const bucket = hours.get(hour);

                bucket.sum += Number(reading.power) || 0;
                bucket.count++;

            }

            const sortedHours =
                [...hours.keys()].sort((a, b) => a - b);

            for (const hour of sortedHours) {

                const bucket = hours.get(hour);

                labels.push(
                    String(hour).padStart(2, "0") + ":00"
                );

                values.push(
                    Number(
                        (bucket.sum / bucket.count).toFixed(2)
                    )
                );

            }

        } else {

            // WEEK / MAAND: ENERGIE PER DAG

            const days = new Map();

            for (let i = 1; i < readings.length; i++) {

                const previous =
                    Number(readings[i - 1].energy_total);

                const current =
                    Number(readings[i].energy_total);

                if (
                    !Number.isFinite(previous) ||
                    !Number.isFinite(current)
                ) {
                    continue;
                }

                const difference = current - previous;

                if (difference < 0) continue;

                const date = new Date(readings[i].created_at);

                const key =
                    date.getFullYear() + "-" +
                    String(date.getMonth() + 1).padStart(2, "0") + "-" +
                    String(date.getDate()).padStart(2, "0");

                if (!days.has(key)) {
                    days.set(key, 0);
                }

                days.set(
                    key,
                    days.get(key) + difference
                );

            }

            const sortedDays = [...days.keys()].sort();

            for (const key of sortedDays) {

                const parts = key.split("-");

                labels.push(parts[2] + "/" + parts[1]);

                values.push(
                    Number(days.get(key).toFixed(5))
                );

            }

        }

        chartData[selectedPeriod].labels = labels;
        chartData[selectedPeriod].values = values;

        createChart(selectedPeriod);

        const chartNote = document.getElementById("chart-note");

        if (reachedLimit) {

            chartNote.textContent =
                "Echte metingen. Let op: de periode kan " +
                "onvolledig zijn omdat de meetlimiet is bereikt.";

        } else if (selectedPeriod === "day") {

            chartNote.textContent =
                "Echt gemiddeld vermogen per uur (W).";

        } else {

            chartNote.textContent =
                "Echt gemeten energieverbruik per dag (kWh).";

        }

        console.log(
            "EcoBrain AI - Grafiek bijgewerkt:",
            selectedPeriod,
            readings.length,
            "metingen"
        );

    } catch (error) {

        console.error(
            "EcoBrain AI - Grafiekfout:",
            error
        );

        document.getElementById("chart-note").textContent =
            "Grafiek kon niet worden opgehaald.";

    } finally {

        chartBusy = false;

        if (chartRefreshPending) {

            chartRefreshPending = false;

            setTimeout(updateRealChart, 0);

        }

    }

}


// =====================================================
// 21. ENERGIEWAARSCHUWING AANMAKEN
// =====================================================

function createEnergyWarning() {

    let warning = document.getElementById("energy-warning");

    if (warning) return warning;

    const livePower = document.getElementById("live-power");

    if (!livePower) return null;

    const powerPanel = livePower.closest(".power-panel");

    const powerFooter = powerPanel?.querySelector(".power-footer");

    if (!powerFooter) return null;

    warning = document.createElement("div");

    warning.id = "energy-warning";

    warning.style.display = "block";
    warning.style.width = "fit-content";
    warning.style.maxWidth = "calc(100% - 30px)";
    warning.style.boxSizing = "border-box";
    warning.style.margin = "15px auto 20px auto";
    warning.style.padding = "12px 24px";
    warning.style.borderRadius = "12px";
    warning.style.fontSize = "14px";
    warning.style.fontWeight = "600";
    warning.style.textAlign = "center";
    warning.style.backgroundColor = "#122438";
    warning.style.border = "1px solid #27f58b";
    warning.style.color = "#27f58b";

    warning.textContent = "Wachten op energiemeting...";

    powerFooter.insertAdjacentElement(
        "beforebegin",
        warning
    );

    return warning;

}


// =====================================================
// 22. AUTOMATISCHE ENERGIEWAARSCHUWINGEN
// =====================================================

function updateEnergyWarning(power) {

    const warning = createEnergyWarning();

    if (!warning) return;

    let message = "";
    let color = "";

    if (!isDeviceOnline()) {

        message = "⚪ Geen actuele energiemeting";
        color = "#91a4b9";

    } else if (power <= 1) {

        message = "⚫ Apparaat uitgeschakeld";
        color = "#91a4b9";

    } else if (power <= 500) {

        message = "🟢 Normaal energieverbruik";
        color = "#27f58b";

    } else if (power <= 1500) {

        message = "🟠 Hoog energieverbruik";
        color = "#ffae42";

    } else {

        message = "🔴 Zeer hoog energieverbruik";
        color = "#ff5252";

    }

    warning.textContent = message;
    warning.style.color = color;
    warning.style.borderColor = color;

}


// =====================================================
// 23. ECHTE SLIMME ENERGIE-INZICHTEN
// =====================================================

function updateSmartInsights(power) {

    const section = document.querySelector(".ai-section");

    if (!section) return;

    const messages = section.querySelectorAll(".insight p");

    if (messages.length < 3) return;

    const disclaimer = section.querySelector(".disclaimer");

    if (!isDeviceOnline()) {

        messages[0].textContent =
            "Geen actuele energiemeting beschikbaar.";

        messages[1].textContent =
            "Kostenberekening wacht op een nieuwe meting.";

        messages[2].textContent =
            "Controleer de verbinding met je ESP32 en Shelly.";

        if (disclaimer) {

            disclaimer.textContent =
                "De inzichten verschijnen zodra nieuwe metingen binnenkomen.";

        }

        return;

    }

    const watts = Number(power);

    if (!Number.isFinite(watts) || watts < 0) return;

    const hourlyCost = watts / 1000 * pricePerKWh;

    const monthlyCost = hourlyCost * 24 * 30;

    const euro = value => {

        const decimals = value < 0.01 ? 5 : 2;

        return "€ " + value.toLocaleString("nl-BE", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });

    };

    // INZICHT 1: ACTUEEL VERMOGEN

    messages[0].textContent =
        "Actueel vermogen: " +
        formatNumber(watts, 1) +
        " W.";

    // INZICHT 2: ENERGIEKOSTEN

    messages[1].textContent =
        "Bij dit vermogen: " +
        euro(hourlyCost) +
        " per uur en " +
        euro(monthlyCost) +
        " per 30 dagen.";

    // INZICHT 3: BESPARINGSTIP

    if (watts <= 1) {

        messages[2].textContent =
            "Het apparaat lijkt uit of in stand-by te staan.";

    } else if (watts <= 500) {

        messages[2].textContent =
            "Besparingstip: schakel het apparaat uit " +
            "wanneer je het niet nodig hebt.";

    } else if (watts <= 1500) {

        messages[2].textContent =
            "Het actuele vermogen is relatief hoog. " +
            "Controleer of dit nodig is.";

    } else {

        messages[2].textContent =
            "Zeer hoog actueel vermogen. " +
            "Bekijk welk apparaat aangesloten is.";

    }

    if (disclaimer) {

        disclaimer.textContent =
            "Gebaseerd op echte Shelly-metingen. " +
            "Kosten zijn schattingen bij continu gelijk vermogen " +
            "en jouw ingestelde prijs per kWh.";

    }

}


// =====================================================
// 24. APP STARTEN
// =====================================================

function startEcoBrain() {

    console.log("EcoBrain AI gestart!");

    console.log(
        "Live-modus: Shelly + ESP32 + Supabase"
    );

    createEnergyWarning();

    updateGauge(currentPower);

    updateStatistics();

    createChart("day");

}

startEcoBrain();


// =====================================================
// 25. AUTOMATISCH VERNIEUWEN
// =====================================================

// Elke 5 seconden nieuwe Shelly-metingen

setInterval(() => {

    if (!ecobrainApp.hidden) {

        testEnergyConnection();

    }

}, 5000);


// Elke 30 seconden de grafiek vernieuwen

setInterval(() => {

    if (!ecobrainApp.hidden) {

        updateRealChart();

    }

}, 30000);


// Elke 5 seconden online/offline en inzichten controleren

setInterval(() => {

    if (!ecobrainApp.hidden) {

        updateConnectionStatus();

    }

}, 5000);


// =====================================================
// 26. SUPABASE AUTH EVENTS
// =====================================================

db.auth.onAuthStateChange((event, session) => {

    if (event === "SIGNED_IN" && session) {

        setTimeout(() => {

            testEnergyConnection();

        }, 100);

    }

});


// =====================================================
// 27. EERSTE METINGEN OPHALEN
// =====================================================

setTimeout(() => {

    if (!ecobrainApp.hidden) {

        testEnergyConnection();

        updateRealChart();

    }

}, 1500);


// =====================================================
// 28. INLOGSESSIE CONTROLEREN
// =====================================================

checkLogin();


// =====================================================
// ECOBRAIN AI - EINDE SCRIPT
// =====================================================

console.log("EcoBrain AI - Slimme energie-inzichten actief!");
// =====================================================
// ECOBRAIN AI - ENERGY DETECTIVE
// =====================================================

let detectiveBusy = false;

async function runEnergyDetective() {

    if (detectiveBusy || ecobrainApp.hidden) return;

    detectiveBusy = true;

    const detectivePanel =
        document.querySelector("#savings .panel:last-of-type p");

    if (!detectivePanel) {
        detectiveBusy = false;
        return;
    }

    try {

        if (!isDeviceOnline()) {
            detectivePanel.textContent =
                "⚪ Geen actuele metingen. Energy Detective wacht op verbinding.";
            return;
        }

        const { data: userData, error: userError } =
            await db.auth.getUser();

        if (userError || !userData.user) return;

        const start = new Date(
            Date.now() - 30 * 60 * 1000
        );

        const { data, error } = await db
            .from("energy_readings")
            .select(`
                created_at,
                power,
                devices!inner(user_id)
            `)
            .eq("devices.user_id", userData.user.id)
            .gte("created_at", start.toISOString())
            .order("created_at", { ascending: false })
            .limit(1000);

        if (error) throw error;

        if (!data || data.length < 10) {
            detectivePanel.textContent =
                "🔍 Nog onvoldoende metingen voor een betrouwbare analyse.";
            return;
        }

        const oldest = new Date(
            data[data.length - 1].created_at
        ).getTime();

        const newest = new Date(
            data[0].created_at
        ).getTime();

        const duration = (newest - oldest) / 60000;

        if (duration < 20) {
            detectivePanel.textContent =
                "🔍 Energy Detective verzamelt nog meetgegevens.";
            return;
        }

        const powers = data
            .map(row => Number(row.power))
            .filter(value => Number.isFinite(value) && value >= 0);

        if (powers.length < 10) return;

        const average =
            powers.reduce((sum, value) => sum + value, 0)
            / powers.length;

        const minimum = Math.min(...powers);
        const maximum = Math.max(...powers);

        const monthlyCost =
            (average / 1000) * 24 * 30 * pricePerKWh;

        const costText = formatMoney(monthlyCost);

        if (minimum >= 1 && maximum <= 20) {

            detectivePanel.textContent =
                "🔍 Mogelijk sluipverbruik: gemiddeld " +
                formatNumber(average, 1) +
                " W gedurende de onderzochte periode. " +
                "Bij continu gebruik kost dit ongeveer " +
                costText +
                " per 30 dagen.";

        } else if (maximum > average * 2 && maximum > 50) {

            detectivePanel.textContent =
                "⚡ Vermogenspiek gedetecteerd: " +
                formatNumber(maximum, 1) +
                " W. Het gemiddelde was " +
                formatNumber(average, 1) +
                " W.";

        } else {

            detectivePanel.textContent =
                "✅ Geen opvallende afwijking volgens de " +
                "ingestelde detectieregels. " +
                "Gemiddeld vermogen: " +
                formatNumber(average, 1) +
                " W.";

        }

    } catch (error) {

        console.error("Energy Detective:", error);

        detectivePanel.textContent =
            "Energy Detective kon de metingen niet analyseren.";

    } finally {

        detectiveBusy = false;

    }

}

// Eerste analyse
setTimeout(runEnergyDetective, 3000);

// Elke minuut opnieuw analyseren
setInterval(runEnergyDetective, 60000);
// =====================================================
// ECOBRAIN AI - STAP 8.30
// AUTOMATISCHE ECOSCORE
// =====================================================

let ecoScoreBusy = false;

// ======================================
// 1. ECOSCORE BEREKENEN
// ======================================

function calculateEcoScore(averagePower) {

    let score;

    if (averagePower <= 5) {

        score = 100 - averagePower;

    } else if (averagePower <= 50) {

        score = 95 - ((averagePower - 5) / 45) * 10;

    } else if (averagePower <= 250) {

        score = 85 - ((averagePower - 50) / 200) * 15;

    } else if (averagePower <= 1000) {

        score = 70 - ((averagePower - 250) / 750) * 30;

    } else {

        score = Math.max(
            0,
            40 - ((averagePower - 1000) / 1500) * 40
        );

    }

    return Math.round(
        Math.max(0, Math.min(100, score))
    );

}



// =====================================================
// ECOBRAIN AI - ECOSCORE OP BEIDE PAGINA'S
// =====================================================

function displayEcoScore(score, averagePower) {

    // ======================================
    // 1. KLEUR EN BESCHRIJVING
    // ======================================

    let color;
    let label;

    if (score >= 80) {

        color = "#27f58b";
        label = "Laag energieverbruik";

    } else if (score >= 50) {

        color = "#ffae42";
        label = "Gemiddeld energieverbruik";

    } else {

        color = "#ff5252";
        label = "Hoog energieverbruik";

    }


    // ======================================
    // 2. RONDE ECOSCORE OP DASHBOARD
    // ======================================

    const dashboardScore =
        document.getElementById("eco-score");

    if (dashboardScore) {

        dashboardScore.textContent = score;
        dashboardScore.style.color = color;

    }


    // ======================================
    // 3. RONDE METER LATEN MEEBEWEGEN
    // ======================================

    const scoreCircle =
        document.querySelector(".score-circle");

    if (scoreCircle) {

        scoreCircle.style.background =
            `conic-gradient(
                ${color} 0% ${score}%,
                #263b4d ${score}% 100%
            )`;

    }


    // ======================================
    // 4. TEKST ONDER RONDE ECOSCORE
    // ======================================

    const scoreDescription =
        document.querySelector(".score-section p");

    if (scoreDescription) {

        scoreDescription.textContent =
            label +
            " · Gemiddeld " +
            formatNumber(averagePower, 1) +
            " W";

    }


    // ======================================
    // 5. ECOSCORE OP TABBLAD BESPARING
    // ======================================

    const savingsPage =
        document.getElementById("savings");

    if (savingsPage) {

        const savingsScore =
            savingsPage.querySelector(".large-score");

        if (savingsScore) {

            savingsScore.textContent =
                score + "/100";

            savingsScore.style.color = color;

        }


        // ======================================
        // 6. BESCHRIJVING BIJ BESPARING
        // ======================================

        const savingsPanel =
            savingsPage.querySelector(".panel");

        if (savingsPanel) {

            const description =
                savingsPanel.querySelector("p");

            if (description) {

                description.textContent =
                    label +
                    " · Gemiddeld vermogen: " +
                    formatNumber(averagePower, 1) +
                    " W · Berekend met recente Shelly-metingen.";

            }

        }

    }


    console.log(
        "EcoBrain AI - EcoScore bijgewerkt:",
        score + "/100",
        "Gemiddeld vermogen:",
        averagePower
    );

}


// ======================================
// 3. ECHTE METINGEN OPHALEN
// ======================================

async function updateEcoScore() {

    if (ecoScoreBusy) return;

    if (ecobrainApp.hidden) return;

    ecoScoreBusy = true;

    try {

        const { data: userData, error: userError } =
            await db.auth.getUser();

        if (userError || !userData.user) {
            return;
        }

        // Laatste 30 minuten
        const startTime = new Date(
            Date.now() - 30 * 60 * 1000
        );

        const { data, error } = await db
            .from("energy_readings")
            .select(`
                created_at,
                power,
                devices!inner(user_id)
            `)
            .eq(
                "devices.user_id",
                userData.user.id
            )
            .gte(
                "created_at",
                startTime.toISOString()
            )
            .order(
                "created_at",
                { ascending: false }
            )
            .limit(1000);

        if (error) {
            throw error;
        }

        if (!data || data.length < 10) {

            console.log(
                "EcoScore: onvoldoende metingen."
            );

            return;
        }

        // Alleen geldige vermogenswaarden
        const powers = data
            .map(reading => Number(reading.power))
            .filter(power =>
                Number.isFinite(power) &&
                power >= 0
            );

        if (powers.length < 10) return;

        // Gemiddeld vermogen berekenen
        const totalPower = powers.reduce(
            (sum, power) => sum + power,
            0
        );

        const averagePower =
            totalPower / powers.length;

        // Score berekenen
        const ecoScore =
            calculateEcoScore(averagePower);

        // Score tonen
        displayEcoScore(
            ecoScore,
            averagePower
        );

        console.log(
            "EcoBrain AI - EcoScore:",
            ecoScore,
            "Gemiddeld vermogen:",
            averagePower
        );

    } catch (error) {

        console.error(
            "EcoScore berekenen mislukt:",
            error
        );

    } finally {

        ecoScoreBusy = false;

    }

}


// ======================================
// 4. AUTOMATISCH VERNIEUWEN
// ======================================

// Eerste berekening na het laden
setTimeout(updateEcoScore, 4000);

// Elke minuut opnieuw berekenen
setInterval(updateEcoScore, 60000);


// ======================================
// 5. ECOSCORE BIJ OPENEN TABBLAD
// ======================================

document.querySelectorAll(".nav-item").forEach(
    button => {

        button.addEventListener("click", () => {

            if (button.dataset.page === "savings") {

                setTimeout(
                    updateEcoScore,
                    300
                );

            }

        });

    }
);


// ======================================
// ECOBRAIN AI - ECOSCORE ACTIEF
// ======================================

console.log(
    "EcoBrain AI - Automatische EcoScore actief!"
);
// =====================================================
// STAP 8.32 - GEMIDDELD VERMOGEN UIT SUPABASE
// =====================================================



async function updateAveragePowerStats() {

    const averageElement =
        document.getElementById("stats-average-power");

    if (!averageElement) return;

    try {

        // Controleer of gebruiker ingelogd is
        const { data: authData, error: authError } =
            await db.auth.getUser();

        if (authError || !authData.user) {
            averageElement.textContent = "-- W";
            return;
        }

        // Metingen van de laatste 30 minuten
        const thirtyMinutesAgo =
            new Date(Date.now() - 30 * 60 * 1000).toISOString();

        const { data, error } = await db
            .from("energy_readings")
            .select("power, created_at, devices!inner(user_id)")
            .eq("devices.user_id", authData.user.id)
            .gte("created_at", thirtyMinutesAgo)
            .order("created_at", { ascending: false })
            .limit(1000);

        if (error) throw error;

        // Geen metingen beschikbaar
        if (!data || data.length === 0) {
            averageElement.textContent = "-- W";
            return;
        }

        // Geldige vermogensmetingen verzamelen
        const powers = data
            .map(reading => reading.power)
            .filter(power =>
                power !== null &&
                power !== undefined &&
                Number.isFinite(Number(power)) &&
                Number(power) >= 0
            )
            .map(Number);

        if (powers.length === 0) {
            averageElement.textContent = "-- W";
            return;
        }

        // Gemiddelde berekenen
        const totalPower = powers.reduce(
            (sum, power) => sum + power,
            0
        );

        const averagePower = totalPower / powers.length;

        // Tonen op statistiekenpagina
        averageElement.textContent =
            averagePower.toLocaleString("nl-BE", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
            }) + " W";

        console.log(
            "EcoBrain - Gemiddeld vermogen:",
            averagePower.toFixed(1),
            "W"
        );

    } catch (error) {

        console.error(
            "Fout bij berekenen gemiddeld vermogen:",
            error
        );

        averageElement.textContent = "-- W";

    }

}

// Elke 60 seconden vernieuwen
setInterval(updateAveragePowerStats, 60000);

// Ook vernieuwen wanneer Statistieken wordt geopend
document.querySelectorAll('[data-page="statistics"]')
    .forEach(button => {

        button.addEventListener("click", () => {

            updateAveragePowerStats();

        });

    });