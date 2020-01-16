const readline = require('readline-sync')
const robots = {
  text: require('./robots/text')
}
async function start(){
  const content = {}

  content.searchTerm = askAndReturnSearchTerm()
  content.prefix = askAndReturnPrefix()
  await robots.text(content)

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