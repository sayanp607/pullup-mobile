console.log('--- INDEX.JS STARTING ---');
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

console.log('--- REGISTERING COMPONENT:', appName);
AppRegistry.registerComponent(appName, () => App);
console.log('--- COMPONENT REGISTERED ---');
