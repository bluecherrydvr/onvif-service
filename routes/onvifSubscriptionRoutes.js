// routes/onvifSubscriptionRoute.js
const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');

// Route to create an ONVIF event subscription
router.post('/subscribe', async (req, res) => {
    try {
        const { id } = req.body
        const result = await subscriptionController.createSubscription(id);
        res.status(200).json({ message: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// example request: curl -X POST http://127.0.0.1:3000/api/add_camera -H "Content-Type: application/json" -d '{"ip": "192.168.1.1", "login": "user", "password": "pass", "port": 80}'
router.post('/add_camera', async (req, res) => {
    const { ip, login, password, port = 80 } = req.body;
    if (!ip || !login || !password) {
        return res.status(400).json({
            success: false,
            error: 'Missing required parameter(s). Ensure ip, login, password, and port are provided.'
        });
    }
    try {
        const result =  await subscriptionController.establishConnection(ip, login, password, port);
        res.status(result.status).json({ success: true, message: result.message });
    } catch (error) {
        res.status(error.status || 500).json({ success: false, error: error.error || 'Server error' });
    }
});

module.exports = router;
