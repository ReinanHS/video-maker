import fs from 'fs'
import AppRoot from 'app-root-path'
import NodeCmd from 'node-cmd'
import ENV from 'dotenv'
export class Bootstrap {

  start(Load) {
    this.writeLog('O programa foi iniciado')
    this.checkingEnvironment().finally(() => {
      function newOBJ(key) {
        key = key -1
        const item = new Load[key]()
        item.finally(() => {
          if(key > 0){
            newOBJ(key)
          }
        })
      }

      newOBJ(Load.length)
    })
  }

  saveContent(content){
    const contentString = JSON.stringify(content)
    return this.saveFile('/content/content.json', contentString) 
  }
  
  loadContent(){
    const contentString = this.loadFile('/content/content.json')
    return contentString != null ? JSON.parse(contentString) : {}
  }

  saveFile(filename, content){
    const contentString = content
    return fs.writeFileSync(`${this.getPath()}/${filename}`, contentString)
  }

  loadFile(filename){
    try{
      const contentString = fs.readFileSync(`${this.getPath()}/${filename}`, 'utf-8')
      return contentString
    }catch(e){
      if(filename != 'log.txt'){
        console.log(`[LOG] - O Arquivo ${filename} não foi encontrado.`)
      }
      return null
    }
  }

  writeLog(log){
    const data = new Date()
    const dataDoLog = `${data.getSeconds()}:${data.getMinutes()}:${data.getHours()}`
    const getLog = this.loadFile('log.txt')
    
    const logContent = getLog != null ? (getLog + `\n[${dataDoLog}] - ${log}`) : `[${dataDoLog}] - ${log}`

    this.saveFile('log.txt', logContent)
  }

  showLog(log){
    this.writeLog(log)
    if(this.getConfig().APP_DEBUG === 'true'){
      console.log(log)
    }
  }

  getConfig() {
    if(ENV.config({ path: `${this.getPath()}/.env` }).error){
      console.error('[INFO SYSTEM] O arquivo .ENV não existe, ele é de extrema importância para o funcionamento desse programa.');
      console.log(`[INFO SYSTEM] O programa foi finalizado por falta de componentes fundamentais`)
      process.exit(0)
    }else return ENV.config({ path: `${this.getPath()}/.env` }).parsed
  }

  getPath() {
    return AppRoot.path;
  }

  async checkingEnvironment() {
    await this.checkFFmpeg().then((response) => {
      console.log(`[INFO SYSTEM] ${response.result}`)
    }).catch((error) => {
      this.generateErrorOfDependency(error.result, 'FFmpeg <https://www.ffmpeg.org/>')    
    })

    await this.checkMagick().then((response) => {
      console.log(`[INFO SYSTEM] ${response.result}`)
    }).catch((error) => {
      this.generateErrorOfDependency(error.result, 'ImageMagick <https://imagemagick.org/>')    
    })
  }

  generateErrorOfDependency(result, info) {
    console.log(`[INFO SYSTEM] ${result}`)
    console.log(`[INFO SYSTEM] Para usar esse programa você deve ter instalado em seu computador o ${info}`)
    console.log(`[INFO SYSTEM] O programa foi finalizado por falta de componentes fundamentais`)
    process.exit(0)
  }

  checkFFmpeg(){
    return new Promise((revolve, reject) => {
      const cmd = this.getConfig().FFMPEG_PATH === 'Global' ? 'ffmpeg' : `cd ${this.getConfig().FFMPEG_PATH} && ffmpeg`
      NodeCmd.get(cmd,
        function (err, data, stderr) {
          if(stderr.length < 1000){
            const log = new Bootstrap()
            log.writeLog(err.toString())
            reject({
              status: false,
              result: 'O FFmpeg não foi instalado nesse computador.'
            })
          }else{
            revolve({
              status: true,
              result: `FFmpeg: ${stderr.split('\n')[0]}`,
            })
          }
        }
      );
    })
  }

  checkMagick(){
    return new Promise((revolve, reject) => {
      const cmd = this.getConfig().MAGICK_PATH === 'Global' ? 'magick -version' : `cd ${this.getConfig().MAGICK_PATH} && magick -version`
      NodeCmd.get(cmd,
        function (err, data, stderr) {
          if(err){
            const log = new Bootstrap()
            log.writeLog(err.toString())
            reject({
              status: false,
              result: 'O ImageMagick não foi instalado nesse computador.'
            })
          }else{
            revolve({
              status: true,
              result: `Magick: ${data.split('\n')[0]}`,
            })
          }
        }
      );
    })
  }
}