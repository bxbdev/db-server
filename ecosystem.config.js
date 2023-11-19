module.exports = {
  apps: [
    {
      script: "src/server.js",
      name: "server",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
      watch: ["./server"],
    },
  ],
};
