/**
 * Canonical State Access schema.
 *
 * Source = immutable scenario definitions (engine.src).
 * Runtime = mutable game state (engine.state).
 * Session = transient interaction state (engine.chatState / engine.pendingPasswordAction).
 *
 * Named selectors are the Engine state-access API. Each selector resolves to one
 * canonical source, runtime, or session path; selectors do not define alternate scenario formats.
 */
export const STATE_SCHEMA = Object.freeze({
  // Scenario metadata and configuration (runtime copies are used when present).
  ageRating: ['source', 'meta.ageRating'],
  blurhash: ['source', 'meta.cover.blurhash'],
  copyright: ['source', 'meta.copyright'],
  cover: ['source', 'meta.cover.url'],
  createdAt: ['source', 'meta.createdAt'],
  desc: ['runtime', 'meta.desc'],
  difficulty: ['source', 'meta.difficulty'],
  entryCharacter: ['runtime', 'entryCharacter'],
  originalEntryCharacter: ['runtime', 'originalEntryCharacter'],
  scenarioEntryCharacter: ['runtime', 'meta.entryCharacter'],
  entryScene: ['source', 'meta.entryScene'],
  estimatedPlayTime: ['source', 'meta.estimatedPlayTime'],
  language: ['source', 'meta.language'],
  license: ['source', 'meta.license'],
  notes: ['source', 'meta.notes'],
  ratio: ['source', 'meta.cover.ratio'],
  studio: ['source', 'meta.studio'],
  subtitle: ['source', 'meta.subtitle'],
  tags: ['source', 'meta.tags.[idx]'],
  title: ['runtime', 'meta.title'],
  updatedAt: ['source', 'meta.updatedAt'],
  version: ['source', 'meta.version'],
  writer: ['source', 'meta.writer'],
  defaultNotice: ['runtime', 'config.defaultNotice'],
  brokenDisable: ['runtime', 'config.brokenDisable'],
  fakerMode: ['runtime', 'config.fakerMode'],
  maxCharacterMoving: ['runtime', 'config.maxCharacterMoving'],
  maxHandOn: ['runtime', 'config.maxHandOn'],
  maxInventory: ['runtime', 'config.maxInventory'],
  minAutomationNextStep: ['runtime', 'config.minAutomationNextStep'],
  minCharacterMoving: ['runtime', 'config.minCharacterMoving'],
  minTransition: ['runtime', 'config.minTransition'],
  navContact: ['runtime', 'config.navContact'],
  navInventory: ['runtime', 'config.navInventory'],
  stopEffectWhenChat: ['runtime', 'config.stopEffectWhenChat'],

  // Global variables live under state.global after Loader normalization.
  'globalState.type': ['runtime', 'global.[id].type'],
  'globalState.value': ['runtime', 'global.[id].value'],

  // Runtime automation values; templates remain source definitions.
  'automation.active': ['runtime', 'automations.[id].active'],
  'automation.banClick': ['runtime', 'automations.[id].banClick'],
  'automation.countCurrent': ['runtime', 'automations.[id].countCurrent'],
  'automation.move': ['runtime', 'automations.[id].move'],
  'automation.moveDirection': ['runtime', 'automations.[id].moveDirection'],
  'automation.numberCycleAllow': ['runtime', 'automations.[id].numberCycleAllow'],
  'automation.runInfinity': ['runtime', 'automations.[id].runInfinity'],
  'automation.stepIndex': ['runtime', 'automations.[id].stepIndex'],

  // Items.
  'item.stats': ['runtime', 'itemInfo.[id].stats'],
  'item.stat.current': ['runtime', 'itemInfo.[id].stats.[statId].current'],
  'item.stat.max': ['runtime', 'itemInfo.[id].stats.[statId].max'],
  'item.stat.label': ['runtime', 'itemInfo.[id].stats.[statId].label'],
  'item.stat.color': ['runtime', 'itemInfo.[id].stats.[statId].color'],
  'item.current': ['runtime', 'itemInfo.[id].usage.current'],
  'item.max': ['runtime', 'itemInfo.[id].usage.max'],
  'item.desc': ['runtime', 'itemInfo.[id].desc'],
  'item.icon': ['runtime', 'itemInfo.[id].icon'],
  'item.name': ['runtime', 'itemInfo.[id].name'],

  // Scene definitions vs scene runtime flags are deliberately separated.
  'scene.activeRouterId': ['runtime', 'scenes.[id].activeRouterId'],
  'scene.blocked': ['runtime', 'scenes.[id].blocked'],
  'scene.title': ['source', 'scenes.[id].meta.title'],
  'scene.desc': ['source', 'scenes.[id].meta.desc'],
  'scene.cover': ['source', 'scenes.[id].meta.cover.url'],
  'scene.music': ['source', 'scenes.[id].meta.music.url'],
  'scene.ambience': ['source', 'scenes.[id].meta.ambience.url'],
  'scene.transition': ['runtime', 'scenes.[id].transition'],
  'scene.parent': ['source', 'scenes.[id].meta.parentScene'],
  'router.actions': ['source', 'scenes.[sceneId].routers.[routerId].actions'],
  'router.blocked': ['runtime', 'routers.[routerKey].blocked'],
  'router.countVisited': ['runtime', 'routers.[routerKey].countVisited'],
  'router.cover': ['source', 'scenes.[sceneId].routers.[routerId].meta.cover'],
  'router.desc': ['source', 'scenes.[sceneId].routers.[routerId].meta.desc'],
  'router.overlay': ['source', 'scenes.[sceneId].routers.[routerId].set.overlay'],
  'router.sceneID': ['source', 'scenes.[sceneId].routers.[routerId].meta.sceneID'],
  'router.timer': ['runtime', 'routers.[routerKey].timer'],
  'router.visited': ['runtime', 'routers.[routerKey].visited'],

  // Actions: definition fields come from source; mutable counters/flags from runtime.
  'action.buttonIcon': ['source', 'actions.[id].meta.buttonIcon'],
  'action.buttonLabel': ['source', 'actions.[id].meta.buttonLabel'],
  'action.cooldown': ['runtime', 'actions.[id].cooldown'],
  'action.count': ['runtime', 'actions.[id].count'],
  'action.desc': ['source', 'actions.[id].meta.desc'],
  'action.display': ['runtime', 'actions.[id].display'],
  'action.password': ['source', 'actions.[id].set.password'],
  'action.requirement': ['source', 'actions.[id].set.requirement'],
  'action.thumb': ['source', 'actions.[id].meta.thumb'],
  'action.title': ['source', 'actions.[id].meta.title'],

  // Chat definitions are in source.chat; runtime chat progress is state.chats.
  'chat.sender': ['source', 'chat.[id].meta.sender'],
  'chat.entry': ['source', 'chat.[id].meta.entry'],
  'chat.loop': ['source', 'chat.[id].meta.loop'],
  'chat.title': ['source', 'chat.[id].meta.title'],
  'chat.to': ['source', 'chat.[id].meta.to'],
  'chat.bookmark': ['runtime', 'chats.[id].set.bookmark'],
  'chat.block.text': ['source', 'chat.[chatId].block.[blockId].line.[idx].text'],
  'chat.choice.text': ['source', 'chat.[chatId].choice.[choiceId].[idx].text'],
  'chat.data': ['runtime', 'chats.[id]'],
  'chat.history': ['runtime', 'chatHistory.[id]'],

  // Characters.
  'char.avatar': ['runtime', 'characters.[id].meta.avatar'],
  'char.desc': ['runtime', 'characters.[id].meta.desc'],
  'char.name': ['runtime', 'characters.[id].meta.name'],
  'char.inventory': ['runtime', 'characters.[id].inventory'],
  'char.stats': ['runtime', 'characters.[id].stats'],
  'char.stat.current': ['runtime', 'characters.[id].stats.[statId].current'],
  'char.stat.max': ['runtime', 'characters.[id].stats.[statId].max'],
  'char.stat.label': ['runtime', 'characters.[id].stats.[statId].label'],
  'char.stat.color': ['runtime', 'characters.[id].stats.[statId].color'],
  'char.current': ['runtime', 'characters.[charId].stats.[statId].current'],
  'char.max': ['runtime', 'characters.[charId].stats.[statId].max'],
  'char.scene_id': ['runtime', 'characters.[id].place.scene_id'],
  'char.currentIndex': ['runtime', 'characters.[id].place.currentIndex'],
  'char.alert': ['runtime', 'characters.[id].set.alert'],
  'char.moving': ['runtime', 'characters.[id].set.moving'],

  // Passwords and endings are scenario definitions, not runtime state.
  'pass.number.value': ['source', 'passwords.number.[id].value'],
  'pass.string.value': ['source', 'passwords.string.[id].value'],
  'ending.title': ['source', 'endings.[id].title'],
  'ending.desc': ['source', 'endings.[id].desc'],

  // Session-only data.
  'session.chat': ['session', 'chatState'],
  'session.passwordChallenge': ['session', 'pendingPasswordAction']
});
