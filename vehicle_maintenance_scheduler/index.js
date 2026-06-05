const express = require('express');
const axios = require('axios');
const { Log, refreshToken } = require('./logger');

const app = express();
app.use(express.json());

async function getToken() {
    const response = await axios.post(
        'http://4.224.186.213/evaluation-service/auth',
        {
            email: "chandralekhad184@gmail.com",
            name: "Chandralekha",
            rollNo: "23bq1a4236",
            accessCode: "QQdEYy",
            clientID: "5e370bf0-c72b-4618-9d49-4be38de1df34",
            clientSecret: "TmRjsJkApRMmgbwy"
        }
    );
    return response.data.access_token;
}

function knapsack(vehicles, capacity) {
    const n = vehicles.length;
    const dp = Array(n + 1).fill(null).map(() => Array(capacity + 1).fill(0));
    for (let i = 1; i <= n; i++) {
        const { Duration, Impact } = vehicles[i - 1];
        for (let w = 0; w <= capacity; w++) {
            dp[i][w] = dp[i - 1][w];
            if (Duration <= w) {
                dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - Duration] + Impact);
            }
        }
    }
    let w = capacity;
    const selected = [];
    for (let i = n; i > 0; i--) {
        if (dp[i][w] !== dp[i - 1][w]) {
            selected.push(vehicles[i - 1]);
            w -= vehicles[i - 1].Duration;
        }
    }
    return { maxImpact: dp[n][capacity], selected };
}

app.get('/schedule/:depotId', async (req, res) => {
    const { depotId } = req.params;
    try {
        await Log("backend", "info", "handler", `Scheduling started for depot ${depotId}`);
        const token = await getToken();
        const headers = { 'Authorization': `Bearer ${token}` };

        const depotsRes = await axios.get('http://4.224.186.213/evaluation-service/depots', { headers });
        const depot = depotsRes.data.depots.find(d => d.ID == depotId);
        if (!depot) {
            await Log("backend", "error", "handler", `Depot ${depotId} not found`);
            return res.status(404).json({ error: 'Depot not found' });
        }

        const vehiclesRes = await axios.get('http://4.224.186.213/evaluation-service/vehicles', { headers });
        const vehicles = vehiclesRes.data.vehicles;
        await Log("backend", "info", "service", `Fetched ${vehicles.length} vehicles`);

        const result = knapsack(vehicles, depot.MechanicHours);
        await Log("backend", "info", "service", `Scheduling complete. Max impact: ${result.maxImpact}`);

        res.json({
            depotId: depot.ID,
            mechanicHours: depot.MechanicHours,
            maxImpact: result.maxImpact,
            selectedVehicles: result.selected
        });
    } catch (error) {
        await Log("backend", "error", "handler", `Error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, async () => {
    await refreshToken();
    console.log(`Server running on port ${PORT}`);
});