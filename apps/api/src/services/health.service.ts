export const getHealthStatus = () => ({
  status: 'ok',
  service: 'attendance-tracker-api',
  timestamp: new Date().toISOString(),
});
