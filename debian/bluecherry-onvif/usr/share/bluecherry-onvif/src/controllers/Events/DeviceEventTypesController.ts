import { Request, Response } from 'express';
import { DeviceEventTypes } from '../../models/db/DeviceEventTypes';

export async function updateDeviceEventTypes(req: Request, res: Response): Promise<void> {
  const deviceId = parseInt(req.params.deviceId, 10);
  const selectedTypes: string[] = req.body.selectedTypes;

  if (isNaN(deviceId)) {
    res.status(400).json({ error: 'Invalid device ID' });
    return;
  }

  if (!Array.isArray(selectedTypes) || selectedTypes.some(type => typeof type !== 'string')) {
    res.status(400).json({ error: 'selectedTypes must be an array of strings' });
    return;
  }

  try {
    // Remove existing event types for the device
    await DeviceEventTypes.destroy({ where: { device_id: deviceId } });

    // Insert the new types
    const newEntries = selectedTypes.map(type => ({
      device_id: deviceId,
      event_type: type,
      enabled: true,
    }));

    await DeviceEventTypes.bulkCreate(newEntries);

    res.status(200).json({ message: 'Device event types updated successfully.' });
  } catch (error: any) {
    console.error(`Failed to update device event types for device ${deviceId}:`, error);
    res.status(500).json({ error: 'Failed to update event types.' });
  }
}

