import {DataTypes, Model} from 'sequelize';
import {Server} from '../../server';

export interface DeviceAttributes {
  id: number;
  onvif_events_enabled: boolean;
  onvif_port: number;
  rtsp_username: string;
  rtsp_password: string;
  ip_address: string;
  disabled: boolean;
}

export class Devices extends Model<DeviceAttributes> implements DeviceAttributes {
  public id!: number;
  public onvif_events_enabled!: boolean;
  public onvif_port!: number;
  public rtsp_username!: string;
  public rtsp_password!: string;
  public ip_address!: string;
  public disabled!: boolean;
}

export function Register(sequelize = Server.sequelize): void {
  Devices.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      onvif_events_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      onvif_port: {
        type: DataTypes.INTEGER,
        defaultValue: 80
      },
      rtsp_username: DataTypes.STRING,
      rtsp_password: DataTypes.STRING,
      ip_address: DataTypes.STRING,
      disabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    },
    {
      sequelize,
      modelName: 'Devices'
    }
  );
}
