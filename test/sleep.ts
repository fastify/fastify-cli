export async function sleep (ms: number): Promise<void> {
  return await new Promise(function (resolve) {
    setTimeout(resolve, ms)
  })
}
