import { moment } from '../../../../../lib.js';
import { extension_settings, getContext } from "../../../../extensions.js";
import { getRegexedString, regex_placement } from '../../../regex/engine.js';
import { createWorldInfoEntry } from "../../../../world-info.js";
import { user_avatar } from "../../../../personas.js";
import { getCharaFilename } from "../../../../utils.js";
import { settings, SceneEndMode } from "./settings.js";
import { toggleSceneHighlight } from "./messages.js";
import { debug } from "./logging.js";

const runSlashCommand = getContext().executeSlashCommandsWithOptions;

let commandArgs;

const infoToast = (text)=>{if (!commandArgs.quiet) toastr.info(text, "ReMemory")};
const doneToast = (text)=>{if (!commandArgs.quiet) toastr.success(text, "ReMemory")};
const oopsToast = (text)=>{if (!commandArgs.quiet) toastr.warning(text, "ReMemory")};
const errorToast = (text)=>{if (!commandArgs.quiet) toastr.error(text, "ReMemory")};

const delay_ms = ()=> {
	return Math.max(500, 60000 / Number(settings.rate_limit));
}
let last_gen_timestamp = 0;

function bookForChar(characterId) {
	debug('getting books for character', characterId);
	let char_data, char_file;
	if (characterId.endsWith('png')) {
		char_data = getContext().characters.find((e) => e.avatar === characterId);
		char_file = getCharaFilename(null, {'manualAvatarKey':characterId});
	}
	else {
		char_data = getContext().characters[characterId];
		char_file = getCharaFilename(characterId);
	}
	if (char_file in settings.book_assignments) {
		return settings.book_assignments[char_file];
	}
	return "";
}

export function getActiveMemoryBooks() {
	const context = getContext();
	const powerUserSettings = context.powerUserSettings;

	let books = {};
	if (context.chatMetadata.world_info) {
		debug('adding chat book', context.chatMetadata.world_info);
		books.Chat = context.chatMetadata.world_info;
	}
	let persona = powerUserSettings.personas[user_avatar] ?? "";
	if (persona) {
		debug('persona found:', persona);
		if (powerUserSettings.persona_descriptions[user_avatar]?.lorebook) {
			debug('adding persona book');
			books[persona] = powerUserSettings.persona_descriptions[user_avatar].lorebook;
		}
	}
	if (context.characterId) {
		let book = bookForChar(context.characterId);
		if (book) {
			books[getCharaFilename(context.characterId)] = book;
		}
	}
	if (context.groupId) {
		const group = context.groups.find(x => x.id === context.groupId);
		for (const member of group.members) {
			if (member !== context.characterId) {
				let book = bookForChar(member);
				if (book) {
					books[getCharaFilename(null, {'manualAvatarKey':member})] = book;
				}
			}
		}
	}
	return books;
}

async function promptInfoBooks() {
	const books = getActiveMemoryBooks();
	const bookOptions = Object.keys(books);
	if (bookOptions.length === 0) return [];
	let bookchars = commandArgs.books;
	if (!bookchars) {
		bookchars = await runSlashCommand(`/buttons labels=${JSON.stringify(bookOptions)} multiple=true Which characters do you want to remember this?`);
	}
	let result = [];
	for (const char of JSON.parse(bookchars.pipe)) {
		if (!(char in books)) return [];
		result.push(books[char]);
	}
	return result;
}

async function createMemoryEntry(content, book, keywords, options={}) {
	const context = getContext();
	const book_data = await context.loadWorldInfo(book);

	if (!(book_data && ('entries' in book_data))) {
		oopsToast('Memory book missing or invalid');
		return;
	}
	const timestamp = moment().format('YYYY-MM-DD HH:mm');

	// create regular keyword entry
	const new_entry = createWorldInfoEntry(book, book_data);
	new_entry.content = content;
	new_entry.addMemo = true;
	new_entry.comment = options.title ?? `memory ${timestamp}`;
	new_entry.key = keywords;
	new_entry.position = 4;
	new_entry.depth = settings.memory_depth;
	new_entry.group = 'memory';
	// allows keyword-triggered memories to take precedence to popup memories
	new_entry.useGroupScoring = true;
	new_entry.sticky = settings.memory_life;
	new_entry.probability = settings.trigger_pct;

	// optionally create pop-up constant entry
	const do_popup = JSON.parse(options.popup ?? settings.popup_memories);
	if (do_popup) {
			const new_popup = createWorldInfoEntry(book, book_data);
			new_popup.content = content;
			new_popup.addMemo = true;
			new_popup.comment = (options.title ?? `memory ${timestamp}`) + ` POPUP`;
			new_popup.constant = true;
			new_popup.position = 4;
			new_popup.depth = settings.memory_depth;
			new_popup.group = 'memory';
			// allows keyword-triggered memories to take precedence to popup memories
			new_popup.useGroupScoring = true;
			new_popup.sticky = settings.memory_life;
			new_popup.probability = settings.popup_pct;
			new_popup.rmr_fade = true;
		}

	await context.saveWorldInfo(book, book_data);
	context.reloadWorldInfoEditor(book, false);
}

async function processMessageSlice(mes_id, count=0, start=0) {
	const chat = getContext().chat;
	const length = chat.length;

	// slice to just the history from this message
	let message_history = chat.slice(start, mes_id+1);

	// process for regex/hidden
	message_history = await Promise.all(message_history.map(async (message, index) => {
		let placement = message.is_user ? regex_placement.USER_INPUT : regex_placement.AI_OUTPUT;
		let options = { isPrompt: true, depth: (length - (start+index) - 1) };
		// no point in running the regexing on hidden messages
		let mes_text = message.is_system ? message.mes : getRegexedString(message.mes, placement, options);
		return {
			...message,
			mes: mes_text,
			index: start+index,
		};
  }));

	// filter out hidden messages
	message_history = message_history.filter((it) => {return !it.is_system});
	if (count > 0) {
		count++;
		if (message_history.length > count) {
			// slice it again
			message_history = message_history.slice(-1*count);
		}
	}
	return message_history;
}

async function swapProfile() {
	let swapped = false;
	const current = extension_settings.connectionManager.selectedProfile;
	const profile_list = extension_settings.connectionManager.profiles;
	let target_id = settings.profile;
	if (commandArgs.profile) target_id = commandArgs.profile;
	if (current != target_id) {
		// we have to swap
		debug('swapping profile');
		swapped = current;
		if (profile_list.findIndex(p => p.id === target_id) < 0) {
			oopsToast("Invalid connection profile override; using current profile.");
			return false
		}
		$('#connection_profiles').val(target_id);
		document.getElementById('connection_profiles').dispatchEvent(new Event('change'));
		await new Promise((resolve) => getContext().eventSource.once(getContext().event_types.CONNECTION_PROFILE_LOADED, resolve));
	}
	return swapped;
}

async function genSummaryWithSlash(history, id=0) {
	let this_delay = delay_ms() - (Date.now() - last_gen_timestamp);
	debug('delaying', this_delay, "out of", delay_ms());
	if (this_delay > 0) {
		await new Promise(resolve => setTimeout(resolve, this_delay));
	}
	last_gen_timestamp = Date.now();

	if (id > 0) {
		infoToast("Generating summary #"+id+"....");
	}
	const gen = `/genraw stop=[] instruct=on lock=on Consider the following history:

	${history}
	
	${settings.memory_prompt}`
	let swapped = false;
	if (settings.profile || commandArgs.profile) {
		swapped = await swapProfile();
		debug('swapped?', swapped);
		if (swapped === null) return '';
	}
	const result = await runSlashCommand(gen);
	if (swapped) {
		$('#connection_profiles').val(swapped);
		document.getElementById('connection_profiles').dispatchEvent(new Event('change'));
		await new Promise((resolve) => getContext().eventSource.once(getContext().event_types.CONNECTION_PROFILE_LOADED, resolve));
	}
	const parsed_result = getContext().parseReasoningFromString(result.pipe);
	if (!parsed_result) return result.pipe;
	return parsed_result.content;
}

async function generateMemory(message) {
	const mes_id = Number(message.attr('mesid'));

	const memory_history = await processMessageSlice(mes_id, settings.memory_span);
	debug('memory history', memory_history);
	const memory_context = memory_history.map((it) => `${it.name}: ${it.mes}`).join("\n\n");
	return await genSummaryWithSlash(memory_context);
}

async function generateKeywords(content) {
	let this_delay = delay_ms() - (Date.now() - last_gen_timestamp);
	if (this_delay > 0) {
		await new Promise(resolve => setTimeout(resolve, this_delay));
	}
	last_gen_timestamp = Date.now();

	infoToast("Generating keywords....");
	const gen = `/genraw stop=["\n"] lock=on Consider the following quote:
	
	"${content}"
	
	${settings.keywords_prompt}`;
	let swapped = false;
	if (settings.profile) {
		swapped = await swapProfile();
		debug('swapped?', swapped);
		if (swapped === null) return '';
	}
	let result = await runSlashCommand(gen);
	if (swapped) {
		$('#connection_profiles').val(swapped);
		document.getElementById('connection_profiles').dispatchEvent(new Event('change'));
		await new Promise((resolve) => getContext().eventSource.once(getContext().event_types.CONNECTION_PROFILE_LOADED, resolve));
	}
	const parsed_result = getContext().parseReasoningFromString(result.pipe);
	if (parsed_result) result = parsed_result.content;
	else result = result.pipe;
	// TODO: strip out character names
	return result.split(',').slice(0,5).map((it) => it.trim());
}

async function generateSceneSummary(mes_id) {
	const chat = getContext().chat;
	// slice to just the history from this message
	// slice to messages since the last scene end, if there was one
	let last_end = chat.slice(0, mes_id+1).findLastIndex((it) => it.extra.rmr_scene);
	if (last_end < 0) { last_end = 0; }
	const memory_history = await processMessageSlice(mes_id, 0, last_end);

	const max_tokens = getContext().maxContext - 100; // take out padding for the instructions
	const getTokenCount = getContext().getTokenCountAsync;

	let chunks = [];
	let current = "";
	for (const mes of memory_history) {
		const mes_text = `${mes.name}: ${mes.mes}`;
		const next_text = current+"\n\n"+mes_text;
		const tokens = await getTokenCount(current+mes_text);
		if (tokens > max_tokens) {
			chunks.push(current);
			current = mes_text;
		} else {
			current = next_text;
		}
	}
	if (current.length) chunks.push(current);
	let final_context;
	if (chunks.length == 1) {
		final_context = chunks[0];
	}
	else if (chunks.length > 1) {
		infoToast(`Generating summaries for ${chunks.length} chunks....`);
		let chunk_sums = [];
		let cid = 0;
		while (cid < chunks.length) {
			const chunk_sum = await genSummaryWithSlash(chunks[cid], Number(cid)+1);
			if (chunk_sum.length > 0) {
				chunk_sums.push(chunk_sum);
				cid++;
			} else {
				// popup
		    const result = await getContext().Popup.show.text(
					"ReMemory",
					"There was an error generating a summary for chunk #"+Number(cid)+1,
					{okButton: 'Retry', cancelButton: 'Cancel'});
		    if (result != 1) return "";
			}
		}
		// now we have a summary for each chunk, we need to combine them
		final_context = chunk_sums.join("\n\n");
		if (settings.add_chunk_summaries) {
			await runSlashCommand(`/comment at=${mes_id+1} <details class="rmr-summary-chunks"><summary>Chunk Summaries</summary>${final_context}</details>`)
		}
	}
	else {
		oopsToast("No visible scene content! Skipping summary.");
		return "";
	}
	if (final_context.length > 0) {
		infoToast("Generating scene summary....");
		const result = await genSummaryWithSlash(final_context);
		// at this point we have a history that we've successfully summarized
		// if scene hiding is on, we want to hide all the messages we summarized, now
		debug(settings.hide_scene, memory_history);
		if (settings.hide_scene) {
			for (const mes of memory_history) {
				chat[mes.index].is_system = true;
				// Also toggle "hidden" state for all visible messages
				const mes_elem = $(`.mes[mesid="${mes.index}"]`);
				debug(mes_elem);
				if (mes_elem.length) mes_elem.attr('is_system', 'true');
			}
			getContext().saveChat();
		}
		return result;
	} else {
		oopsToast("No final content - skipping summary.");
		return "";
	}

}

// generates a memory entry for the current message and its immediate context
export async function rememberEvent(message, options={}) {
	commandArgs = options;
	const membooks = await promptInfoBooks();
	if (!membooks.length) {
		oopsToast("No books selected");
		return;
	}
	infoToast('Generating memory....');
	const message_text = await generateMemory(message);
	if (message_text.length <= 0) {
		errorToast("No memory text generated to record.");
		return;
	}
	let keywords;
	if ('keywords' in options) keywords = options.keywords.split(',').map(it=>it.trim());
	else keywords = await generateKeywords(message_text);
	const memory_text = `${settings.memory_prefix}${message_text}${settings.memory_suffix}`;

	for (const book of membooks) {
		await createMemoryEntry(memory_text, book, keywords, options);
	}
	doneToast('Memory entry created');
}

// logs the current message
export async function logMessage(message, options={}) {
	commandArgs = options;
	const membooks = await promptInfoBooks();
	if (!membooks.length) {
		oopsToast("No books selected");
		return;
	}
	const message_text = message.find('.mes_text').text();
	if (message_text.length <= 0) {
		errorToast("No message text found to record.");
		return;
	}
	let keywords;
	if ('keywords' in options) keywords = options.keywords.split(',').map(it=>it.trim());
	else keywords = await generateKeywords(message_text);
	const memory_text = `${settings.memory_prefix}${message_text}${settings.memory_suffix}`;

	for (const book of membooks) {
		await createMemoryEntry(memory_text, book, keywords, options);
	}
	doneToastoast('Memory entry created');
}

// closes off the scene and summarizes it
export async function endScene(message, options={}) {
	commandArgs = options;
	const chat = getContext().chat;
	let mes_id = Number(message.attr('mesid'));
	let mode = settings.scene_end_mode;
	if ('mode' in options) {
		let mode_in = options.mode.toUpperCase();
		if (mode_in in SceneEndMode) mode = SceneEndMode[mode_in];
	}
	if (mode !== SceneEndMode.NONE) {
		let membooks = [];
		if (mode === SceneEndMode.MEMORY) {
			membooks = await promptInfoBooks();
			if (!membooks.length) {
				errorToast("No books selected");
				return;
			}
		}
		const summary = await generateSceneSummary(mes_id);
		if (summary.length === 0) {
			errorToast("Scene summary returned empty!");
			return;
		}
		if (mode === SceneEndMode.MEMORY) {
			let keywords;
			if ('keywords' in options) keywords = options.keywords.split(',').map(it=>it.trim());
			else keywords = await generateKeywords(summary);
			const memory_text = `${settings.memory_prefix}${summary}${settings.memory_suffix}`;
			
			for (const book of membooks) {
				await createMemoryEntry(memory_text, book, keywords, options);
			}
			doneToast('Scene memory entry created');
		}
		else if (mode === SceneEndMode.MESSAGE) {
			mes_id += 1
			await runSlashCommand(`/comment at=${mes_id} ${summary} || /chat-jump ${mes_id}`);
		}
	}
	if (settings.fade_memories) {
		infoToast('Fading all pop-up memories for this chat...');
		fadeMemories();
	}
	chat[mes_id].extra.rmr_scene = true;
	getContext().saveChat();
	toggleSceneHighlight($(`.mes[mesid="${mes_id}"] .rmr-button.fa-circle-stop`), mes_id);
	doneToast(`Scene ending marked at message ${mes_id}.`);
}

// fade all fadeable memories
export async function fadeMemories(name='', quiet=true) {
	const context = getContext();
	let books = getActiveMemoryBooks();
	let count = 0;
	let purged = 0;
	if (name.length) {
		if (Object.keys(books).includes(name)) books = [books[name]];
		else return;
	}	else {
		books = Object.values(books);
	}
	for (const book of books) {
		const book_data = await context.loadWorldInfo(book);
		let modified = false;
		for (const entry of Object.values(book_data.entries)) {
			if (entry.rmr_fade) {
				modified = true;
				let trigger_pct = entry.probability;
				trigger_pct -= settings.fade_pct;
				if (trigger_pct <= 0) {
					// delete the entry entirely
					delete book_data.entries[entry.uid];
					purged++;
				} else {
					entry.probability = trigger_pct;
				}
				count++;
			}
		}
		// save modifications to the book
		if (modified) {
			await context.saveWorldInfo(book, book_data);
			context.reloadWorldInfoEditor(book, false);
		}
	}
	doneToast(`Faded ${count} "pop-up" memories across ${books.length} book(s); ${purged} were removed.`, "ReMemory")
}