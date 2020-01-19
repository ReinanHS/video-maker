const readline = require('readline-sync')
const state = require('./state')
function robot(){
  const content = {
    maximunSenteces: 7,
  }

  content.searchTerm = askAndReturnSearchTerm()
  content.prefix = askAndReturnPrefix()
  state.save(content)

  function askAndReturnSearchTerm(){
    return readline.question('Type a Wikipedia search term: ')
  }

  function askAndReturnPrefix(){
    const prefixs = ['Who is', 'What is', 'The history of']
    const prefixsTranslation = ['Quem é', 'O que é', 'A história de']
    const selectPrefixIndex = readline.keyInSelect(prefixs, 'Type a prefix: ')
    return prefixsTranslation[selectPrefixIndex]
  }
}

module.exports = robot