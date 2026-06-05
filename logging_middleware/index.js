const express = require('express');
const { Log } = require('./logger');
const app = express();

app.use(express.json());

app.use(async (req, res, next) => {
    await Log("backend", "info", "route", `${req.method} ${req.url} was called`);
    next();
});

app.get('/', async (req, res) => {
    await Log("backend", "info", "handler", "Root route accessed successfully");
    res.json({ message: 'Logging middleware is working!' });
});

const PORT = 3000;
app.listen(PORT, async () => {
    await Log("backend", "info", "service", "Server started on port 3000");
    console.log(`Server running on port ${PORT}`);
});