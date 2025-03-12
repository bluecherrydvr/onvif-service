export class EventHandlerService {
    private activeSubscriptions: Map<number, OnvifEventInterface> = new Map();

    async subscribeToDeviceEvents(deviceId: number): Promise<void> {
        if (this.activeSubscriptions.has(deviceId)) {
            return; // Already subscribed
        }

        const eventInterface = new OnvifEventInterface(deviceId);
        try {
            await eventInterface.initialize();
            this.activeSubscriptions.set(deviceId, eventInterface);
        } catch (error) {
            Server.Logs.error(`Failed to subscribe to device events: ${error}`);
            throw error;
        }
    }

    async unsubscribeFromDeviceEvents(deviceId: number): Promise<void> {
        const subscription = this.activeSubscriptions.get(deviceId);
        if (subscription) {
            subscription.stop();
            this.activeSubscriptions.delete(deviceId);
        }
    }

    async handleDeviceEvent(deviceId: number, event: any): Promise<void> {
        // Process and store the event in the database
        try {
            await Events.create({
                device_id: deviceId,
                type_id: event.type,
                time: Math.floor(Date.now() / 1000),
                details: JSON.stringify(event)
            });
        } catch (error) {
            Server.Logs.error(`Failed to store device event: ${error}`);
            throw error;
        }
    }
}

