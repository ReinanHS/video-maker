const state = require('./state')
const downloadFiles = require('download-file')
const { getAudioDurationInSeconds } = require('get-audio-duration')

const watsonApiKey = require('../credentials/watsonTextToSpeech.json').apikey
const fs = require('fs');
const TextToSpeechV1 = require('ibm-watson/text-to-speech/v1');
const { IamAuthenticator } = require('ibm-watson/auth');

async function robot() {
  console.log('> [audio-robot] Starting...')
  const content = state.load()
  await textToSpeechWithWatson(content)
  await downloadMusicForVideo(content)
  state.save(content)

  async function downloadMusicForVideo(content){
    return new Promise((resolve, reject) => {
      const options = {
          directory: "./content/",
          filename: "music.mp3"
      }

      const urls = [
        'https://www.bensound.com/bensound-music/bensound-summer.mp3',
        'https://www.bensound.com/bensound-music/bensound-creativeminds.mp3',
        'https://www.bensound.com/bensound-music/bensound-anewbeginning.mp3',
        'https://www.bensound.com/bensound-music/bensound-littleidea.mp3',
        'https://www.bensound.com/bensound-music/bensound-jazzyfrenchy.mp3',
        'https://www.bensound.com/bensound-music/bensound-happyrock.mp3',
      ]
      
      downloadFiles(urls[0], options, function(err){
          if (err) throw err
          console.log("A música foi baixada com sucesso")
      }) 
    })
  }

  async function textToSpeechWithWatson(content){
    const textToSpeech = new TextToSpeechV1({
      authenticator: new IamAuthenticator({ apikey: watsonApiKey }),
      url: 'https://stream.watsonplatform.net/text-to-speech/api/'
    });

    let sentenceIndex = 0

    for(const sentence of content.sentences){
      const result = await downloadSpeechWithWatson(textToSpeech, sentence, sentenceIndex)
      sentence.music = {
        path: result,
        time: await getTheDurationOfAudio(result)
      }
      sentenceIndex++
    }
  }

  async function downloadSpeechWithWatson(textToSpeech, sentence, index){
    
    console.log(`[${index}] - Convertendo o texto ${sentence.text.substring(0,15)}... para áudio`);
    
    const params = {
      text: sentence.text,
      voice: 'pt-BR_IsabelaVoice', // Optional voice
      accept: 'audio/wav'
    };

    const filePath = `./content/${index}-audio.wav`

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
      console.log(err);
    });

    return filePath
  }

  async function getTheDurationOfAudio(path){
    let timeDuration = 0

    await getAudioDurationInSeconds(path).then((duration) => {
      console.log(`[${path}] - Esse áudio tem uma duração de ${duration}s`);
      timeDuration =  Math.round(duration)
    })

    return timeDuration
  }
}

module.exports = robot