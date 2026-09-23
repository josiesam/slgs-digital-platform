import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from "@platejs/table/react";

import {
  TableCellElement,
  TableCellHeaderElement,
  TableElement,
  TableRowElement,
} from "../../ui/table-node";

import {
  TableCellElementStatic,
  TableCellHeaderElementStatic,
  TableElementStatic,
  TableRowElementStatic,
} from "../../ui/table-node-static";

export const TableKit = [
  TablePlugin.withComponent(TableElement),
  TableRowPlugin.withComponent(TableRowElement),
  TableCellPlugin.withComponent(TableCellElement),
  TableCellHeaderPlugin.withComponent(TableCellHeaderElement),
];

export const TableKitStatic = [
  TablePlugin.withComponent(TableElementStatic),
  TableRowPlugin.withComponent(TableRowElementStatic),
  TableCellPlugin.withComponent(TableCellElementStatic),
  TableCellHeaderPlugin.withComponent(TableCellHeaderElementStatic),
];
