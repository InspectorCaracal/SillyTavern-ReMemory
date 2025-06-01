import { extension_settings, getContext } from "../../../../extensions.js";
import { commonEnumProviders } from '../../../../slash-commands/SlashCommandCommonEnumsProvider.js';
import { enumTypes, SlashCommandEnumValue } from "../../../../slash-commands/SlashCommandEnumValue.js";
import { getActiveMemoryBooks, endScene, logMessage, rememberEvent, fadeMemories } from "./memories.js";

// debugger;
const log = (...msg)=>console.log('[reMemory]', ...msg);
const debug = (...msg)=>console.debug('[reMemory]', ...msg);
const error = (...msg)=>console.error('[reMemory]', ...msg);

// it's not exported for me to use, rip
const profilesProvider = () => [
	new SlashCommandEnumValue('<None>'),
	...extension_settings.connectionManager.profiles.map(p => new SlashCommandEnumValue(p.name, null, enumTypes.name)),
];

function getMesFromInput(value) {
	if (value.length > 0) {
		const mes_id = Number(value);
		if (isNaN(mes_id)) {
			toastr.error(`Invalid message ID: ${value} is not a number.`);
		}
		return $(`.mes[mesid=${mes_id}]`);
	} else {
		const mes_id = getContext().chat.length-1;
		return $(`.mes[mesid=${mes_id}]`);
	}
}

function profileIdFromName(profile_name) {
	const profile = extension_settings.connectionManager.profiles.find(p => p.name == profile_name);
	if (profile) return profile.id;
	return '';
}


export function loadSlashCommands() {
	const parser = getContext().SlashCommandParser;
	const command = getContext().SlashCommand;
	const commandArg = getContext().SlashCommandArgument;
	const namedArg = getContext().SlashCommandNamedArgument;
	const arg_types = getContext().ARGUMENT_TYPE;

	parser.addCommandObject(command.fromProps({
		name: 'memory-gen',
		callback: (args, value) => {
			const message = getMesFromInput(value);
			if (message.length) {
				if (args.profile !== undefined) {
					args.profile = profileIdFromName(args.profile);
				}
				rememberEvent(message, args);
			}
		},
		unnamedArgumentList: [
			commandArg.fromProps({
				description: 'message index (starts with 0)',
				typeList: [arg_types.NUMBER],
				isRequired: false,
				enumProvider: commonEnumProviders.messages(),
			}),
		],
		namedArgumentList: [
			namedArg.fromProps({
				name: 'title',
				description: 'comment/title for the memory entry',
				typeList: [arg_types.STRING],
				isRequired: false,
			}),
			namedArg.fromProps({
				name: 'popup',
				description: 'override the "popup memory" setting',
				typeList: [arg_types.BOOLEAN],
				isRequired: false,
			}),
			namedArg.fromProps({
				name: 'profile',
				description: 'name of a connection profile to override the current one',
				enumProvider: profilesProvider,
				isRequired: false,
			}),
		],
		helpString: 'Generate a memory for the given message ID. Defaults to the most recent message if no ID is provided.',
	}));

	parser.addCommandObject(command.fromProps({
		name: 'memory-log',
		callback: (args, value) => {
			const message = getMesFromInput(value);
			if (message) {
				logMessage(message, args);
			}
		},
		unnamedArgumentList: [
			commandArg.fromProps({
				description: 'message index (starts with 0)',
				typeList: [arg_types.NUMBER],
				isRequired: false,
				enumProvider: commonEnumProviders.messages(),
			}),
		],
		namedArgumentList: [
			namedArg.fromProps({
				name: 'title',
				description: 'comment/title for the memory entry',
				typeList: [arg_types.STRING],
				isRequired: false,
			}),
			namedArg.fromProps({
				name: 'popup',
				description: 'override the "popup memory" setting',
				typeList: [arg_types.BOOLEAN],
				isRequired: false,
			}),
		],
		helpString: 'Logs the message at the given ID. Defaults to the most recent message if no ID is provided.',
	}));

	parser.addCommandObject(command.fromProps({
		name: 'scene-end',
		callback: (args, value) => {
			const message = getMesFromInput(value);
			if (message) {
				if (args.profile !== undefined) {
					args.profile = profileIdFromName(args.profile);
				}
				endScene(message, args);
			}
		},
		unnamedArgumentList: [
			commandArg.fromProps({
				description: 'message index (starts with 0)',
				typeList: [arg_types.NUMBER],
				isRequired: false,
				enumProvider: commonEnumProviders.messages(),
			}),
		],
		namedArgumentList: [
			namedArg.fromProps({
				name: 'mode',
				description: 'override summarization mode for scene endings',
				typeList: [arg_types.STRING],
				isRequired: false,
				enumList: [
					new SlashCommandEnumValue('none', "don't summarize"),
					new SlashCommandEnumValue('message', 'add summary to chat'),
					new SlashCommandEnumValue('memory', 'create memory entry with summary'),
				],
			}),
			namedArg.fromProps({
				name: 'title',
				description: 'comment/title for the memory entry. only used when scene end mode is `memory`',
				typeList: [arg_types.STRING],
				isRequired: false,
			}),
			namedArg.fromProps({
				name: 'popup',
				description: 'override the "popup memory" setting. only used when scene end mode is `memory`',
				typeList: [arg_types.BOOLEAN],
				isRequired: false,
			}),
			namedArg.fromProps({
				name: 'profile',
				description: 'name of a connection profile to override the current one',
				enumProvider: profilesProvider,
				isRequired: false,
			}),
		],
		helpString: 'Marks the message as a scene endpoint and generates a summary from the previous endpoint. Defaults to the most recent message if no ID is provided.',
	}));

	parser.addCommandObject(command.fromProps({
		name: 'memory-fade',
		callback: (args, value) => {
			if (!value.length) {
				debug('fading all active memory books');
				return fadeMemories();
			}
			const memorable = getActiveMemoryBooks();
			if (Object.keys(memorable).includes(value)) {
				debug('fading memories for',value);
				fadeMemories(value);
			} else {
				toastr.error(`No memory book available for ${value}.`, "ReMemory");
			}
		},
		unnamedArgumentList: [
			commandArg.fromProps({
				description: 'specific target to fade memories for',
				isRequired: false,
				enumProvider: () => Object.keys(getActiveMemoryBooks()).map(charname => new SlashCommandEnumValue(charname)),
			}),
		],
		helpString: "Reduces trigger % on all of the pop-up memories for the current chat/characters. If a specific target name is given, only that target's memories will fade.",
	}));

}