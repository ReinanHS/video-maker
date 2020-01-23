import { Bootstrap } from '../src/Bootstrap'
import Input from '../src/robots/Input'
import Text from '../src/robots/Text'

const robots = [
  Input,
  Text,
]

const init = new Bootstrap()
init.start(robots.reverse())