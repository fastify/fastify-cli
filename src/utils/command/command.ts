// This file actually address the issue from
// https://github.com/oclif/oclif/issues/190
import { Command as RawCommand, Interfaces } from '@oclif/core'
import * as Parser from './parser'

export abstract class Command extends RawCommand {
  protected async parse<F, A extends { [name: string]: any }>(options?: Interfaces.Input<F>, argv = this.argv): Promise<Interfaces.ParserOutput<F, A>> {
    if (options == null) options = this.constructor as any
    const opts = { context: this, ...options }
    // the spread operator doesn't work with getters so we have to manually add it here
    opts.flags = options?.flags
    return await Parser.parse(argv, opts)
  }
}
