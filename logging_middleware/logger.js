const axios = require('axios');

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJjaGFuZHJhbGVraGFkMTg0QGdtYWlsLmNvbSIsImV4cCI6MTc4MDYzODgwOSwiaWF0IjoxNzgwNjM3OTA5LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiMTFlMjY1NjQtNzZiMi00ODc0LWI2YjYtNDFmN2ExNjgyM2VhIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoiY2hhbmRyYWxla2hhIiwic3ViIjoiNWUzNzBiZjAtYzcyYi00NjE4LTlkNDktNGJlMzhkZTFkZjM0In0sImVtYWlsIjoiY2hhbmRyYWxla2hhZDE4NEBnbWFpbC5jb20iLCJuYW1lIjoiY2hhbmRyYWxla2hhIiwicm9sbE5vIjoiMjNicTFhNDIzNiIsImFjY2Vzc0NvZGUiOiJRUWRFWXkiLCJjbGllbnRJRCI6IjVlMzcwYmYwLWM3MmItNDYxOC05ZDQ5LTRiZTM4ZGUxZGYzNCIsImNsaWVudFNlY3JldCI6IlRtUmpzSmtBcFJNbWdid3kifQ.-EEgHmxcqdSwTHTiEDqNWd7RdyiYKaKJkldd_NydAYY";

async function Log(stack, level, package_name, message) {
    try {
        const response = await axios.post(
            'http://4.224.186.213/evaluation-service/logs',
            {
                stack: stack,
                level: level,
                package: package_name,
                message: message
            },
            {
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('Log sent successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Logging failed:', error.message);
    }
}

module.exports = { Log };