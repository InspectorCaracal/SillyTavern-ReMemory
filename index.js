import { eventSource, event_types } from "../../../../script.js";
import { loadSlashCommands } from "./src/commands.js";
import { addMessageButtons, resetMessageButtons } from "./src/messages.js";
import { loadSettings, changeCharaName } from "./src/settings.js";

export const extension_name = 'SillyTavern-ReMemory';
// NOTE: this path is magic, use it
export const extension_path = `scripts/extensions/third-party/${extension_name}`;

export let STVersion;


// debugger;
const log = (...msg)=>console.log('[reMemory]', ...msg);
const debug = (...msg)=>console.debug('[reMemory]', ...msg);
const error = (...msg)=>console.error('[reMemory]', ...msg);


function onMessageRendered(mes_id) {
	let message = $('.mes[mesid="'+mes_id+'"]');
	addMessageButtons(message);
}

function checkVersion(version_string) {
	let ver = version_string.pkgVersion.split('.').map(x=>Number(x));
	if (ver[1] < 13) return false;
	else return true;
}

jQuery(async () => {
	const res = await fetch('/version');
	STVersion = await res.json();
	if (checkVersion(STVersion)===true) {
		eventSource.on(event_types.APP_READY, async () => {
			loadSettings();
			loadSlashCommands();
		});
		eventSource.on(event_types.USER_MESSAGE_RENDERED, (mesId)=>onMessageRendered(mesId));
		eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (mesId)=>onMessageRendered(mesId));
		eventSource.on(event_types.CHAT_CHANGED, (chatId)=>{
			if (!chatId) return;
			resetMessageButtons();
		});
		eventSource.on(event_types.CHARACTER_RENAMED, changeCharaName);		
	}
	else {
		toastr.error("SillyTavern version is incompatible! Please update to the latest release.", "ReMemory");
		throw new Error("ReMemory: SillyTavern version is incompatible! Please update to the latest release.");
	}
});
