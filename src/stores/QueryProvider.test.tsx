import { describe, it, expect, vi } from "vitest";
import { render, screen, renderHook, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { QueryProvider } from "./QueryProvider";

describe("QueryProvider", () => {
  it("renders children", () => {
    render(
      <QueryProvider>
        <div data-testid="child">Hello</div>
      </QueryProvider>,
    );

    expect(screen.getByTestId("child")).toHaveTextContent("Hello");
  });

  it("provides QueryClient context for useQuery", async () => {
    const mockData = { message: "Hello from query" };
    const queryFn = vi.fn().mockResolvedValue(mockData);

    function TestComponent() {
      const { data, isLoading } = useQuery({
        queryKey: ["test"],
        queryFn,
        staleTime: 0,
      });

      if (isLoading) return <div data-testid="loading">Loading...</div>;
      return <div data-testid="result">{data?.message}</div>;
    }

    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>,
    );

    // Initial loading state
    expect(screen.getByTestId("loading")).toBeInTheDocument();

    // Wait for data to be loaded
    await waitFor(() => {
      expect(screen.getByTestId("result")).toHaveTextContent("Hello from query");
    });
  });

  it("shares QueryClient state between components", async () => {
    const mockData = { value: 42 };
    const queryFn = vi.fn().mockResolvedValue(mockData);

    function Component1() {
      const { data, isLoading } = useQuery({
        queryKey: ["shared"],
        queryFn,
      });
      if (isLoading) return <div data-testid="loading1">Loading...</div>;
      return <div data-testid="result1">{data?.value}</div>;
    }

    function Component2() {
      const { data, isLoading } = useQuery({
        queryKey: ["shared"],
        queryFn,
      });
      if (isLoading) return <div data-testid="loading2">Loading...</div>;
      return <div data-testid="result2">{data?.value}</div>;
    }

    render(
      <QueryProvider>
        <Component1 />
        <Component2 />
      </QueryProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("result1")).toHaveTextContent("42");
      expect(screen.getByTestId("result2")).toHaveTextContent("42");
    });

    // queryFn should only be called once due to deduplication
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it("uses renderHook with QueryProvider wrapper correctly", async () => {
    const mockData = { id: 1, name: "Test" };
    const queryFn = vi.fn().mockResolvedValue(mockData);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryProvider>{children}</QueryProvider>
    );

    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ["hook-test"],
          queryFn,
        }),
      { wrapper },
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockData);
    });
  });
});
