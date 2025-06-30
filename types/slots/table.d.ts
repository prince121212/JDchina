import { TableColumn } from "@/types/blocks/table";
import { Slot } from "@/types/slots/base";

export interface Table extends Slot {
  columns?: TableColumn[];
  empty_message?: string;
}

// 重新导出 TableColumn 类型
export type { TableColumn };
