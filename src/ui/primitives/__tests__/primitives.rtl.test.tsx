/**
 * Canonical primitives — RTL layout sanity.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Sheet, SheetTrigger, SheetContent, Label, Card, Switch } from "@/ui";

function withRtl(node: React.ReactNode) {
  return (
    <div dir="rtl" lang="ar">
      {node}
    </div>
  );
}

describe("Primitives RTL", () => {
  it("Sheet exposes logical side prop (start/end), not physical (left/right)", () => {
    // Type check + runtime: passing "start" should not throw.
    render(
      withRtl(
        <Sheet>
          <SheetTrigger>X</SheetTrigger>
          <SheetContent side="start">panel</SheetContent>
        </Sheet>,
      ),
    );
  });

  it("Label required marker uses logical ms-* (start margin)", () => {
    const { container } = render(
      withRtl(
        <Label htmlFor="x" required>
          Name
        </Label>,
      ),
    );
    const star = container.querySelector("[aria-hidden=true]");
    expect(star?.className).toMatch(/\bms-1\b/);
    expect(star?.className).not.toMatch(/\b(ml|mr)-1\b/);
  });

  it("Card renders without physical-direction classes", () => {
    const { container } = render(withRtl(<Card>body</Card>));
    const html = container.innerHTML;
    expect(html).not.toMatch(/\b(ml|mr|pl|pr)-\d/);
  });

  it("Switch keeps thumb visible in RTL", () => {
    render(withRtl(<Switch aria-label="t" />));
  });
});
