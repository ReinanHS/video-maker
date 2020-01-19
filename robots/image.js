const google = require('googleapis').google
const customSearch = google.customsearch('v1')
const ImageDownload = require('image-downloader')

const googleSearchCredentials = require('../credentials/google-search.json')
const state = require('./state')
async function robot(){
  const content = state.load()
  await fetchImageOffAllSentences(content)
  await dowloadAllImages(content)
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

  async function dowloadAllImages(content){

    content.dowloadedImages = []

    for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
      const images = content.sentences[sentenceIndex].images
      for(let imageIndex = 0; imageIndex < images.length; imageIndex++){
        const imageURL = images[imageIndex]

        try {

          if(content.dowloadedImages.includes(imageURL)){
            throw new Error('Imagem já foi baixada!')
          }

          await dowloadedAndSave(imageURL, `${sentenceIndex}-original.png`)

          console.log(`[${sentenceIndex}][${imageIndex}] Baixou a imagem com sucesso: ${imageURL}`)
          content.dowloadedImages.push(imageURL)
          break
        } catch (error) {
          console.log(`[${sentenceIndex}][${imageIndex}] Error ao baixar a imagem ${imageURL}: ${error}`) 
        }
      }
    }
  }

  async function dowloadedAndSave(url, fileName){
    return ImageDownload.image({
      url,
      dest: `./content/${fileName}`,
    }).then(({ filename }) => {
      console.log('A imagem foi salva: ', filename)
    })
    .catch((err) => console.error(err))
  }
}

module.exports = robot