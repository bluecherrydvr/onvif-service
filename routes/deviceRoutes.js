// routes/deviceRoutes.js
const express = require('express');
const deviceController = require('../controllers/deviceController');
const deviceDiscoveryController = require('../controllers/deviceDiscoveryController');

const router = express.Router();


const Memcached = require('memcached');

const memcached = new Memcached('localhost:11211'); // Replace with your Memcached server configuration

// GET all devices
router.get('/read', (req, res) => {
    const key = 'devices'; // The key under which the data is stored in Memcached
    const devices = [
        {
            "ip": "192.168.86.89",
            "login": "admin",
            "password": "admin",
            "path" : "/onvifsnapshot/media_service/snapshot?channel=1&subtype=0"
        },

    ]
    console.log('Retrieved JSON data from Memcached:', devices);
    res.status(200).json(devices); 
    // Retrieve the JSON array from Memcached
    // memcached.get(key, (err, data) => {
    //     if (err) {
    //         console.error('Error retrieving data from Memcached:', err);
    //         res.status(500).json({ error: 'Error retrieving data from Memcached' });
    //     } else {
    //         if (data) {
    //             // Data exists in Memcached
    //             const jsonData = data; // Parse the JSON data
    //             console.log('Retrieved JSON data from Memcached:', jsonData);
    //             res.status(200).json(jsonData); // Return the JSON data as the API response
    //         } else {
    //             // Data does not exist in Memcached
    //             console.log('Data not found in Memcached');
    //             res.status(404).json({ error: 'Data not found in Memcached' });
    //         }
    //     }
    // });
});

router.post('/set', (req, res) => {
    const key = 'devices'; // The key under which you want to store the data
    const devices = [
        {
            "ip": "192.168.86.175",
            "login": "admin",
            "password": "camera123"
        },
        {
            "ip": "192.168.86.200",
            "login": "admin",
            "password": "admin123"
        },
        {
            "ip": "192.168.86.121",
            "login": "admin",
            "password": "admin123"
        },
        {
            "ip": "192.168.86.176",
            "login": "admin",
            "password": "camera123"
        },
        {
            "ip": "192.168.86.89",
            "login": "admin",
            "password": "admin123"
        },
        {
            "ip": "192.168.86.119",
            "login": "admin",
            "password": "admin"
        }
    ]
    console.log('?')

    // Store the JSON array in Memcached with a specified expiration time (e.g., 1 hour)
    memcached.set(key, devices, 3600, (err) => {
        if (err) {
            console.error('Error storing data in Memcached:', err);
            res.status(500).json({ error: 'Error storing data in Memcached' });
        } else {
            console.log('Data stored in Memcached successfully');
            res.json({ message: 'Data stored in Memcached successfully' });
        }
    });
});



router.post('/discovery', (req, res) => {
    let result = deviceDiscoveryController.discoverDevices();
    console.log(result)
});

module.exports = router;
