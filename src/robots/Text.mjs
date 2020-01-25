import fs from 'fs'
import { Bootstrap } from '../Bootstrap'
import Algorithmia from 'algorithmia'
import SentenceBoundaryDetection from 'sbd'
import Authenticator from 'ibm-watson/auth'
import NaturalLanguageUnderstandingV1 from 'ibm-watson/natural-language-understanding/v1'

const { IamAuthenticator } = Authenticator

export default class Text extends Bootstrap {
  constructor(){
    super()
    return new Promise((revolver) => {
      const content = this.loadContent()
      this.fetchContentFromWikepedia(content).then(() => {
        this.sanitizeContent(content)
        this.breackContentIntoSentences(content)
        this.limitMaximunSentences(content)
        this.fetchKeywordsOfAllSentences(content).then(() => {
          this.saveContent(content)
          revolver()
        })
      })
    })
  }

  async fetchContentFromWikepedia(content) {

    this.showLog(`[robot] Buscando informações no Wikipedia`)

    const input = {
      "articleName": `${content.prefix} ${content.searchTerm}`,
      "lang": "pt"
    }
    const algorithmiaAuthenticated = Algorithmia(this.getConfig().ALGORITHMIA_APIKEY)
    const wikipediaAlgorithmia = algorithmiaAuthenticated.algo("web/WikipediaParser/0.1.2")
    const wikipediaResponde = await wikipediaAlgorithmia.pipe(input)
    const wikipediaContent = wikipediaResponde.get()

    content.sourceContentOriginal = wikipediaContent.content

    this.showLog(`[robot] Informações coletadas com sucesso`)

  }

  sanitizeContent(content) {

    this.showLog(`[robot] Separando as sentenças nas informações encontradas.`)

    const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdown(content.sourceContentOriginal)
    const withoutDatesInParentheses = this.removeDatesInParentheses(withoutBlankLinesAndMarkdown)

    content.sourceContentSanitized = withoutDatesInParentheses

    function removeBlankLinesAndMarkdown(text) {
      const allLines = text.split('\n')

      const withoutBlankLinesAndMarkdown = allLines.filter((line) => {
        if (line.trim().length === 0 || line.trim().startsWith('=')) {
          return false
        }

        return true
      })

      return withoutBlankLinesAndMarkdown.join(' ')
    }
  }

  removeDatesInParentheses(text) {
    return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, '').replace(/  /g, ' ')
  }

  breackContentIntoSentences(content) {
    content.sentences = []

    const sentences = SentenceBoundaryDetection.sentences(content.sourceContentSanitized)
    sentences.forEach((sentence) => {
      content.sentences.push({
        text: sentence,
        keywords: [],
        images: [],
      })
    })
  }

  limitMaximunSentences(content){
    content.sentences = content.sentences.slice(0, content.maximunSenteces)
  }

  async fetchKeywordsOfAllSentences(content){
    this.showLog(`[robot] Procurando às palavras chaves.`)
    for(const sentence of content.sentences){
      sentence.keywords = await this.fetchWatsonAndReturnKeywords(sentence.text)
    }
  }

  naturalLanguageUnderstanding() {
    const nlu = new NaturalLanguageUnderstandingV1({
      authenticator: new IamAuthenticator({ apikey: this.getConfig().WATSON_LANGUAGE }),
      version: '2018-04-05',
      url: 'https://gateway.watsonplatform.net/natural-language-understanding/api/'
    })

    return nlu
  }

  async fetchWatsonAndReturnKeywords(sentence){
    this.showLog(`[robot] Buscando palavras chaves sobre ${sentence}`)
    return new Promise((resolve, reject) => {
      this.naturalLanguageUnderstanding().analyze({
        text: sentence,
        features: {
          keywords: {},
        }
      }, (error, response) => {
        if (error) {
          reject(error)
          return
        }

        const keywords = response.result.keywords.map((keyword) => {
          return keyword.text
        })

        this.showLog(`[robot] Palavras chaves encontradas: ${keywords.map(item => {
          return item
        })}`)

        resolve(keywords) 
      })
    })
  }

}