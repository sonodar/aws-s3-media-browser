import { describe, it, expect } from "vitest";
import { render, screen, renderHook, act } from "@testing-library/react";
import { atom, useAtom, useAtomValue } from "jotai";
import { JotaiProvider } from "./JotaiProvider";

// Task 1.2: DevTools Provider コンポーネントのテスト

describe("JotaiProvider", () => {
  it("renders children", () => {
    render(
      <JotaiProvider>
        <div data-testid="child">Hello</div>
      </JotaiProvider>,
    );

    expect(screen.getByTestId("child")).toHaveTextContent("Hello");
  });

  it("provides atom scope for useAtom", () => {
    const countAtom = atom(0);

    function Counter() {
      const [count, setCount] = useAtom(countAtom);
      return (
        <div>
          <span data-testid="count">{count}</span>
          <button onClick={() => setCount((c) => c + 1)}>Increment</button>
        </div>
      );
    }

    render(
      <JotaiProvider>
        <Counter />
      </JotaiProvider>,
    );

    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("provides atom scope for useAtomValue", () => {
    const messageAtom = atom("Hello Jotai");

    function Message() {
      const message = useAtomValue(messageAtom);
      return <span data-testid="message">{message}</span>;
    }

    render(
      <JotaiProvider>
        <Message />
      </JotaiProvider>,
    );

    expect(screen.getByTestId("message")).toHaveTextContent("Hello Jotai");
  });

  it("isolates state between different JotaiProvider instances", () => {
    const countAtom = atom(0);

    const wrapper1 = ({ children }: { children: React.ReactNode }) => (
      <JotaiProvider>{children}</JotaiProvider>
    );
    const wrapper2 = ({ children }: { children: React.ReactNode }) => (
      <JotaiProvider>{children}</JotaiProvider>
    );

    const { result: result1 } = renderHook(() => useAtom(countAtom), {
      wrapper: wrapper1,
    });
    const { result: result2 } = renderHook(() => useAtom(countAtom), {
      wrapper: wrapper2,
    });

    // Update in Provider 1
    act(() => {
      result1.current[1](10);
    });

    // Provider 1 updated, Provider 2 unchanged
    expect(result1.current[0]).toBe(10);
    expect(result2.current[0]).toBe(0);
  });
});
