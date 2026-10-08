## Openclaw Architecture Fundamentals

### (1) User sends a message
The user will type in the whats app channel saying something like "2 bedroom apartment in Irvine under 1.5 M". What's "moving" here is a plain string text and the identity of the user (phone number/account), which the system will use as a userId so it knows whose conversation this is.

### (2) Whats up channel recieves it
A channel is like the pipeline from the app to OpenClaw. Because I linked my WhatsAPP as a linked device in week 0, openclaw can see incoming messages and replies. The channels job is to take the app message and hand the runtime a clean message.

### (3) Openclaw runtime picks it up and loads the session
The runtime is the core engine that coordinates everything. The first thing it does is to look up the session for that user. A session is that person's conversation state, like what cities they looked for houses in or like the total cost of the condo. For a brand new user it creates an empty one.

### (4) Skill selector chooses a skill
Skills are modular capabilities. For example, it could be time, property search, market stats, etc. The selector looks at my message and decides which one should handle it. The handbook's example is to see if the message contains the word time, and if it does it will use the time skill.

### (5) Tool execution
A skill doesn't do the work by itself, it calls tools that do the work. A tool is an async function that does one specific thing and returns structured data. An example is getCurrentTime(). The main idea is that text goes in, structured data comes out.

### (6) Database layer
Tools that need data talk to SQL. Queries go out and rows of data come back.

### (7) Memory update
After the work is done, the system saves what would be useful for future conversations. Short term memory is session state: such as the city, number of bedrooms, etc. Long term memory is vector storage.

### (8) Response goes out
The raw result is formatted into something readable, and goes back through the same WhatsApp channel to the user. 