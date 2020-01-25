import { Bootstrap } from '../Bootstrap'
import gm from 'gm'
import NodeCmd from 'node-cmd'
const ImageMagick = gm.subClass({ imageMagick: true })
export default class Music extends Bootstrap {
  constructor() {
    super()
    return new Promise((revolver) => {
      const content = this.loadContent()
      this.start(content)
    })
  }

  async start(content) {
    await this.convertAllImages(content)
    await this.createAllSentenceImages(content)
    await this.createYouTubeThumbnail(content)
    await this.renderVideoWithFFmpeg(content).catch(e => {
      this.showLog('Ocorreu um erro inesperado ao renderizar o vídeo')
      this.showLog(`Error: ${e}`)
      process.exit(0)
    })
    await this.renderTextInVideo(content).catch(e => {
      this.showLog('Ocorreu um erro inesperado ao renderizar os textos no vídeo')
      this.showLog(`Error: ${e}`)
      process.exit(0)
    })
    await this.renderAudioInVideo(content).catch(e => {
      this.showLog('Ocorreu um erro inesperado ao renderizar o vídeo com o áudio')
      this.showLog(`Error: ${e}`)
      process.exit(0)
    })
  }

  async convertAllImages(content) {
    for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
      await this.convertImage(sentenceIndex)
    }
  }

  async convertImage(sentenceIndex) {
    return new Promise((resolve, reject) => {
      const inputFile = `./content/${sentenceIndex}-original.png[0]`
      const outputFile = `./content/${sentenceIndex}-converted.png`
      const width = 1920
      const height = 1080

      ImageMagick()
        .in(inputFile)
        .out('(')
        .out('-clone')
        .out('0')
        .out('-background', 'white')
        .out('-blur', '0x9')
        .out('-resize', `${width}x${height}^`)
        .out(')')
        .out('(')
        .out('-clone')
        .out('0')
        .out('-background', 'white')
        .out('-resize', `${width}x${height}`)
        .out(')')
        .out('-delete', '0')
        .out('-gravity', 'center')
        .out('-compose', 'over')
        .out('-composite')
        .out('-extent', `${width}x${height}`)
        .write(outputFile, (error) => {
          if (error) {
            return reject(error)
          }

          this.showLog(`> [video-robot] Image converted: ${outputFile}`)
          resolve()
        })

    })
  }

  async createAllSentenceImages(content) {
    for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
      await this.createSentenceImage(sentenceIndex, content.sentences[sentenceIndex].text)
    }
  }

  async createSentenceImage(sentenceIndex, sentenceText) {
    return new Promise((resolve, reject) => {
      const outputFile = `./content/${sentenceIndex}-sentence.png`

      const templateSettings = {
        0: {
          size: '600x100',
          gravity: 'center'
        },
        1: {
          size: '960x540',
          gravity: 'center'
        },
        2: {
          size: '960x540',
          gravity: 'west'
        },
      }

      ImageMagick()
        .out('-size', templateSettings[0].size)
        .out('-gravity', templateSettings[0].gravity)
        .out('-background', 'red')
        .out('-fill', 'white')
        .out('-kerning', '-1')
        .out(`caption:${sentenceText}`)
        .write(outputFile, (error) => {
          if (error) {
            return reject(error)
          }

          this.showLog(`[video-robot] Sentence created: ${outputFile}`)
          resolve()
        })
    })
  }

  // Função responsável por criar uma Thumbnail para o Youtube
  async createYouTubeThumbnail(content) {
    return new Promise((resolve, reject) => {
      ImageMagick()
        .in('./content/0-converted.png')
        .write('./content/youtube-thumbnail.jpg', (error) => {
          if (error) {
            return reject(error)
          }

          this.showLog('[video-robot] YouTube thumbnail created')
          resolve()
        })
    })
  }

  // Função responsável por transformar as imagens em vídeos
  async renderVideoWithFFmpeg(content) {
    this.showLog(`[video-robot] Iniciando a renderização do vídeo`)

    return new Promise((resolve, reject) => {
      // Variável responsável por armazenar os itens que serão importados para a renderização
      let importFiles = ''
      // Variável responsável por armazenar os efeitos de zoom de cada item
      let filters = '-filter_complex "'
      // Parâmetro para fazer o efeito funcionar
      let parameter = ''
      for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
        const sentence = content.sentences[sentenceIndex]
        // Importando o arquivo e definido um tempo de duração no vídeo
        importFiles += `-t ${!sentence.music ? 10 : sentence.music.time} -i ${this.getPath()}/content/${sentenceIndex}-converted.png `
        // Definidos os efeitos
        filters += `[${sentenceIndex}:v]zoompan=z='if(lte(zoom,1.0),1.5,max(1.001,zoom-0.0015))':d=${25 * (!sentence.music ? 10 : sentence.music.time)},${sentenceIndex > 0 ? 'fade=t=in:st=0:d=1,' : ''}fade=t=out:st=${(!sentence.music ? 10 : sentence.music.time) - 1}:d=1[v${sentenceIndex}]; `
        parameter += `[v${sentenceIndex}]`
      }

      // Comando completo
      const command = `${this.getConfig().FFMPEG_PATH === 'Global' ? '' : this.getConfig().FFMPEG_PATH}ffmpeg -y ${importFiles} ${filters} ${parameter} concat=n=${content.sentences.length}:v=1:a=0,format=yuv420p[v]" -map "[v]" -c:v libx264 -r 60 ${this.getPath()}/content/out_fade.mp4`

      // Executando o comando
      NodeCmd.get(command, (err, data, stderr) => {
        if (!err) {
          this.showLog('As imagens foram convertidas para vídeo')
          resolve()
        } else {
          this.showLog('error', err)
          reject()
        }
      })
    })
  }

  // Função responsável por colocar os textos sobre o vídeo
  async renderTextInVideo(content) {
    this.showLog(`[video-robot] Iniciando a renderização dos textos nos vídeo`)

    return new Promise((resolve, reject) => {
      // Variável responsável por armazenar os itens que serão importados para a renderização
      let importFiles = ''
      // Variável responsável por armazenar os efeitos de zoom de cada item
      let filters = '-filter_complex "'
      // Contador para calcular o tempo para o próximo texto
      let contTempo = 0;
      for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
        const sentence = content.sentences[sentenceIndex]
        const tempo = (!sentence.music ? 10 : sentence.music.time)
        importFiles += `-i ${this.getPath()}/content/${sentenceIndex}-sentence.png `
        filters += `[${sentenceIndex > 0 ? 'v' + sentenceIndex : sentenceIndex}][${sentenceIndex + 1}]overlay=y=H-h:enable='between(t,${contTempo},${contTempo + tempo})'[v${sentenceIndex + 1}]${sentenceIndex < content.sentences.length - 1 ? ';' : ''}`
        // Incrementando o contador
        contTempo += tempo
      }
      // Comando completo
      const ffmpeg = this.getConfig().FFMPEG_PATH === 'Global' ? 'ffmpeg' : this.getConfig().FFMPEG_PATH + 'ffmpeg'
      const command = `${ffmpeg} -y -i ${this.getPath()}/content/out_fade.mp4 ${importFiles} ${filters}" -map "[v${content.sentences.length}]" ${this.getPath()}/content/out_fade_texts.mp4`

      // Executar o comando
      NodeCmd.get(command, (err, data, stderr) => {
        if (!err) {
          this.showLog('A renderização dos textos no vídeo foi feita com sucesso')
          resolve()
        } else {
          this.showLog('error', err)
          reject()
        }
      })
    })
  }

  // Função responsável por adicionar áudio ao vídeo
  async renderAudioInVideo(content) {
    this.showLog(`[video-robot] Iniciando a renderização dos áudios no vídeo`)

    // Se não foi possível sintetizar uma voz então colocamos uma música de fundo
    if (content.sentences[0].music === undefined || content.sentences[0].music == false) {
      return new Promise((resolve, reject) => {
        let command = 'ffmpeg -i ./content/out_fade_texts.mp4 -i ./content/music.mp3 -c:v libx264 -r 60 -pix_fmt yuv420p -y ./content/out.mp4'
        NodeCmd.get(command, (err, data, stderr) => {
          if (!err) {
            this.showLog('O áudio foi renderizado com sucesso')
            resolve()
          } else {
            this.showLog('error', err)
            reject()
          }
        })
      })
    } else {
      // Essa função é responsável por colocar cada áudio que foi sintetizado no tempo de cada imagem
      return new Promise((resolve, reject) => {
        // Variável responsável por armazenar os itens que serão importados para a renderização
        let importFiles = ''
        // Variável responsável por armazenar os efeitos de zoom de cada item
        let filters = '-filter_complex "'
        // Parâmetro para fazer o efeito funcionar
        let parameter = ''
        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
          const sentence = content.sentences[sentenceIndex]
          const tempo = (!sentence.music ? 10 : sentence.music.time)
          importFiles += `-i ${this.getPath()}/content/${sentenceIndex}-audio.wav `
          filters += `[${sentenceIndex + 1}:a]atrim=end=${tempo},asetpts=PTS-STARTPTS[a${sentenceIndex + 1}];`
          parameter += `[a${sentenceIndex + 1}]`
        }
        // Comando completo
        const ffmpeg = this.getConfig().FFMPEG_PATH === 'Global' ? 'ffmpeg' : this.getConfig().FFMPEG_PATH + 'ffmpeg'
        const command = `${ffmpeg} -y -i ${this.getPath()}/content/out_fade_texts.mp4 ${importFiles} ${filters}" ${parameter} concat=n=${content.sentences.length}:v=0:a=1[a]" -map 0:v -map "[a]" -codec:v copy -codec:a libmp3lame -shortest ${this.getPath()}/content/out_audio.mp4`

        console.log(command)

        NodeCmd.get(command, (err, data, stderr) => {
          if (!err) {
            this.showLog('O áudio foi renderizado com sucesso')
            resolve()
          } else {
            this.showLog('error', err)
            reject()
          }
        })
      })
    }
  }
}