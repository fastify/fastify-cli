

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g fastify-cli
$ fastify COMMAND
running command...
$ fastify (--version)
fastify-cli/3.1.0 linux-x64 node-v18.2.0
$ fastify --help [COMMAND]
USAGE
  $ fastify COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`fastify generate project [NAME]`](#fastify-generate-project-name)
* [`fastify help [COMMAND]`](#fastify-help-command)
* [`fastify start ENTRY`](#fastify-start-entry)

## `fastify generate project [NAME]`

Generate fastify project

```
USAGE
  $ fastify generate project [NAME] [--location <value>] [--overwrite] [--language <value>] [--lint <value>] [--test
    <value>] [--help]

ARGUMENTS
  NAME  Name of the project.

FLAGS
  --help              Show CLI help.
  --language=<value>  Programming Language you would like to use in this project.
  --lint=<value>      Lint Tools you would like to use in this project.
  --location=<value>  Location to place the project.
  --overwrite         Force to overwrite the project location when it exist.
  --test=<value>      Test Framework you would like to use in this project.

DESCRIPTION
  Generate fastify project
```

## `fastify help [COMMAND]`

Display help for fastify.

```
USAGE
  $ fastify help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for fastify.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.12/src/commands/help.ts)_

## `fastify start ENTRY`

Start fastify instance

```
USAGE
  $ fastify start [ENTRY] [-r <value>] [-p <value>] [-a <value>] [--debug-port <value> -d] [--debug-address
    <value> ] [--prefix <value>] [-P] [--watch] [--watch-ignore <value>] [--watch-verbose] [--help]

ARGUMENTS
  ENTRY  Entry point of fastify instance.

FLAGS
  -P, --pretty-logs         [default: false] Use "pino-pretty" for log display. It require to install the module
                            seperately.
  -a, --address=<value>     [default: localhost] Address listen on. It can be either address or socket.
  -d, --debug               [default: false] Enable debug mode.
  -p, --port=<value>        [default: 3000] Port listen on.
  -r, --require=<value>...  Preload Modules, for example "-r ts-node/register".
  --debug-address=<value>   Inspector host, by default it will be either "localhost" or "0.0.0.0" in docker.
  --debug-port=<value>      [default: 9320] Inspector port.
  --help                    Show CLI help.
  --prefix=<value>          [default: ""] Entry file prefix.
  --watch
  --watch-ignore=<value>
  --watch-verbose

DESCRIPTION
  Start fastify instance
```

_See code: [dist/commands/start.ts](https://github.com/fastify/fastify-cli/blob/v3.1.0/dist/commands/start.ts)_
<!-- commandsstop -->
