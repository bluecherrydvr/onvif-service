import { Server } from '../server';
import { Devices, Register as RegisterDevices } from './db/Device';
import { DeviceEventTypes, RegisterDeviceEventTypes } from './db/DeviceEventTypes';

export { Devices, DeviceEventTypes }; 

export class Models {
  public static Devices: typeof Devices;
  public static DeviceEventTypes: typeof DeviceEventTypes;

  public static async Initialize(): Promise<void> {
    RegisterDevices(Server.sequelize);
    Models.Devices = Devices;

    RegisterDeviceEventTypes(Server.sequelize);
    Models.DeviceEventTypes = DeviceEventTypes;

    await Server.sequelize.sync(); 
  }
}
