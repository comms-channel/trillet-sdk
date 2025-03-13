import { EventEmitter } from "eventemitter3";
import { RemoteAudioTrack, Room, RoomEvent, Track, createAudioAnalyser, } from "livekit-client";
const TRILLET_API_URL = {
    CONNECT: "https://api.trillet.ai/v1/api/web-call",
    PUBLIC_CONNECT: "https://api.trillet.ai/v1/api/web-call/public",
};
const decoder = new TextDecoder();
// Browser compatibility check
const isBrowser = typeof window !== "undefined";
const isSecureContext = isBrowser && window.isSecureContext;
export class TrilletAgent extends EventEmitter {
    constructor(config) {
        super();
        this.sdkToken = null;
        this.transcripts = [];
        this.currentTranscript = {};
        // Validate environment
        if (!isBrowser) {
            throw new Error("Trillet SDK must be used in a browser environment");
        }
        if (!isSecureContext) {
            throw new Error("Trillet SDK requires a secure context (HTTPS or localhost)");
        }
        if (!config.agentId) {
            throw new Error("agentId is required");
        }
        this.config = {
            ...config,
            mode: config.mode || "voice", // Default to voice mode
        };
        this.sdk = new TrilletWebSDK();
        this.setupEventForwarding();
    }
    setupEventForwarding() {
        var _a;
        // Forward all SDK events to agent listeners
        this.sdk.on("connected", () => this.emit("connected"));
        this.sdk.on("disconnected", () => this.emit("disconnected"));
        this.sdk.on("error", (error) => this.emit("error", error));
        this.sdk.on("status", (status) => this.emit("status", status));
        this.sdk.on("metadata", (metadata) => this.emit("metadata", metadata));
        this.sdk.on("assistantStartedSpeaking", () => this.emit("assistantStartedSpeaking"));
        this.sdk.on("assistantStoppedSpeaking", () => this.emit("assistantStoppedSpeaking"));
        this.sdk.on("audioData", (data) => this.emit("audioData", data));
        // Forward Room events to agent listeners
        (_a = this.sdk
            .getRoom()) === null || _a === void 0 ? void 0 : _a.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
            const room = this.sdk.getRoom();
            if (!room)
                return;
            const participantId = (participant === null || participant === void 0 ? void 0 : participant.identity) || room.localParticipant.identity;
            const isAgent = participantId.startsWith("agent-") ||
                participantId.startsWith("web-agent");
            segments.forEach((segment) => {
                var _a;
                if (segment.final) {
                    delete this.currentTranscript[participantId];
                    const text = segment.text.trim();
                    // Check for duplicates
                    const lastMessage = this.transcripts[this.transcripts.length - 1];
                    if (lastMessage &&
                        lastMessage.text === text &&
                        lastMessage.participantId === participantId &&
                        Date.now() - lastMessage.timestamp.getTime() < 1000) {
                        return;
                    }
                    this.transcripts.push({
                        role: isAgent ? "assistant" : "user",
                        text,
                        isFinal: true,
                        timestamp: new Date(),
                        participantId,
                        toolUsed: text.includes("Using tool:")
                            ? {
                                name: text.split("Using tool:")[1].split(" ")[1],
                                args: (_a = text.split("Arguments:")[1]) === null || _a === void 0 ? void 0 : _a.trim(),
                                status: "pending",
                            }
                            : undefined,
                    });
                }
                else {
                    this.currentTranscript[participantId] = segment.text;
                }
            });
            this.emit(RoomEvent.TranscriptionReceived, segments, participant);
        });
    }
    async startCall() {
        try {
            // 2. Initialize call with API KEY
            const response = await fetch(TRILLET_API_URL.CONNECT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-API_KEY": this.config.apiKey,
                },
                body: JSON.stringify({
                    agentId: this.config.agentId,
                    mode: this.config.mode,
                    dynamic_variables: this.config.variables || {},
                    callback_url: this.config.callbackUrl,
                }),
            });
            if (!response.ok) {
                let errorMessage;
                try {
                    const errorData = await response.json();
                    errorMessage =
                        errorData.message || errorData.error || "Unknown error";
                }
                catch (_a) {
                    errorMessage = await response.text();
                }
                throw new Error(`API Error: ${errorMessage}`);
            }
            const data = await response.json();
            if (!data.token || !data.roomName) {
                throw new Error("Invalid response from server: missing token or room name");
            }
            // Initialize call with LiveKit token
            await this.sdk.initializeCall({
                token: data.token,
                wsUrl: "wss://trillet-ai-xdx0dw5r.livekit.cloud",
                audioSettings: {
                    sampleRate: 48000,
                },
                features: {
                    enableRawAudio: this.config.mode === "voice",
                },
            });
            // Enable audio playback for voice mode
            if (this.config.mode === "voice") {
                await this.sdk.enableAudioPlayback();
            }
            // Emit additional connection details
            this.emit("connected", {
                callId: data.callId,
                roomName: data.roomName,
                agent: data.agent,
            });
        }
        catch (error) {
            console.error("Trillet SDK Error:", error);
            this.emit("error", error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async startPublicCall() {
        // 2. Initialize public call
        const response = await fetch(TRILLET_API_URL.PUBLIC_CONNECT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                'x-workspace-id': this.config.workspaceId
            },
            body: JSON.stringify({
                call_agent_id: this.config.agentId,
                mode: this.config.mode,
                dynamic_variables: this.config.variables || {},
                callback_url: this.config.callbackUrl,
            }),
        });
        if (!response.ok) {
            let errorMessage;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || "Unknown error";
            }
            catch (_a) {
                errorMessage = await response.text();
            }
            throw new Error(`API Error: ${errorMessage}`);
        }
        const data = await response.json();
        if (!data.token || !data.roomName) {
            throw new Error("Invalid response from server: missing token or room name");
        }
        // Initialize call with LiveKit token
        await this.sdk.initializeCall({
            token: data.token,
            wsUrl: "wss://trillet-ai-xdx0dw5r.livekit.cloud",
            audioSettings: {
                sampleRate: 48000,
            },
            features: {
                enableRawAudio: this.config.mode === "voice",
            },
        });
        // Enable audio playback for voice mode
        if (this.config.mode === "voice") {
            await this.sdk.enableAudioPlayback();
        }
        // Emit additional connection details
        this.emit("connected", {
            callId: data.callId,
            roomName: data.roomName,
            agent: data.agent,
        });
    }
    endCall() {
        this.sdk.endCall();
    }
    toggleMicrophone(enabled) {
        this.sdk.toggleMicrophone(enabled);
    }
    get isAssistantSpeaking() {
        return this.sdk.isAssistantSpeaking;
    }
    getTranscripts() {
        return this.transcripts;
    }
    getCurrentTranscript() {
        return this.currentTranscript;
    }
}
// Internal SDK class
class TrilletWebSDK extends EventEmitter {
    constructor() {
        super();
        this.isConnected = false;
        // Audio state tracking
        this.isAssistantSpeaking = false;
    }
    async initializeCall(config) {
        var _a, _b, _c;
        try {
            this.room = new Room({
                audioCaptureDefaults: {
                    autoGainControl: true,
                    echoCancellation: true,
                    noiseSuppression: true,
                    channelCount: 1,
                    deviceId: (_a = config.audioSettings) === null || _a === void 0 ? void 0 : _a.inputDeviceId,
                    sampleRate: (_b = config.audioSettings) === null || _b === void 0 ? void 0 : _b.sampleRate,
                },
                audioOutput: {
                    deviceId: (_c = config.audioSettings) === null || _c === void 0 ? void 0 : _c.outputDeviceId,
                },
            });
            this.setupEventHandlers(config);
            await this.room.connect(config.wsUrl, config.token);
            console.log("Connected to Trillet room:", this.room.name);
            this.room.localParticipant.setMicrophoneEnabled(true);
            this.isConnected = true;
            this.emit("connected");
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to initialize call";
            this.emit("error", errorMessage);
            console.error("Call initialization failed:", error);
            this.endCall();
            throw error; // Re-throw to let TrilletAgent handle it
        }
    }
    async enableAudioPlayback() {
        var _a;
        await ((_a = this.room) === null || _a === void 0 ? void 0 : _a.startAudio());
    }
    endCall() {
        var _a;
        if (!this.isConnected)
            return;
        this.isConnected = false;
        this.emit("disconnected");
        (_a = this.room) === null || _a === void 0 ? void 0 : _a.disconnect();
        this.isAssistantSpeaking = false;
        if (this.audioAnalyzer) {
            this.audioAnalyzer.cleanup();
            this.audioAnalyzer = undefined;
        }
        if (this.audioFrameCapture) {
            cancelAnimationFrame(this.audioFrameCapture);
            this.audioFrameCapture = undefined;
        }
        this.room = undefined;
    }
    toggleMicrophone(enabled) {
        if (this.isConnected && this.room) {
            this.room.localParticipant.setMicrophoneEnabled(enabled);
        }
    }
    captureAudio() {
        if (!this.isConnected || !this.audioAnalyzer)
            return;
        const bufferSize = this.audioAnalyzer.analyser.fftSize;
        const audioData = new Float32Array(bufferSize);
        this.audioAnalyzer.analyser.getFloatTimeDomainData(audioData);
        this.emit("audioData", audioData);
        this.audioFrameCapture = requestAnimationFrame(() => this.captureAudio());
    }
    setupEventHandlers(config) {
        if (!this.room)
            return;
        // Room events
        this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
            if ((participant === null || participant === void 0 ? void 0 : participant.identity) === "assistant") {
                this.endCall();
            }
        });
        this.room.on(RoomEvent.Disconnected, () => {
            if (this.isConnected)
                this.endCall();
        });
        // Audio events
        this.room.on(RoomEvent.TrackSubscribed, (track, publication) => {
            var _a;
            if (track.kind === Track.Kind.Audio) {
                if (publication.trackName === "assistant_audio" &&
                    track instanceof RemoteAudioTrack &&
                    ((_a = config.features) === null || _a === void 0 ? void 0 : _a.enableRawAudio)) {
                    const analyzer = createAudioAnalyser(track);
                    this.audioAnalyzer = {
                        calculateVolume: analyzer.calculateVolume,
                        analyser: analyzer.analyser,
                        cleanup: analyzer.cleanup,
                    };
                    this.audioFrameCapture = requestAnimationFrame(() => this.captureAudio());
                }
                track.attach();
            }
        });
        // Data events
        this.room.on(RoomEvent.DataReceived, (payload, participant) => {
            if ((participant === null || participant === void 0 ? void 0 : participant.identity) !== "assistant")
                return;
            try {
                const data = JSON.parse(decoder.decode(payload));
                this.handleDataEvent(data);
            }
            catch (error) {
                console.error("Failed to process received data:", error);
            }
        });
    }
    handleDataEvent(event) {
        switch (event.type) {
            case "status":
                this.emit("status", event);
                break;
            case "metadata":
                this.emit("metadata", event);
                break;
            case "assistant_speaking_started":
                this.isAssistantSpeaking = true;
                this.emit("assistantStartedSpeaking");
                break;
            case "assistant_speaking_ended":
                this.isAssistantSpeaking = false;
                this.emit("assistantStoppedSpeaking");
                break;
        }
    }
    getRoom() {
        return this.room;
    }
}
