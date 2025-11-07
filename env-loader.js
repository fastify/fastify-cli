module.exports = {
  safeLoad: () => {
    try {
      process.loadEnvFile()
    } catch { }
  }
}
