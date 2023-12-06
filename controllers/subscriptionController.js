// controllers/subscriptionController.js
const deviceController = require('./deviceController');
const onvif = require('onvif');
const db = require('./databaseController'); // Path to your db.js
function createSubscription(deviceId) {

    return new Promise((resolve, reject) => {
        // Initialize the ONVIF client with the provided device configuration
        deviceController.getCachedDevice(deviceId).then((data) => {

            // Create a new ONVIF camera object
            const cam = new onvif.Cam({
                hostname: data.ip,
                username: data.login,
                password: data.password,
                port: 80,
                timeout: 5000, // Set a suitable timeout
            });
            // Initialize the camera
            cam.connect((initErr) => {
                if (initErr) {
                    console.error('Error initializing camera:', initErr);
                    return;
                }

                // Create a pull point subscription
                cam.createPullPointSubscription((subscriptionErr, subscriptionReference) => {
                    if (subscriptionErr) {
                        console.error('Error creating subscription:', subscriptionErr);
                    } else {
                        console.log('Subscription Reference:', subscriptionReference);
                    }
                });
            });
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    });
}

async function  establishConnection(ip, login, password, port) {

    return new Promise((resolve, reject) => {
        const camera = new onvif.Cam({
            hostname: ip,
            username: login,
            password: password,
            port: port,
            timeout: 5000
        }, (err) => {
            if (err) {
                if (err.message.includes('EHOSTUNREACH') || err.message.includes('ETIMEDOUT')) {
                    reject({ status: 400, error: 'Cannot reach the IP address of the camera.' });
                } else if (err.message.includes('401 Unauthorized')) {
                    reject({ status: 401, error: 'Invalid username or password.' });
                } else {
                    reject({ status: 500, error: 'Error connecting to camera: ' + err.message });
                }
            } else {
                //@todo store device in database if connection is successful
                // db.execute('INSERT INTO cameras (ip, username, password, port) VALUES (?, ?, ?, ?)',
                //     [ip, login, password, port], (err, results) => {
                //         if (err) {
                //             // Handle database error
                //             throw new Error('Database error: ' + err.message);
                //         }
                //         // Success
                //         // ... Handle success ...
                //     });

                resolve({ status: 200, message: 'Camera connected successfully.' });
            }
        });
    });
}
module.exports = {
    createSubscription,
    establishConnection
};
