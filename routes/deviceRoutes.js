// routes/deviceRoutes.js
const express = require('express');
const deviceController = require('../controllers/deviceController');

const router = express.Router();

// GET all devices
router.get('/devices', (req, res) => {
    deviceController.getAllDevices((devices) => {
        res.json(devices);
    });
});

// GET a single device by ID
router.get('/devices/:id', (req, res) => {
    const id = parseInt(req.params.id);
    deviceController.getDeviceById(id, (device) => {
        if (!device) return res.status(404).send('Device not found');
        res.json(device);
    });
});

// POST a new device
router.post('/devices', (req, res) => {
    const name = req.body.name;
    if (!name) return res.status(400).send('Device name is required');
    deviceController.createDevice(name, (newDevice) => {
        res.status(201).json(newDevice);
    });
});

// PUT (update) a device
router.put('/devices/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const name = req.body.name;
    if (!name) return res.status(400).send('Device name is required');
    deviceController.updateDevice(id, name, (updatedDevice) => {
        if (!updatedDevice) return res.status(404).send('Device not found');
        res.json(updatedDevice);
    });
});

// DELETE a device
router.delete('/devices/:id', (req, res) => {
    const id = parseInt(req.params.id);
    deviceController.deleteDevice(id, (deletedDevice) => {
        if (!deletedDevice) return res.status(404).send('Device not found');
        res.json(deletedDevice);
    });
});

module.exports = router;
