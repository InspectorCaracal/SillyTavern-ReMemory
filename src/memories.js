import { moment } from '../../../../../lib.js';
import { getContext } from "../../../../extensions.js";
import { world_info, createWorldInfoEntry } from "../../../../world-info.js";
import { user_avatar } from "../../../../personas.js";
import { getCharaFilename } from "../../../../utils.js";
import { settings, SceneEndMode } from "./settings.js";
import { toggleSceneHighlight } from "./messages.js";
import { STVersion } from "../index.js";

// debugger;
const log = (...msg)=>console.log('[reMemory]', ...msg);
const debug = (...msg)=>console.debug('[reMemory]', ...msg);
const error = (...msg)=>console.error('[reMemory]', ...msg);

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

async function promptInfoBooks() {
	const context = getContext();
	const powerUserSettings = context.powerUserSettings;

	// TODO: get book options with js instead of stscript
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

	const bookOptions = Object.keys(books);
	if (bookOptions.length === 0) return [];

	let bookchars = await context.executeSlashCommandsWithOptions(`/buttons labels=${JSON.stringify(bookOptions)} multiple=true Which characters do you want to remember this?`);
	let result = [];
	for (const char of JSON.parse(bookchars.pipe)) {
		result.push(books[char]);
	}
	return result;
}

async function createMemoryEntry(content, book, keywords) {
	const context = getContext();
	const book_data = await context.loadWorldInfo(book);

	if (!(book_data && ('entries' in book_data))) {
		toastr.warning('Memory book missing or invalid', 'ReMemory');
		return;
	}
	const timestamp = moment().format('YYYY-MM-DD HH:mm');

	// create regular keyword entry
	const new_entry = createWorldInfoEntry(book, book_data);
	new_entry.content = content;
	new_entry.addMemo = true;
	new_entry.comment = `memory ${timestamp}`;
	new_entry.key = keywords;
	new_entry.position = 4;
	new_entry.depth = settings.memory_depth;
	new_entry.group = 'memory';
	// allows keyword-triggered memories to take precedence to popup memories
	new_entry.useGroupScoring = true;
	new_entry.sticky = settings.memory_life;
	new_entry.probability = settings.trigger_pct;

	// optionally create pop-up constant entry
	if (settings.popup_memories) {
			const new_popup = createWorldInfoEntry(book, book_data);
			new_popup.content = content;
			new_popup.addMemo = true;
			new_popup.comment = `memory ${timestamp} POPUP`;
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
	reloadWorldInfoEditor(book, false);
}

async function genSummaryWithSlash(history, id=0) {
	let this_delay = delay_ms() - (Date.now() - last_gen_timestamp);
	debug('delaying', this_delay, "out of", delay_ms());
	if (this_delay > 0) {
		await new Promise(resolve => setTimeout(resolve, this_delay));
	}
	last_gen_timestamp = Date.now();

	if (id > 0) {
		toastr.info("Generating summary #"+id+"....", 'ReMemory');
	}
	const gen = `/genraw stop=[] lock=on instruct=on Consider the following history:

	${history}
	
	${settings.memory_prompt}`
	let result = await getContext().executeSlashCommandsWithOptions(gen);
	return result.pipe;
}

async function generateMemory(message) {
	const mes_id = Number(message.attr('mesid'));

	// slice to just the history from this message
	let memory_history = getContext().chat.slice(0, mes_id+1);
	// filter out hidden messages
	memory_history = memory_history.filter((it) => {return !it.is_system});
	if (memory_history.length > settings.memory_span) {
		// slice it again
		memory_history = memory_history.slice(-1*settings.memory_span);
	}
	
	const memory_context = memory_history.map((it) => `${it.name}: ${it.mes}`).join("\n\n");
	return await genSummaryWithSlash(memory_context);
}

async function generateKeywords(content) {
	let this_delay = delay_ms() - (Date.now() - last_gen_timestamp);
	if (this_delay > 0) {
		await new Promise(resolve => setTimeout(resolve, this_delay));
	}
	last_gen_timestamp = Date.now();

	toastr.info("Generating keywords....", 'ReMemory');
	const gen = `/genraw stop=["\n"] Consider the following quote:
	
	"${content}"
	
	${settings.keywords_prompt}`;
	let result = await getContext().executeSlashCommandsWithOptions(gen);
	debug(result.pipe);
	// TODO: strip out character names
	return result.pipe.split(',').slice(0,5).map((it) => it.trim());
}

async function generateSceneSummary(mes_id) {
	// slice to just the history from this message
	const chat = getContext().chat;
	let memory_history = chat.slice(0, mes_id+1);
	// slice to messages since the last scene end, if there was one
	const last_end = memory_history.findLastIndex((it) => it.extra.rmr_scene);
	if (last_end >= 0) {
		// slice for just this scene
		memory_history = memory_history.slice(last_end+1)
	}
	// filter out hidden messages
	memory_history = memory_history.filter((it) => !it.is_system);

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
		toastr.info(`Generating summaries for ${chunks.length} chunks....`, 'ReMemory');
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
			await getContext().executeSlashCommandsWithOptions(`/comment at=${mes_id+1} <details class="rmr-summary-chunks"><summary>Chunk Summaries</summary>${final_context}</details>`)
		}
	}
	else {
		toastr.warning("No visible scene content! Skipping summary.", 'ReMemory');
		return "";
	}
	if (final_context.length > 0) {
		toastr.info("Generating scene summary....", 'ReMemory');
		const result = await genSummaryWithSlash(final_context);
		// at this point we have a history that we've successfully summarized
		// if scene hiding is on, we want to hide all the messages we summarized, now
		if (settings.hide_scene) {
			for (const mes of memory_history) {
				mes.is_system = true;
				// Also toggle "hidden" state for all visible messages
				const mes_elem = $(`.mes[mesid="${mes.id}"]`);
				if (mes_elem.length) mes_elem.attr('is_system', 'true');
			}
			getContext().saveChat();
		}
		return result;
	} else {
		toastr.warning("No final content - skipping summary.", 'ReMemory');
		return "";
	}

}

// generates a memory entry for the current message and its immediate context
export async function rememberEvent(message) {
	const membooks = await promptInfoBooks();
	if (!membooks.length) {
		toastr.warning("No books selected", "ReMemory");
		return;
	}
	toastr.info('Generating memory....', 'ReMemory');
	const message_text = await generateMemory(message);
	if (message_text.length <= 0) {
		toastr.error("No memory text generated to record.", "ReMemory");
		return;
	}
	const keywords = await generateKeywords(message_text);
	const memory_text = `${settings.memory_prefix}${message_text}${settings.memory_suffix}`;

	for (const book of membooks) {
		await createMemoryEntry(memory_text, book, keywords);
	}
	toastr.success('Memory entry created', 'ReMemory');
}

// logs the current message
export async function logMessage(message) {
	const membooks = await promptInfoBooks();
	if (!membooks.length) {
		toastr.warning("No books selected", "ReMemory");
		return;
	}
	const message_text = message.find('.mes_text').text();
	if (message_text.length <= 0) {
		toastr.error("No message text found to record.", "ReMemory");
		return;
	}
	const keywords = await generateKeywords(message_text);
	const memory_text = `${settings.memory_prefix}${message_text}${settings.memory_suffix}`;

	for (const book of membooks) {
		await createMemoryEntry(memory_text, book, keywords);
	}
	toastr.success('Memory entry created', 'ReMemory');
}

// closes off the scene and summarizes it
export async function endScene(message) {
	const chat = getContext().chat;
	let mes_id = Number(message.attr('mesid'));
	if (settings.scene_end_mode !== SceneEndMode.NONE) {
		let membooks = [];
		if (settings.scene_end_mode === SceneEndMode.MEMORY) {
			membooks = await promptInfoBooks();
			if (!membooks.length) {
				toastr.error("No books selected", "ReMemory");
				return;
			}
		}
		const summary = await generateSceneSummary(mes_id);
		if (summary.length === 0) {
			toastr.error("Scene summary returned empty!", "ReMemory");
			return;
		}
		if (settings.scene_end_mode === SceneEndMode.MEMORY) {
			const keywords = await generateKeywords(summary);
			const memory_text = `${settings.memory_prefix}${summary}${settings.memory_suffix}`;
			
			for (const book of membooks) {
				await createMemoryEntry(memory_text, book, keywords);
			}
			toastr.success('Scene memory entry created', 'ReMemory');
		}
		else if (settings.scene_end_mode === SceneEndMode.MESSAGE) {
			mes_id += 1
			await getContext().executeSlashCommandsWithOptions(`/comment at=${mes_id} ${summary}`);
			// compat shenanigans
			let ver = STVersion.pkgVersion.split(',').map(x=>Number(x));
			let chatJump = true;
			if (ver[1] < 12 || (ver[2] < 14 && STVersion.gitBranch =='staging') ||  (ver[2] < 15)) {
				chatJump = false;
			}
			if (chatJump)	await getContext().executeSlashCommandsWithOptions(`/chat-jump ${mes_id}`);
		}
	}
	chat[mes_id].extra.rmr_scene = true;
	getContext().saveChat();
	toggleSceneHighlight($(`.mes[mesid="${mes_id}"] .rmr-button.fa-circle-stop`), mes_id);
	toastr.success(`Scene ending marked at message ${mes_id}.`, 'ReMemory');
}