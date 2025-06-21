// src/models/db/Events.ts
import { DataTypes, Model, Optional, CreateOptions } from 'sequelize';
import { sequelize } from '../sequelize'; // Import your sequelize instance

// Define the interface for the attributes of the Events model
interface EventAttributes {
  id: number;
  device_id: number;
  type_id: string;
  details?: string;
  time: number;
}

// Define the interface for the creation attributes of the Events model
// 'id' is optional for creation because it's auto-incremented
interface EventCreationAttributes extends Optional<EventAttributes, 'id'> {}

export class Events extends Model<EventAttributes, EventCreationAttributes> implements EventAttributes {
  public id!: number;
  public device_id!: number;
  public type_id!: string;
  public details?: string;
  public time!: number;

  // Static method to find an event by options (using Sequelize's findOne)
  static findOne(options: any) {
    return super.findOne(options); // Use Sequelize's findOne method
  }
}

// Initialize the model with Sequelize
Events.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    device_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    time: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,  // Use the sequelize instance
    modelName: 'Event',  // Define the model name
    tableName: 'events', // Define the table name in the database
    timestamps: false,   // Disable timestamps if not needed
  }
);
