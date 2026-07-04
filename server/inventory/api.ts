import { Router, type Request, type Response, type RequestHandler } from "express";
import { z } from "zod";
import { getInventoryService } from "./factory.js";
import {
  inventorySearchQuerySchema,
  productSchema,
  reservationStatusSchema,
  reserveInputSchema,
  restockInputSchema,
  sizeSchema
} from "./types.js";

const router = Router();

const addProductBody = productSchema
  .omit({ created_at: true, updated_at: true, active: true })
  .extend({ active: z.boolean().optional() });

const editProductBody = productSchema
  .omit({ product_id: true, created_at: true, updated_at: true })
  .partial();

const restockBody = restockInputSchema.omit({ product_id: true });
const setStockBody = z.object({ on_hand_by_size: z.record(sizeSchema, z.number().int().nonnegative()) });

/** Wrap async handlers so rejections become 500s instead of unhandled rejections. */
function handler(fn: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

function csv(value: unknown): string[] | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

// --- product catalog ---

router.get(
  "/products",
  handler(async (req, res) => {
    const parsed = inventorySearchQuerySchema.safeParse({
      categories: csv(req.query.category),
      colors: csv(req.query.color),
      style_tags: csv(req.query.style),
      avoid_colors: csv(req.query.avoid_color),
      avoid_style_tags: csv(req.query.avoid_style),
      max_price_yen: req.query.max_price !== undefined ? Number(req.query.max_price) : undefined,
      size: typeof req.query.size === "string" ? req.query.size : undefined,
      in_stock_only: req.query.in_stock === undefined ? true : req.query.in_stock !== "false",
      limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined
    });
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid search query" });
      return;
    }
    const service = await getInventoryService();
    res.json({ results: await service.search(parsed.data) });
  })
);

router.get(
  "/products/:id",
  handler(async (req, res) => {
    const service = await getInventoryService();
    const product = await service.getProduct(String(req.params.id));
    if (!product) {
      res.status(404).json({ error: "product not found" });
      return;
    }
    res.json({ product, level: await service.getLevel(String(req.params.id)) });
  })
);

router.post(
  "/products",
  handler(async (req, res) => {
    const parsed = addProductBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid product payload" });
      return;
    }
    const service = await getInventoryService();
    if (await service.getProduct(parsed.data.product_id)) {
      res.status(409).json({ error: "product_id already exists" });
      return;
    }
    res.status(201).json({ product: await service.addProduct(parsed.data) });
  })
);

router.patch(
  "/products/:id",
  handler(async (req, res) => {
    const parsed = editProductBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid product patch" });
      return;
    }
    const service = await getInventoryService();
    const updated = await service.editProduct(String(req.params.id), parsed.data);
    if (!updated) {
      res.status(404).json({ error: "product not found" });
      return;
    }
    res.json({ product: updated });
  })
);

router.delete(
  "/products/:id",
  handler(async (req, res) => {
    const service = await getInventoryService();
    const removed = await service.removeProduct(String(req.params.id));
    if (!removed) {
      res.status(404).json({ error: "product not found" });
      return;
    }
    res.status(204).end();
  })
);

// --- inventory levels ---

router.get(
  "/levels",
  handler(async (_req, res) => {
    const service = await getInventoryService();
    res.json({ levels: await service.listLevels() });
  })
);

router.get(
  "/levels/:id",
  handler(async (req, res) => {
    const service = await getInventoryService();
    const level = await service.getLevel(String(req.params.id));
    if (!level) {
      res.status(404).json({ error: "inventory level not found" });
      return;
    }
    res.json({ level });
  })
);

router.post(
  "/levels/:id/restock",
  handler(async (req, res) => {
    const parsed = restockBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid restock payload" });
      return;
    }
    const service = await getInventoryService();
    const level = await service.restock({ product_id: String(req.params.id), ...parsed.data });
    if (!level) {
      res.status(404).json({ error: "product not found" });
      return;
    }
    res.json({ level });
  })
);

router.patch(
  "/levels/:id",
  handler(async (req, res) => {
    const parsed = setStockBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid stock payload" });
      return;
    }
    const service = await getInventoryService();
    const level = await service.setStock(String(req.params.id), parsed.data.on_hand_by_size);
    if (!level) {
      res.status(404).json({ error: "product not found" });
      return;
    }
    res.json({ level });
  })
);

router.get(
  "/low-stock",
  handler(async (_req, res) => {
    const service = await getInventoryService();
    res.json({ low_stock: await service.lowStock() });
  })
);

// --- reservations (mostly Agent-driven; exposed for ops/debug) ---

router.get(
  "/reservations",
  handler(async (req, res) => {
    const statusParam = typeof req.query.status === "string" ? req.query.status : undefined;
    const status = statusParam ? reservationStatusSchema.safeParse(statusParam) : undefined;
    if (status && !status.success) {
      res.status(400).json({ error: "invalid reservation status" });
      return;
    }
    const service = await getInventoryService();
    res.json({
      reservations: await service.listReservations({
        session_id: typeof req.query.session_id === "string" ? req.query.session_id : undefined,
        status: status?.success ? status.data : undefined
      })
    });
  })
);

router.post(
  "/reservations",
  handler(async (req, res) => {
    const parsed = reserveInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid reservation payload" });
      return;
    }
    const service = await getInventoryService();
    const result = await service.reserve(parsed.data);
    res.status(result.ok ? 201 : 409).json(result);
  })
);

router.post(
  "/reservations/:id/confirm",
  handler(async (req, res) => {
    const service = await getInventoryService();
    const reservation = await service.confirmPurchase(String(req.params.id));
    if (!reservation) {
      res.status(404).json({ error: "reservation not found" });
      return;
    }
    res.json({ reservation });
  })
);

router.post(
  "/reservations/:id/release",
  handler(async (req, res) => {
    const service = await getInventoryService();
    const reservation = await service.release(String(req.params.id));
    if (!reservation) {
      res.status(404).json({ error: "reservation not found" });
      return;
    }
    res.json({ reservation });
  })
);

export const inventoryRouter = router;
