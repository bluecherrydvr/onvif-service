// controllers/onvifSubscriptionController.js
const { OnvifDevice } = require('node-onvif');

const deviceConfig = {
    xaddr: 'http://your-camera-ip/onvif/device_service',
    user: 'your-username',
    pass: 'your-password',
};

// Initialize the ONVIF client
const device = new OnvifDevice(deviceConfig);


function createSubscription() {
    return new Promise((resolve, reject) => {
        device.init().then(() => {
            device.createPullPointSubscription((createErr, subscriptionReference) => {
                if (createErr) {
                    reject(createErr);
                } else {
                    resolve(subscriptionReference);
                }
            });
        }).catch((error) => {
            reject(error);
        });
    });
}

// Other ONVIF subscription-related functions can be defined here

module.exports = {
    createSubscription,
    // Other ONVIF subscription-related functions here
};
