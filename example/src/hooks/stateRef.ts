import { useRef, useState, type RefObject } from 'react';

type UseStateRef<T> = [
  T,
  (newState: T | ((prevState: T) => T)) => void,
  RefObject<T>
];

export const useStateRef = <T>(initialState: T | (() => T)): UseStateRef<T> => {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(
    initialState instanceof Function ? initialState() : initialState
  );

  const setStateRef = (
    newState: typeof state | ((prevState: typeof state) => typeof state)
  ) => {
    const nextState =
      newState instanceof Function ? newState(stateRef.current) : newState;
    stateRef.current = nextState;
    setState(nextState);
  };

  return [state, setStateRef, stateRef];
};
