import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "jotai";
import { AtomsDevtools } from "./AtomsDevtools";

// Task 2.1: AtomsDevtools コンポーネントのテスト

// Mock useAtomsDevtools
vi.mock("jotai-devtools/utils", () => ({
  useAtomsDevtools: vi.fn(),
}));

describe("AtomsDevtools", () => {
  it("renders children correctly", () => {
    render(
      <Provider>
        <AtomsDevtools>
          <div data-testid="child">Child Content</div>
        </AtomsDevtools>
      </Provider>,
    );

    expect(screen.getByTestId("child")).toHaveTextContent("Child Content");
  });

  it("calls useAtomsDevtools with application name", async () => {
    const { useAtomsDevtools } = await import("jotai-devtools/utils");

    render(
      <Provider>
        <AtomsDevtools>
          <div>Test</div>
        </AtomsDevtools>
      </Provider>,
    );

    expect(useAtomsDevtools).toHaveBeenCalledWith("aws-s3-photo-browser");
  });
});
