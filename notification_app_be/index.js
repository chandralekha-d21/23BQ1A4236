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

function getWeight(type) {
    if (type === 'Placement') return 3;
    if (type === 'Result') return 2;
    if (type === 'Event') return 1;
    return 0;
}

function getTop10(notifications) {
    return notifications
        .sort((a, b) => {
            const weightDiff = getWeight(b.Type) - getWeight(a.Type);
            if (weightDiff !== 0) return weightDiff;
            return new Date(b.Timestamp) - new Date(a.Timestamp);
        })
        .slice(0, 10);
}

app.get('/notifications/priority', async (req, res) => {
    try {
        await Log("backend", "info", "handler", "Priority notifications request received");

        const token = await getToken();
        const response = await axios.get(
            'http://4.224.186.213/evaluation-service/notifications',
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        const notifications = response.data.notifications;
        await Log("backend", "info", "service", `Fetched ${notifications.length} notifications`);

        const top10 = getTop10(notifications);
        await Log("backend", "info", "service", "Top 10 priority notifications selected");

        res.json({
            total: notifications.length,
            top10: top10
        });

    } catch (error) {
        await Log("backend", "error", "handler", `Error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3002;
app.listen(PORT, async () => {
    await refreshToken();
    console.log(`Server running on port ${PORT}`);
});