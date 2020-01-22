const robots = {
  input: require('./robots/input'),
  text: require('./robots/text'),
  state: require('./robots/state'),
  image: require('./robots/image'),
  video: require('./robots/video'),
  music: require('./robots/music')
}
async function start(){
  
  robots.input()
  await robots.text()
  await robots.image()
  // await robots.music()
  await robots.video()
  // console.dir(robots.state.load(), { depth: null })
}

start()