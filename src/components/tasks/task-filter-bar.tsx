import { useMemo, useState } from "react";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  priorityLabels,
  type Department,
  type Employee,
  type Group,
  type Priority,
  type Task,
} from "@/lib/domain";

export type TaskFilterState = {
  departmentIds: string[];
  groupIds: string[];
  priorities: Priority[];
  responsibleIds: string[];
  tags: string[];
};

export const emptyTaskFilters: TaskFilterState = {
  departmentIds: [],
  groupIds: [],
  priorities: [],
  responsibleIds: [],
  tags: [],
};

export function hasActiveTaskFilters(filters: TaskFilterState) {
  return (
    filters.departmentIds.length > 0 ||
    filters.groupIds.length > 0 ||
    filters.priorities.length > 0 ||
    filters.responsibleIds.length > 0 ||
    filters.tags.length > 0
  );
}

export function taskMatchesFilters(
  task: Task,
  filters: TaskFilterState,
  context: { employees: Employee[]; groups: Group[] },
) {
  if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) return false;
  if (filters.responsibleIds.length > 0 && !filters.responsibleIds.includes(task.responsibleId)) {
    return false;
  }
  if (filters.tags.length > 0 && !filters.tags.some((tag) => task.tags.includes(tag))) {
    return false;
  }

  if (filters.departmentIds.length > 0) {
    const responsible = context.employees.find((employee) => employee.id === task.responsibleId);
    const matchesTarget =
      task.target.type === "department" && filters.departmentIds.includes(task.target.id);
    const matchesResponsible =
      responsible && filters.departmentIds.includes(responsible.departmentId);
    if (!matchesTarget && !matchesResponsible) return false;
  }

  if (filters.groupIds.length > 0) {
    const matchesTarget = task.target.type === "group" && filters.groupIds.includes(task.target.id);
    const matchesMember = context.groups.some(
      (group) =>
        filters.groupIds.includes(group.id) && group.memberIds.includes(task.responsibleId),
    );
    if (!matchesTarget && !matchesMember) return false;
  }

  return true;
}

type FacetOption = { value: string; label: string };

function FacetPopover({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: FacetOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (value: string) => {
    onChange(
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-9 px-3 rounded-md border text-sm font-medium inline-flex items-center gap-2 transition-colors",
            selected.length > 0
              ? "border-primary/40 bg-primary/5 text-primary"
              : "border-border bg-card hover:bg-muted",
          )}
        >
          {label}
          {selected.length > 0 && (
            <span className="text-[11px] bg-primary/15 text-primary rounded-md px-1.5 py-0.5 font-semibold">
              {selected.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {options.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma opção</div>
          )}
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={() => toggle(option.value)}
              />
              <span className="truncate">{option.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TaskFilterBar({
  filters,
  onChange,
  departments,
  groups,
  employees,
  tasks,
}: {
  filters: TaskFilterState;
  onChange: (filters: TaskFilterState) => void;
  departments: Department[];
  groups: Group[];
  employees: Employee[];
  tasks: Task[];
}) {
  const allTags = useMemo(
    () => Array.from(new Set(tasks.flatMap((task) => task.tags))).sort(),
    [tasks],
  );

  const active = hasActiveTaskFilters(filters);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">
          <Filter className="h-3.5 w-3.5" /> Filtros
        </span>
        <FacetPopover
          label="Setor"
          options={departments.map((department) => ({
            value: department.id,
            label: department.name,
          }))}
          selected={filters.departmentIds}
          onChange={(values) => onChange({ ...filters, departmentIds: values })}
        />
        <FacetPopover
          label="Grupo"
          options={groups.map((group) => ({ value: group.id, label: group.name }))}
          selected={filters.groupIds}
          onChange={(values) => onChange({ ...filters, groupIds: values })}
        />
        <FacetPopover
          label="Prioridade"
          options={Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))}
          selected={filters.priorities}
          onChange={(values) => onChange({ ...filters, priorities: values as Priority[] })}
        />
        <FacetPopover
          label="Responsável"
          options={employees.map((employee) => ({ value: employee.id, label: employee.name }))}
          selected={filters.responsibleIds}
          onChange={(values) => onChange({ ...filters, responsibleIds: values })}
        />
        <FacetPopover
          label="Tags"
          options={allTags.map((tag) => ({ value: tag, label: tag }))}
          selected={filters.tags}
          onChange={(values) => onChange({ ...filters, tags: values })}
        />
      </div>

      {active && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.departmentIds.map((id) => (
            <FilterChip
              key={`d-${id}`}
              label={departments.find((department) => department.id === id)?.name ?? id}
              onRemove={() =>
                onChange({
                  ...filters,
                  departmentIds: filters.departmentIds.filter((item) => item !== id),
                })
              }
            />
          ))}
          {filters.groupIds.map((id) => (
            <FilterChip
              key={`g-${id}`}
              label={groups.find((group) => group.id === id)?.name ?? id}
              onRemove={() =>
                onChange({ ...filters, groupIds: filters.groupIds.filter((item) => item !== id) })
              }
            />
          ))}
          {filters.priorities.map((priority) => (
            <FilterChip
              key={`p-${priority}`}
              label={priorityLabels[priority]}
              onRemove={() =>
                onChange({
                  ...filters,
                  priorities: filters.priorities.filter((item) => item !== priority),
                })
              }
            />
          ))}
          {filters.responsibleIds.map((id) => (
            <FilterChip
              key={`r-${id}`}
              label={employees.find((employee) => employee.id === id)?.name ?? id}
              onRemove={() =>
                onChange({
                  ...filters,
                  responsibleIds: filters.responsibleIds.filter((item) => item !== id),
                })
              }
            />
          ))}
          {filters.tags.map((tag) => (
            <FilterChip
              key={`t-${tag}`}
              label={tag}
              onRemove={() =>
                onChange({ ...filters, tags: filters.tags.filter((item) => item !== tag) })
              }
            />
          ))}
          <button
            type="button"
            onClick={() => onChange(emptyTaskFilters)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium pl-2 pr-1 py-1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-sm hover:bg-foreground/10 p-0.5"
        aria-label={`Remover filtro ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
