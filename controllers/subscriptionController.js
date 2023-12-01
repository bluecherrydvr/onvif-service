// controllers/subscriptionController.js
const deviceController = require('./deviceController');
const onvif = require('onvif');

function createSubscription(deviceId) {

    return new Promise((resolve, reject) => {
        // Initialize the ONVIF client with the provided device configuration
        deviceController.getCachedDevice(deviceId).then((data2) => {
            const data =         {
                "ip": "192.168.86.89",
                "login": "admin",
                "password": "admin",
            }
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

// Other ONVIF subscription-related functions can be defined here

module.exports = {
    createSubscription,
    // Other ONVIF subscription-related functions here
};
