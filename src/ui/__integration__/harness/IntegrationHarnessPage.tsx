/**
 * Integration Harness Page — UX-1E (dev-only).
 *
 * @canonicalState Spike
 * @adr ADR-0005
 * @since UX-1E
 *
 * Mounts the canonical composites against the mock domain layer for every
 * scenario in the registry. Includes:
 *   • scenario switcher
 *   • event panel (immutable recorder)
 *   • performance panel
 *   • export buttons
 *
 * Invariant E4: this file is reached only via a DEV-guarded dynamic import
 * from `App.tsx`. It never appears in the production bundle.
 */
import * as React from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  FormField,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/ui";
import {
  DataGrid,
  DataGridToolbar,
  Pagination,
  Form,
  FormSection,
  FormActions,
  FormDialog,
  PageHeader,
  Stat,
  StatGrid,
  DescriptionList,
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/ui/composites";
import type {
  CompositeEvent,
  EventPayload,
  GridUIEvent,
  FormUIEvent,
} from "@/ui/contracts";
import { scenarioNames, type ScenarioName } from "../scenarios";
import { useMockList } from "../adapters/useMockList";
import { useMockForm } from "../adapters/useMockForm";
import { useMockOverlay } from "../adapters/useMockOverlay";
import { createRecorder } from "../events/EventRecorder";
import {
  emptyMeasurements,
  makeEnvironment,
  timeSync,
  type PerfMeasurements,
} from "../perf/probes";
import { SEED } from "../mocks/seed";
import { integrationManifest } from "../integration.manifest";

export default function IntegrationHarnessPage(): JSX.Element {
  const [scenario, setScenario] = React.useState<ScenarioName>("happy");
  const recorderRef = React.useRef(createRecorder());
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  const [perf, setPerf] = React.useState<PerfMeasurements>(emptyMeasurements());

  const onEvent = React.useCallback(
    (event: CompositeEvent<string, EventPayload>) => {
      recorderRef.current.record(event);
      force();
    },
    [],
  );

  React.useEffect(() => {
    recorderRef.current.clear();
    setPerf(emptyMeasurements());
    force();
  }, [scenario]);

  const list = useMockList(scenario);
  const form = useMockForm(scenario);
  const overlay = useMockOverlay({
    id: `dialog-${scenario}`,
    title: "Integration overlay",
    description: "Adapter-driven OverlaySpec consumed by the harness.",
    bodySlot: "harness.body",
    footerSlot: "harness.footer",
    size: "md",
    dismissible: true,
  });

  // First-render probe.
  React.useEffect(() => {
    const { ms } = timeSync(() => list.rows.length);
    setPerf((p) => ({ ...p, firstRender: ms }));
  }, [list.rows]);

  const handleGridEvent = (e: GridUIEvent) => {
    if (e.type === "grid.sort.change") {
      const { ms } = timeSync(() =>
        list.setSort({ columnId: e.payload.columnId, direction: e.payload.direction }),
      );
      setPerf((p) => ({ ...p, sort: ms }));
    } else if (e.type === "grid.selection.change") {
      const { ms } = timeSync(() =>
        list.setSelection(e.payload.selectedIds as ReadonlyArray<string>),
      );
      setPerf((p) => ({ ...p, selectionToggle: ms }));
    } else if (e.type === "grid.page.change") {
      list.setPage(e.payload.page);
    } else if (e.type === "grid.density.change") {
      list.setDensity(e.payload.density);
    }
    onEvent(e);
  };

  const handleFormEvent = (e: FormUIEvent) => onEvent(e);

  const openDialog = () => {
    const { ms } = timeSync(() => overlay.openOverlay());
    setPerf((p) => ({ ...p, dialogOpen: ms }));
    onEvent({ type: "overlay.open", payload: { id: overlay.spec.id } });
  };

  const exportEvents = () => {
    const blob = new Blob([recorderRef.current.dump()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `events.${scenario}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPerf = () => {
    const payload = {
      scenario,
      environment: makeEnvironment(SEED),
      measurements: perf,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `perf.${scenario}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const aggregates = React.useMemo(() => {
    const totalBalance = list.rows.reduce(
      (sum, r) => sum + (typeof r.balance === "number" ? r.balance : 0),
      0,
    );
    return {
      totalRows: list.rows.length,
      totalBalance: Math.round(totalBalance * 100) / 100,
    };
  }, [list.rows]);

  const events = recorderRef.current.flush();

  return (
    <main className="container mx-auto flex flex-col gap-6 p-6">
      <PageHeader
        title={`UX-1E Harness — ${scenario}`}
        description={`Manifest ${integrationManifest.fingerprint} · schema ${integrationManifest.manifestSchema}`}
        actions={
          <div className="flex items-center gap-2">
            <Label htmlFor="scenario">Scenario</Label>
            <Select
              value={scenario}
              onValueChange={(v) => setScenario(v as ScenarioName)}
            >
              <SelectTrigger id="scenario" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scenarioNames.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <StatGrid columns={4}>
        <Stat label="Rows (page)" value={aggregates.totalRows} />
        <Stat label="Sum balance" value={aggregates.totalBalance} />
        <Stat label="Events" value={events.length} />
        <Stat label="Page" value={`${list.page} / ${list.pageCount}`} />
      </StatGrid>

      <DescriptionList
        items={[
          { term: "Scenario", description: scenario },
          { term: "Loading", description: String(list.loading) },
          { term: "Error", description: list.error ? list.error.message : "—" },
          { term: "Sort", description: list.sort ? `${list.sort.columnId} ${list.sort.direction}` : "—" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>DataGrid</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <DataGridToolbar>
            <Button type="button" variant="outline" size="sm" onClick={openDialog}>
              Open dialog
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={exportEvents}>
              Export events
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={exportPerf}>
              Export perf
            </Button>
          </DataGridToolbar>

          {list.loading ? (
            <LoadingState label="Loading mock domain…" />
          ) : list.error ? (
            <ErrorState
              title="Mock error"
              description={list.error.message}
              action={
                <Button type="button" onClick={() => list.setPage(1)}>
                  Reset
                </Button>
              }
            />
          ) : list.rows.length === 0 ? (
            <EmptyState title="No rows" description="This scenario yields no data." />
          ) : (
            <>
              <DataGrid
                rows={list.rows}
                columns={list.columns}
                getRowId={list.getRowId}
                sort={list.sort}
                selection={list.selection}
                density={list.density}
                ariaLabel={`Harness grid — ${scenario}`}
                onEvent={handleGridEvent}
              />
              <Pagination
                page={list.page}
                pageCount={list.pageCount}
                onEvent={handleGridEvent}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form</CardTitle>
        </CardHeader>
        <CardContent>
          <Form
            id={form.id}
            phase={form.phase}
            onEvent={handleFormEvent}
            onSubmitForm={() => void form.submit()}
            onResetForm={() => form.reset()}
          >
            <FormSection title="Customer" description="Mock-backed adapter">
              {Object.keys(form.values).map((name) => (
                <FormField key={name} label={name} htmlFor={`${form.id}-${name}`}>
                  <Input
                    id={`${form.id}-${name}`}
                    name={name}
                    value={form.values[name]}
                    onChange={(e) => form.setField(name, e.target.value)}
                  />
                </FormField>
              ))}
            </FormSection>
            <FormActions>
              <Button type="reset" variant="outline">
                Reset
              </Button>
              <Button type="submit" disabled={form.phase === "submitting"}>
                {form.phase === "submitting" ? "Submitting…" : "Submit"}
              </Button>
            </FormActions>
            {form.error ? (
              <ErrorState title="Submit failed" description={form.error.message} />
            ) : null}
          </Form>
        </CardContent>
      </Card>

      <FormDialog
        config={{
          id: overlay.spec.id,
          title: overlay.spec.title,
          description: overlay.spec.description,
          bodySlot: overlay.spec.bodySlot,
          footerSlot: overlay.spec.footerSlot,
          size: overlay.spec.size,
          dismissible: overlay.spec.dismissible,
        }}
      >
        {({ spec }) => (
          <Card>
            <CardHeader>
              <CardTitle>OverlaySpec preview ({spec.id})</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div>open: {String(overlay.open)}</div>
              <div>lastCloseReason: {overlay.lastCloseReason ?? "—"}</div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    overlay.closeOverlay("cancel");
                    onEvent({
                      type: "overlay.close",
                      payload: { id: spec.id, reason: "cancel" },
                    });
                  }}
                >
                  Close (cancel)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </FormDialog>

      <Card>
        <CardHeader>
          <CardTitle>Recorded events ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
            {recorderRef.current.dump()}
          </pre>
        </CardContent>
      </Card>
    </main>
  );
}
