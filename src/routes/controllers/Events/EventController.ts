import { OnvifEventInterface } from '../../../services/onvif/EventInterface';
import { Devices } from '../../../models/db/Device';
import { Server } from '../../../server';

export class EventController {
    private static eventInterfaces: Map<number, OnvifEventInterface> = new Map();

    static async subscribeToDeviceEvents(deviceId: number): Promise<void> {
        try {
            const device = await Devices.findOne({ where: { id: deviceId } });
            if (!device) {
                throw new Error(`Device ${deviceId} not found`);
            }

            let eventInterface = this.eventInterfaces.get(deviceId);
            if (!eventInterface) {
                eventInterface = new OnvifEventInterface(deviceId);
                this.eventInterfaces.set(deviceId, eventInterface);
            }

            await eventInterface.startEventSubscription();

        } catch (error) {
            Server.Logs.error(`Failed to subscribe to device events: ${error}`);
            throw error;
        }
    }

    static async unsubscribeFromDeviceEvents(deviceId: number): Promise<void> {
        try {
            const eventInterface = this.eventInterfaces.get(deviceId);
            if (eventInterface) {
                await eventInterface.stopEventSubscription();
                this.eventInterfaces.delete(deviceId);
            }
        } catch (error) {
            Server.Logs.error(`Failed to unsubscribe from device events: ${error}`);
            throw error;
        }
    }
}

