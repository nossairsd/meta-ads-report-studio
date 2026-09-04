import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom has no IntersectionObserver — motion's `whileInView` needs a stub to avoid crashing in tests.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error -- test-only stub, not a full IntersectionObserver implementation
global.IntersectionObserver = IntersectionObserverStub;

// jsdom has no matchMedia — motion checks prefers-reduced-motion via it.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom has no WebGL. GradientWaves/SpecularButton already guard against a
// null context, but jsdom logs a noisy "Not implemented" error on every call
// unless getContext is stubbed to return null quietly.
const originalGetContext = HTMLCanvasElement.prototype.getContext;
// @ts-expect-error -- test-only stub narrowed to what our components call
HTMLCanvasElement.prototype.getContext = function (contextId: string, ...args: unknown[]) {
  if (contextId === "webgl2" || contextId === "webgl") return null;
  return originalGetContext.call(this, contextId, ...args);
};
