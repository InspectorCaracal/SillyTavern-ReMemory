# ReMemory
*A Memory Management Extension*

### This document is still WIP!

**Currently Beta**

Sometimes you want just a bit more control over what events are important for your characters to remember, but manually writing up world info entries every time is too much trouble....

### Convenience, Not Automation

While most memory tools focus on automating away the process, ReMemory leaves the decision of what's important to remember in your hands - while handling all the tedious parts of actually creating such records for you.

And by using world info books as the memory, it leaves the resulting memories available for you to edit individually as needed, without any custom coding required.

### High Compatability

Since ReMemory uses SillyTavern's robust core feature of *world info*, it avoids virtually all cross-extension compatability issues. In addition, you can use any and all existing world info features and extensions to further manage your memory books!

### Lightweight Recall Simulation

The memory entry creation is designed to roughly simulate the experience of human recall. The basic keyword-based memories are by default set to activate only 50% of the time the keywords are present (this is configurable), to mimic how you wouldn't *always* be reminded of relevant experiences.

Additionally, it can create what I call "pop-up" memories - these are memories that just "pop into your head" with no apparent connection to events. These are secondary copies that are constant, not keyword, and have a much lower trigger chance - 10% by default.

*TBA: Pop-up memories will be able to fade over time, becoming less likely to trigger until they're deleted.*

## Features

### Log Message
[add image]

**Copy a message directly to a memory book entry.**

The **Log Message** button creates a new memory directly from the message, only generating keywords - no summary. The memory prefix/suffix in your settings are still applied.

### Generate Memory
[add image]

**Generate a summarized memory of a specific event.**

The **Generate Memory** button will generate a new memory and keywords from the message you click, using the prior few messages as context. How many previous messages are included is defined by your `Memory Span` setting.

### End Scene
[add image]

**Summarize a scene and mark its end point.**

The **End Scene** button does two things: it generates a summary of all that happened since the last scene (or beginning of chat), and it marks a message as the end of a scene. Scene end-point messages can also be unset through the same button.

*Summarizing can be turned off in the settings, if you just want the scene markers.*

## Configuration

*All text- and number-entry fields can be reset to defaults by deleting the contents of the field.*

### Message Actions
[add image]

Configure which buttons you want visible on your messages.

### Memory Entry settings
[add image]

#### Memory Depth

#### Memory Span

#### Stickiness

#### Trigger %

### Generation settings
[add image]

#### Keywords prompt

#### Summary prompt

### "Pop-up" settings
[add image]

#### popup

#### fading

### Scene Ending
[add image]

#### Hide summarized messages

#### Add chunk summaries

#### Scene summary behavior


## To-Do

- Add the memory-fade mechanism
- Add an additional selector in the character book panel to choose which auxiliary book is the memory.
- Add a couple slash commands
- Connection profiles...?

## Support

Feel free to open issues or PRs directly here, although no promises on timely resolution.

There is also a thread in the official SillyTavern Discord you're welcome to comment in!