api.post('/:deviceId/onvif/subscribe', async (req, res) => {
    try {
        const deviceId = parseInt(req.params.deviceId);
        await eventHandlerService.subscribeToDeviceEvents(deviceId);
        res.status(200).send({ message: 'Successfully subscribed to device events' });
    } catch (error) {
        res.status(500).send(new ErrorResponse(500, `Failed to subscribe to device events: ${error}`));
    }
});

api.post('/:deviceId/onvif/unsubscribe', async (req, res) => {
    try {
        const deviceId = parseInt(req.params.deviceId);
        await eventHandlerService.unsubscribeFromDeviceEvents(deviceId);
        res.status(200).send({ message: 'Successfully unsubscribed from device events' });
    } catch (error) {
        res.status(500).send(new ErrorResponse(500, `Failed to unsubscribe from device events: ${error}`));
    }
});

