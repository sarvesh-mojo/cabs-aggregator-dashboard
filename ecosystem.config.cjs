module.exports = {
  apps: [
    {
      name: "Mojo-Management-Dashboard",
      script: "npm",
      args: "run start:pm2",
      cwd: "./",             // project root
      watch: false,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    }
  ]
};
