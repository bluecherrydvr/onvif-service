import { DataTypes, Model, Sequelize } from 'sequelize';

// This interface is not strictly necessary but provides a clear definition
// of the model's attributes for type-safety.
export interface DeviceAttributes {
  id: number;
  device_name: string;
  device: Buffer;
  onvif_events_enabled: boolean;
  onvif_port: number;
  rtsp_username: Buffer;
  rtsp_password: Buffer;
  disabled: boolean;
}

// The 'declare' keyword is the key to solving the shadowing issue.
// It tells TypeScript that these properties exist for type-checking,
// but they are not actually initialized on the class, so they do not
// interfere with Sequelize's runtime getters and setters.
export class Devices extends Model<DeviceAttributes> implements DeviceAttributes {
  public declare id: number;
  public declare device_name: string;
  public declare device: Buffer;
  public declare onvif_events_enabled: boolean;
  public declare onvif_port: number;
  public declare rtsp_username: Buffer;
  public declare rtsp_password: Buffer;
  public declare disabled: boolean;
}

export function Register(sequelize: Sequelize): void {
  Devices.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      device_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      device: {
        type: DataTypes.BLOB('tiny'),
        allowNull: true,
      },
      onvif_events_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      onvif_port: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 80,
      },
      rtsp_username: {
        type: DataTypes.BLOB('tiny'),
        allowNull: true,
      },
      rtsp_password: {
        type: DataTypes.BLOB('tiny'),
        allowNull: true,
      },
      disabled: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
    },
    {
      sequelize,
      tableName: 'Devices',
      timestamps: false,
    }
  );
}
