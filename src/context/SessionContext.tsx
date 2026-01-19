"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import type {
  Session,
  EntryMode,
  Message,
  CodeReference,
  AnalysisResult,
  ReferenceResult,
  CritiqueArtifact,
  ConversationPhase,
  SessionSettings,
  CodeVersion,
  CreateLanguage,
  ExperienceLevel,
  LineAnnotation,
} from "@/types";
import { generateId, getCurrentTimestamp } from "@/lib/utils";

// Action types
type SessionAction =
  | { type: "INIT_SESSION"; payload: { mode: EntryMode; experienceLevel?: ExperienceLevel } }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "ADD_CODE"; payload: CodeReference }
  | { type: "REMOVE_CODE"; payload: string }
  | { type: "ADD_ANALYSIS"; payload: AnalysisResult }
  | { type: "ADD_REFERENCES"; payload: ReferenceResult[] }
  | { type: "CLEAR_REFERENCES" }
  | { type: "ADD_ARTIFACT"; payload: CritiqueArtifact }
  | { type: "SET_PHASE"; payload: ConversationPhase }
  | { type: "ESCALATE_FEEDBACK" }
  | { type: "UPDATE_SETTINGS"; payload: Partial<SessionSettings> }
  | { type: "IMPORT_SESSION"; payload: Session }
  | { type: "RESET_SESSION" }
  // Create mode actions
  | { type: "INIT_CREATE_STATE"; payload: { projectName: string; inspiration?: string; inspirationUrl?: string } }
  | { type: "ADD_CODE_VERSION"; payload: Omit<CodeVersion, "id" | "createdAt" | "version"> }
  | { type: "SET_CURRENT_VERSION"; payload: string }
  | { type: "SET_CREATE_LANGUAGE"; payload: CreateLanguage }
  | { type: "TRANSFER_TO_CRITIQUE"; payload: string } // version id to transfer
  // Line annotation actions
  | { type: "ADD_LINE_ANNOTATION"; payload: LineAnnotation }
  | { type: "UPDATE_LINE_ANNOTATION"; payload: { id: string; content: string } }
  | { type: "REMOVE_LINE_ANNOTATION"; payload: string }
  | { type: "CLEAR_LINE_ANNOTATIONS"; payload?: string }; // optional codeFileId to clear only that file's annotations

// Initial state
const createInitialSession = (): Session => ({
  id: generateId(),
  mode: "critique",
  messages: [],
  codeFiles: [],
  lineAnnotations: [],
  analysisResults: [],
  references: [],
  critiqueArtifacts: [],
  settings: {
    beDirectMode: false,
    teachMeMode: false,
  },
  currentPhase: "opening",
  feedbackEscalation: 0,
  createdAt: getCurrentTimestamp(),
  lastModified: getCurrentTimestamp(),
});

// Reducer
function sessionReducer(state: Session, action: SessionAction): Session {
  const now = getCurrentTimestamp();

  switch (action.type) {
    case "INIT_SESSION":
      return {
        ...createInitialSession(),
        mode: action.payload.mode,
        experienceLevel: action.payload.experienceLevel,
      };

    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.payload],
        lastModified: now,
      };

    case "ADD_CODE":
      return {
        ...state,
        codeFiles: [...state.codeFiles, action.payload],
        lastModified: now,
      };

    case "REMOVE_CODE":
      return {
        ...state,
        codeFiles: state.codeFiles.filter((f) => f.id !== action.payload),
        lastModified: now,
      };

    case "ADD_ANALYSIS":
      return {
        ...state,
        analysisResults: [...state.analysisResults, action.payload],
        lastModified: now,
      };

    case "ADD_REFERENCES":
      return {
        ...state,
        references: [...state.references, ...action.payload],
        lastModified: now,
      };

    case "CLEAR_REFERENCES":
      return {
        ...state,
        references: [],
        lastModified: now,
      };

    case "ADD_ARTIFACT":
      return {
        ...state,
        critiqueArtifacts: [...state.critiqueArtifacts, action.payload],
        lastModified: now,
      };

    case "SET_PHASE":
      return {
        ...state,
        currentPhase: action.payload,
        lastModified: now,
      };

    case "ESCALATE_FEEDBACK":
      return {
        ...state,
        feedbackEscalation: Math.min(state.feedbackEscalation + 1, 3),
        lastModified: now,
      };

    case "UPDATE_SETTINGS":
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        lastModified: now,
      };

    case "IMPORT_SESSION":
      // Gracefully handle old session formats by providing defaults for missing fields
      // eslint-disable-next-line no-case-declarations
      const defaultSession = createInitialSession();
      // eslint-disable-next-line no-case-declarations
      const imported = action.payload as Session & {
        uploadedFiles?: CodeReference[];
        literatureFindings?: ReferenceResult[];
        puzzleArtifacts?: CritiqueArtifact[];
      };
      return {
        ...defaultSession, // Start with all default values
        ...action.payload, // Override with imported values
        // Ensure arrays are always arrays (handle missing fields from old formats)
        // Support both old (uploadedFiles) and new (codeFiles) field names
        codeFiles: Array.isArray(imported.codeFiles) ? imported.codeFiles :
                   Array.isArray(imported.uploadedFiles) ? imported.uploadedFiles : [],
        analysisResults: Array.isArray(action.payload.analysisResults) ? action.payload.analysisResults : [],
        // Support both old (literatureFindings) and new (references) field names
        references: Array.isArray(imported.references) ? imported.references :
                    Array.isArray(imported.literatureFindings) ? imported.literatureFindings : [],
        // Support both old (puzzleArtifacts) and new (critiqueArtifacts) field names
        critiqueArtifacts: Array.isArray(imported.critiqueArtifacts) ? imported.critiqueArtifacts :
                           Array.isArray(imported.puzzleArtifacts) ? imported.puzzleArtifacts : [],
        messages: Array.isArray(action.payload.messages) ? action.payload.messages : [],
        // Ensure settings object exists with defaults
        settings: {
          ...defaultSession.settings,
          ...(action.payload.settings || {}),
        },
        // Ensure other required fields have defaults
        currentPhase: action.payload.currentPhase || "opening",
        feedbackEscalation: typeof action.payload.feedbackEscalation === "number" ? action.payload.feedbackEscalation : 0,
        lastModified: now,
      };

    case "RESET_SESSION":
      return createInitialSession();

    // Create mode actions
    case "INIT_CREATE_STATE":
      return {
        ...state,
        createState: {
          projectName: action.payload.projectName,
          inspiration: action.payload.inspiration,
          inspirationUrl: action.payload.inspirationUrl,
          language: "Python", // Default language
          versions: [],
          currentVersionId: undefined,
        },
        currentPhase: "concept",
        lastModified: now,
      };

    case "ADD_CODE_VERSION":
      // eslint-disable-next-line no-case-declarations
      const newVersion: CodeVersion = {
        ...action.payload,
        id: generateId(),
        version: (state.createState?.versions.length || 0) + 1,
        createdAt: now,
      };
      return {
        ...state,
        createState: state.createState
          ? {
              ...state.createState,
              versions: [...state.createState.versions, newVersion],
              currentVersionId: newVersion.id,
            }
          : {
              projectName: action.payload.name,
              language: "Python", // Default language
              versions: [newVersion],
              currentVersionId: newVersion.id,
            },
        lastModified: now,
      };

    case "SET_CREATE_LANGUAGE":
      return {
        ...state,
        createState: state.createState
          ? {
              ...state.createState,
              language: action.payload,
            }
          : {
              projectName: "New Project",
              language: action.payload,
              versions: [],
              currentVersionId: undefined,
            },
        lastModified: now,
      };

    case "SET_CURRENT_VERSION":
      return {
        ...state,
        createState: state.createState
          ? {
              ...state.createState,
              currentVersionId: action.payload,
            }
          : undefined,
        lastModified: now,
      };

    case "TRANSFER_TO_CRITIQUE":
      // Find the version and add it as a CodeReference
      // eslint-disable-next-line no-case-declarations
      const versionToTransfer = state.createState?.versions.find(
        (v) => v.id === action.payload
      );
      if (!versionToTransfer) return state;

      // eslint-disable-next-line no-case-declarations
      const codeRef: CodeReference = {
        id: generateId(),
        name: `${versionToTransfer.name} v${versionToTransfer.version}`,
        language: versionToTransfer.language,
        source: "created",
        size: versionToTransfer.content.length,
        uploadedAt: now,
        summary: versionToTransfer.description,
        context: versionToTransfer.inspiration
          ? `Inspired by ${versionToTransfer.inspiration}`
          : undefined,
      };

      return {
        ...state,
        mode: "critique",
        codeFiles: [...state.codeFiles, codeRef],
        currentPhase: "opening",
        lastModified: now,
      };

    // Line annotation actions
    case "ADD_LINE_ANNOTATION":
      return {
        ...state,
        lineAnnotations: [...state.lineAnnotations, action.payload],
        lastModified: now,
      };

    case "UPDATE_LINE_ANNOTATION":
      return {
        ...state,
        lineAnnotations: state.lineAnnotations.map((ann) =>
          ann.id === action.payload.id
            ? { ...ann, content: action.payload.content }
            : ann
        ),
        lastModified: now,
      };

    case "REMOVE_LINE_ANNOTATION":
      return {
        ...state,
        lineAnnotations: state.lineAnnotations.filter(
          (ann) => ann.id !== action.payload
        ),
        lastModified: now,
      };

    case "CLEAR_LINE_ANNOTATIONS":
      return {
        ...state,
        lineAnnotations: action.payload
          ? state.lineAnnotations.filter((ann) => ann.codeFileId !== action.payload)
          : [],
        lastModified: now,
      };

    default:
      return state;
  }
}

// Context type
interface SessionContextType {
  session: Session;
  initSession: (mode: EntryMode, experienceLevel?: ExperienceLevel) => void;
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  addCode: (code: Omit<CodeReference, "id" | "uploadedAt">) => string;
  removeCode: (codeId: string) => void;
  addAnalysis: (analysis: Omit<AnalysisResult, "id" | "createdAt">) => void;
  addReferences: (refs: ReferenceResult[]) => void;
  clearReferences: () => void;
  addArtifact: (artifact: Omit<CritiqueArtifact, "id" | "createdAt">) => void;
  setPhase: (phase: ConversationPhase) => void;
  escalateFeedback: () => void;
  updateSettings: (settings: Partial<SessionSettings>) => void;
  importSession: (session: Session) => void;
  resetSession: () => void;
  exportSession: () => Session;
  // Create mode functions
  initCreateState: (projectName: string, inspiration?: string, inspirationUrl?: string) => void;
  addCodeVersion: (version: Omit<CodeVersion, "id" | "createdAt" | "version">) => void;
  setCurrentVersion: (versionId: string) => void;
  setCreateLanguage: (language: CreateLanguage) => void;
  transferToCritique: (versionId: string) => void;
  // Line annotation functions
  addLineAnnotation: (annotation: Omit<LineAnnotation, "id" | "createdAt">) => void;
  updateLineAnnotation: (id: string, content: string) => void;
  removeLineAnnotation: (id: string) => void;
  clearLineAnnotations: (codeFileId?: string) => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

// Provider component
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, dispatch] = useReducer(sessionReducer, null, createInitialSession);

  const initSession = useCallback((mode: EntryMode, experienceLevel?: ExperienceLevel) => {
    dispatch({ type: "INIT_SESSION", payload: { mode, experienceLevel } });
  }, []);

  const addMessage = useCallback(
    (message: Omit<Message, "id" | "timestamp">) => {
      const fullMessage: Message = {
        ...message,
        id: generateId(),
        timestamp: getCurrentTimestamp(),
      };
      dispatch({ type: "ADD_MESSAGE", payload: fullMessage });
    },
    []
  );

  const addCode = useCallback(
    (code: Omit<CodeReference, "id" | "uploadedAt">): string => {
      const id = generateId();
      const fullCode: CodeReference = {
        ...code,
        id,
        uploadedAt: getCurrentTimestamp(),
      };
      dispatch({ type: "ADD_CODE", payload: fullCode });
      return id;
    },
    []
  );

  const removeCode = useCallback((codeId: string) => {
    dispatch({ type: "REMOVE_CODE", payload: codeId });
  }, []);

  const addAnalysis = useCallback(
    (analysis: Omit<AnalysisResult, "id" | "createdAt">) => {
      const fullAnalysis: AnalysisResult = {
        ...analysis,
        id: generateId(),
        createdAt: getCurrentTimestamp(),
      };
      dispatch({ type: "ADD_ANALYSIS", payload: fullAnalysis });
    },
    []
  );

  const addReferences = useCallback((refs: ReferenceResult[]) => {
    dispatch({ type: "ADD_REFERENCES", payload: refs });
  }, []);

  const clearReferences = useCallback(() => {
    dispatch({ type: "CLEAR_REFERENCES" });
  }, []);

  const addArtifact = useCallback(
    (artifact: Omit<CritiqueArtifact, "id" | "createdAt">) => {
      const fullArtifact: CritiqueArtifact = {
        ...artifact,
        id: generateId(),
        createdAt: getCurrentTimestamp(),
      };
      dispatch({ type: "ADD_ARTIFACT", payload: fullArtifact });
    },
    []
  );

  const setPhase = useCallback((phase: ConversationPhase) => {
    dispatch({ type: "SET_PHASE", payload: phase });
  }, []);

  const escalateFeedback = useCallback(() => {
    dispatch({ type: "ESCALATE_FEEDBACK" });
  }, []);

  const updateSettings = useCallback((settings: Partial<SessionSettings>) => {
    dispatch({ type: "UPDATE_SETTINGS", payload: settings });
  }, []);

  const importSession = useCallback((sessionData: Session) => {
    dispatch({ type: "IMPORT_SESSION", payload: sessionData });
  }, []);

  const resetSession = useCallback(() => {
    dispatch({ type: "RESET_SESSION" });
  }, []);

  const exportSession = useCallback(() => {
    return session;
  }, [session]);

  // Create mode functions
  const initCreateState = useCallback(
    (projectName: string, inspiration?: string, inspirationUrl?: string) => {
      dispatch({
        type: "INIT_CREATE_STATE",
        payload: { projectName, inspiration, inspirationUrl },
      });
    },
    []
  );

  const addCodeVersion = useCallback(
    (version: Omit<CodeVersion, "id" | "createdAt" | "version">) => {
      dispatch({ type: "ADD_CODE_VERSION", payload: version });
    },
    []
  );

  const setCurrentVersion = useCallback((versionId: string) => {
    dispatch({ type: "SET_CURRENT_VERSION", payload: versionId });
  }, []);

  const setCreateLanguage = useCallback((language: CreateLanguage) => {
    dispatch({ type: "SET_CREATE_LANGUAGE", payload: language });
  }, []);

  const transferToCritique = useCallback((versionId: string) => {
    dispatch({ type: "TRANSFER_TO_CRITIQUE", payload: versionId });
  }, []);

  // Line annotation functions
  const addLineAnnotation = useCallback(
    (annotation: Omit<LineAnnotation, "id" | "createdAt">) => {
      const fullAnnotation: LineAnnotation = {
        ...annotation,
        id: generateId(),
        createdAt: getCurrentTimestamp(),
      };
      dispatch({ type: "ADD_LINE_ANNOTATION", payload: fullAnnotation });
    },
    []
  );

  const updateLineAnnotation = useCallback((id: string, content: string) => {
    dispatch({ type: "UPDATE_LINE_ANNOTATION", payload: { id, content } });
  }, []);

  const removeLineAnnotation = useCallback((id: string) => {
    dispatch({ type: "REMOVE_LINE_ANNOTATION", payload: id });
  }, []);

  const clearLineAnnotations = useCallback((codeFileId?: string) => {
    dispatch({ type: "CLEAR_LINE_ANNOTATIONS", payload: codeFileId });
  }, []);

  const value: SessionContextType = {
    session,
    initSession,
    addMessage,
    addCode,
    removeCode,
    addAnalysis,
    addReferences,
    clearReferences,
    addArtifact,
    setPhase,
    escalateFeedback,
    updateSettings,
    importSession,
    resetSession,
    exportSession,
    // Create mode
    initCreateState,
    addCodeVersion,
    setCurrentVersion,
    setCreateLanguage,
    transferToCritique,
    // Line annotations
    addLineAnnotation,
    updateLineAnnotation,
    removeLineAnnotation,
    clearLineAnnotations,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

// Hook to use session context
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
