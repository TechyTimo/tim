import { AsyncStorage } from 'react-native'
import AsyncSnappyStorage from 'react-native-async-storage-snappy'
AsyncStorage.setBackend(AsyncSnappyStorage)
AsyncSnappyStorage.encrypt()

// require('./utils/perf')
require('./index.common')
