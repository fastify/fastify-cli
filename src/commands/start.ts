import { Flags } from '@oclif/core'
import { Command } from '../utils/command/command'
import { start, StartOption } from '../utils/start'
import { watch } from '../utils/watch/watch'

export default class Start extends Command {
  static description = 'Start fastify instance'

  static args = [
    { name: 'entry', required: true, description: 'Entry point of fastify instance.' }
  ]

  static flags = {
    require: Flags.string({ char: 'r', description: 'Preload Modules, for example "-r ts-node/register".', multiple: true }),
    port: Flags.integer({ char: 'p', description: '[default: 3000] Port listen on.' }),
    address: Flags.string({ char: 'a', description: '[default: localhost] Address listen on. It can be either address or socket.' }),
    debug: Flags.boolean({ char: 'd', description: '[default: false] Enable debug mode.' }),
    'debug-port': Flags.integer({ description: '[default: 9320] Inspector port.', dependsOn: ['debug'] }),
    'debug-address': Flags.string({ description: 'Inspector host, by default it will be either "localhost" or "0.0.0.0" in docker.', dependsOn: ['debug'] }),
    prefix: Flags.string({ description: '[default: ""] Entry file prefix.' }),
    'pretty-logs': Flags.boolean({ char: 'P', description: '[default: false] Use "pino-pretty" for log display. It require to install the module seperately.' }),
    watch: Flags.boolean(),
    'watch-ignore': Flags.string(),
    'watch-verbose': Flags.boolean(),
    help: Flags.help()
  }

  async run (): Promise<void> {
    const { args, flags } = await this.parse(Start)

    // we normalize the options before start
    const options: Partial<StartOption> = {
      prefix: flags.prefix,
      entry: args.entry,
      require: flags.require,
      port: flags.port,
      address: flags.address,
      debug: flags.debug,
      debugPort: flags['debug-port'],
      debugAddress: flags['debug-address'],
      pretty: flags['pretty-logs'],
      watch: flags.watch,
      watchIgnorePattern: flags['watch-ignore'],
      watchVerbose: flags['watch-verbose']
    }

    if (options.watch === true) {
      await watch(options)
    } else {
      await start(options)
    }
  }
}
