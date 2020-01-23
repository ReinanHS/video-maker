import { Bootstrap } from '../Bootstrap'
import Readline from 'readline-sync'
export default class Input extends Bootstrap{
  constructor(){
    super()
    return new Promise((revolver) => {
      const content = this.loadContent()
      content.searchTerm = this.askAndReturnSearchTerm()
      content.prefix = this.askAndReturnPrefix()
      content.maximunSenteces = this.askAndReturnMaximunSenteces()
      this.saveContent(content)
      revolver()
    })
  }

  askAndReturnSearchTerm(){
    return Readline.question('Type a Wikipedia search term: ')
  }

  askAndReturnPrefix(){
    const prefixs = ['Who is', 'What is', 'The history of']
    const selectPrefixIndex = Readline.keyInSelect(prefixs, 'Type a prefix: ')
    return prefixs[selectPrefixIndex]
  }

  askAndReturnMaximunSenteces(){
    const MAX = 60
    const MIN = 5
    let value = 10 
    let key
    console.log('Escolha o número de sentenças que serão renderizadas: ')
    console.log('\n\n' + (new Array(20)).join(' ') +
      '[Z] <- -> [X]  Escolher: [SPACE]\n');
    while (true) {
      console.log('\x1B[1A\x1B[K|' +
        (new Array(value + 1)).join('-') + 'O' +
        (new Array(MAX - value + 1)).join('-') + '| ' + value);
      key = Readline.keyIn('',
        {hideEchoBack: true, mask: '', limit: 'zx '});
      if (key === 'z') { if (value > MIN) { value--; } }
      else if (key === 'x') { if (value < MAX) { value++; } }
      else { break; }
    }

    return value
  }
}