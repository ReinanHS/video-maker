import { Bootstrap } from '../Bootstrap'
import Google from 'googleapis'
import ImageDownload from 'image-downloader'
import fs from 'fs'
import readimage from 'readimage'
export default class Image extends Bootstrap {
  constructor() {
    super()
    return new Promise((revolver) => {
      const content = this.loadContent()
      this.fetchImageOffAllSentences(content).then(() => {
        this.dowloadAllImages(content).then(() => {
          this.checkImageIntegrity(content).finally(() => {
            this.saveContent(content)
            revolver()
          })
        })
      })
    })
  }

  async checkImageIntegrity(content, downloadeIndex = 1){

    let callFunction = this

    for (let index = 0; index < content.sentences.length; index++) {
      fs.readFile(`./content/temp/${index}-original.png`, function (err, data) {
        //console.log("reading image "+index)
        readimage(data, function (err, image) {
          if (err) {
            console.log("failed to opem image "+index)
            callFunction.dowloadedAndSave(content.sentences[index].images[downloadeIndex], `${index}-original.png`).finally(() => {
              return callFunction.checkImageIntegrity(content, downloadeIndex + 1)
            })
          }
        })
      });  
    }
  }

  async fetchImageOffAllSentences(content) {
    this.showLog(`[robot] Buscando imagens relacionadas as sentenças`)
    let index = 0
    for (const sentence of content.sentences) {

      let keywordsToString = ''

      sentence.keywords.forEach(element => {
        keywordsToString = keywordsToString + " " + element
      });

      const query = `${content.searchTerm} ${index > 0 ? keywordsToString : content.prefix}`
      sentence.images = await this.fetchGoogleAndReturnImagesLinks(query)

      sentence.googleSearchQuery = query
      index = index + 1
    }
  }

  getCustomSearch() {
    const customSearch = Google.google.customsearch('v1')
    return customSearch
  }

  async fetchGoogleAndReturnImagesLinks(query) {
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

  async dowloadAllImages(content) {
    this.showLog(`[robot] Baixando as imagens`)
    content.dowloadedImages = []

    for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
      const images = content.sentences[sentenceIndex].images
      for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
        const imageURL = images[imageIndex]

        try {

          if (content.dowloadedImages.includes(imageURL)) {
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

  async dowloadedAndSave(url, fileName) {
    return ImageDownload.image({
      url,
      dest: `./content/temp/${fileName}`,
    }).then(({ filename }) => {
      this.showLog('A imagem foi salva: ', filename)
    })
      .catch((err) => this.showLog(err))
  }
}