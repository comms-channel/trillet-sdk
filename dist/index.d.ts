import { EventEmitter } from "eventemitter3";
export interface TrilletAgentConfig {
    apiKey?: string;
    workspaceId?: string;
    agentId: string;
    variables?: Record<string, any>;
    callbackUrl?: string;
    mode?: "voice" | "text";
}
export interface TrilletCallConfig {
    token: string;
    wsUrl: string;
    audioSettings?: {
        sampleRate?: number;
        inputDeviceId?: string;
        outputDeviceId?: string;
    };
    features?: {
        enableRawAudio?: boolean;
    };
}
interface ToolUsed {
    name: string;
    args?: any;
    status?: "pending" | "success" | "error";
}
interface Transcript {
    role: "user" | "assistant";
    text: string;
    isFinal: boolean;
    timestamp: Date;
    participantId?: string;
    toolUsed?: ToolUsed;
}
export declare class TrilletAgent extends EventEmitter {
    private sdk;
    private config;
    private sdkToken;
    private transcripts;
    private currentTranscript;
    constructor(config: TrilletAgentConfig);
    private setupEventForwarding;
    startCall(): Promise<void>;
    startPublicCall(): Promise<void>;
    endCall(): void;
    toggleMicrophone(enabled: boolean): void;
    get isAssistantSpeaking(): boolean;
    getTranscripts(): Transcript[];
    getCurrentTranscript(): {
        [key: string]: string;
    };
}
export {};
