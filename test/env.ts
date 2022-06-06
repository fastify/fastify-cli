// TODO: it take too long for Github Actions to run npm install
export const INGORE_NPM_INSTALL = Boolean(process.env.IGNORE_NPM_INSTALL ?? true)
// TODO: it should ensure the generated project coverage
// currently, nyc is throwing in this apporach
export const INGORE_GENERATE_TEST = Boolean(process.env.INGORE_GENERATE_TEST ?? true)
