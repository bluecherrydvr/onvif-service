import { Router } from 'express';
import { ErrorResponse } from '../../../models/api/Responses/ErrorResponse';
import { EventHandlerService } from '../../../services/onvif/EventHandlerService';
import { OnvifNvtService } from '../../../services/onvif/OnvifNvtService';

const api = Router(); // ✅ Declare this or Express will throw an error

export class DevicesController {
    private static eventHandlerService: EventHandlerService;

    public static register(app: Router): void {
        // Initialize the EventHandlerService
        this.eventHandlerService = new EventHandlerService();

        // Register all routes on the passed app
        app.post('/devices/:deviceId/onvif/subscribe', async (req, res) => {
            try {
                const deviceId = parseInt(req.params.deviceId);
                await this.eventHandlerService.subscribeToDeviceEvents(deviceId);
                res.status(200).send({ message: 'Successfully subscribed to device events' });
            } catch (error) {
                res.status(500).send(new ErrorResponse(500, `Failed to subscribe to device events: ${error}`));
            }
        });

        app.post('/devices/:deviceId/onvif/unsubscribe', async (req, res) => {
            try {
                const deviceId = parseInt(req.params.deviceId);
                await this.eventHandlerService.unsubscribeFromDeviceEvents(deviceId);
                res.status(200).send({ message: 'Successfully unsubscribed from device events' });
            } catch (error) {
                res.status(500).send(new ErrorResponse(500, `Failed to unsubscribe from device events: ${error}`));
            }
        });

        app.get('/devices/discover', async (req, res) => {
            try {
                const devices = await OnvifNvtService.probeDevices();
                res.status(200).json(devices);
            } catch (error) {
                res.status(500).send(new ErrorResponse(500, `Device discovery failed: ${error}`));
            }
        });

        app.post('/devices/:deviceId/ptz/move', async (req, res) => {
            try {
                const deviceId = parseInt(req.params.deviceId);
                const { x, y, zoom } = req.body;

                const nvtService = new OnvifNvtService(deviceId);
                await nvtService.connect();
                await nvtService.ptzMove(x, y, zoom);

                res.status(200).send({ message: 'PTZ movement successful' });
            } catch (error) {
                res.status(500).send(new ErrorResponse(500, `PTZ movement failed: ${error}`));
            }
        });
    }
}

export default api;

