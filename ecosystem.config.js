module.exports = {
    apps: [
        {
            name: 'pvhverp-backend',
            script: './backend/index.js',
            env: {
                NODE_ENV: 'development'
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 5001,
                DB_USER: 'your_db_user',
                DB_PASSWORD: 'your_db_password',
                DB_SERVER: '127.0.0.1',
                DB_DATABASE: 'your_db_name',
                DB_PORT: 1433,
                JWT_SECRET: 'your_jwt_secret_key'
            }
        }
    ]
};
