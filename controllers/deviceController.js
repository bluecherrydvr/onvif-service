const Memcached = require('memcached');
const memcached = new Memcached('localhost:11211'); // Replace with your Memcached server configuration
const db = require('../database'); // Import the database.js module

// Function to fetch devices from the cache
function getCachedDevices(callback) {
    const key = 'devices'; // The key under which the data is stored in Memcached

    // Retrieve the JSON array from Memcached
    memcached.get(key, (err, data) => {
        if (err) {
            console.error('Error retrieving data from Memcached:', err);
            res.status(500).json({ error: 'Error retrieving data from Memcached' });
        } else {
            if (data) {
                // Data exists in Memcached
                const jsonData = data; // Parse the JSON data
                console.log('Retrieved JSON data from Memcached:', jsonData);
                res.status(200).json(jsonData); // Return the JSON data as the API response
            } else {
                // Data does not exist in Memcached
                console.log('Data not found in Memcached');
                res.status(404).json({ error: 'Data not found in Memcached' });
            }
        }
    });
}

function setCachedDevices() {
    const key = 'devices'; // The key under which you want to store the data
    // Store the JSON array in Memcached with a specified expiration time (e.g., 1 hour)
    // Store every device under devices key in cache
    //@todo remove extra steps
    const cachedDevices = [
        {
            "id": 1,
            "ip": "192.168.86.175",
            "login": "admin",
            "password": "camera123"
        },
        {
            "id": 2,
            "ip": "192.168.86.200",
            "login": "admin",
            "password": "admin123"
        },
        {
            "id": 3,
            "ip": "192.168.86.121",
            "login": "admin",
            "password": "admin123"
        },
        {
            "id": 4,
            "ip": "192.168.86.176",
            "login": "admin",
            "password": "camera123"
        },
        {
            "id": 5,
            "ip": "192.168.86.91",
            "login": "admin",
            "password": "admin123"
        },
        {
            "id": 6,
            "ip": "192.168.86.119",
            "login": "admin",
            "password": "admin"
        }
    ];

    memcached.set(key, cachedDevices, 3600, (err) => {
        if (err) {
            console.error('Error storing data in Memcached:', err);
        } else {
            console.log('Data stored in Memcached successfully');
        }
    });

    // Store devices in Memcached with keys that include the ID
    cachedDevices.forEach(device => {
        const key = `device_${device.id}`;
        const data = JSON.stringify(device);

        // Store the data in Memcached with a specified expiration time (e.g., 1 hour)
        memcached.set(key, data, 3600, (err) => {
            if (err) {
                console.error(`Error storing device ${device.id} in Memcached:`, err);
            } else {
                console.log(`Device ${device.id} stored in Memcached`);
            }
        });
    });
}

function getCachedDevice(deviceId) {
    const key = `device_${deviceId}`; // Create a key that includes the ID
    // Retrieve the device by its ID from Memcached
    return new Promise((resolve, reject) => {
        memcached.get(key, (err, data) => {
            if (err) {
                console.error('Error retrieving data from Memcached:', err);
                reject(err); // Reject the promise if there's an error
            } else {
                if (data) {
                    console.log('Retrieved JSON data from Memcached:', data);
                    resolve(JSON.parse(data)); // Resolve the promise with the retrieved data
                } else {
                    // Data does not exist in Memcached
                    console.log('Data not found in Memcached');
                    resolve(null); // Resolve with null (or any appropriate value) if data is not found
                }
            }
        });
    });
}

module.exports = {
    getCachedDevices,
    setCachedDevices,
    getCachedDevice
};


