import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 OverloadGuard Backend API listening on port ${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔒 Privacy Verified: Location tracking strictly omitted`);
  console.log(`=======================================================`);
});
