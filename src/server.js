const config = require('./config');
const app = require('./app');
const { ensureSchema } = require('./database/pg');

ensureSchema()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database schema:', error);
    process.exit(1);
  });
