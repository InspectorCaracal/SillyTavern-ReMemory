import { extension_settings, getContext } from "../../../../extensions.js";
import { getCharaFilename } from "../../../../utils.js";
import { world_info } from "../../../../world-info.js";
import { extension_name, extension_path } from '../index.js';
import { resetMessageButtons } from './messages.js';

// debugger;
const log = (...msg) => console.log('[reMemory]', ...msg);
const debug = (...msg) => console.debug('[reMemory]', ...msg);
const error = (...msg) => console.error('[reMemory]', ...msg);

export let settings;

export const Buttons = {
	LOG: "log_button",
	STOP: "scene_button",
	REMEMBER: "memory_button",
}
export const SceneEndMode = {
	MESSAGE: "Add to chat",
	MEMORY: "Log to memory book",
	NONE: "Don't summarize",
}

const defaultSettings = {
	// general settings
	"is_enabled": true,
	"show_buttons": [Buttons.LOG, Buttons.STOP, Buttons.REMEMBER],
	// prompt/text injection settings
	"keywords_prompt": "In your next response I want you to provide only a comma-delimited list of keywords and phrases which summarize the text you were given. Arrange the list in order of importance. Do not write in full sentences. Only include the list.",
	"memory_prompt": "Briefly summarize the most important details and events that occured in that sequence of events. Write your summary in a single paragraph.",
	"memory_prefix": "",
	"memory_suffix": "",
	"memory_max_tokens": 0, // max generated length for memories. 0 = default setting used
	"rate_limit": 0, // requests per minute. 0 means no limit
	"profile": null, // optional connection-profile override
	// WI settings
	"memory_depth": 4, // depth
	"memory_life": 3,	// sticky
	"memory_span": 3,	// how far back in the chat to include in a memory
	"trigger_pct": 50, // trigger % for normal keyword entries
	// popup WI settings
	"popup_memories": false, // create additional low-chance constant memories
	"popup_pct": 10,	 // trigger % for constant entries
	"fade_memories": false, // reduce popup trigger % over time until removal
	"fade_pct": 5,		// how much to reduce the trigger % by each time
	// scene end settings
	"hide_scene": true, // hide messages after summarizing the scene
	"add_chunk_summaries": false, // add a comment containing all of the individual chunk summaries
	"scene_end_mode": SceneEndMode.MESSAGE, // whether final summary is added as a chat message or memory book entry
	"book_assignments": {}, // which book to use for memory
}

function toggleCheckboxSetting(event) {
	const setting_key = event.target.id.replace('rmr_', '');
	settings[setting_key] = event.target.checked;
	getContext().saveSettingsDebounced();
}

function handleStringValueChange(event) {
	const setting_key = event.target.id.replace('rmr_', '');
	let value = event.target.value;
	if (value.length > 0) {
		settings[setting_key] = value;
	} else {
		settings[setting_key] = defaultSettings[setting_key];
	}
	getContext().saveSettingsDebounced();
}

function handleIntValueChange(event) {
	const setting_key = event.target.id.replace('rmr_', '');
	let value = parseInt(event.target.value);
	debug("setting numeric value", value);
	if (isNaN(value)) {
		debug('Invalid value for setting', setting_key, event.target.value);
		if (event.target.value.length === 0) event.target.value = defaultSettings[setting_key];
		else event.target.value = settings[setting_key];
		return;
	}

	if (event.target.max.length > 0) {
		debug("max value", event.target.max);
		value = Math.min(value, event.target.max);
	}
	if (event.target.min.length > 0) {
		debug("min value", event.target.min);
		value = Math.max(value, event.target.min);
	}
	debug("numeric value is now", value);

	if (event.target.value !== value) {
		event.target.value = value;
	}
	debug("numeric value is now", value);

	settings[setting_key] = value;
	getContext().saveSettingsDebounced();
}

function reloadProfiles() {
	const profileSelect = $('#rmr_profile');
	profileSelect.not(':first').remove();
	for (const profile of extension_settings.connectionManager.profiles) {
		profileSelect.append(
			$('<option></option>')
				.attr('value', profile.id)
				.text(profile.name)
		);
		if (settings.profile == profile.id) profileSelect.val(profile.id);
	}
}

async function loadSettingsUI() {
	// add settings UI
	const settingsDiv = await $.get(`${extension_path}/templates/settings_panel.html`);
	$('#extensions_settings').append(settingsDiv);
	$('#rmr_keywords_prompt').attr('placeholder', defaultSettings.keywords_prompt);
	$('#rmr_memory_prompt').attr('placeholder', defaultSettings.memory_prompt);
	const mode_div = $(`#rmr_scene_end_mode`);
	for (const end_mode in SceneEndMode) {
		mode_div.append(
			$('<option></option>')
				.attr('value', end_mode)
				.text(SceneEndMode[end_mode])
		);
	}

	// handle button checkboxes
	for (const button in Buttons) {
		const button_name = Buttons[button];
		const button_elem = $(`#rmr_${button_name}`);
		// set initial state
		if (settings.show_buttons.includes(button_name)) {
			button_elem.prop('checked', true);
		}
		// set up event listener
		button_elem.on('click', (e) => {
			if (e.target.checked && !settings.show_buttons.includes(button_name)) {
				settings.show_buttons.push(button_name);
			}
			else if (!e.target.checked && settings.show_buttons.includes(button_name)) {
				settings.show_buttons = settings.show_buttons.filter(it => it !== button_name);
			}
			resetMessageButtons();
			getContext().saveSettingsDebounced();
		});
	}
	// handle other checkboxes
	$("#rmr_popup_memories").prop('checked', settings.popup_memories).on('click', toggleCheckboxSetting);
	$("#rmr_fade_memories").prop('checked', settings.fade_memories).on('click', toggleCheckboxSetting);
	// $("#rmr_fade_memories").prop('checked', settings.fade_memories).on('click', (e) => {
	// 	toastr.warning('Memory fading is not yet implemented.', 'ReMemory');
	// 	e.target.checked = false;
	// });
	$("#rmr_hide_scene").prop('checked', settings.hide_scene).on('click', toggleCheckboxSetting);
	// $("#rmr_add_banner").prop('checked', settings.add_banner).on('click', toggleCheckboxSetting);
	$("#rmr_add_chunk_summaries").prop('checked', settings.add_chunk_summaries).on('click', toggleCheckboxSetting);
	// handle dropdowns
	reloadProfiles();
	$('#rmr_profile').on('input', () => {
		const profile = $('#rmr_profile').val();
		if (!profile.length) {
			// no override, we won't change
			settings.profile = null;
			getContext().saveSettingsDebounced();
			return;
		}
		const profileID = extension_settings.connectionManager.profiles.findIndex(it => it.id == profile);
		if (profileID >= 0) {
			settings.profile = profile;
			getContext().saveSettingsDebounced();
		}
		else {
			toastr.error("Non-existent profile selected.", "ReMemory");
			$('rmr_profile').val('');
			settings.profile = null;
			getContext().saveSettingsDebounced();
		}
	});
	for (const mode in SceneEndMode) {
		if (SceneEndMode[mode] === settings.scene_end_mode) {
			$('#rmr_scene_end_mode').val(mode);
		}
	}
	$('#rmr_scene_end_mode').on('input', () => {
		const mode = $('#rmr_scene_end_mode').val();
		if (!Object.keys(SceneEndMode).includes(mode)) return;
		settings.scene_end_mode = SceneEndMode[mode];
		getContext().saveSettingsDebounced();
	});
	// load all numeric settings
	$(`.rmr-extension_block input[type="number"]`).each((_i, elem) => {
		const setting_key = elem.id.replace('rmr_', '');
		elem.value = settings[setting_key];
		$(elem).on('change', handleIntValueChange);
	});
	// load all text settings
	$(`.rmr-extension_block textarea`).each((_i, elem) => {
		const setting_key = elem.id.replace('rmr_', '');
		elem.value = settings[setting_key];
		$(elem).on('change', handleStringValueChange);
	});

	debug('Settings UI loaded');
}

async function loadBookSelector() {
	debug("load book selector");
	const characterId = $('#set_character_world').data('chid');
	const bookDiv = $(await $.get(`${extension_path}/templates/book_select.html`));
	let char_file = getCharaFilename(characterId);
	if (char_file) {
		const extraBooks = world_info.charLore?.find((e) => e.name === char_file)?.extraBooks ?? [];
		debug(extraBooks);
		if (extraBooks) {
			const selector = bookDiv.children('#rmr_memory_book_selector');
			for (const book of extraBooks) {
				selector.append(`<option value="${book}">${book}</option>`);
			}
			selector.on('change', (e) => {
				const selectedBook = $(e.target.selectedOptions).val();
				settings.book_assignments[char_file] = selectedBook;
				getContext().saveSettingsDebounced();
			});
			selector.val(settings.book_assignments[char_file]);
		}
	}
	getContext().callGenericPopup(bookDiv, 1, { okButton: 'Ok' });
}

export function loadSettings() {
	// load settings
	settings = extension_settings[extension_name] || {};

	// load default values into settings
	for (const key in defaultSettings) {
		if (settings[key] === undefined) {
			settings[key] = defaultSettings[key];
		}
	}

	extension_settings[extension_name] = settings;

	// load settings UI
	loadSettingsUI();
	$('#avatar_controls .buttons_block').prepend($('<div id="rmr_memory_book" class="menu_button rmr-button fa-solid fa-fw fa-brain interactable" title="ReMemory Book" tabindex="0"></div>'));
	$('#rmr_memory_book').on('click', loadBookSelector);
}

export function changeCharaName(old_key, new_key) {
	if (old_key in settings.book_assignments) {
		settings.book_assignments[new_key] = settings.book_assignments[old_key];
		delete settings.book_assignments[old_key];
		getContext().saveSettingsDebounced();
	}
}