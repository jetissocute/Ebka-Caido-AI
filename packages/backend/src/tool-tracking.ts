import type { SDK } from "caido:plugin";

// In-memory storage for tool execution state
const toolExecutionState = new Map<string, {
  isExecuting: boolean;
  toolName: string;
  toolInput: any;
  startTime: number;
}>();

export const startToolExecution = (sessionId: number, toolName: string, toolInput: any) => {
  const key = `session_${sessionId}`;
  const state = {
    isExecuting: true,
    toolName,
    toolInput,
    startTime: Date.now()
  };
  toolExecutionState.set(key, state);
  console.log(`[BACKEND] startToolExecution: Set state for session ${sessionId}:`, state);
};

export const stopToolExecution = (sessionId: number) => {
  const key = `session_${sessionId}`;
  const wasExecuting = toolExecutionState.has(key);
  toolExecutionState.delete(key);
  console.log(`[BACKEND] stopToolExecution: Removed state for session ${sessionId}, was executing: ${wasExecuting}`);
};

export const getToolExecutionState = (sessionId: number) => {
  const key = `session_${sessionId}`;
  const state = toolExecutionState.get(key) || null;
  console.log(`[BACKEND] getToolExecutionState called for session ${sessionId}, state:`, state);
  return state;
};

export const saveToolExecutionState = (sessionId: number, toolName: string, toolInput: any) => {
  const key = `session_${sessionId}`;
  const state = {
    isExecuting: false,
    toolName,
    toolInput,
    startTime: Date.now()
  };
  toolExecutionState.set(key, state);
};

export const isToolExecuting = (sessionId: number) => {
  const key = `session_${sessionId}`;
  const state = toolExecutionState.get(key);
  return state ? state.isExecuting : false;
};
