const { query } = require("../db");
const { validateCreate, validatePatch, isStatusTransitionAllowed } = require("../validators/item.validator");

async function listItems(req, res, next) {
  try {
    // 登录后才能看：routes 已经 requireAuth
    const result = await query(
      "SELECT id, owner_user_id, category, title, description, location, date, contact, status, created_at, updated_at FROM items ORDER BY date DESC, created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function getItem(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      "SELECT id, owner_user_id, category, title, description, location, date, contact, status, created_at, updated_at FROM items WHERE id=$1",
      [id]
    );
    const item = result.rows[0];
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  } catch (err) {
    next(err);
  }
}

async function createItem(req, res, next) {
  try {
    const v = validateCreate(req.body);
    if (!v.ok) return res.status(400).json({ error: "Validation failed", details: v.errors });

    const ownerUserId = req.userId;

    const result = await query(
      `INSERT INTO items (owner_user_id, category, title, description, location, date, contact, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, owner_user_id, category, title, description, location, date, contact, status, created_at, updated_at`,
      [
        ownerUserId,
        v.value.category,
        v.value.title,
        v.value.description,
        v.value.location,
        v.value.date,
        v.value.contact,
        v.value.status,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function patchItem(req, res, next) {
  try {
    const { id } = req.params;

    // 先取出当前 item，做 owner 校验 + 状态机
    const currentRes = await query("SELECT * FROM items WHERE id=$1", [id]);
    const current = currentRes.rows[0];
    if (!current) return res.status(404).json({ error: "Item not found" });

    if (current.owner_user_id !== req.userId) {
      return res.status(403).json({ error: "Forbidden: not the owner" });
    }

    const v = validatePatch(req.body);
    if (!v.ok) return res.status(400).json({ error: "Validation failed", details: v.errors });

    if (v.patch.status && !isStatusTransitionAllowed(current.status, v.patch.status)) {
      return res.status(400).json({ error: "Invalid status transition" });
    }

    // 动态拼 SQL（只更新传入字段）
    const fields = Object.keys(v.patch);
    if (fields.length === 0) return res.json(current);

    const setClauses = fields.map((f, i) => `${f}=$${i + 1}`);
    const params = fields.map((f) => v.patch[f]);

    // updated_at
    setClauses.push(`updated_at=NOW()`);

    const sql = `
      UPDATE items
      SET ${setClauses.join(", ")}
      WHERE id=$${params.length + 1}
      RETURNING id, owner_user_id, category, title, description, location, date, contact, status, created_at, updated_at
    `;
    params.push(id);

    const updated = await query(sql, params);
    res.json(updated.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function deleteItem(req, res, next) {
  try {
    const { id } = req.params;

    const currentRes = await query("SELECT owner_user_id FROM items WHERE id=$1", [id]);
    const current = currentRes.rows[0];
    if (!current) return res.status(404).json({ error: "Item not found" });

    if (current.owner_user_id !== req.userId) {
      return res.status(403).json({ error: "Forbidden: not the owner" });
    }

    await query("DELETE FROM items WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listItems, getItem, createItem, patchItem, deleteItem };