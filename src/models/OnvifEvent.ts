import { Model, DataTypes } from 'sequelize';
import { Server } from '../server';

export class OnvifEvent extends Model {
    public id!: number;
    public deviceId!: number;
    public topic!: string;
    public source!: string;
    public data!: string;
    public timestamp!: Date;
    public recordingTriggered!: boolean;

    static Register(sequelize = Server.sequelize): void {
        OnvifEvent.init({
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            deviceId: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            topic: {
                type: DataTypes.STRING,
                allowNull: false
            },
            source: DataTypes.STRING,
            data: DataTypes.TEXT,
            timestamp: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            },
            recordingTriggered: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            }
        }, {
            sequelize,
            tableName: 'onvif_events'
        });
    }
}

