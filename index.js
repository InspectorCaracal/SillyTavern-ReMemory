// The main script for the extension
// The following are examples of some basic extension functionality

//You'll likely need to import extension_settings, getContext, and loadExtensionSettings from extensions.js
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";

//You'll likely need to import some other functions from the main script
import { eventSource, event_types } from "../../../../script.js";

import { addMessageButtons, resetMessageButtons } from "./src/messages.js";
import { loadSettings } from "./src/settings.js";

export const extension_name = 'SillyTavern-ReMemory';

// debugger;
const log = (...msg)=>console.log('[reMemory]', ...msg);
const debug = (...msg)=>console.debug('[reMemory]', ...msg);
const error = (...msg)=>console.error('[reMemory]', ...msg);

function onMessageRendered(mes_id) {
  debug("aaaaaaaaaaaaaaa");
  let message = $('.mes[mesid="'+mes_id+'"]');
  addMessageButtons(message);
}

jQuery(async () => {
    loadSettings();

    // addSettingsUI();
    // registerSettingsListeners();

    // registerGenerationMutexListeners();
    // registerGenerationEventListeners();
});

eventSource.on(event_types.USER_MESSAGE_RENDERED, (mesId)=>onMessageRendered(mesId));
eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (mesId)=>onMessageRendered(mesId));
eventSource.on(event_types.CHAT_CHANGED, (chatId)=>{
    if (!chatId) return;
    resetMessageButtons();
});
