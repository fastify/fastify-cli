import { confirm, input, select } from '@inquirer/prompts'
import { Args, Command, Flags } from '@oclif/core'
import { compile } from 'ejs'
import { execSync } from 'node:child_process'
import { access, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { computePackageJSON } from '../../utils/package-json/project.js'

export default class GenerateProject extends Command {
  static args = {
    name: Args.string({ description: 'Name of the project.', required: false }),
  }

  static description = 'Generate fastify project'

  static flags = {
    force: Flags.boolean({ default: false, description: 'Force to overwrite the project location when it exists.' }),
    help: Flags.help(),
    language: Flags.string({ description: 'Programming Language to use in project.' }),
    lint: Flags.string({ description: 'Lint Tool to use in project.' }),
    location: Flags.directory({ description: 'Location to place the project.' }),
    repo: Flags.string({ description: 'Git Repository URL of the project.' }),
    test: Flags.string({ description: 'Test Framework to use in project.' }),
  }

  async run (): Promise<void> {
    const { args, flags } = await this.parse(GenerateProject)

    // validate
    const answer: Record<string, unknown> = {}
    answer.language = this.corceLanguage(flags.language)

    answer.name = args.name ?? await input({ message: 'What is your project name?', validate: this.questionNameValidate })
    answer.location = flags.location ?? await input({ default: this.questionLocationDefault(answer.name as string), message: 'Where do you want to place your project?' })
    if (await this.questionOverwriteWhen(answer.location as string)) {
      answer.force = await confirm({ default: flags.force ?? false, message: 'The folder already exist. Do you want to overwrite?' })

      if (!answer.force) {
        this.log('Terminated because location cannot be overwrite.')
        this.exit(0)
      }
    }

    answer.repo = flags.repo ?? await input({ message: 'What is the repo url?' })
    answer.language = flags.language ?? await select({ choices: [{ value: 'JavaScript' }, { value: 'TypeScript' }], default: 'JavaScript', message: 'Which language will you use?' })
    answer.lint = flags.lint ?? await select({ choices: this.questionLintChoices(answer.language as string), default: this.questionLintDefault(answer.language as string), message: 'Which linter would you like to use?' })
    answer.test = flags.test ?? await select({ choices: [{ value: 'node:test' }, { value: 'tap' }], default: 'node:test', message: 'Which test framework would you like to use?' })

    const fileList = await this.computeFileList(answer)
    const files = await this.prepareFiles(fileList, answer)
    await this.writeFiles(files, answer)
    await this.npmInstall(answer)
    this.log(`project "${answer.name as string}" initialized in "${answer.location as string}"`)
  }

  computeFileList (answer: Record<string, unknown>): string[] {
    // we do not add .ejs in here
    // we should find the file if .ejs exist first and then compile to the destination
    const files: string[] = [
      '.vscode/launch.json',
      'README.md',
      '__gitignore',
      'eslint.config.js',
    ]

    if (answer.language === 'JavaScript') {
      files.push(
        'app.js',
        'plugins/README.md',
        'plugins/sensible.js',
        'plugins/support.js',
        'routes/README.md',
        'routes/root.js',
        'routes/example/index.js',
        'test/helper.js',
        'test/plugins/support.test.js',
        'test/routes/root.test.js',
        'test/routes/example.test.js'
      )
    }

    if (answer.language === 'TypeScript') {
      files.push(
        'tsconfig.json',
        'tsconfig.build.json',
        'src/app.ts',
        'src/plugins/README.md',
        'src/plugins/sensible.ts',
        'src/plugins/support.ts',
        'src/routes/README.md',
        'src/routes/root.ts',
        'src/routes/example/index.ts',
        'test/helper.ts',
        'test/plugins/support.test.ts',
        'test/routes/root.test.ts',
        'test/routes/example.test.ts'
      )
    }

    return files
  }

  corceLanguage (str?: string): 'JavaScript' | 'TypeScript' {
    switch (String(str).trim().toLowerCase()) {
      case 'undefined':
      case 'js':
      case 'javascript': {
        return 'JavaScript'
      }

      case 'ts':
      case 'typescript': {
        return 'TypeScript'
      }

      default: {
        this.error(`Programming Language expected to be "JavaScript" or "TypeScript", but recieved "${str}"`, { exit: 1 })
      }
    }
  }

  async isFileExist (path: string): Promise<boolean> {
    try {
      const stats = await stat(path)
      return stats.isFile()
    } catch {
      return false
    }
  }

  async npmInstall (answer: Record<string, unknown>): Promise<void> {
    this.log('run "npm install"')
    const result = await confirm({ default: true, message: 'Do you want to run "npm install"?' })
    if (result) {
      execSync('npm install', {
        cwd: resolve(answer.location as string),
        stdio: 'inherit',
      })
    }
  }

  async prepareFiles (files: string[], answer: Record<string, unknown>): Promise<{ [path: string]: string }> {
    const o: { [path: string]: string } = {}
    o['package.json'] = await computePackageJSON(answer)
    for await (let file of files) {
      const { content, template } = await this.resolveFile(file)
      const dir = dirname(file)
      file = `${dir}/${basename(file).replace('__', '.')}`
      if (template) {
        const render = compile(content, { async: true })
        o[file] = await render(answer)
      } else {
        o[file] = content
      }
    }

    return o
  }

  questionLintChoices (language: string): { value: string }[] {
    switch (this.corceLanguage(language)) {
      case 'JavaScript': {
        return [{ value: 'eslint' }, { value: 'neostandard' }]
      }

      case 'TypeScript': {
        return [{ value: 'eslint' }, { value: 'neostandard' }]
      }
    }
  }

  questionLintDefault (language: string): string {
    switch (this.corceLanguage(language)) {
      case 'JavaScript': {
        return 'eslint'
      }

      case 'TypeScript': {
        return 'eslint'
      }
    }
  }

  questionLocationDefault (name: string): string {
    return this.toLocation(name)
  }

  questionNameValidate (input?: string): string | true {
    if (!input || input.trim() === '') {
      return 'Project Name cannot be empty.'
    }

    return true
  }

  async questionOverwriteWhen (location: string): Promise<boolean> {
    return !(await this.validateProjectLocation(location))
  }

  async resolveFile (file: string): Promise<{ content: string, template: boolean }> {
    const o = { content: '', template: false }
    const ejsPath = resolve(join('templates', 'project', `${file}.ejs`))
    const isEJSTemplate = await this.isFileExist(ejsPath)
    if (isEJSTemplate) {
      o.template = true
      const data = await readFile(ejsPath)
      o.content = data.toString()
      return o
    }

    const filePath = resolve(join('templates', 'project', file))
    const isFileExist = await this.isFileExist(filePath)
    if (isFileExist) {
      const data = await readFile(filePath)
      o.content = data.toString()
      return o
    }

    throw new Error(`File ${file} is missing, please check if the module installed properly.`)
  }

  toLocation (name: string): string {
    return name.trim().toLowerCase().replaceAll(/\s+/g, '-')
  }

  async validateProjectLocation (location: string): Promise<boolean> {
    const path = resolve(location)
    try {
      await access(path)
      return false
    } catch {
      return true
    }
  }

  async writeFiles (files: { [path: string]: string }, answer: Record<string, unknown>): Promise<void> {
    if (answer.force === true) {
      this.log(`remove folder "${answer.location as string}"`)
      await rm(resolve(answer.location as string), { force: true, recursive: true })
    }

    for await (const [path, content] of Object.entries(files)) {
      const realpath = join(answer.location as string, path)
      const fullpath = resolve(realpath)
      await mkdir(dirname(fullpath), { recursive: true })
      await writeFile(fullpath, content)
      this.log(`write file "${path}" to "${realpath}"`)
    }
  }
}
