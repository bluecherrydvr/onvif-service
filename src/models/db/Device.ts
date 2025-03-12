import {DataTypes, Model} from 'sequelize';
import {Server} from '../../server';

// Define interface for Device attributes
export interface DeviceAttributes {
  id: number;
  // ONVIF-related fields
  onvif_events_enabled: boolean;
  onvif_port: number;
  rtsp_username: string;
  rtsp_password: string;
  // ... other existing fields remain the same
}

// Extend Model with DeviceAttributes
export class Devices extends Model<DeviceAttributes> implements DeviceAttributes {
  public id!: number;
  public onvif_events_enabled!: boolean;
  public onvif_port!: number;
  public rtsp_username!: string;
  public rtsp_password!: string;
  // ... other existing fields remain the same
}

export function Register(sequelize = Server.sequelize): void {
  Devices.init(
    {
      // ... existing fields remain the same
      onvif_events_enabled: DataTypes.BOOLEAN,
      onvif_port: DataTypes.MEDIUMINT,
      rtsp_username: DataTypes.STRING,
      rtsp_password: DataTypes.STRING,
      // ... other existing fields remain the same
    },
    {
      sequelize: sequelize, 
      modelName: 'Devices'
    }
  );
}

export default {Devices, Register};

