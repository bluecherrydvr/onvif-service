const express = require('express');
const router = express.Router();
const ptzController = require('../controllers/ptzController');

router.post('/ptz', async (req, res) => {
    try {
        const deviceId = req.body.deviceId;
        const ptzCommand = req.body.command;
        console.log(deviceId, ptzCommand);
        ptzController.sendPTZCommand(deviceId, ptzCommand, res);
    } catch (error) {
        // Only send a response here if there's an error before sendPTZCommand is called
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
