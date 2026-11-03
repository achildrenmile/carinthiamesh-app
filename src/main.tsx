import { render } from 'preact'
import { App } from './ui/App'
import { loadSettings } from './data/settings'
import './ui/styles.css'

void loadSettings().then(() => render(<App />, document.getElementById('app')!))
