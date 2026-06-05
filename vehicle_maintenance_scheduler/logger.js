
const axios = require('axios');

let TOKEN = "";

async function refreshToken() {
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
    TOKEN = response.data.access_token;
    console.log("Token refreshed!");
}

async function Log(stack, level, package_name, message) {
    if (!TOKEN) await refreshToken();
    try {
        const response = await axios.post(
            'http://4.224.186.213/evaluation-service/logs',
            { stack, level, package: package_name, message },
            { headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' } }
        );
        console.log('Log sent:', response.data);
        return response.data;
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 400)) {
            await refreshToken();
            const response = await axios.post(
                'http://4.224.186.213/evaluation-service/logs',
                { stack, level, package: package_name, message },
                { headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' } }
            );
            return response.data;
        }
        console.error('Logging failed:', error.message);
    }
}

module.exports = { Log, refreshToken };