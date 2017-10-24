export function getConfigurationPath() {
  const command = process.argv[2]
  const commandArgument = process.argv[3]

  if ((command !== '--configuration' && command !== '-c') || !commandArgument) {
    console.error('Usage: [--configuration <path>] [-c <path>]')
    process.exit()
  }

  return commandArgument
}