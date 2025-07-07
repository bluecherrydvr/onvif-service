import { Sequelize } from 'sequelize';

// Update these values with your Bluecherry MySQL credentials
export const sequelize = new Sequelize('bluecherry_db', 'bluecherry_user', 'bluecherry_password', {
  host: 'localhost', // or your MySQL server host
  dialect: 'mysql',
  logging: false,
});

