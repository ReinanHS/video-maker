const fs = require('fs')
const contentFilePath = './content.json'

function save(content){
  const contentString = JSON.stringify(content)
  return fs.writeFileSync(contentFilePath, contentString) 
}

function load(){
  const contentString = fs.readFileSync(contentFilePath, 'utf-8')
  return JSON.parse(contentString)
}

module.exports = {
  save,
  load,
}