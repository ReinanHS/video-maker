const google = require('googleapis').google
const customSearch = google.customsearch('v1')

const googleSearchCredentials = require('../credentials/google-search.json')
const state = require('./state')
async function robot(){
  const content = state.load()
  await fetchImageOffAllSentences(content)
  state.save(content)

  async function fetchImageOffAllSentences(content){
    for(const sentence of content.sentences){
      const query = `${content.searchTerm} ${sentence.keywords[0]}`
      sentence.images = await fetchGoogleAndReturnImagesLinks(query)

      sentence.googleSearchQuery = query
    }
  }

  async function fetchGoogleAndReturnImagesLinks(query){
    const response = await customSearch.cse.list({
      auth: googleSearchCredentials.apiKey,
      cx: googleSearchCredentials.searchEngine,
      q: query,
      num: 4,
      searchType: 'image',
      imgSize: 'huge'
    })

    const imagesUrl = response.data.items.map((item) => {
      return item.link
    })
    
    return imagesUrl
  }
}

module.exports = robot