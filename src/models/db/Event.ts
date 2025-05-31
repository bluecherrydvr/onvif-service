import { DataTypes, Model } from 'sequelize';
import { Server } from '../../server';

interface EventAttributes {
    id: number;
    device_id: number;
    type_id: string;
    time: number;
    details: string;
}

export class Events extends Model<EventAttributes> implements EventAttributes {
    public id!: number;
    public device_id!: number;
    public type_id!: string;
    public time!: number;
    public details!: string;
}

export function Register(sequelize = Server.sequelize) {
    Events.init({
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        device_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        type_id: {
            type: DataTypes.STRING,
            allowNull: false
        },
        time: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        details: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'Events'
    });
}

export default {
    Events,
    Register
};

