import { mkdir, rm } from 'fs/promises'
import { join, resolve } from 'path'
import t from 'tap'
import { INGORE_GENERATE_TEST, INGORE_NPM_INSTALL } from '../../env'
import { ENTER, KEY_DOWN, runCommand, runRawCommand } from '../../run-command'

t.test('terminate on folder exist and not overwrite', async (t) => {
  const name = 'terminate-not-overwrite'
  const location = resolve(join('test', 'fixtures', name))

  await mkdir(location, { recursive: true })

  t.teardown(async () => {
    await rm(location, { recursive: true, force: true })
  })

  t.plan(4)

  const { stdout, stdin } = runCommand(['generate', 'project'])

  await stdout.until(/What is your project name?/)
  t.pass('ask project name')
  stdin.writeLn(name)
  await stdout.until(/Where do you want to place your project?/)
  t.pass('ask project location')
  stdin.writeLn(location)
  await stdout.until(/The folder already exist. Do you want to overwrite?/)
  t.pass('ask project overwrite')
  stdin.writeLn('N')
  await stdout.until(/Terminated because location cannot be overwrite./)
  t.pass('command terminated')
})

t.test('re-input on invalid name', async (t) => {
  const name = 'terminate-not-overwrite'
  const location = resolve(join('test', 'fixtures', name))

  await mkdir(location, { recursive: true })

  t.teardown(async () => {
    await rm(location, { recursive: true, force: true })
  })

  t.plan(6)

  const { stdout, stdin } = runCommand(['generate', 'project'])

  await stdout.until(/What is your project name?/)
  t.pass('ask project name')
  stdin.writeLn('')
  await stdout.until(/Project Name cannot be empty./)
  t.pass('ask when invalid name - empty string')
  stdin.press(ENTER)
  await stdout.until(/Project Name cannot be empty./)
  t.pass('ask when invalid name - enter')
  stdin.writeLn(name)
  await stdout.until(/Where do you want to place your project?/)
  t.pass('ask project location')
  stdin.writeLn(location)
  await stdout.until(/The folder already exist. Do you want to overwrite?/)
  t.pass('ask project overwrite')
  stdin.writeLn('N')
  await stdout.until(/Terminated because location cannot be overwrite./)
  t.pass('command terminated')
})

t.test('JavaScript + Standard', async (t) => {
  const name = 'javascript-standard'
  const location = resolve(join('test', 'fixtures', name))

  t.teardown(async () => {
    await rm(location, { recursive: true, force: true })
  })

  t.plan(INGORE_NPM_INSTALL ? 8 : 9)
  const { stdout, stdin } = runCommand(['generate', 'project'])

  await stdout.until(/What is your project name?/)
  t.pass('ask project name')
  stdin.writeLn(name)
  await stdout.until(/Where do you want to place your project?/)
  t.pass('ask project location')
  stdin.writeLn(location)
  await stdout.until(/Which language will you use?/)
  t.pass('ask project language')
  stdin.press(ENTER)
  await stdout.until(/Which linter would you like to use?/)
  t.pass('ask project lint')
  stdin.press(ENTER)
  await stdout.until(/Which test framework would you like to use?/)
  t.pass('ask project test framework')
  stdin.press(ENTER)
  await stdout.until(/Do you want to run "npm install"?/)
  t.pass('ask project npm install')
  if (INGORE_NPM_INSTALL) {
    stdin.writeLn('N')
  } else {
    stdin.press(ENTER)
    await stdout.until(/initialized in/)
    t.pass('project node_modules installed')
  }

  t.test('Lint', { skip: INGORE_NPM_INSTALL }, async (t) => {
    t.plan(2)
    const { stdout, stderr, exited } = runRawCommand(['npm', 'run', 'lint'], { cwd: location })
    await exited
    t.same(stderr.lines, [], 'no stderr')
    t.matchSnapshot(stdout.lines)
  })

  t.test('Test', { skip: INGORE_GENERATE_TEST }, async (t) => {
    t.plan(2)
    const { stdout, stderr, exited } = runRawCommand(['npm', 'run', 'test'], { cwd: location })
    await exited
    t.same(stderr.lines, [], 'no stderr')
    t.matchSnapshot(stdout.lines)
  })
})

t.test('TypeScript + ESLint + TSStandard', async (t) => {
  const name = 'typescript-eslint-ts-standard'
  const location = resolve(join('test', 'fixtures', name))

  t.teardown(async () => {
    await rm(location, { recursive: true, force: true })
  })

  t.plan(INGORE_NPM_INSTALL ? 8 : 9)
  const { stdout, stdin } = runCommand(['generate', 'project'])

  await stdout.until(/What is your project name?/)
  t.pass('ask project name')
  stdin.writeLn(name)
  await stdout.until(/Where do you want to place your project?/)
  t.pass('ask project location')
  stdin.writeLn(location)
  await stdout.until(/Which language will you use?/)
  t.pass('ask project language')
  stdin.press(KEY_DOWN)
  stdin.press(ENTER)
  await stdout.until(/Which linter would you like to use?/)
  t.pass('ask project lint')
  stdin.press(KEY_DOWN)
  stdin.press(KEY_DOWN)
  stdin.press(ENTER)
  await stdout.until(/Which test framework would you like to use?/)
  t.pass('ask project test framework')
  stdin.press(ENTER)
  await stdout.until(/Do you want to run "npm install"?/)
  t.pass('ask project npm install')
  if (INGORE_NPM_INSTALL) {
    stdin.writeLn('N')
  } else {
    stdin.press(ENTER)
    await stdout.until(/initialized in/)
    t.pass('project node_modules installed')
  }

  t.test('Lint', { skip: INGORE_NPM_INSTALL }, async (t) => {
    t.plan(2)
    const { stdout, stderr, exited } = runRawCommand(['npm', 'run', 'lint'], { cwd: location })
    await exited
    t.same(stderr.lines, [], 'no stderr')
    t.matchSnapshot(stdout.lines)
  })

  t.test('Test', { skip: INGORE_GENERATE_TEST }, async (t) => {
    t.plan(2)
    const { stdout, stderr, exited } = runRawCommand(['npm', 'run', 'test'], { cwd: location })
    await exited
    t.same(stderr.lines, [], 'no stderr')
    t.matchSnapshot(stdout.lines)
  })
})
