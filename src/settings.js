import { extension_settings, getContext } from "../../../../extensions.js";
import { extension_name } from '../index.js';
import { resetMessageButtons } from './messages.js';

// debugger;
const log = (...msg)=>console.log('[reMemory]', ...msg);
const debug = (...msg)=>console.debug('[reMemory]', ...msg);
const error = (...msg)=>console.error('[reMemory]', ...msg);

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
}

const settingsDiv = `<div class="rmr-extension-settings">
	<div class="inline-drawer">
		<div class="inline-drawer-toggle inline-drawer-header">
			<b>ReMemory</b>
			<div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
		</div>
		<div class="inline-drawer-content">
			<h4>Message Buttons</h4>
			<div class="rmr-extension_block">
				<label class="checkbox_label" for="rmr_log_button">
					<span class="rmr-button fa-solid fa-fw fa-book-bookmark"></span>
					<input id="rmr_log_button" class="checkbox" type="checkbox" />
					Log Message
				</label>
				<label class="checkbox_label" for="rmr_memory_button">
					<span class="rmr-button fa-solid fa-fw fa-brain"></span>
					<input id="rmr_memory_button" class="checkbox" type="checkbox" /> Generate Memory
				</label>
				<label class="checkbox_label" for="rmr_scene_button">
					<span class="rmr-button fa-solid fa-fw fa-circle-stop"></span>
					<input id="rmr_scene_button" class="checkbox" type="checkbox" />
					End Scene
				</label>
			</div>
			<hr>
			<h4>Memory Settings</h4>
			<div class="rmr-extension_block">
				<div class="flex-container marginTopBot5">
					<div title="How many previous messages to include when generating a new memory." class="flex-container flex1 flexFlowColumn">
						<label for="rmr_memory_span">
							<small>Memory Span</small>
						</label>
						<input max="99" min="0" class="text_pole" id="rmr_memory_span" type="number">
					</div>
					<div title="Insertion depth for memory entries." class="flex-container flex1 flexFlowColumn">
						<label for="rmr_memory_depth">
							<small>Memory Depth</small>
						</label>
						<input max="99" min="0" class="text_pole" id="rmr_memory_depth" type="number">
					</div>
					<div title="The 'sticky' value for the memory entry - how many messages it'll stay active for after being activated." class="flex-container flex1 flexFlowColumn">
						<label for="rmr_memory_life">
							<small>Stickiness</small>
						</label>
					<input max="99" min="0" class="text_pole" id="rmr_memory_life" type="number">
					</div>
					<div title="How often a memory should activate when potentially triggered. Value is a percentage." class="flex-container flex1 flexFlowColumn">
						<label for="rmr_trigger_pct">
							<small>Trigger %</small>
						</label>
						<input max="100" min="1" class="text_pole" id="rmr_trigger_pct" type="number">
					</div>
				</div>
			</div>
			<hr>
			<div class="rmr-extension_block flex-container marginTopBot5">
				<div title="A string which will be added to the beginning of all memory entries." class="flex-container flex1 flexFlowColumn">
					<label for="rmr_memory_prefix">
						<small>Memory Prefix</small>
					</label>
					<textarea placeholder="" rows="1" class="margin0 text_pole textarea_compact" id="rmr_memory_prefix"></textarea>
				</div>
				<div title="A string which will be appended to the end of all memory entries." class="flex-container flex1 flexFlowColumn">
					<label for="rmr_memory_suffix">
						<small>Memory Suffix</small>
					</label>
					<textarea placeholder="" rows="1" class="margin0 text_pole textarea_compact" id="rmr_memory_suffix"></textarea>
				</div>
			</div>
			<hr>
			<div class="rmr-extension_block flex-container flexFlowColumn">
				<div title="The prompt appended to a section of message history when generating a summary." class="flex-container flex1 flexFlowColumn">
					<label for="rmr_memory_prompt">
						<span>Summary Prompt</span>
					</label>
					<textarea placeholder="${defaultSettings['memory_prompt']}" rows="3" class="margin0 text_pole textarea_compact" id="rmr_memory_prompt"></textarea>
				</div>
				<div title="The prompt appended to a new memory message when generating triggering keywords." class="flex-container flex1 flexFlowColumn">
					<label for="rmr_keywords_prompt">
						<span>Keyword Prompt</span>
					</label>
					<textarea placeholder="${defaultSettings['keywords_prompt']}" rows="3" class="margin0 text_pole textarea_compact" id="rmr_keywords_prompt"></textarea>
				</div>
			</div>
			<hr>
			<h4>"Pop-Up" Memories</h4>
			<div class="rmr-extension_block flex-container marginTopBot5">
				<div title="Create an extra, low-chance, constant-activation copy of the memory entry." class="flex-container flex1 flexFlowColumn">
					<label class="checkbox_label" for="rmr_popup_memories">
						<input id="rmr_popup_memories" class="checkbox" type="checkbox" />
						Create "Pop-Up" memories
					</label>
					<label for="rmr_popup_pct">
						<input max="100" min="1" class="text_pole widthUnset" id="rmr_popup_pct" type="number">
						<span>Trigger %</span>
					</label>
				</div>
				<div title="Subtracts the set % from all pop-up memories every time a scene is ended." class="flex-container flex1 flexFlowColumn">
					<label class="checkbox_label" for="rmr_fade_memories">
						<input id="rmr_fade_memories" class="checkbox" type="checkbox" />
						Enable memory fading
					</label>
					<label for="rmr_fade_pct">
						<input max="100" min="1" class="text_pole widthUnset" id="rmr_fade_pct" type="number">
						<span>Fade %</span>
					</label>
				</div>
			</div>
			<hr>
			<h4>Scene Ending</h4>
			<div class="rmr-extension_block">
				<label class="checkbox_label" for="rmr_hide_scene">
					<input id="rmr_hide_scene" class="checkbox" type="checkbox" />
					Hide Summarized Messages
				</label>
				<label class="checkbox_label" for="rmr_add_chunk_summaries">
					<input id="rmr_add_chunk_summaries" class="checkbox" type="checkbox" />
					Add chunk summaries (when there are more than one) as comment
				</label>
				<span>
					Scene summary behavior:
					<select class="text_pole widthNatural" id="rmr_scene_end_mode">
						<option value="MESSAGE">${SceneEndMode.MESSAGE}</option>
						<option value="MEMORY">${SceneEndMode.MEMORY}</option>
						<option value="NONE">${SceneEndMode.NONE}</option>
					</select>
				</span>
			</div>
			<hr>
		</div>
	</div>
</div>`;

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
	if (isNaN(value)) {
		if (event.target.value.length === 0) event.target.value = defaultSettings[setting_key];
		else event.target.value = settings[setting_key];
		return;
	}

	if (event.target.max !== undefined) {
		value = Math.min(value, event.target.max);
	}
	if (event.target.min !== undefined) {
		value = Math.max(value, event.target.min);
	}

	if (event.target.value !== value) {
		event.target.value = value;
	}
	
	settings[setting_key] = value;
	getContext().saveSettingsDebounced();
}

function loadSettingsUI() {
	// add settings UI
	$('#extensions_settings').append($(settingsDiv));

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
				settings.show_buttons = settings.show_buttons.filter(it=>it!==button_name);
			}
			resetMessageButtons();
			getContext().saveSettingsDebounced();
		});
	}
	// handle other checkboxes
	$("#rmr_popup_memories").prop('checked', settings.popup_memories).on('click', toggleCheckboxSetting);
	// $("#rmr_fade_memories").prop('checked', settings.fade_memories).on('click', toggleCheckboxSetting);
	$("#rmr_fade_memories").prop('checked', settings.fade_memories).on('click', (e) => {
		toastr.warning('Memory fading is not yet implemented.', 'ReMemory');
		e.target.checked = false;
	});
	$("#rmr_hide_scene").prop('checked', settings.hide_scene).on('click', toggleCheckboxSetting);
	// $("#rmr_add_banner").prop('checked', settings.add_banner).on('click', toggleCheckboxSetting);
	$("#rmr_add_chunk_summaries").prop('checked', settings.add_chunk_summaries).on('click', toggleCheckboxSetting);
	// handle dropdown
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
}