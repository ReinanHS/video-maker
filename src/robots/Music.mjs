import fs from 'fs'
import { Bootstrap } from '../Bootstrap'
import DownloadFiles from 'download-file'
import AudioDurationInSeconds from 'get-audio-duration'
import TextToSpeechV1 from 'ibm-watson/text-to-speech/v1'
import Watson from 'ibm-watson/auth'
import NodeCmd from 'node-cmd'

const { getAudioDurationInSeconds } = AudioDurationInSeconds
const { IamAuthenticator } = Watson
export default class Music extends Bootstrap {
  constructor() {
    super()
    return new Promise((revolver) => {
      const content = this.loadContent()
      this.textToSpeechWithWatson(content).finally(() => {
        this.downloadMusicForVideo().finally(() => {
          this.lowerMusicVolume().then(() => {
            this.renderAudios(content).then(() => {
              this.mixMusicWithAudios().finally(() => {
                this.saveContent(content)
                revolver()
              });
            }).catch(() => {
              this.showLog('Ocorreu um erro ao mix audios')
            })
          }).catch(() => {
            this.showLog('Ocorreu um erro na música')
          })
        })
      })
    })
  }

  async textToSpeechWithWatson(content) {
    const textToSpeech = new TextToSpeechV1({
      authenticator: new IamAuthenticator({ apikey: this.getConfig().WATSON_SPEECH }),
      url: 'https://stream.watsonplatform.net/text-to-speech/api/'
    });

    let sentenceIndex = 0

    for (const sentence of content.sentences) {
      const result = await this.downloadSpeechWithWatson(textToSpeech, sentence, sentenceIndex)
      if (!result) {
        sentence.music = false
      } else {
        sentence.music = {
          path: result,
          time: await this.getTheDurationOfAudio(result)
        }
      }
      sentenceIndex++
    }
  }

  async downloadSpeechWithWatson(textToSpeech, sentence, index) {

    console.log(`[${index}] - Convertendo o texto ${sentence.text.substring(0, 15)}... para áudio`);

    const params = {
      text: sentence.text,
      voice: 'pt-BR_IsabelaVoice', // Optional voice
      accept: 'audio/wav'
    };

    let filePath = `./content/temp/${index}-audio.wav`

    await textToSpeech
      .synthesize(params)
      .then(response => {
        console.log(`[${index}] - O áudio foi obtido com sucesso`);
        const audio = response.result;
        return textToSpeech.repairWavHeaderStream(audio);
      })
      .then(repairedFile => {
        fs.writeFileSync(filePath, repairedFile);
        console.log(`${index} O áudio foi gravado com sucesso`);
      })
      .catch(err => {
        this.showLog('Ocorreu um erro ao tentar sintetizar a voz')
        this.showLog('Um dos motivos pode ser por causa do limite da API da IBM')
        filePath = false
      });

    return filePath
  }

  async getTheDurationOfAudio(path) {
    let timeDuration = 0

    await getAudioDurationInSeconds(path).then((duration) => {
      console.log(`[${path}] - Esse áudio tem uma duração de ${duration}s`);
      timeDuration = Math.round(duration)
    })

    return timeDuration
  }

  async mixMusicWithAudios(){
    this.showLog(`[audio-robot] Iniciando a renderização dos áudios com a música`)
    // Essa função é responsável por colocar cada áudio que foi sintetizado no tempo de cada imagem
    return new Promise((resolve, reject) => {
      // Comando completo
      const ffmpeg = this.getConfig().FFMPEG_PATH === 'Global' ? 'ffmpeg' : this.getConfig().FFMPEG_PATH + 'ffmpeg'
      const command = `${ffmpeg} -y -i "${this.getPath()}/content/temp/out_audios.mp3" -i "${this.getPath()}/content/temp/out_music.mp3" -filter_complex amix=inputs=2:duration=longest "${this.getPath()}/content/temp/out_audio_final.mp3"`

      //console.log(command)

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

  async lowerMusicVolume() {
    this.showLog(`[audio-robot] Iniciando a renderização da música`)
    // Essa função é responsável por colocar cada áudio que foi sintetizado no tempo de cada imagem
    return new Promise((resolve, reject) => {
      // Comando completo
      const ffmpeg = this.getConfig().FFMPEG_PATH === 'Global' ? 'ffmpeg' : this.getConfig().FFMPEG_PATH + 'ffmpeg'
      const command = `${ffmpeg} -y -i "${this.getPath()}/content/temp/music.mp3" -vcodec copy -vol 40 "${this.getPath()}/content/temp/out_music.mp3"`

      //console.log(command)

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

  async renderAudios(content) {
    this.showLog(`[audio-robot] Iniciando a renderização os áudios`)
    // Essa função é responsável por colocar cada áudio que foi sintetizado no tempo de cada imagem
    return new Promise((resolve, reject) => {
      // Variável responsável por armazenar os itens que serão importados para a renderização
      let importFiles = ''
      for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
        importFiles += `-i "${this.getPath()}/content/temp/${sentenceIndex}-audio.wav" `
      }
      // Comando completo
      const ffmpeg = this.getConfig().FFMPEG_PATH === 'Global' ? 'ffmpeg' : this.getConfig().FFMPEG_PATH + 'ffmpeg'
      const command = `${ffmpeg} -y ${importFiles} -filter_complex concat=n=${content.sentences.length}:v=0:a=1 -f MOV -vn -y "${this.getPath()}/content/temp/out_audios.mp3"`

      //console.log(command)

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

  async downloadMusicForVideo() {
    return new Promise((resolve, reject) => {
      const options = {
        directory: "./content/temp/",
        filename: "music.mp3"
      }

      const urls = [
        'https://www.bensound.com/bensound-music/bensound-summer.mp3',
        'https://www.bensound.com/bensound-music/bensound-creativeminds.mp3',
        'https://www.bensound.com/bensound-music/bensound-anewbeginning.mp3',
        'https://www.bensound.com/bensound-music/bensound-littleidea.mp3',
        'https://www.bensound.com/bensound-music/bensound-jazzyfrenchy.mp3',
        'https://www.bensound.com/bensound-music/bensound-happyrock.mp3',
        'https://www.bensound.com/bensound-music/bensound-buddy.mp3',
        'https://www.bensound.com/bensound-music/bensound-dubstep.mp3',
        'https://www.bensound.com/bensound-music/bensound-betterdays.mp3',
        'https://www.bensound.com/bensound-music/bensound-sunny.mp3',
        'https://www.bensound.com/bensound-music/bensound-energy.mp3',
        'https://www.bensound.com/bensound-music/bensound-tenderness.mp3',
        'https://www.bensound.com/bensound-music/bensound-funnysong.mp3',
        'https://www.bensound.com/bensound-music/bensound-onceagain.mp3',
        'https://www.bensound.com/bensound-music/bensound-tomorrow.mp3',
        'https://www.bensound.com/bensound-music/bensound-slowmotion.mp3',
      ]

      DownloadFiles(urls[Math.floor(Math.random() * (urls.length - 1))], options, function (err) {
        if (err) {
          console.log('Ocorreu um erro ao baixar a música de fundo')
          this.downloadMusicForVideo()
        }
        console.log("A música foi baixada com sucesso")
        resolve()
      })
    })
  }

}