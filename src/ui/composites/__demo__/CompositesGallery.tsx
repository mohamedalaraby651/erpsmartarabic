/**
 * Composites demo gallery — UX-1D.
 * Renders the full composite suite against mock data only.
 */
import * as React from "react";
import {
  Button,
  Badge,
  Input,
  Label,
} from "@/ui";
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
  GridUIEvent,
  SelectionState,
  SortState,
} from "@/ui/contracts";

type Customer = { id: string; name: string; amount: number; status: string };
const MOCK: Customer[] = [
  { id: "c1", name: "Acme", amount: 1200, status: "active" },
  { id: "c2", name: "Globex", amount: 800, status: "active" },
  { id: "c3", name: "Initech", amount: 540, status: "pending" },
];

const columns: ColumnDef<Customer>[] = [
  { id: "name", header: "Name", accessor: "name", sortable: true },
  { id: "amount", header: "Amount", accessor: "amount", sortable: true, align: "end" },
  {
    id: "status",
    header: "Status",
    render: (r) => <Badge>{r.status}</Badge>,
  },
];

export function CompositesGallery() {
  const [sort, setSort] = React.useState<SortState | undefined>();
  const [selection, setSelection] = React.useState<SelectionState>({
    mode: "multi",
    selectedIds: [],
  });
  const [page, setPage] = React.useState(1);
  const [tags, setTags] = React.useState<string[]>(["alpha"]);

  const onGrid = (e: GridUIEvent) => {
    if (e.type === "grid.sort.change")
      setSort({ columnId: e.payload.columnId, direction: e.payload.direction });
    if (e.type === "grid.selection.change")
      setSelection((s) => ({ ...s, selectedIds: [...e.payload.selectedIds] }));
    if (e.type === "grid.page.change") setPage(e.payload.page);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-6">
      <PageHeader
        title="Composites Gallery"
        description="UX-1D composition tier — mock data only."
        actions={<Button>New</Button>}
      />

      <StatGrid columns={4}>
        <Stat label="Customers" value="3" hint="this month" />
        <Stat label="Revenue" value="2,540" trend="up" />
        <Stat label="Pending" value="1" />
        <Stat label="Active" value="2" />
      </StatGrid>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Result states</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <LoadingState label="Fetching…" />
          <EmptyState title="No records" description="Try adjusting filters." />
          <ErrorState title="Could not load" description="Network problem." />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">DataGrid</h2>
        <DataGridToolbar
          start={<span className="text-sm text-muted-foreground">Selected: {selection.selectedIds.length}</span>}
          end={<Button size="sm" variant="outline">Export</Button>}
        />
        <DataGrid<Customer>
          rows={MOCK}
          columns={columns}
          getRowId={(r) => r.id}
          sort={sort}
          selection={selection}
          ariaLabel="Customers"
          onEvent={onGrid}
        />
        <Pagination page={page} pageCount={5} onEvent={onGrid} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Form + FormDialog</h2>
        <Form id="customer" onEvent={() => undefined}>
          <FormSection title="Customer" description="Basic info">
            <FormRow columns={2}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cn">Name</Label>
                <Input id="cn" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ce">Email</Label>
                <Input id="ce" type="email" />
              </div>
            </FormRow>
            <FieldArray<string>
              items={tags}
              onChange={(next) => setTags([...next])}
              createItem={() => ""}
              renderItem={(it, i) => (
                <Input
                  value={it}
                  onChange={(e) => {
                    const next = [...tags];
                    next[i] = e.target.value;
                    setTags(next);
                  }}
                />
              )}
            />
          </FormSection>
          <FormActions>
            <Button type="reset" variant="ghost">Reset</Button>
            <Button type="submit">Save</Button>
          </FormActions>
        </Form>

        <FormDialog
          config={{
            id: "edit-customer",
            title: "Edit customer",
            bodySlot: "editCustomerBody",
          }}
        >
          {({ spec }) => (
            <DescriptionList
              items={[
                { term: "Overlay id", description: spec.id },
                { term: "Body slot", description: spec.bodySlot },
                { term: "Size", description: spec.size ?? "md" },
              ]}
            />
          )}
        </FormDialog>
      </section>
    </div>
  );
}
