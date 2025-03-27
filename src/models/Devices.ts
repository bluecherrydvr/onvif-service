import { DataTypes, Model, Sequelize } from 'sequelize';

class Devices extends Model {
  public id!: number;
  public device!: string;
  public rtsp_username!: string;
  public rtsp_password!: string;
  public onvif_port!: number;
}

function Register(sequelize: Sequelize): void {
  Devices.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true },
      device: DataTypes.STRING,
      rtsp_username: DataTypes.STRING,
      rtsp_password: DataTypes.STRING,
      onvif_port: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: 'Devices',
      tableName: 'Devices',
      timestamps: false
    }
  );
}

export { Devices, Register };

