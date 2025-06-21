// src/sequelize.ts
import { Sequelize } from 'sequelize';

// Initialize Sequelize with your database connection details
const sequelize = new Sequelize({
  dialect: 'mysql',  // You can change this to 'postgres', 'sqlite', etc.
  host: 'localhost', // Your database host (e.g., 'localhost')
  username: 'root',  // Your database username
  password: 'password',  // Your database password
  database: 'mydatabase',  // Your database name
  logging: false,  // Disable logging of SQL queries (set to true if you want to see SQL queries)
});

export { sequelize };
