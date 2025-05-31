// Instead of wrapping in a class, just export the function directly
import { Request, Response, NextFunction } from 'express';
import { Devices } from '../models/db/Device';
import { ErrorResponse } from '../models/api/Responses/ErrorResponse';
import { Server } from '../server';
import { CameraEventService } from '../services/onvif/CameraEventService';
import { DeviceInfoService } from '../services/onvif/DeviceInfoService';

export async function getEventTypes(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
        const deviceId = parseInt(req.params.deviceId, 10);
        Server.Logs.debug(`Received getEventTypes request for deviceId: ${deviceId}`);

        const deviceInfo = await DeviceInfoService.getDeviceConnectionInfo(deviceId);
        Server.Logs.debug(`📦 Device info: ${JSON.stringify(deviceInfo)}`);

        if (!deviceInfo || !deviceInfo.ipAddress) {
            Server.Logs.error(`Device ${deviceId} connection info is missing an IP address.`);
            res.status(400).json(
                new ErrorResponse(400, `Device ${deviceId} connection info is incomplete.`)
            );
            return;
        }

        const device = await Devices.findOne({ where: { id: deviceId } });
        if (!device) {
            res.status(404).json(
                new ErrorResponse(404, `Device with ID ${deviceId} not found`)
            );
            return;
        }

        const result = await CameraEventService.getEventTypes(deviceId);
        res.status(200).json(result);
        return;

    } catch (error: any) {
        Server.Logs.error(`Error getting event types: ${error}`);
        res.status(500).json(
            new ErrorResponse(500, `Failed to get event types: ${error.message || error}`)
        );
        return;
    }
}

