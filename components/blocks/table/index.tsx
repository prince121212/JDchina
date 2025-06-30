import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import CopyComponent from "./copy";
import { TableColumn } from "@/types/blocks/table";

interface TableProps<T = Record<string, any>> {
  columns?: TableColumn[];
  data?: T[];
  empty_message?: string;
}

export default function DataTable<T = Record<string, any>>({
  columns,
  data,
  empty_message,
}: TableProps<T>) {
  if (!columns) {
    columns = [];
  }

  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow>
          {columns &&
            columns.map((item: TableColumn, idx: number) => {
              return (
                <TableHead key={idx} className={item.className}>
                  {item.title}
                </TableHead>
              );
            })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data && data.length > 0 ? (
          data.map((item: any, idx: number) => (
            <TableRow key={idx}>
              {columns &&
                columns.map((column: TableColumn, iidx: number) => {
                  const content = column.callback
                    ? column.callback(item)
                    : item[column.name as keyof typeof item];
                  const value = item[column.name as keyof typeof item];

                  if (column.type === "copy" && value) {
                    return (
                      <TableCell key={iidx} className={column.className}>
                        <CopyComponent text={value}>{content}</CopyComponent>
                      </TableCell>
                    );
                  }

                  return (
                    <TableCell key={iidx} className={column.className}>
                      {content}
                    </TableCell>
                  );
                })}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length}>
              <div className="flex w-full justify-center items-center py-8 text-muted-foreground">
                <p>{empty_message}</p>
              </div>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
