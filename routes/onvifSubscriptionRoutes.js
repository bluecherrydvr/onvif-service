// routes/onvifSubscriptionRoute.js
const express = require('express');
const router = express.Router();
const onvifSubscriptionController = require('../controllers/onvifSubscriptionController');

// Route to create an ONVIF event subscription
router.post('/subscribe', async (req, res) => {
    try {
        const result = await onvifSubscriptionController.createSubscription();
        res.status(200).json({ message: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
