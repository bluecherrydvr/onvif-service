const express = require('express');
const router = express.Router();
const ptzController = require('../controllers/ptzController');

// Define a route for receiving and handling arrow key commands

router.post('/ptz', async (req, res) => {
    try {
        const result = await ptzController.sendPTZCommand;
        return 'givi';
        res.status(200).json({ message: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;
