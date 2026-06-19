/**
 * PrimitivesGallery — static demo rendering every canonical primitive.
 * Not wired to any route; used for visual review and (later) Storybook.
 *
 * @canonicalState Canonical
 * @adr ADR-0003
 * @since UX-1C
 */
import * as React from "react";
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Label,
  FormField,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Switch,
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
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
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
} from "@/ui";
import { Settings } from "lucide-react";

export function PrimitivesGallery() {
  return (
    <TooltipProvider>
      <div className="space-y-8 p-6">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Buttons</h2>
          <div className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="success">Success</Button>
            <IconButton aria-label="Settings">
              <Settings />
            </IconButton>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Form</h2>
          <div className="grid gap-4 max-w-md">
            <FormField label="Email" required>
              {({ inputId, invalid }) => (
                <Input id={inputId} invalid={invalid} placeholder="you@x.com" />
              )}
            </FormField>
            <FormField label="Notes" help="Optional context">
              {({ inputId }) => <Textarea id={inputId} />}
            </FormField>
            <div className="flex items-center gap-2">
              <Checkbox id="agree" />
              <Label htmlFor="agree">Accept terms</Label>
            </div>
            <RadioGroup defaultValue="a" aria-label="opts">
              <div className="flex items-center gap-2">
                <RadioGroupItem id="r-a" value="a" />
                <Label htmlFor="r-a">A</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="r-b" value="b" />
                <Label htmlFor="r-b">B</Label>
              </div>
            </RadioGroup>
            <div className="flex items-center gap-2">
              <Switch id="dark" />
              <Label htmlFor="dark">Dark mode</Label>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Surface & feedback</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Card title</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>AB</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <Badge tone="success">Active</Badge>
                  <Separator />
                  <Skeleton className="h-3 w-32" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Spinner & Tooltip</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Spinner />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">Hover me</Button>
                  </TooltipTrigger>
                  <TooltipContent>Tooltip content</TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Tabs & Table</h2>
          <Tabs defaultValue="a">
            <TabsList>
              <TabsTrigger value="a">Overview</TabsTrigger>
              <TabsTrigger value="b">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="a">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Invoice #1</TableCell>
                    <TableCell>
                      <Badge tone="success">Paid</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="b">Details panel</TabsContent>
          </Tabs>
        </section>
      </div>
    </TooltipProvider>
  );
}
