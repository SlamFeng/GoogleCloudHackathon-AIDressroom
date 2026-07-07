import * as React from "react";

export interface ProductLike {
  name: string;
  category: "outerwear" | "top" | "bottom" | "dress" | "shoes" | "accessory";
  price_yen: number;
  colors?: string[];
  style_tags?: string[];
  fit?: string;
}

/**
 * A single product line in a recommendation set: slot label + name, price (¥),
 * and color / fit meta. Bind to `Product`.
 */
export interface ProductRowProps extends React.HTMLAttributes<HTMLDivElement> {
  product: ProductLike;
}

export function ProductRow(props: ProductRowProps): React.ReactElement;
