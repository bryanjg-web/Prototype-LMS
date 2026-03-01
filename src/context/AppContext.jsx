import { createContext, useContext, useReducer, useCallback } from "react";
import { roleDefaults } from "../config/navigation";

const AppContext = createContext(null);

const initialState = {
  mode: "interactive",
  role: null,
  activeView: null,
  scrollActiveView: null,
  scrollDirection: null, // "up" | "down" | null — for sidebar chevron behavior
  selectedLeadId: null,
  selectedTaskId: null,
  sidebarCollapsed: false,
  journeyStarted: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_MODE": {
      const mode = action.payload;
      if (mode === "journey") {
        return { ...state, mode, journeyStarted: false, selectedLeadId: null, selectedTaskId: null, activeView: null };
      }
      // switching to interactive: route to role default
      return {
        ...state,
        mode,
        activeView: state.role ? roleDefaults[state.role] : null,
        selectedLeadId: null,
        selectedTaskId: null,
      };
    }
    case "SET_ROLE": {
      const role = action.payload;
      return {
        ...state,
        role,
        activeView: roleDefaults[role],
        selectedLeadId: null,
        selectedTaskId: null,
        journeyStarted: false,
      };
    }
    case "NAVIGATE_TO":
      return { ...state, activeView: action.payload, scrollActiveView: null };
    case "SET_SCROLL_ACTIVE_VIEW":
      return { ...state, scrollActiveView: action.payload };
    case "SET_SCROLL_DIRECTION":
      return { ...state, scrollDirection: action.payload };
    case "SELECT_LEAD":
      return { ...state, selectedLeadId: action.payload };
    case "SELECT_TASK":
      return { ...state, selectedTaskId: action.payload };
    case "SET_JOURNEY_STARTED":
      return { ...state, journeyStarted: action.payload };
    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case "RESET_VIEW_STATE":
      return {
        ...state,
        activeView: state.role ? roleDefaults[state.role] : null,
        selectedLeadId: null,
        selectedTaskId: null,
      };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setMode = useCallback((mode) => dispatch({ type: "SET_MODE", payload: mode }), []);
  const setRole = useCallback((role) => dispatch({ type: "SET_ROLE", payload: role }), []);
  const navigateTo = useCallback((view) => dispatch({ type: "NAVIGATE_TO", payload: view }), []);
  const setScrollActiveView = useCallback((view) => dispatch({ type: "SET_SCROLL_ACTIVE_VIEW", payload: view }), []);
  const setScrollDirection = useCallback((dir) => dispatch({ type: "SET_SCROLL_DIRECTION", payload: dir }), []);
  const selectLead = useCallback((id) => dispatch({ type: "SELECT_LEAD", payload: id }), []);
  const selectTask = useCallback((id) => dispatch({ type: "SELECT_TASK", payload: id }), []);
  const setJourneyStarted = useCallback((v) => dispatch({ type: "SET_JOURNEY_STARTED", payload: v }), []);
  const toggleSidebar = useCallback(() => dispatch({ type: "TOGGLE_SIDEBAR" }), []);
  const resetViewState = useCallback(() => dispatch({ type: "RESET_VIEW_STATE" }), []);

  return (
    <AppContext.Provider
      value={{
        ...state,
        setMode,
        setRole,
        navigateTo,
        setScrollActiveView,
        setScrollDirection,
        selectLead,
        selectTask,
        setJourneyStarted,
        toggleSidebar,
        resetViewState,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
