import { DataTypes, Model, Sequelize } from 'sequelize';

export class DeviceEventTypes extends Model {}

export function RegisterDeviceEventTypes(sequelize: Sequelize): void {
  DeviceEventTypes.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    device_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    event_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    sequelize,
    modelName: 'device_event_types',
    tableName: 'device_event_types',
    timestamps: false,
  });
}
