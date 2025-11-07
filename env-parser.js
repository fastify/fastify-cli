module.exports = {
  safeParse: () => {
    try {
      process.loadEnvFile()
    } catch { }
  }
}
