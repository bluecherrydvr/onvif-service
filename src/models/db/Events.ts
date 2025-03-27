import { DataTypes, Model } from 'sequelize';
import { Server } from '../../server';

// Define interface for Event attributes
export interface EventAttributes {
    id?: number;
    device_id: number;
    type_id: number;
    time: number;
    details: string;
}

// Extend Model with EventAttributes
export class Events extends Model<EventAttributes> implements EventAttributes {
    public id!: number;
    public device_id!: number;
    public type_id!: number;
    public time!: number;
    public details!: string;

    static Register(sequelize = Server.sequelize): void {
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
                type: DataTypes.INTEGER,
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
            tableName: 'events'
        });
    }
}

// Export just the Events class since Register is a static method of Events
export default Events;

