/**
 * Canonical primitives — a11y checks (focused, not full axe).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  IconButton,
  FormField,
  Input,
  Label,
  Spinner,
  Skeleton,
} from "@/ui";
import { X } from "lucide-react";

describe("Primitives a11y", () => {
  it("IconButton sets aria-label on the button element", () => {
    render(
      <IconButton aria-label="Close menu">
        <X />
      </IconButton>,
    );
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Close menu",
    );
  });

  it("FormField wires error → aria-describedby + role=alert", () => {
    render(
      <FormField label="Email" error="Required">
        {({ inputId, errorId, invalid }) => (
          <Input id={inputId} aria-describedby={errorId} invalid={invalid} />
        )}
      </FormField>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("Label htmlFor binds to input id", () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </>,
    );
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("Spinner exposes role=status + sr-only label", () => {
    render(<Spinner label="Saving" />);
    expect(screen.getByText("Saving")).toBeInTheDocument();
  });

  it("Skeleton exposes role=status and aria-busy", () => {
    const { container } = render(<Skeleton className="h-4 w-10" />);
    const el = container.firstElementChild!;
    expect(el.getAttribute("role")).toBe("status");
    expect(el.getAttribute("aria-busy")).toBe("true");
  });
});
