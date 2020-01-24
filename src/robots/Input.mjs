import { Bootstrap } from '../Bootstrap'
import Readline from 'readline-sync'
import GoogleTrends from 'google-trends-api'
import math from 'mathjs'
export default class Input extends Bootstrap {
  constructor() {
    super()
    return new Promise((revolver) => {
      const content = this.loadContent()
      this.askAndReturnTrendsSearchTerm().finally(() => {
        content.searchTerm = this.askAndReturnSearchTerm()
        this.askAndReturnPrefixAutomatic(content).then(response => {
          content.prefix = response
          content.maximunSenteces = this.askAndReturnMaximunSenteces()
          this.saveContent(content)
          revolver()
        })
      })
    })
  }

  askAndReturnTrendsSearchTerm() {
    return new Promise(resolver => {
      GoogleTrends.realTimeTrends({
        geo: 'BR',
        category: 'e',
      }).then((results) => {
        let data = JSON.parse(results);
        let trends = []

        data.storySummaries.trendingStories.forEach((item) => {
          item.articles.forEach((result) => {
            trends.push(result.articleTitle)
          })
        })

        console.log('Listagem dos termos mais procurados no google atualmente:\n')
        trends.slice(0, 10).map((item, index) => {
          console.log(`[${index}] - ${item}`)
        })

        resolver()
      }).catch((e) => {
        resolver()
      })
    })
  }

  askAndReturnSearchTerm() {
    return Readline.question('Digite um termo de pesquisa da Wikipedia: ')
  }

  askAndReturnPrefixAutomatic(content) {
    const prefixes = [
      'Quem é',
      'O que é',
      'A história de'
    ]
    let prefixesTrend = []
    prefixes.forEach((elem) => {
      prefixesTrend.push(elem + ' ' + content.searchTerm);
    });

    return new Promise((revolver) => {
      try{
        GoogleTrends.interestOverTime({ keyword: prefixesTrend }).then((results) => {
          let data = JSON.parse(results);
          let values = [];
          data.default.timelineData.forEach((elem) => {
            values.push(elem.value);
          });
  
          let mostTrends = [];
          math.transpose(values).forEach((elem) => {
            mostTrends.push(math.sum(elem));
          });
  
          let mostTrend = prefixes[mostTrends.indexOf(math.max(mostTrends))];
          console.log(`A busca no wikipedia sera feita dessa forma: ${mostTrend} ${content.searchTerm}`)
          revolver(mostTrend)
  
        }).catch((err) => {
          revolver(this.askAndReturnPrefix())
        });
      }catch(e){
        revolver(this.askAndReturnPrefix())
      }
    })
  }

  askAndReturnPrefix() {
    const prefixs = ['Quem é', 'O que é', 'A história de']
    console.log('Digite um prefixo: \n')
    prefixs.forEach((item, index) => {
      console.log(`[${index}] - ${item}`)
    })
    console.log(`\n`)
    const selectPrefixIndex = Number.parseInt(Readline.question('Digite o valor do prefixo: '))
    if (Number.isNaN(selectPrefixIndex)) {
      return prefixs[0]
    }

    return prefixs[selectPrefixIndex]
  }

  askAndReturnMaximunSenteces() {
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
        { hideEchoBack: true, mask: '', limit: 'zx ' });
      if (key === 'z') { if (value > MIN) { value--; } }
      else if (key === 'x') { if (value < MAX) { value++; } }
      else { break; }
    }

    return value
  }
}