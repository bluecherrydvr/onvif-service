import { Devices } from '../models/db/Device';

export class CameraService {
  static async getCameraById(id: number) {
    return await Devices.findByPk(id);
  }

  static async listAllCameras() {
    return await Devices.findAll();
  }

  static async updateCameraSettings(id: number, settings: any) {
    const camera = await Devices.findByPk(id);
    if (!camera) throw new Error('Camera not found');
    return await camera.update(settings);
  }
}
