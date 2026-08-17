export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_key_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '365d',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'db_trans',
  },
});