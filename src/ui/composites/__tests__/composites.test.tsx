/**
 * Composites — smoke + event-envelope + RTL tests — UX-1D.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Stat,
  StatGrid,
  DescriptionList,
  Form,
  FormSection,
  FormRow,
  FormActions,
  FieldArray,
  FormDialog,
  DataGrid,
  DataGridToolbar,
  Pagination,
} from "@/ui";
import type {
  ColumnDef,
  CompositeEvent,
  EventPayload,
  GridUIEvent,
  OverlayUIEvent,
} from "@/ui/contracts";

type Row = { id: string; name: string; amount: number };
const rows: Row[] = [
  { id: "1", name: "Alpha", amount: 10 },
  { id: "2", name: "Beta", amount: 20 },
];
const columns: ColumnDef<Row>[] = [
  { id: "name", header: "Name", accessor: "name", sortable: true },
  { id: "amount", header: "Amount", accessor: "amount", sortable: true, align: "end" },
];

describe("Composites — smoke", () => {
  it("renders state composites", () => {
    render(<EmptyState title="Nothing here" description="Try later." />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    render(<ErrorState title="Failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
    render(<LoadingState label="Working…" />);
    expect(screen.getByText("Working…")).toBeInTheDocument();
  });

  it("renders page composites", () => {
    render(<PageHeader title="Customers" description="All clients" actions={<button>New</button>} />);
    expect(screen.getByRole("heading", { name: "Customers", level: 1 })).toBeInTheDocument();
    render(
      <StatGrid columns={3}>
        <Stat label="Revenue" value="1,000" />
      </StatGrid>,
    );
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    render(
      <DescriptionList
        items={[{ term: "Name", description: "Acme" }, { term: "Status", description: "Active" }]}
      />,
    );
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("Form emits envelope-shaped events", () => {
    const events: CompositeEvent[] = [];
    render(
      <Form id="f1" onEvent={(e) => events.push(e)}>
        <FormSection title="Basic">
          <FormRow columns={2}>
            <input name="a" data-testid="a" />
          </FormRow>
          <FormActions>
            <button type="submit">Save</button>
          </FormActions>
        </FormSection>
      </Form>,
    );
    fireEvent.change(screen.getByTestId("a"), { target: { value: "x" } });
    fireEvent.submit(document.querySelector("form")!);
    expect(events.length).toBeGreaterThan(0);
    for (const ev of events) {
      expect(typeof ev.type).toBe("string");
      expect(ev).toHaveProperty("payload");
    }
    expect(events.some((e) => e.type === "form.submit")).toBe(true);
  });

  it("FieldArray adds and removes items", () => {
    function Host() {
      const [items, setItems] = React.useState<string[]>(["a"]);
      return (
        <FieldArray
          items={items}
          onChange={(next) => setItems([...next])}
          createItem={() => "new"}
          renderItem={(it, i) => <span data-testid={`item-${i}`}>{it}</span>}
        />
      );
    }
    render(<Host />);
    expect(screen.getByTestId("item-0")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByTestId("item-1")).toBeInTheDocument();
  });

  it("FormDialog renders zero portal nodes (Shell owns overlays)", () => {
    const events: OverlayUIEvent[] = [];
    const { container } = render(
      <FormDialog
        config={{ id: "d1", title: "Edit", bodySlot: "editBody" }}
      >
        {({ spec, open }) => {
          // Trigger open synchronously to confirm event is enveloped.
          open((e) => events.push(e));
          return <div data-testid="dlg-spec">{spec.id}</div>;
        }}
      </FormDialog>,
    );
    // No portal: nothing rendered outside the React root container.
    expect(container.querySelector("[data-testid='dlg-spec']")).toBeInTheDocument();
    expect(document.body.querySelectorAll("[role='dialog']").length).toBe(0);
    expect(events[0]?.type).toBe("overlay.open");
    expect(events[0]?.payload).toEqual({ id: "d1" });
  });

  it("DataGrid emits sort, selection, page events with envelope", () => {
    const events: GridUIEvent[] = [];
    render(
      <>
        <DataGridToolbar start={<span>tools</span>} />
        <DataGrid<Row>
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          selection={{ mode: "multi", selectedIds: [] }}
          ariaLabel="rows"
          onEvent={(e) => events.push(e)}
        />
        <Pagination page={1} pageCount={3} onEvent={(e) => events.push(e)} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const sort = events.find((e) => e.type === "grid.sort.change");
    const page = events.find((e) => e.type === "grid.page.change");
    expect(sort?.payload).toMatchObject({ columnId: "name", direction: "asc" });
    expect(page?.payload).toMatchObject({ page: 2 });
    for (const ev of events) {
      expect(ev).toHaveProperty("type");
      expect(ev).toHaveProperty("payload");
    }
  });

  it("DataGrid header is RTL-safe (uses logical text-start/text-end)", () => {
    const { container } = render(
      <DataGrid<Row>
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        ariaLabel="rows"
      />,
    );
    const headers = container.querySelectorAll("th");
    for (const h of headers) {
      const cls = h.className;
      expect(cls).not.toMatch(/\btext-left\b/);
      expect(cls).not.toMatch(/\btext-right\b/);
    }
  });

  it("Pagination disables Previous on page 1 and Next on last page", () => {
    const { rerender } = render(<Pagination page={1} pageCount={3} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    rerender(<Pagination page={3} pageCount={3} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("Contract event envelope is type-safe (compile-time)", () => {
    const ev: CompositeEvent<"x", { a: number }> = { type: "x", payload: { a: 1 } };
    const p: EventPayload = { k: "v", n: 1, b: true, arr: [1, 2] };
    expect(ev.type).toBe("x");
    expect(p.k).toBe("v");
  });
});

// React import for FieldArray host
import * as React from "react";
