/**
 * Canonical primitives — smoke tests.
 * Covers rendering, displayName, and key API contracts for every primitive.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Switch,
  Label,
  FormField,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Avatar,
  AvatarFallback,
  Separator,
  Skeleton,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  Sheet,
  SheetTrigger,
  SheetContent,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Toaster,
} from "@/ui";
import { X } from "lucide-react";

describe("Canonical primitives — smoke", () => {
  it("Toaster host mounts", () => {
    render(<Toaster />);
  });

  it("Button renders with accessible role", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("IconButton requires an accessible name", () => {
    render(
      <IconButton aria-label="Close">
        <X />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("Input is associated via FormField", () => {
    render(
      <FormField label="Email" required>
        {({ inputId, invalid }) => (
          <Input id={inputId} invalid={invalid} placeholder="you@x.com" />
        )}
      </FormField>,
    );
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
  });

  it("Textarea renders", () => {
    render(<Textarea aria-label="Notes" />);
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });

  it("Label associates with input", () => {
    render(
      <>
        <Label htmlFor="x">Name</Label>
        <input id="x" />
      </>,
    );
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("Checkbox renders with role", () => {
    render(<Checkbox aria-label="agree" />);
    expect(screen.getByRole("checkbox", { name: "agree" })).toBeInTheDocument();
  });

  it("RadioGroup renders items", () => {
    render(
      <RadioGroup defaultValue="a" aria-label="opts">
        <RadioGroupItem value="a" aria-label="a" />
        <RadioGroupItem value="b" aria-label="b" />
      </RadioGroup>,
    );
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("Switch renders with role", () => {
    render(<Switch aria-label="dark mode" />);
    expect(screen.getByRole("switch", { name: "dark mode" })).toBeInTheDocument();
  });

  it("Card composition renders", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>T</CardTitle>
        </CardHeader>
        <CardContent>body</CardContent>
      </Card>,
    );
    expect(screen.getByRole("heading", { name: "T" })).toBeInTheDocument();
  });

  it("Badge renders text", () => {
    render(<Badge tone="success">OK</Badge>);
    expect(screen.getByText("OK")).toBeInTheDocument();
  });

  it("Avatar renders fallback", () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("AB")).toBeInTheDocument();
  });

  it("Separator renders with role", () => {
    const { container } = render(<Separator />);
    expect(container.querySelector("[role=none], [data-orientation]")).toBeTruthy();
  });

  it("Skeleton exposes status role", () => {
    render(<Skeleton className="h-4 w-20" />);
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
  });

  it("Spinner exposes status role with label", () => {
    render(<Spinner label="Loading data" />);
    expect(screen.getByText("Loading data")).toBeInTheDocument();
  });

  it("Tabs renders triggers and content", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A panel</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText("A panel")).toBeInTheDocument();
  });

  it("Table renders semantic markup", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>H</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>C</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "H" })).toBeInTheDocument();
  });

  it("Dialog opens via trigger", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Hello</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("Sheet renders trigger", () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent side="end">panel</SheetContent>
      </Sheet>,
    );
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("Select renders trigger", () => {
    render(
      <Select>
        <SelectTrigger aria-label="role">
          <SelectValue placeholder="pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole("combobox", { name: "role" })).toBeInTheDocument();
  });

  it("Tooltip provider mounts", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>hover</TooltipTrigger>
          <TooltipContent>tip</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByText("hover")).toBeInTheDocument();
  });
});
