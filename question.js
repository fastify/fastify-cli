'use strict'

const inquirer = require('inquirer')
const path = require('path')

module.exports = function question (dir) {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'package name',
      default: function () {
        return path.basename(dir)
      },
      validate: function (input) {
        if (/^([A-Za-z-_\d])+$/.test(input)) {
          return true
        } else {
          return 'Project name may only include letters, numbers, underscores and hashes.'
        }
      }
    },
    {
      type: 'input',
      name: 'version',
      message: 'version',
      validate: function (input) {
        if (/[0-9]+\.[0-9]+\.[0-9]+/.test(input)) {
          return true
        } else {
          return 'version must be in the form of <major>.<minor>.<patch>'
        }
      },
      default: function () {
        return '1.0.0'
      }
    },
    {
      type: 'input',
      name: 'description',
      message: 'description',
      default: function () {
        return ''
      }
    },
    {
      type: 'input',
      name: 'author',
      message: 'author',
      default: function () {
        return ''
      }
    },
    {
      type: 'input',
      name: 'license',
      message: 'license',
      default: function () {
        return 'ISC'
      }
    }
  ])
}
