import { cn } from "@/lib/utils";
import { getAvatarGradient } from "@/lib/avatar-colors";
import type { Department, Employee } from "@/lib/domain";

export function EmployeeAvatar({
  employee,
  departments,
  size = "md",
}: {
  employee?: Employee;
  departments: Department[];
  size?: "sm" | "md";
}) {
  const department = employee?.departmentId
    ? departments.find((item) => item.id === employee.departmentId)
    : null;
  const initials =
    employee?.name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("") ?? "?";
  const sizeClass = size === "sm" ? "h-5 w-5 text-[9px]" : "h-9 w-9 text-[11px]";

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-full text-white flex items-center justify-center font-semibold ring-2 ring-background",
        sizeClass,
      )}
      style={
        employee?.avatar
          ? undefined
          : { background: department?.color ?? getAvatarGradient(employee?.id ?? "unassigned") }
      }
      title={employee?.name}
    >
      {employee?.avatar ? (
        <img src={employee.avatar} alt={employee.name} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}
