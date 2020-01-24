import { Bootstrap } from '../src/Bootstrap'
import Input from '../src/robots/Input'
import Text from '../src/robots/Text'
import Image from '../src/robots/Image'

const robots = [
  Input,
  Text,
  Image,
]

const init = new Bootstrap()
init.start(robots.reverse())