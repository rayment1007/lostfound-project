const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { listItems, getItem, createItem, patchItem, deleteItem } = require("../controllers/items.controller");

const router = express.Router();

// 登录后才能看
router.use(requireAuth);

router.get("/", listItems);
router.get("/:id", getItem);
router.post("/", createItem);
router.patch("/:id", patchItem);
router.delete("/:id", deleteItem);

module.exports = router;