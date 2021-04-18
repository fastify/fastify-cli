'use strict'

const blessed = require('blessed')
const contrib = require('blessed-contrib')
const fs = require('fs')
const path = require('path')

function renderDocs () {
  const docsBase = path.join(path.dirname(require.resolve('fastify')), 'docs')

  if (!docsBase) return console.error('Something went wrong finding docs... please report a bug! https://github.com/fastify/fastify-cli')

  const fileNames = fs.readdirSync(docsBase)
  const docNames = fileNames.map(fileName => fileName.replace(/-/g, ' ').replace(/\.md$/, ''))

  const fileContents = []
  for (const fileName of fileNames) {
    const fullFilePath = path.join(docsBase, fileName)
    if (fs.lstatSync(fullFilePath).isFile()) {
      fileContents.push((fs.readFileSync(fullFilePath)).toString('utf8'))
    }
  }

  const screen = blessed.screen({
    smartCSR: true
  })

  // eslint-disable-next-line
  const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen })

  const list = grid.set(0, 0, 12, 3, blessed.list, {
    label: 'Docs',
    items: docNames,
    keys: true,
    vi: true,
    mouse: true,
    style: {
      border: {
        fg: 'green'
      },
      selected: {
        fg: 'green',
        bg: 'white'
      }
    }
  })
  list.select(0)
  list.focus()

  list.on('select', (el, selected) => {
    markdown.setLabel(docNames[selected])
    markdown.setMarkdown(fileContents[selected])
    screen.render()
  })

  const markdown = grid.set(0, 3, 12, 9, contrib.markdown, {
    label: docNames[0],
    scrollable: true,
    keys: true,
    vi: true,
    mouse: true,
    style: {
      border: {
        fg: 'white'
      }
    },
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      bg: 'blue'
    }
  })
  markdown.setMarkdown(fileContents[0])

  list.on('keypress', (el, e) => {
    if (e.full === 'right') {
      markdown.focus()
      list.style.selected.fg = null
      list.style.selected.bg = null
      list.style.border.fg = 'white'
      markdown.style.border.fg = 'green'
      screen.render()
    }
  })

  markdown.on('keypress', (el, e) => {
    if (e.full === 'left') {
      list.focus()
      list.style.selected.fg = 'green'
      list.style.selected.bg = 'white'
      list.style.border.fg = 'green'
      markdown.style.border.fg = 'white'
      screen.render()
    }
  })

  screen.render()

  screen.key(['escape', 'q', 'C-c'], function (ch, key) {
    return process.exit(0)
  })
}

module.exports = renderDocs
