const robots = {
  input: require('./robots/input'),
  text: require('./robots/text'),
  state: require('./robots/state'),
  image: require('./robots/image')
}
async function start(){
  
  // robots.input()
  // await robots.text()
  await robots.image()
  // console.dir(robots.state.load(), { depth: null })
}

start()