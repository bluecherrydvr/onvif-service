const onvif = require('onvif');
const { getCachedDevice } = require("./deviceController");

function sendPTZCommand(deviceID, command, res) {
    getCachedDevice(deviceID).then((data) => {
        const cameraConfig = {
            "hostname": data.ip,
            "login": data.login,
            "password": data.password,
            "port": 80,
            "timeout": 5000,
        };
        const camera = new onvif.Cam(cameraConfig, function(err) {
            if (err) {
                console.error('Error connecting to camera:', err);
                return res.status(500).send('Error connecting to camera');
            }

            console.log('Connected to ONVIF camera', cameraConfig.hostname);

            camera.getServices(true, function(err, services) {
                if (err) {
                    console.error('Error getting camera services:', err);
                    return res.status(500).send('Error getting camera services');
                }

                const ptzService = services.find(service => service.XAddr.includes('/onvif/ptz_service'));
                const metadataService = services.find(service => service.XAddr.includes('/onvif/metadata_service'));

                if (metadataService) {
                    console.log('Profile M (metadata stream) support detected.');
                } else {
                    console.log('No Profile M (metadata stream) support detected.');
                }

                if (!ptzService) {
                    console.log('No PTZ support detected.');
                    return res.status(500).send('No PTZ support detected.');
                }

                console.log('PTZ support detected.');

                camera.relativeMove(command, function(err) {
                    if (err) {
                        console.error('Error on move:', err);
                        return res.status(500).send('Error executing move');
                    }

                    console.log('Move successful');
                    setTimeout(() => {
                        camera.getStatus(function(err, status) {
                            if (err) {
                                console.error('Error getting PTZ status:', err);
                                return res.status(500).send('Error getting PTZ status');
                            }
                            console.log('PTZ Status:', status);
                            res.send(status);
                        });
                    }, 5000); // Adjust the timeout as needed
                });
            });
        });
    }).catch(error => {
        console.error('Error in getCachedDevice:', error);
        res.status(500).send('Internal Server Error');
    });
}

module.exports = {
    sendPTZCommand,
};
