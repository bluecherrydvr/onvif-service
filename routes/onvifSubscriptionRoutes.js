// routes/onvifSubscriptionRoute.js
const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');

// Route to create an ONVIF event subscription
router.post('/subscribe', async (req, res) => {
    try {
        const { id } = req.body
        console.log()
        const result = await subscriptionController.createSubscription(id);
        res.status(200).json({ message: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
