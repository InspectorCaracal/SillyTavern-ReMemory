import { eventSource, event_types } from "../../../../script.js";

import { addMessageButtons, resetMessageButtons } from "./src/messages.js";
import { loadSettings } from "./src/settings.js";

export const extension_name = 'SillyTavern-ReMemory';

function onMessageRendered(mes_id) {
	let message = $('.mes[mesid="'+mes_id+'"]');
	addMessageButtons(message);
}

jQuery(async () => {
	loadSettings();
});

eventSource.on(event_types.USER_MESSAGE_RENDERED, (mesId)=>onMessageRendered(mesId));
eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (mesId)=>onMessageRendered(mesId));
eventSource.on(event_types.CHAT_CHANGED, (chatId)=>{
	if (!chatId) return;
	resetMessageButtons();
});
