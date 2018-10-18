const inquirer = require('inquirer')

module.exports = function question () {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'project name'
    },
    {
      type: 'input',
      name: 'description',
      message: 'project description'
    },
    {
      type: 'input',
      name: 'author',
      message: 'project author'
    }
  ])
}
