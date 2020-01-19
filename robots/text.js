const algorithmia = require('algorithmia')
const algorithmiaApiKey = require('../credentials/algorithmia.json').apiKey
const sentenceBoundaryDetection = require('sbd')
const watsonApiKey = require('../credentials/watson.json').apikey


const fs = require('fs');
const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1');
const { IamAuthenticator } = require('ibm-watson/auth');
const state = require('./state')

const nlu = new NaturalLanguageUnderstandingV1({
  authenticator: new IamAuthenticator({ apikey: watsonApiKey }),
  version: '2018-04-05',
  url: 'https://gateway.watsonplatform.net/natural-language-understanding/api/'
})

async function robot() {
  const content = state.load()
  await fetchContentFromWikepedia(content)
  sanitizeContent(content)
  breackContentIntoSentences(content)
  limitMaximunSentences(content)
  await fetchKeywordsOfAllSentences(content)
  state.save(content)

  async function fetchContentFromWikepedia(content) {
    const input = {
      "articleName": `${content.prefix} ${content.searchTerm}`,
      "lang": "pt"
    }
    const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey)
    const wikipediaAlgorithmia = algorithmiaAuthenticated.algo("web/WikipediaParser/0.1.2")
    const wikipediaResponde = await wikipediaAlgorithmia.pipe(input)
    const wikipediaContent = wikipediaResponde.get()

    content.sourceContentOriginal = wikipediaContent.content
  }

  function sanitizeContent(content) {
    const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdown(content.sourceContentOriginal)
    const withoutDatesInParentheses = removeDatesInParentheses(withoutBlankLinesAndMarkdown)

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

  function removeDatesInParentheses(text) {
    return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, '').replace(/  /g, ' ')
  }

  function breackContentIntoSentences(content) {
    content.sentences = []

    const sentences = sentenceBoundaryDetection.sentences(content.sourceContentSanitized)
    sentences.forEach((sentence) => {
      content.sentences.push({
        text: sentence,
        keywords: [],
        images: [],
      })
    })
  }

  function limitMaximunSentences(content){
    content.sentences = content.sentences.slice(0, content.maximunSenteces)
  }

  async function fetchKeywordsOfAllSentences(content){
    for(const sentence of content.sentences){
      sentence.keywords = await fetchWatsonAndReturnKeywords(sentence.text)
    }
  }

  async function fetchWatsonAndReturnKeywords(sentence){
    return new Promise((resolve, reject) => {
      nlu.analyze({
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

        resolve(keywords) 
      })
    })
  }

}

module.exports = robot