const Memcached = require('memcached');
const memcached = new Memcached('localhost:11211'); // Replace with your Memcached server configuration
const db = require('../database'); // Import the database.js module

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

module.exports = {
    getCachedDevices,
};
