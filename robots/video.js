const gm = require('gm').subClass({imageMagick: true})
const state = require('./state.js')
const nodeCmd = require('node-cmd')

async function robot() {
  console.log('> [video-robot] Starting...')
  const content = state.load()
  await convertAllImages(content)
  await createAllSentenceImages(content)
  await createYouTubeThumbnail(content)
  await renderVideoWithFFmpeg(content)  

  async function convertAllImages(content){
    for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
      await convertImage(sentenceIndex)
    }
  }

  async function convertImage(sentenceIndex){
    return new Promise((resolve, reject) => {
      const inputFile = `./content/${sentenceIndex}-original.png[0]`
      const outputFile = `./content/${sentenceIndex}-converted.png`
      const width = 1920
      const height = 1080

      gm()
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

          console.log(`> [video-robot] Image converted: ${outputFile}`)
          resolve()
        })

    })
  }

  async function createAllSentenceImages(content){
    for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
      await createSentenceImage(sentenceIndex, content.sentences[sentenceIndex].text)
    }
  }

  async function createSentenceImage(sentenceIndex, sentenceText){
    return new Promise((resolve, reject) => {
      const outputFile = `./content/${sentenceIndex}-sentence.png`

      const templateSettings = {
        0: {
          size: '960x200',
          gravity: 'center'
        },
        1: {
          size: '960x540',
          gravity: 'center'
        },
        2: {
          size: '800x540',
          gravity: 'west'
        },
      }

      gm()
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

          console.log(`> [video-robot] Sentence created: ${outputFile}`)
          resolve()
        })
    })
  }

  async function createYouTubeThumbnail(content){
    return new Promise((resolve, reject) => {
      gm()
        .in('./content/0-converted.png')
        .write('./content/youtube-thumbnail.jpg', (error) => {
          if (error) {
            return reject(error)
          }

          console.log('> [video-robot] YouTube thumbnail created')
          resolve()
        })
    })
  }

  async function renderVideoWithFFmpeg(content){
    console.log(`> [video-robot] Iniciando a renderização do vídeo`)
   
    return new Promise((resolve, reject) => {
      let command = 'ffmpeg -y '
      for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
        command += `-t ${content.sentences[sentenceIndex].music.time} -i ./content/${sentenceIndex}-converted.png ` 
      }  
      command += '-filter_complex '
      for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
        if(sentenceIndex === 0){
          command += `"[0:v]zoompan=z='if(lte(zoom,1.0),1.5,max(1.001,zoom-0.0015))':d=${25*content.sentences[sentenceIndex].music.time},fade=t=out:st=${content.sentences[sentenceIndex].music.time-1}:d=1[v0]; `
        }else{
          command += `[${sentenceIndex}:v]zoompan=z='if(lte(zoom,1.0),1.5,max(1.001,zoom-0.0015))':d=${25*content.sentences[sentenceIndex].music.time},fade=t=in:st=0:d=1,fade=t=out:st=${content.sentences[sentenceIndex].music.time-1}:d=1[v${sentenceIndex}]; `
        }
      }
      for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
        command += `[v${sentenceIndex}]` 
      }    
      command += `concat=n=${content.sentences.length}:v=1:a=0,format=yuv420p[v]" -map "[v]" -c:v libx264 -r 60 ./content/out_fade.mp4`
      
      nodeCmd.get(command, (err, data, stderr) => {
        if (!err) {
          console.log('Primeira etapa da renderização concluída com sucesso')
          renderTextInVideo(content)
        } else {
          console.log('error', err)
        }
      })
    })
  }

  async function renderTextInVideo(content){
    console.log(`> [video-robot] Iniciando a renderização dos textos nos vídeo`)

    return new Promise((resolve, reject) => {
      let command = 'ffmpeg -y -i ./content/out_fade.mp4 '
      for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
        command += `-i ./content/${sentenceIndex}-sentence.png ` 
      }
      command += `-filter_complex `
      let contTempo = 0;
      for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
        if(sentenceIndex === 0){
          command += `"[0][1]overlay=y=H-h:enable='between(t,0,${content.sentences[sentenceIndex].music.time})'[v1]; `
          contTempo = content.sentences[sentenceIndex].music.time
        }else{
          command += `[v${sentenceIndex}][${sentenceIndex+1}]overlay=y=H-h:enable='between(t,${contTempo},${contTempo+content.sentences[sentenceIndex].music.time})'[v${sentenceIndex+1}]${sentenceIndex < content.sentences.length-1 ? ';' : ''} `
          contTempo += content.sentences[sentenceIndex].music.time
        } 
      }   
      command += `" -map "[v${content.sentences.length}]" ./content/out_fade_texts.mp4`

      nodeCmd.get(command, (err, data, stderr) => {
        if (!err) {
          console.log('Segunda etapa da renderização concluída com sucesso')
          renderAudioInVideo(content)
        } else {
          console.log('error', err)
        }
      })
    })
  }

  async function renderAudioInVideo(content){
    console.log(`> [video-robot] Iniciando a renderização dos áudios no vídeo`)

    if(content.sentences[0].music === undefined){
      return false
    }

    return new Promise((resolve, reject) => {
      let command = 'ffmpeg -y -i ./content/out_fade_texts.mp4  '

      for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
        command += `-i ./content/${sentenceIndex}-audio.wav ` 
      }
      command += `-filter_complex `

      for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
        if(sentenceIndex === 0){
          command += `"[1:a]atrim=end=${content.sentences[sentenceIndex].music.time},asetpts=PTS-STARTPTS[a1];`
        }else{
          command += `[${sentenceIndex+1}:a]atrim=end=${content.sentences[sentenceIndex].music.time},asetpts=PTS-STARTPTS[a${sentenceIndex+1}];`
        } 
      }
      
      for(let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
        command += `[a${sentenceIndex+1}]` 
      }
      
      command += `concat=n=${content.sentences.length}:v=0:a=1[a]" `
      command += `-map 0:v -map "[a]" -codec:v copy -codec:a libmp3lame -shortest ./content/out_audio.mp4`

      nodeCmd.get(command, (err, data, stderr) => {
        if (!err) {
          console.log('Segunda etapa da renderização concluída com sucesso')
        } else {
          console.log('error', err)
        }
      })
    })
  }
}

module.exports = robot