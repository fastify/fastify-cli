import { Flags } from '@oclif/core'
import { execSync } from 'child_process'
import { compile } from 'ejs'
import { access, mkdir, readFile, rm, stat, writeFile } from 'fs/promises'
import { prompt } from 'inquirer'
import { basename, dirname, join, resolve } from 'path'
import { Command } from '../../utils/command/command'
import { computePackageJSON } from '../../utils/package-json/plugin'
import { toCamelCase } from '../../utils/string'

export default class Plugin extends Command {
  static description = 'Generate fastify plugin'

  static args = [
    { name: 'name', required: false, description: 'Name of the plugin' }
  ]

  static flags = {
    location: Flags.string({ description: 'Location to place the project.' }),
    overwrite: Flags.boolean({ description: 'Force to overwrite the project location when it exist.', default: false }),
    repo: Flags.string({ description: 'Git repository url of the project.' }),
    language: Flags.string({ description: 'Programming Language you would like to use in this project.' }),
    lint: Flags.string({ description: 'Lint Tools you would like to use in this project.' }),
    test: Flags.string({ description: 'Test Framework you would like to use in this project.' }),
    help: Flags.help()
  }

  shouldOverwrite = false

  async run (): Promise<void> {
    const { args, flags } = await this.parse(Plugin)

    // validate
    if (flags.language !== undefined) this.corceLanguage(flags.language)

    const answer: any = {}

    Object.assign(answer, await prompt([
      { type: 'input', name: 'name', message: 'What is your project name?', validate: this.questionNameValidate },
      { type: 'input', name: 'location', message: 'Where do you want to place your project?', default: this.questionLocationDefault },
      { type: 'confirm', name: 'overwrite', message: 'The folder already exist. Do you want to overwrite?', default: flags.overwrite ?? false, when: this.questionOverwriteWhen, askAnswered: true }
    ], {
      name: args.name,
      location: flags.location,
      overwrite: flags.overwrite
    }))

    if (this.shouldOverwrite) this.questionOverwriteValidate(answer.overwrite)

    Object.assign(answer, await prompt([
      { type: 'input', name: 'repo', message: 'What is the repo url?' },
      { type: 'list', name: 'language', message: 'Which language will you use?', default: 'JavaScript', choices: ['JavaScript'] },
      { type: 'list', name: 'lint', message: 'Which linter would you like to use?', default: this.questionLintDefault, choices: this.questionLintChoices },
      { type: 'list', name: 'test', message: 'Which test framework would you like to use?', default: 'tap', choices: ['tap'] }
    ], {
      repo: flags.repo,
      language: flags.language,
      lint: flags.lint,
      test: flags.test
    }))

    answer.camelCaseName = toCamelCase(answer.name)

    const fileList = await this.computeFileList(answer)
    const files = await this.prepareFiles(fileList, answer)
    await this.writeFiles(files, answer)
    await this.npmInstall(answer)
    this.log(`project "${answer.name as string}" initialized in "${answer.location as string}"`)
  }

  questionNameValidate = (input: string): true | string => {
    if (String(input).trim() === '') {
      return 'Project Name cannot be empty.'
    }
    return true
  }

  questionLocationDefault = (answer: any): string => {
    return this.toLocation(answer.name)
  }

  questionOverwriteWhen = async (answer: any): Promise<boolean> => {
    this.shouldOverwrite = !(await this.validateProjectLocation(answer.location))
    return this.shouldOverwrite
  }

  questionOverwriteValidate = (input: boolean): true | undefined => {
    if (input) return true
    this.log('Terminated because location cannot be overwrite.')
    this.exit(0)
  }

  questionLintDefault =(answer: any): string => {
    switch (this.corceLanguage(answer.language)) {
      case 'JavaScript':
        return 'standard'
    }
  }

  questionLintChoices = (answer: any): string[] => {
    switch (this.corceLanguage(answer.language)) {
      case 'JavaScript':
        return ['standard', 'eslint', 'eslint + standard']
    }
  }

  corceLanguage (str: string): 'JavaScript' {
    switch (str.trim().toLowerCase()) {
      case 'js':
      case 'javascript':
        return 'JavaScript'
      default:
        throw new Error(`Programming Language expected to be "JavaScript", but recieved "${str}"`)
    }
  }

  toLocation (name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '-')
  }

  async isFileExist (path: string): Promise<boolean> {
    try {
      const stats = await stat(path)
      return stats.isFile()
    } catch {
      return false
    }
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

  computeFileList (answer: any): string[] {
    // we do not add .ejs in here
    // we should find the file if .ejs exist first and then compile to the destination
    const files: string[] = [
      'README.md',
      '__gitignore',
      '.github/dependabot.yml',
      '.github/workflows/ci.yml'
    ]

    if (answer.language === 'JavaScript') {
      files.push('tsconfig.json')
      files.push('index.js')
      files.push('index.d.ts')
      files.push('test/index.test.js')
      files.push('test/index.test-d.ts')
    }

    return files
  }

  async resolveFile (file: string): Promise<{ template: boolean, content: string }> {
    const o = { template: false, content: '' }
    const ejsPath = resolve(join('templates', 'plugin', `${file}.ejs`))
    const isEJSTemplate = await this.isFileExist(ejsPath)
    if (isEJSTemplate) {
      o.template = true
      const data = await readFile(ejsPath)
      o.content = data.toString()
      return o
    }
    const filePath = resolve(join('templates', 'plugin', file))
    const isFileExist = await this.isFileExist(filePath)
    if (isFileExist) {
      const data = await readFile(filePath)
      o.content = data.toString()
      return o
    }
    throw new Error(`File ${file} is missing, please check if the module installed properly.`)
  }

  async prepareFiles (files: string[], answer: any): Promise<{ [path: string]: string }> {
    const o: { [path: string]: string } = {}
    o['package.json'] = computePackageJSON(answer)
    for (let file of files) {
      const { template, content } = await this.resolveFile(file)
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

  async writeFiles (files: { [path: string]: string }, answer: any): Promise<void> {
    if (this.shouldOverwrite) {
      this.log(`remove folder "${answer.location as string}"`)
      await rm(resolve(answer.location as string), { recursive: true, force: true })
    }
    for (const [path, content] of Object.entries(files)) {
      const realpath = join(answer.location, path)
      const fullpath = resolve(realpath)
      await mkdir(dirname(fullpath), { recursive: true })
      await writeFile(fullpath, content)
      this.log(`write file "${path}" to "${realpath}"`)
    }
  }

  async npmInstall (answer: any): Promise<void> {
    this.log('run "npm install"')
    const result: any = await prompt([
      { type: 'confirm', name: 'npm', message: 'Do you want to run "npm install"?', default: true }
    ])
    if (result.npm === true) {
      execSync('npm install', {
        cwd: resolve(answer.location),
        stdio: 'inherit'
      })
    }
  }
}
