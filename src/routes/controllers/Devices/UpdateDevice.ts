if (data.onvif_events_enabled !== undefined) {
    const eventHandler = new EventHandlerService();
    if (data.onvif_events_enabled) {
        await eventHandler.subscribeToDeviceEvents(deviceId);
    } else {
        await eventHandler.unsubscribeFromDeviceEvents(deviceId);
    }
}

