# ReMemory
*A Memory Management Extension*

**Currently Beta**

### Convenience, Not Automation

While most memory tools focus on automating away the process, ReMemory leaves the decision of what's important to remember in your hands - while handling all the tedious parts of actually creating such records for you.

And by using world info books as the memory, it leaves the resulting memories available for you to edit individually as needed, without any custom coding required.

### High Compatibility

Since ReMemory uses SillyTavern's robust core feature of *world info*, it avoids virtually all cross-extension compatibility issues. In addition, you can use any and all existing world info features and extensions to further manage your memory books!

### Lightweight Recall Simulation

The memory entry creation is designed to roughly simulate the experience of human recall. The basic keyword-based memories are by default set to activate only 50% of the time the keywords are present (this is configurable), to mimic how you wouldn't *always* be reminded of relevant experiences.

Additionally, it can create what I call "pop-up" memories - these are memories that just "pop into your head" with no apparent connection to events. These are secondary copies that are constant, not keyword, and have a much lower trigger chance - 10% by default.

*TBA: Pop-up memories will be able to fade over time, becoming less likely to trigger until they're deleted.*

## Installation

Install like any other SillyTavern extension, with the Github link: `https://github.com/InspectorCaracal/SillyTavern-ReMemory`

## Features

### Log Message
![image](https://github.com/user-attachments/assets/11300e4a-77bd-48a7-9a82-7c2d28f8042c)

**Copy a message directly to a memory book entry.**

The **Log Message** button creates a new memory directly from the message, only generating keywords - no summary. The memory prefix/suffix in your settings are still applied.

### Generate Memory
![image](https://github.com/user-attachments/assets/7a384771-7396-4386-b1d8-a8b8e74e438a)

**Generate a summarized memory of a specific event.**

The **Generate Memory** button will generate a new memory and keywords from the message you click, using the prior few messages as context. How many previous messages are included is defined by your `Memory Span` setting.

### End Scene
![image](https://github.com/user-attachments/assets/03eee155-95d5-481c-902b-a2edad1c6c45)

**Summarize a scene and mark its end point.**

The **End Scene** button does two things: it generates a summary of all that happened since the last scene (or beginning of chat), and it marks a message as the end of a scene. Scene end-point messages can also be unset through the same button.

*Summarizing can be turned off in the settings, if you just want the scene markers.*

## Configuration

*All text- and number-entry fields can be reset to defaults by deleting the contents of the field.*

### Memory Book
*image TBA*

From the character's card, click the Brain icon to choose an auxiliary world book that will act as the character's memory. Choosing the character in the pop-up for future memories will add entries to the book you define here.

*NOTE: Auxiliary world books can be added from the globe icon in SillyTavern's normal character settings. Shift+click the globe to open the configuration panel.*

### General
*image TBA*

Configure a maximum number of requests the extension can make **per minute**, to avoid API throttling. Requests are evenly spaced based on this value.

Set to 0 (default) for no rate limiting.

### Message Buttons
![image](https://github.com/user-attachments/assets/83d77ff1-24de-4704-bfdb-6c3b2aa75045)

Configure which buttons you want visible on your messages.

### Memory Entry settings
![image](https://github.com/user-attachments/assets/61114cc1-218d-4f03-b77f-779f09f47743)

- **Memory Span** - How many messages back are included when generating a memory. The default of 3 means that the message and the 3 previous messages right before it are used to generate the memory.
- **Memory Depth** - What chat depth recalled memories are inserted at. Lower depth means closer to the end, which means higher priority. I recommend a value between 1 and 6, but follow your dreams.
- **Stickiness** - How long a memory will stay "on your mind", so to speak, in terms of messages sent since activation. 
- **Trigger %** - Defines how likely a given memory is to trigger when one of its keywords is used. This is set to 50% by default so that memories aren't necessarily recalled every time something related happens.
- **Memory Prefix & Suffix** - These strings will be added to the beginning and to the end of the memory entry.

### Generation settings
![image](https://github.com/user-attachments/assets/94fd9257-77c6-436d-bb05-0588b10ec8e6)

- **Summary prompt** - The summary prompt is appended to the end of a chunk of messages or summaries when creating a summary. It's used by Generate Memory and by both stages of scene summaries.
- **Keyword prompt** - The keyword prompt is used when generating a list of comma-separated keywords to trigger the memory entry. The generation is given an additional stop string of a newline to ensure that the content is only one line.

### "Pop-up" settings
![image](https://github.com/user-attachments/assets/9cc01910-630a-4df6-9666-fce5204fe42f)

- **"Pop-Up" Memories** - Enables the constant-activation type copies of memories that can "pop up" at any time. You can modify the trigger percent for them separately, but it's best to keep it low.
- **Memory fading** - *Not Yet Implemented*

### Scene Ending
![image](https://github.com/user-attachments/assets/4820cff9-4750-4405-80b3-1e85fdd73df7)

- **Hide summarized messages** - Whether or not messages should be hidden from context after being summarized for an ended scene. This is normal hiding, so you can always click the eye icon or `/unhide` again later.
- **Add chunk summaries** - The individual summaries for each chunk of history can optionally be added to the chat as comments.
- **Scene summary behavior** - When ending a scene, you can choose to add a summary to the chat, add a summary as a memory, or skip summarizing.

*NOTE: Choosing "Don't summarize" will cause no messages to be hidden after ending a scene, even if "Hide summarized messages" is enabled, as no messages will have been summarized.*

## To-Do

- Add the memory-fade mechanism
- Add a couple slash commands
- Connection profiles...?

## Support

Feel free to open issues or PRs directly here, although no promises on timely resolution.

There is also a thread in the official SillyTavern Discord you're welcome to comment in!
