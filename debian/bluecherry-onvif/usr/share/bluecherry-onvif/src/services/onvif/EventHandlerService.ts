import { OnvifEventInterface } from './EventInterface';
import { Server } from '../../server';
import { Events } from '../../models/db/Events';

export class EventHandlerService {
    private activeSubscriptions: Map<number, OnvifEventInterface> = new Map();

    /**
     * Subscribes to ONVIF device events for a given device ID.
     * Called when enabling ONVIF event handling for a camera.
     */
    async subscribeToDeviceEvents(deviceId: number): Promise<void> {
        if (this.activeSubscriptions.has(deviceId)) {
            return;
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

    /**
     * Unsubscribes from ONVIF device events for a given device ID.
     * Called when disabling ONVIF event handling for a camera.
     */
    async unsubscribeFromDeviceEvents(deviceId: number): Promise<void> {
        const subscription = this.activeSubscriptions.get(deviceId);
        if (subscription) {
            subscription.stop();
            this.activeSubscriptions.delete(deviceId);
        }
    }

    /**
     * Persists an ONVIF event received from a device to the Events table.
     * Likely triggered by a PullPoint listener.
     */
    async handleDeviceEvent(deviceId: number, event: any): Promise<void> {
        try {
            await Events.create({
                id: 0, // Sequelize should auto-handle if set correctly
                device_id: deviceId,
                type_id: event.type,
                time: Math.floor(Date.now() / 1000),
                details: JSON.stringify(event),
            });
        } catch (error) {
            Server.Logs.error(`Failed to store device event: ${error}`);
            throw error;
        }
    }
}    

