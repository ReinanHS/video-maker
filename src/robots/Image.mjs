import { Bootstrap } from '../Bootstrap'
import Google from 'googleapis'
import ImageDownload from 'image-downloader'
export default class Image extends Bootstrap{
  constructor(){
    super()
    return new Promise((revolver) => {
      const content = this.loadContent()
      this.fetchImageOffAllSentences(content).then(() => {
        this.dowloadAllImages(content).then(() => {
          this.saveContent(content)
          revolver()
        })
      })
    })
  }

  async fetchImageOffAllSentences(content){
    this.showLog(`[robot] Buscando imagens relacionadas as sentenças`)
    let index = 0
    for(const sentence of content.sentences){
      const query = `${index > 0 ? `${content.prefix} ${content.searchTerm} ${sentence.text}` : `${content.prefix} ${content.searchTerm}` }`
      sentence.images = await this.fetchGoogleAndReturnImagesLinks(query)

      sentence.googleSearchQuery = query
      index = index + 1
    }
  }

  getCustomSearch(){
    const customSearch = Google.google.customsearch('v1')
    return customSearch
  }

  async fetchGoogleAndReturnImagesLinks(query){
    this.showLog(`[robot] Buscando imagens no google sobre ${query}`)
    const response = await this.getCustomSearch().cse.list({
      auth: this.getConfig().GOOGLE_SEARCH_APIKEY,
      cx: this.getConfig().GOOGLE_SEARCH_ENGINE,
      q: query,
      num: 4,
      searchType: 'image',
    })

    const imagesUrl = response.data.items.map((item) => {
      return item.link
    })
    
    return imagesUrl
  }

  async dowloadAllImages(content){
    this.showLog(`[robot] Baixando as imagens`)
    content.dowloadedImages = []

    for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
      const images = content.sentences[sentenceIndex].images
      for(let imageIndex = 0; imageIndex < images.length; imageIndex++){
        const imageURL = images[imageIndex]

        try {

          if(content.dowloadedImages.includes(imageURL)){
            throw new Error('Imagem já foi baixada!')
          }

          await this.dowloadedAndSave(imageURL, `${sentenceIndex}-original.png`)

          this.showLog(`[${sentenceIndex}][${imageIndex}] Baixou a imagem com sucesso: ${imageURL}`)
          content.dowloadedImages.push(imageURL)
          break
        } catch (error) {
          this.showLog(`[${sentenceIndex}][${imageIndex}] Error ao baixar a imagem ${imageURL}: ${error}`) 
        }
      }
    }
  }

  async dowloadedAndSave(url, fileName){
    return ImageDownload.image({
      url,
      dest: `./content/${fileName}`,
    }).then(({ filename }) => {
      this.showLog('A imagem foi salva: ', filename)
    })
    .catch((err) => this.showLog(err))
  }
}