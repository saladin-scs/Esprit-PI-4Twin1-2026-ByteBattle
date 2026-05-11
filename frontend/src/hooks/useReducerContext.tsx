/**
 * Advanced hook: useReducer + Context.
 * Creates a Provider and a hook exposing state + dispatch.
 */
import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
  type Reducer,
} from 'react';

export interface ReducerContextValue<S, A> {
  state: S;
  dispatch: Dispatch<A>;
}

export function createReducerContext<S, A>(
  reducer: Reducer<S, A>,
  initialState: S
): {
  Provider: (props: { children: ReactNode; initialState?: S }) => JSX.Element;
  useReducerContext: () => ReducerContextValue<S, A>;
} {
  const Context = createContext<ReducerContextValue<S, A> | null>(null);

  function Provider({
    children,
    initialState: initialProp,
  }: {
    children: ReactNode;
    initialState?: S;
  }) {
    const [state, dispatch] = useReducer(reducer, initialProp ?? initialState);
    const value = useMemo(() => ({ state, dispatch }), [state]);
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useReducerContext(): ReducerContextValue<S, A> {
    const ctx = useContext(Context);
    if (!ctx) throw new Error('useReducerContext must be used within its Provider');
    return ctx;
  }

  return { Provider, useReducerContext };
}

/**
 * Variant: hook returning [state, dispatch] and a Provider.
 */
export function useReducerWithContext<S, A>(
  reducer: Reducer<S, A>,
  initialState: S
): {
  Provider: (props: { children: ReactNode; initialState?: S }) => JSX.Element;
  useSlice: () => [S, Dispatch<A>];
} {
  const { Provider, useReducerContext } = createReducerContext(reducer, initialState);
  const useSlice = () => {
    const { state, dispatch } = useReducerContext();
    return [state, dispatch] as [S, Dispatch<A>];
  };
  return { Provider, useSlice };
}
