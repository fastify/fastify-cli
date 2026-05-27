module.exports = {
  loadEnvQuitely: () => {
    try {
      process.loadEnvFile()
    } catch { }
  }
}
