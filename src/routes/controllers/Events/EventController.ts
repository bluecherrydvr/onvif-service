import { OnvifEventInterface } from '../../../services/onvif/EventInterface';
import { Devices } from '../../../models/db/Device';

export class EventController {
    private static eventInterfaces: Map<number, OnvifEventInterface> = new Map();

    static async subscribeToDeviceEvents(deviceId: number): Promise<void> {
        try {
            const device = await Devices.findOne({ where: { id: deviceId } });
            if (!device) {
                throw new Error(`Device ${deviceId} not found`);
            }

            const eventInterface = new OnvifEventInterface({
                host: device.ipAddress,
                port: device.onvif_port,
                username: device.rtsp_username,
                password: device.rtsp_password
            });

            await eventInterface.startEventSubscription();
            this.eventInterfaces.set(deviceId, eventInterface);

        } catch (error) {
            Server.Logs.error(`Failed to subscribe to device events: ${error}`);
            throw error;
        }
    }

    static async unsubscribeFromDeviceEvents(deviceId: number): Promise<void> {
        const eventInterface = this.eventInterfaces.get(deviceId);
        if (eventInterface) {
            eventInterface.stopEventSubscription();
            this.eventInterfaces.delete(deviceId);
        }
    }
}

