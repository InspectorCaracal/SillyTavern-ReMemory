import { getContext } from "../../../../extensions.js";
import { settings, Buttons } from "./settings.js";
import { endScene, rememberEvent, logMessage } from "./memories.js";

// debugger;
const log = (...msg)=>console.log('[reMemory]', ...msg);
const debug = (...msg)=>console.debug('[reMemory]', ...msg);
const error = (...msg)=>console.error('[reMemory]', ...msg);

const logMessageDiv = `<div class="rmr-button fa-solid fa-fw fa-book-bookmark interactable" title="Create a lorebook memory entry for this post" tabindex="0"></div>`;
const genMemoryDiv = `<div class="rmr-button fa-solid fa-fw fa-brain interactable" title="Generate a lorebook memory entry from this post and its immediate context" tabindex="0"></div>`;
const endSceneDiv = `<div class="rmr-button fa-solid fa-fw fa-circle-stop interactable" title="Close off the scene and summarize it" tabindex="0"></div>`;

// context.executeSlashCommandsWithOptions('/echo title="My Echo" "My text here"');

export function toggleSceneHighlight(button, mes_id) {
	button.off('click');
	if (getContext().chat[mes_id]?.extra?.rmr_scene) {
		button.removeClass('fa-circle-stop');
		button.addClass('rmr-scene-point fa-circle-check');
		button.prop("title", "Unset this message as a scene end");
		button.on('click', (e) => {
			getContext().chat[mes_id].extra.rmr_scene = false;
			toggleSceneHighlight($(e.target), $(e.target).closest('.mes').attr('mesid'));
			getContext().saveChat();
		});
	} else {
		button.removeClass('rmr-scene-point fa-circle-check');
		button.addClass('fa-circle-stop');
		button.prop("title", "Close off the scene and summarize it");
		button.on('click', (e) => {
			const message = $(e.target).closest('.mes');
			endScene(message);
		});
	}
}

export function addMessageButtons(message) {
	const mes_id = Number(message.attr('mesid'));
	const buttonbox = message.find('.extraMesButtons');
	// clear out any existing buttons just in case
	buttonbox.find('.rmr-button').remove();

	if (settings.show_buttons.includes(Buttons.STOP)) {
		let newButton = $(endSceneDiv);
		toggleSceneHighlight(newButton, mes_id);
		buttonbox.prepend(newButton);
	}
	if (settings.show_buttons.includes(Buttons.REMEMBER)) {
		let newButton = $(genMemoryDiv);
		newButton.on('click', (e) => {
			rememberEvent(message);
		});
		buttonbox.prepend(newButton);
	}
	if (settings.show_buttons.includes(Buttons.LOG)) {
		let newButton = $(logMessageDiv);
		newButton.on('click', (e) => {
			logMessage(message);
		});
		buttonbox.prepend(newButton);
	}
}

export function resetMessageButtons() {
	document.querySelectorAll('#chat > .mes[mesid]').forEach(it=>addMessageButtons($(it)));
}