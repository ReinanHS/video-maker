const readline = require('readline-sync')
function start(){
  const content = {}

  content.searchTerm = askAndReturnSearchTerm()
  content.prefix = askAndReturnPrefix()

  function askAndReturnSearchTerm(){
    return readline.question('Type a Wikipedia search term: ')
  }

  function askAndReturnPrefix(){
    const prefixs = ['Who is', 'What is', 'The history of']
    const selectPrefixIndex = readline.keyInSelect(prefixs, 'Type a prefix: ')
    return prefixs[selectPrefixIndex]
  }

  console.log(content)
}

start()