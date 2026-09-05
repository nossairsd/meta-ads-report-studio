import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnchorLink } from "@/components/landing/anchor-link";

/**
 * These assert the component's decisions, not the scrolling itself. An
 * animated scroll is driven by requestAnimationFrame, which does not run in a
 * headless environment, so exercising it through the DOM would prove nothing.
 */

const scrollTo = vi.fn();
let lenis: { scrollTo: typeof scrollTo } | null = { scrollTo };

vi.mock("lenis/react", () => ({ useLenis: () => lenis }));

const NO_REDUCED_MOTION = { matches: false } as MediaQueryList;

beforeEach(() => {
  scrollTo.mockClear();
  lenis = { scrollTo };
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
  vi.spyOn(window, "matchMedia").mockReturnValue(NO_REDUCED_MOTION);
});

function renderWithTarget(id = "features") {
  const section = document.createElement("section");
  section.id = id;
  section.scrollIntoView = vi.fn();
  document.body.appendChild(section);

  render(<AnchorLink href={`#${id}`}>Features</AnchorLink>);
  return section;
}

describe("AnchorLink", () => {
  it("hands the scroll to Lenis, which owns the page's scroll position", () => {
    const section = renderWithTarget();
    fireEvent.click(screen.getByText("Features"));

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo.mock.calls[0][0]).toBe(section);
  });

  it("offsets by the navbar height, so the section does not land underneath it", () => {
    renderWithTarget();
    fireEvent.click(screen.getByText("Features"));

    expect(scrollTo.mock.calls[0][1].offset).toBeLessThan(0);
  });

  it("updates the address bar without pushing a history entry", () => {
    // A pushed entry would make the back button undo a scroll rather than
    // return the reader to the previous page.
    const push = vi.spyOn(window.history, "pushState");
    const replace = vi.spyOn(window.history, "replaceState");

    renderWithTarget();
    fireEvent.click(screen.getByText("Features"));

    expect(replace).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("falls back to the element's own scrolling when Lenis is absent", () => {
    lenis = null;
    const section = renderWithTarget();

    fireEvent.click(screen.getByText("Features"));
    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
  });

  it("jumps instantly for a reader who asked for reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);

    renderWithTarget();
    fireEvent.click(screen.getByText("Features"));

    expect(scrollTo.mock.calls[0][1]).toMatchObject({ duration: 0 });
  });

  it("leaves the click alone when the section is not on this page", () => {
    // Swallowing it would turn a link to another page into a dead one.
    render(<AnchorLink href="#nowhere">Elsewhere</AnchorLink>);
    fireEvent.click(screen.getByText("Elsewhere"));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("does not hijack a modified click, so open-in-new-tab still works", () => {
    renderWithTarget();
    fireEvent.click(screen.getByText("Features"), { metaKey: true });

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("still calls the caller's onClick, which is what closes the mobile menu", () => {
    const onClick = vi.fn();
    const section = document.createElement("section");
    section.id = "features";
    document.body.appendChild(section);

    render(
      <AnchorLink href="#features" onClick={onClick}>
        Features
      </AnchorLink>
    );
    fireEvent.click(screen.getByText("Features"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
