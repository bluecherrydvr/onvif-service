// controllers/deviceController.js
require('dotenv').config();
const Memcached = require('memcached');
const memcached = new Memcached('localhost:11211'); // Replace with your Memcached server configuration
const mysql = require('mysql2');
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
});


// Function to fetch devices from the cache
function getCachedDevices(callback) {
    memcached.get('allDevices', (err, data) => {
        if (err) {
            console.error('Memcached error:', err);
            callback(err, null);
        } else {
            callback(null, data);
        }
    });
}

// Function to set devices in the cache
function setCachedDevices(devices, callback) {
    memcached.set('allDevices', devices, 3600, (cacheErr) => {
        if (cacheErr) {
            console.error('Memcached set error:', cacheErr);
            callback(cacheErr);
        } else {
            callback(null);
        }
    });
}

async function getAllDevices(callback) {
    // Attempt to fetch devices from the cache
    getCachedDevices(async (err, cachedDevices) => {
        if (err || !cachedDevices) {
            try {
                // Fetch devices from the database using the getDevices function from database.js
                const devices = await pool.query('SELECT * FROM devices')

                // Cache the devices
                setCachedDevices(devices, (cacheErr) => {
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
