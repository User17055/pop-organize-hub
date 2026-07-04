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
  type TargetType,
} from "@/lib/domain";

export type TaskFilterState = {
  targetTypes: TargetType[];
  departmentIds: string[];
  groupIds: string[];
  priorities: Priority[];
  responsibleIds: string[];
  tags: string[];
};

export const emptyTaskFilters: TaskFilterState = {
  targetTypes: [],
  departmentIds: [],
  groupIds: [],
  priorities: [],
  responsibleIds: [],
  tags: [],
};

export function hasActiveTaskFilters(filters: TaskFilterState) {
  return (
    filters.targetTypes.length > 0 ||
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
  if (filters.targetTypes.length > 0 && !filters.targetTypes.includes(task.target.type)) {
    return false;
  }
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

const targetTypeLabels: Record<TargetType, string> = {
  company: "Empresa inteira",
  department: "Setor",
  group: "Grupo",
  user: "Pessoa",
};

function uniqueValues<T extends string>(values: T[]) {
  return Array.from(new Set(values));
}

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

  if (options.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "pressable inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors",
            selected.length > 0
              ? "border-primary/40 bg-primary/5 text-primary"
              : "app-surface text-foreground/80 hover:bg-white",
          )}
        >
          {label}
          {selected.length > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
              {selected.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-muted"
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
  showResponsibleFilter = true,
}: {
  filters: TaskFilterState;
  onChange: (filters: TaskFilterState) => void;
  departments: Department[];
  groups: Group[];
  employees: Employee[];
  tasks: Task[];
  showResponsibleFilter?: boolean;
}) {
  const targetTypeOptions = useMemo(
    () =>
      uniqueValues(tasks.map((task) => task.target.type))
        .sort()
        .map((value) => ({ value, label: targetTypeLabels[value] })),
    [tasks],
  );
  const departmentOptions = useMemo(() => {
    const ids = new Set(
      tasks.filter((task) => task.target.type === "department").map((task) => task.target.id),
    );
    return departments
      .filter((department) => ids.has(department.id))
      .map((department) => ({ value: department.id, label: department.name }));
  }, [departments, tasks]);
  const groupOptions = useMemo(() => {
    const ids = new Set(
      tasks.filter((task) => task.target.type === "group").map((task) => task.target.id),
    );
    return groups
      .filter((group) => ids.has(group.id))
      .map((group) => ({ value: group.id, label: group.name }));
  }, [groups, tasks]);
  const responsibleOptions = useMemo(() => {
    const ids = new Set(tasks.map((task) => task.responsibleId));
    return employees
      .filter((employee) => ids.has(employee.id))
      .map((employee) => ({ value: employee.id, label: employee.name }));
  }, [employees, tasks]);
  const allTags = useMemo(() => uniqueValues(tasks.flatMap((task) => task.tags)).sort(), [tasks]);

  const active = hasActiveTaskFilters(filters);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mr-1">
          <Filter className="h-3.5 w-3.5" /> Filtros
        </span>
        {targetTypeOptions.length > 1 && (
          <FacetPopover
            label="Destino"
            options={targetTypeOptions}
            selected={filters.targetTypes}
            onChange={(values) => onChange({ ...filters, targetTypes: values as TargetType[] })}
          />
        )}
        <FacetPopover
          label="Setor"
          options={departmentOptions}
          selected={filters.departmentIds}
          onChange={(values) => onChange({ ...filters, departmentIds: values })}
        />
        <FacetPopover
          label="Grupo"
          options={groupOptions}
          selected={filters.groupIds}
          onChange={(values) => onChange({ ...filters, groupIds: values })}
        />
        <FacetPopover
          label="Prioridade"
          options={Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))}
          selected={filters.priorities}
          onChange={(values) => onChange({ ...filters, priorities: values as Priority[] })}
        />
        {showResponsibleFilter && responsibleOptions.length > 1 && (
          <FacetPopover
            label="Responsável"
            options={responsibleOptions}
            selected={filters.responsibleIds}
            onChange={(values) => onChange({ ...filters, responsibleIds: values })}
          />
        )}
        <FacetPopover
          label="Tags"
          options={allTags.map((tag) => ({ value: tag, label: tag }))}
          selected={filters.tags}
          onChange={(values) => onChange({ ...filters, tags: values })}
        />
      </div>

      {active && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.targetTypes.map((type) => (
            <FilterChip
              key={`target-${type}`}
              label={targetTypeLabels[type]}
              onRemove={() =>
                onChange({
                  ...filters,
                  targetTypes: filters.targetTypes.filter((item) => item !== type),
                })
              }
            />
          ))}
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
          {showResponsibleFilter &&
            filters.responsibleIds.map((id) => (
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
