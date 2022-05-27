// This file actually address the issue from
// https://github.com/oclif/oclif/issues/190
import { Input, OutputArgs, OutputFlags, ParserInput, ParserOutput } from '@oclif/core/lib/interfaces'
import * as args from '@oclif/core/lib/parser/args'
import Deps from '@oclif/core/lib/parser/deps'
import * as flags from '@oclif/core/lib/parser/flags'
import { Parser as RawParser } from '@oclif/core/lib/parser/parse'

export class Parser<T extends ParserInput, TFlags extends OutputFlags<T['flags']>, TArgs extends OutputArgs> extends RawParser<T, TFlags, TArgs> {

  async parse (): Promise<any> {
    // @ts-expect-error
    this._debugInput()

    const findLongFlag = (arg: string): string | undefined => {
      const name = arg.slice(2)
      // @ts-expect-error
      if (this.input.flags[name]) {
        return name
      }

      if (arg.startsWith('--no-')) {
        // @ts-expect-error
        const flag = this.booleanFlags[arg.slice(5)]
        if (flag && flag.allowNo) return flag.name
      }
    }

    const findShortFlag = (arg: string): string[] => {
      // @ts-expect-error
      return Object.keys(this.input.flags).find(k => this.input.flags[k].char === arg[1])
    }

    const parseFlag = (arg: string): boolean => {
      const long = arg.startsWith('--')
      const name = long ? findLongFlag(arg) : findShortFlag(arg)
      if (!name) {
        const i = arg.indexOf('=')
        if (i !== -1) {
          const sliced = arg.slice(i + 1)
          // @ts-expect-error
          this.argv.unshift(sliced)

          const equalsParsed = parseFlag(arg.slice(0, i))
          if (!equalsParsed) {
            // @ts-expect-error
            this.argv.shift()
          }

          return equalsParsed
        }

        return false
      }

      // @ts-expect-error
      const flag = this.input.flags[name]
      if (flag.type === 'option') {
        // @ts-expect-error
        this.currentFlag = flag
        // @ts-expect-error
        const input = long || arg.length < 3 ? this.argv.shift() : arg.slice(arg[2] === '=' ? 3 : 2)
        if (typeof input !== 'string') {
          // @ts-expect-error
          throw new m.errors.CLIError(`Flag --${name} expects a value`)
        }

      // @ts-expect-error
        this.raw.push({ type: 'flag', flag: flag.name, input })
      } else {
        // @ts-expect-error
        this.raw.push({ type: 'flag', flag: flag.name, input: arg })
        // push the rest of the short characters back on the stack
        if (!long && arg.length > 2) {
          // @ts-expect-error
          this.argv.unshift(`-${arg.slice(2)}`)
        }
      }

      return true
    }

    let parsingFlags = true
    // @ts-expect-error
    while (this.argv.length > 0) {
      // @ts-expect-error
      const input = this.argv.shift() as string
      if (parsingFlags && input.startsWith('-') && input !== '-') {
        // attempt to parse as arg
        // @ts-expect-error
        if (this.input['--'] !== false && input === '--') {
          parsingFlags = false
          continue
        }

        if (parseFlag(input)) {
          continue
        }
        // not actually a flag if it reaches here so parse as an arg
      }

      // not a flag, parse as arg
      // @ts-expect-error
      const arg = this.input.args[this._argTokens.length]
      if (arg) arg.input = input
      // @ts-expect-error
      this.raw.push({ type: 'arg', input })
    }

      // @ts-expect-error
    const argv = await this._argv()
    // @ts-expect-error
    const args = this._args(argv)
    // @ts-expect-error
    const flags = await this._flags()
    // @ts-expect-error
    this._debugOutput(argv, args, flags)
    return {
      args,
      argv,
      flags,
      // @ts-expect-error
      raw: this.raw,
      // @ts-expect-error
      metadata: this.metaData
    }
  }
}

const m = Deps()
  .add('validate', () => require('@oclif/core/lib/parser/validate').validate)

export async function parse<TFlags, TArgs extends { [name: string]: string }> (argv: string[], options: Input<TFlags>): Promise<ParserOutput<TFlags, TArgs>> {
  const input = {
    argv,
    context: options.context,
    args: (options.args || []).map((a: any) => args.newArg(a as any)),
    '--': options['--'],
    flags: {
      color: flags.defaultFlags.color,
      ...((options.flags || {}))
    },
    strict: options.strict !== false
  }
  const parser = new Parser(input)
  const output = await parser.parse()
  m.validate({ input, output })
  return output as ParserOutput<TFlags, TArgs>
}
