import { Server } from '../server';
import { Devices, Register as RegisterDevices } from './db/Device';

export { Devices }; 

export class Models {
  public static Devices: typeof Devices;

  public static async Initialize(): Promise<void> {
    RegisterDevices(Server.sequelize);
    Models.Devices = Devices;

    await Server.sequelize.sync(); 
  }
}
