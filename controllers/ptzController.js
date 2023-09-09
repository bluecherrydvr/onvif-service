const { OnvifDevice, Media, PTZ } = require('node-onvif');

const cameraConfig = {
    xaddr: 'http://your-camera-ip/onvif/device_service',
    user: 'your-username',
    pass: 'your-password',
};

const camera = new OnvifDevice(cameraConfig);

camera.init().then(() => {
    console.log('Camera initialized');
}).catch(err => {
    console.error('Error initializing camera:', err);
});

function sendPTZCommand(req, res) {
    const { command } = req.body;

    if (!command) {
        return res.status(400).json({ message: 'Command is required' });
    }

    // Handle PTZ commands
    if (command === 'up') {
        camera.ptzMove({
            x: 0, // Adjust these values as needed
            y: 1, // 1 represents "up" movement
            zoom: 0,
        });
    } else if (command === 'down') {
        camera.ptzMove({
            x: 0,
            y: -1, // -1 represents "down" movement
            zoom: 0,
        });
    } else if (command === 'left') {
        camera.ptzMove({
            x: -1, // -1 represents "left" movement
            y: 0,
            zoom: 0,
        });
    } else if (command === 'right') {
        camera.ptzMove({
            x: 1, // 1 represents "right" movement
            y: 0,
            zoom: 0,
        });
    } else if (command === 'stop') {
        camera.ptzStop();
    } else {
        return res.status(400).json({ message: 'Invalid command' });
    }

    return res.status(200).json({message: 'PTZ command sent successfully'});

}
module.exports = {
    sendPTZCommand,
};
