import type { CourseItemType } from "../types";

type Props= {
  type: CourseItemType;
};

export default function CourseTypePill({ type }: Props) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        type === "Assignment" ? "bg-gray-50" : "bg-white",
      ].join(" ")}
    >
      {type}
    </span>
  );
}