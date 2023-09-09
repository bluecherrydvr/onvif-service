const onvif = require('onvif');

// Define your camera's ONVIF credentials and IP address
const cameraConfig = {
    hostname: 'YOUR_CAMERA_IP_ADDRESS',
    username: 'YOUR_USERNAME',
    password: 'YOUR_PASSWORD',
    port: 80, // Default ONVIF port is 80
};

// Create an ONVIF device object
const cam = new onvif.Cam(cameraConfig);

// Connect to the camera
cam.connect((err) => {
    if (err) {
        console.error('Error connecting to the camera:', err);
        return;
    }

    console.log('Connected to the camera');

    // Create PTZ service
    const ptz = new onvif.PTZ({
        xaddr: cam.services.ptz,
        user: cameraConfig.username,
        pass: cameraConfig.password,
    });

    // PTZ command to move the camera up (tilt up)
    const ptzCommand = {
        velocity: {
            x: 0, // Pan (horizontal movement) value (0 is no movement)
            y: 1, // Tilt (vertical movement) value (1 is up, -1 is down)
            zoom: 0, // Zoom value (0 is no zoom)
        },
        timeout: 'PT5S', // Timeout for the movement (e.g., 5 seconds)
    };

    ptz.continuousMove(ptzCommand, (err, result) => {
        if (err) {
            console.error('Error sending PTZ command:', err);
        } else {
            console.log('PTZ command sent successfully');
        }

        // Stop the PTZ movement after a few seconds (optional)
        setTimeout(() => {
            ptz.stop((err, result) => {
                if (err) {
                    console.error('Error stopping PTZ movement:', err);
                } else {
                    console.log('PTZ movement stopped');
                }

                // Disconnect from the camera
                cam.disconnect(() => {
                    console.log('Disconnected from the camera');
                });
            });
        }, 5000); // Stop PTZ movement after 5 seconds (adjust as needed)
    });
});