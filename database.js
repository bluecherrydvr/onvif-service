// controllers/deviceController.js
require('dotenv').config();
const deviceController = require('./controllers/deviceController');
const mysql = require('mysql2');
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
});


// Function to fetch devices from the cache


async function getAllDevices(callback) {
    // Attempt to fetch devices from the cache
    console.log('trying to get devices ')
    deviceController.getCachedDevices(async (err, cachedDevices) => {
        if (err || !cachedDevices) {
            try {
                // Fetch devices from the database using the getDevices function from database.js
                // @todo use real data from database
                // const devices = await pool.query('SELECT * FROM devices')

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
                        "ip": "192.168.86.91",
                        "login": "admin",
                        "password": "admin123"
                    },
                    {
                        "ip": "192.168.86.119",
                        "login": "admin",
                        "password": "admin"
                    }
                ]


                // Cache the devices
                deviceController.setCachedDevices(devices, (cacheErr) => {
                    if (cacheErr) {
                        console.error('Error caching devices:', cacheErr);
                    }
                });

                callback(devices);
            } catch (dbErr) {
                console.error('Database error:', dbErr);
                callback([]);
            }
        } else {
            // Devices found in the cache
            callback(cachedDevices);
        }
    });
}

// Other controller functions for single device, create, update, and delete can remain the same

module.exports = {
    getAllDevices,
    // Other controller functions here
};
