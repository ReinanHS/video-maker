import { Bootstrap } from '../src/Bootstrap'
import Input from '../src/robots/Input'
import Text from '../src/robots/Text'
import Image from '../src/robots/Image'
import Music from '../src/robots/Music'
import Video from '../src/robots/Video'

const robots = [
  Input,
  Text,
  Image,
  Music,
  Video,
]

const init = new Bootstrap()
init.start(robots.reverse())