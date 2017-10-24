export async function logErrors(ctx: any, next: Function) {
  try {
    await next()
  } catch (error) {
    console.log(`Error processing ${ctx.method} ${ctx.path}`, error, error.stack)
  }
}