# Trillet AI Web Calls SDK

The Trillet AI Web Calls SDK enables seamless integration of AI-powered voice and text interactions into web applications. This SDK provides a simple interface to connect with Trillet AI agents for real-time communication.

## Features

- 🎙️ Real-time voice interactions with AI agents
- 💬 Text-based conversations
- 🔒 Secure authentication options
- 📊 Audio visualization capabilities
- 🎯 Event-driven architecture
- 🔄 Real-time transcription
- 🌐 Browser compatibility checks

## Installation

```bash
npm install @trillet/webcalls-sdk
# or
yarn add @trillet/webcalls-sdk
```

## Quick Start

```typescript
import { TrilletAgent } from '@trillet/webcalls-sdk';

// Initialize the agent with API Key (Standard Method)
const agent = new TrilletAgent({
  apiKey: 'your-api-key',
  workspaceId: 'your-workspace-id',
  agentId: 'your-agent-id',

  // Optional parameters
  variables: {
    customVar1: 'value1',
    customVar2: 'value2'
  },
  callbackUrl: 'https://your-callback-url.com'
});

// Start a regular call
await agent.startCall();

// Or start a public call
await agent.startPublicCall();

// Listen for events
agent.on('connected', (details) => {
  console.log('Connected to call:', details);
});

agent.on('transcriptionReceived', (transcript) => {
  console.log('New transcript:', transcript);
});

// Control the call
agent.toggleMicrophone(true); // Enable/disable microphone
agent.endCall(); // End the call
```

## Authentication

The SDK supports two authentication methods:

1. **API Key Authentication (Standard Method)**
   ```typescript
   const agent = new TrilletAgent({
     apiKey: 'your-api-key',
     workspaceId: 'your-workspace-id',
     agentId: 'your-agent-id'
   });
   ```

2. **Public Access**
   - For public-facing applications
   - Uses `startPublicCall()` method
   ```typescript
   const agent = new TrilletAgent({
     workspaceId: 'your-workspace-id',
     agentId: 'your-agent-id'
   });
   await agent.startPublicCall();
   ```

## Call Types

The SDK supports two types of calls:

1. **Regular Call** - Using `startCall()`
   - Requires full authentication with API Key
   - Suitable for authenticated users

2. **Public Call** - Using `startPublicCall()`
   - Requires workspace ID and agent ID
   - Suitable for public-facing applications
   - No API key needed in client-side code
   - Example:
     ```typescript
     const agent = new TrilletAgent({
       workspaceId: 'your-workspace-id',
       agentId: 'your-agent-id'  // Required for both public and regular calls
     });
     await agent.startPublicCall();
     ```

## Events

The SDK emits various events that you can listen to:

```typescript
agent.on('connected', (details) => {
  // Called when successfully connected to a call
});

agent.on('disconnected', () => {
  // Called when the call ends
});

agent.on('error', (error) => {
  // Called when an error occurs
});

agent.on('transcriptionReceived', (segments, participant) => {
  // Called when new transcription is available
});

agent.on('assistantStartedSpeaking', () => {
  // Called when the AI agent starts speaking
});

agent.on('assistantStoppedSpeaking', () => {
  // Called when the AI agent stops speaking
});

agent.on('audioData', (data) => {
  // Raw audio data for visualization
});
```

## Voice Mode Features

When using voice mode, the SDK provides additional audio-related features:

```typescript
// Check if the assistant is currently speaking
const isSpeaking = agent.isAssistantSpeaking;

// Access transcripts
const allTranscripts = agent.getTranscripts();
const currentTranscript = agent.getCurrentTranscript();
```

## Requirements

- Modern web browser with secure context (HTTPS or localhost)
- WebRTC support
- Microphone access (for voice mode)

## Browser Support

The SDK is compatible with modern browsers that support WebRTC:
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Error Handling

The SDK includes comprehensive error handling:

```typescript
agent.on('error', (error) => {
  console.error('Trillet SDK Error:', error);
});
```

## License

[License details here]

## Support

For support, please contact [support contact information].
