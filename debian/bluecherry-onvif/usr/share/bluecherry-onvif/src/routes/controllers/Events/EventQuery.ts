import { Request, Response } from 'express';
import { Events } from '../../../models/db/Events';
import { Server } from '../../../server';

export async function subscribeToEvents(req: Request, res: Response): Promise<void> {
  const { deviceId } = req.params;
  const { type_id, details } = req.body;

  try {
    await Events.create({
      id: 0,
      device_id: parseInt(deviceId, 10),
      type_id,
      time: Math.floor(Date.now() / 1000),
      details: JSON.stringify(details || {})
    });

    res.status(200).json({ message: 'Event subscription recorded' });
  } catch (error: any) {
    Server.Logs.error(`Failed to subscribe to events: ${error}`);
    res.status(500).json({ error: error.message });
  }
}
