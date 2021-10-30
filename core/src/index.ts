import type { Transaction } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import DevTools from './components/DevTools.svelte'
import {
  subscribeToDispatchTransaction,
  unsubscribeDispatchTransaction
} from './history-and-diff/subscribeToTransactions'
import { resetHistory } from './stores/stateHistory'

import { DevToolsOpts } from './types'
import type { Plugin } from './typings/pm'

declare global {
  interface Window {
    applyDevTools: typeof applyDevTools
    editorView?: EditorView
    _node?: any
    _doc?: { [key: string]: any }
    _tr?: Transaction
    _plugin?: [Plugin | undefined, unknown]
  }
}

const DEVTOOLS_CLASS_NAME = '__prosemirror-dev-toolkit__'

try {
  // Make the dev tools available globally for some scripting shenanigans
  if (typeof window !== 'undefined') window.applyDevTools = applyDevTools
} catch (err) {}

function createOrFindPlace() {
  let place: HTMLElement | null = document.querySelector(`.${DEVTOOLS_CLASS_NAME}`)

  if (!place) {
    place = document.createElement('div')
    place.className = DEVTOOLS_CLASS_NAME
    document.body.appendChild(place)
  }

  return place
}

let removeCallback: (() => void) | undefined

export function applyDevTools(view: EditorView, opts: DevToolsOpts = {}) {
  const place = createOrFindPlace()

  removeDevTools()

  const comp = new DevTools({
    target: place,
    props: {
      view,
      ...opts
    }
  })
  try {
    // Make the editor view available since it might be handy for quick debugging
    if (typeof window !== 'undefined') window.editorView = view
  } catch (err) {}

  // Bind the component's life-cycle to the editorView to automatically unmount the devTools
  const oldDestroyFn = view.destroy.bind(view)
  view.destroy = () => {
    // DevTools must always be removed before view as the resetDispatch requires view to be still present
    removeDevTools()
    oldDestroyFn()
  }

  subscribeToDispatchTransaction(view)

  removeCallback = () => {
    resetHistory()
    unsubscribeDispatchTransaction()
    // TODO add test to check no "Component already destroyed" warnings appear
    comp.$destroy()
  }
}

export function removeDevTools() {
  removeCallback && removeCallback()
  removeCallback = undefined
}
